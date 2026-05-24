import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { ContextDev } from "context.dev";

dotenv.config();

// Bypass self-signed/expired certificate validation on server-side requests
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Context.dev brand cache & helper utilities
interface BrandCacheEntry {
  data: any;
  timestamp: number;
}
const brandCache: Record<string, BrandCacheEntry> = {};
const CACHE_DURATION = 72 * 60 * 60 * 1000; // 72 hours cache duration in milliseconds

function cleanHostname(urlStr: string): string {
  try {
    let cleanUrl = urlStr.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = "https://" + cleanUrl;
    }
    const parsed = new URL(cleanUrl);
    return parsed.hostname.replace(/^www\./i, "");
  } catch (err) {
    return urlStr.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split('/')[0].split(':')[0].trim();
  }
}

async function fetchContextDevBrand(domainOrUrl: string): Promise<any> {
  const domain = cleanHostname(domainOrUrl);
  if (!domain) return null;

  // 1. Check cache for 72 hours duration
  const cached = brandCache[domain.toLowerCase()];
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    console.log(`[Context.dev Cache HIT] Re-using retrieved brand specification for ${domain}.`);
    return cached.data;
  }

  // 2. Validate CONTEXT_DEV_API_KEY is present
  const apiKey = process.env.CONTEXT_DEV_API_KEY;
  if (!apiKey) {
    console.warn("[Context.dev Secret Info] CONTEXT_DEV_API_KEY is currently undefined in environment variables. Skipping domain auto-enrichment.");
    return null;
  }

  try {
    console.log(`[Context.dev SDK Retrieval] Querying brand profiling client for domain: ${domain}...`);
    const client = new ContextDev({ apiKey });
    const response = await client.brand.retrieve({ domain });

    if (response && response.brand) {
      const b = response.brand;
      const logo = b.logos && b.logos.find(l => l.type === 'logo') || b.logos?.[0];
      const backdrop = b.backdrops?.[0];

      const brandColorsMapped = b.colors ? b.colors.map(c => ({
        hex: c.hex || "",
        name: c.name || ""
      })) : [];

      const logoColorsMapped = logo?.colors ? logo.colors.map(c => ({
        hex: c.hex || "",
        name: c.name || ""
      })) : [];

      const socialsMapped = b.socials ? b.socials.map(s => ({
        type: s.type || "",
        url: s.url || ""
      })) : [];

      const mappedData = {
        title: b.title || "",
        domain: b.domain || "",
        slogan: b.slogan || "",
        description: b.description || "",
        logoUrl: logo?.url || "",
        backdropUrl: backdrop?.url || "",
        logoColors: logoColorsMapped,
        brandColors: brandColorsMapped,
        socials: socialsMapped,
        address: b.address ? {
          street: b.address.street || "",
          city: b.address.city || "",
          state_province: b.address.state_province || "",
          postal_code: b.address.postal_code || "",
          country: b.address.country || ""
        } : undefined,
        industries: b.industries?.eic ? b.industries.eic.map(e => ({
          industry: e.industry,
          subindustry: e.subindustry
        })) : []
      };

      // 3. Persist fetched profile in memory for next 72 hours
      brandCache[domain.toLowerCase()] = {
        data: mappedData,
        timestamp: Date.now()
      };

      console.log(`[Context.dev Cache SET] Brand profile successfully parsed and cached for 72 hours.`);
      return mappedData;
    }
  } catch (err: any) {
    console.warn(`[Context.dev SDK Failure] Could not fetch brand metadata for '${domain}':`, err.message || err);
  }
  return null;
}

// Standard validation check for GoogleGenAI lazy init in endpoints
let aiClient: GoogleGenAI | null = null;
function getGenAI(userApiKey?: string): GoogleGenAI {
  const key = userApiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets or customize your credentials locally.");
  }
  
  if (userApiKey) {
    // Fresh client instance for specific user API key triggers
    return new GoogleGenAI({
      apiKey: userApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Function to safely extract/clean HTML content from a fetched page to send to Gemini
function cleanHtml(html: string): string {
  if (!html) return "";
  // Strip out heavy and irrelevant code tags
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "[SVG Element]")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "")
    .replace(/<path\b[^<]*(?:(?!<\/path>)<[^<]*)*<\/path>/gi, "")
    .replace(/\s+/g, " ") // remove excessive spaces
    .trim();
  
  // Take first 15000 characters to keep payload balanced
  return cleaned.substring(0, 15000);
}

// Function to clean potential markdown wrappers out of JSON responses from alternative providers
function cleanJsonResponse(text: string): string {
  if (!text) return "";
  let cleanText = text.trim();
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.substring(7);
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText.substring(3);
  }
  if (cleanText.endsWith("```")) {
    cleanText = cleanText.substring(0, cleanText.length - 3);
  }
  return cleanText.trim();
}

// Unified task executor for all LLM providers (Gemini, OpenAI, Anthropic, OpenRouter, Custom)
async function executeLLMTask({
  apiProvider,
  userApiKey,
  selectedModel,
  apiBaseUrl,
  systemPrompt,
  userPrompt,
  geminiSchema,
  taskName
}: {
  apiProvider: string;
  userApiKey?: string;
  selectedModel?: string;
  apiBaseUrl?: string;
  systemPrompt: string;
  userPrompt: string;
  geminiSchema: any;
  taskName: string;
}): Promise<any> {
  if (!apiProvider || apiProvider === "gemini") {
    const ai = getGenAI(userApiKey);
    const defaultGeminiModels = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.5-pro"];
    const modelsToTry = selectedModel && selectedModel !== "default"
      ? Array.from(new Set([selectedModel, ...defaultGeminiModels]))
      : defaultGeminiModels;
    
    let geminiResponse: any = null;
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      const attempts = (selectedModel && selectedModel !== "default" && selectedModel === modelName) ? 2 : 1;
      for (let i = 0; i < attempts; i++) {
        try {
          console.log(`[${taskName}] Requesting '${modelName}' (Attempt ${i + 1}/${attempts})...`);
          geminiResponse = await ai.models.generateContent({
            model: modelName,
            contents: userPrompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: geminiSchema
            }
          });
          break;
        } catch (err: any) {
          lastError = err;
          console.warn(`[${taskName}] Attempt ${i + 1} with ${modelName} failed:`, err.message || err);
          
          const errStr = String(err).toLowerCase();
          const isQuotaError = errStr.includes("429") || 
                               errStr.includes("quota") || 
                               errStr.includes("exhausted") || 
                               errStr.includes("rate_limit") ||
                               (err.status && err.status === "RESOURCE_EXHAUSTED");
          
          if (isQuotaError) {
            console.warn(`[${taskName}] Quota or rate-limit (429) hit on ${modelName}. Cascading to next fallback...`);
            break; // Break the attempt loop to cascade to next model
          }
          if (i < attempts - 1) {
            await new Promise(resolve => setTimeout(resolve, (i + 1) * 1000));
          }
        }
      }
      if (geminiResponse) break;
    }

    if (geminiResponse && geminiResponse.text) {
      return JSON.parse(geminiResponse.text.trim());
    }
    throw lastError || new Error(`[${taskName}] Gemini failed to return text.`);
  }

  else if (apiProvider === "openai") {
    const openaiKey = userApiKey?.trim() || process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error("OpenAI API Key is missing. Please provide your API Key inside settings drawer.");
    }
    const modelName = selectedModel === "default" ? "gpt-4o-mini" : selectedModel;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      })
    });
    if (!response.ok) {
      const rawErr = await response.text();
      throw new Error(`OpenAI API error: HTTP Status ${response.status} - ${rawErr.substring(0, 300)}`);
    }
    const rawJsonData = await response.json();
    const assistantContent = rawJsonData.choices?.[0]?.message?.content || "";
    if (!assistantContent) {
      throw new Error("Received empty text content from OpenAI completion.");
    }
    const cleanedText = cleanJsonResponse(assistantContent);
    return JSON.parse(cleanedText);
  }

  else if (apiProvider === "anthropic") {
    const anthropicKey = userApiKey?.trim() || process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      throw new Error("Anthropic API Key is missing. Please provide your API Key inside settings drawer.");
    }
    const modelName = selectedModel === "default" ? "claude-3-5-sonnet-latest" : selectedModel;
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "dangerously-allow-html-user-agents": "true"
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt + "\nOutput raw JSON only matching the schema." }
        ],
        temperature: 0.2
      })
    });
    if (!response.ok) {
      const rawErr = await response.text();
      throw new Error(`Anthropic API error: HTTP Status ${response.status} - ${rawErr.substring(0, 300)}`);
    }
    const rawJsonData = await response.json();
    const assistantContent = rawJsonData.content?.[0]?.text || "";
    if (!assistantContent) {
      throw new Error("Received empty text content from Anthropic completion.");
    }
    const cleanedText = cleanJsonResponse(assistantContent);
    return JSON.parse(cleanedText);
  }

  else if (apiProvider === "openrouter") {
    const openrouterKey = userApiKey?.trim() || process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
      throw new Error("OpenRouter API Key is missing. Please provide your API Key inside settings drawer.");
    }
    const defaultOpenRouterModels = ["meta-llama/llama-3.3-70b-instruct", "google/gemini-2.5-flash", "deepseek/deepseek-chat"];
    const openrouterModelsToTry = selectedModel && selectedModel !== "default"
      ? Array.from(new Set([selectedModel, ...defaultOpenRouterModels]))
      : defaultOpenRouterModels;

    let lastOpenRouterError: any = null;
    let finalData: any = null;

    for (const modelName of openrouterModelsToTry) {
      try {
        console.log(`[${taskName}] Sending to OpenRouter '${modelName}'...`);
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openrouterKey}`,
            "HTTP-Referer": "https://stilo.design",
            "X-Title": "Stilo Design System"
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2
          })
        });

        if (!response.ok) {
          const rawErr = await response.text();
          throw new Error(`OpenRouter HTTP ${response.status} - ${rawErr.substring(0, 250)}`);
        }

        const rawJsonData = await response.json();
        const assistantContent = rawJsonData.choices?.[0]?.message?.content || "";
        if (!assistantContent) {
          throw new Error("Received empty text content from OpenRouter API.");
        }

        const cleanedText = cleanJsonResponse(assistantContent);
        finalData = JSON.parse(cleanedText);
        break;
      } catch (err: any) {
        lastOpenRouterError = err;
        console.warn(`[${taskName}] OpenRouter model '${modelName}' failed (Rate limit, quota, or transient issue). Error:`, err.message || err);
        console.warn(`[${taskName}] Moving to next available OpenRouter model in cascade...`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    if (finalData) {
      return finalData;
    }
    throw lastOpenRouterError || new Error(`[${taskName}] OpenRouter failed.`);
  }

  else if (apiProvider === "custom") {
    const finalBaseUrl = apiBaseUrl?.trim() || "";
    if (!finalBaseUrl) {
      throw new Error("Custom Endpoint Base URL is required when choosing a custom compatible provider.");
    }
    const endpointUrl = finalBaseUrl.endsWith("/chat/completions") ? finalBaseUrl : `${finalBaseUrl.replace(/\/+$/, "")}/chat/completions`;
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json"
    };
    const finalKey = userApiKey?.trim() || "";
    if (finalKey) {
      requestHeaders["Authorization"] = `Bearer ${finalKey}`;
    }

    const modelName = selectedModel === "default" ? "custom-model" : selectedModel;
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });
    if (!response.ok) {
      const rawErr = await response.text();
      throw new Error(`Custom API error: HTTP Status ${response.status} - ${rawErr.substring(0, 300)}`);
    }
    const rawJsonData = await response.json();
    const assistantContent = rawJsonData.choices?.[0]?.message?.content || "";
    if (!assistantContent) {
      throw new Error("Received empty text content from Custom API completion.");
    }
    const cleanedText = cleanJsonResponse(assistantContent);
    return JSON.parse(cleanedText);
  }

  throw new Error(`Unsupported API Provider: ${apiProvider}`);
}

// Full-fidelity design system fallback generator if Gemini API key quota is exhausted (429)
function generateHeuristicDesignSystem(urlStr: string, title: string, desc: string): any {
  // Extract a clean brand name from URL
  let domain = urlStr.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0];
  let brandName = domain.split(".")[0];
  brandName = brandName.charAt(0).toUpperCase() + brandName.slice(1);
  
  if (title && title.length > 3) {
    const cleanTitle = title.split(/[|•-]/)[0].trim();
    if (cleanTitle.length > 2 && cleanTitle.length < 25) {
      brandName = cleanTitle;
    }
  }

  const finalDesc = desc || `High-fidelity responsive visual layout with modern premium styling, typography tokens, and robust components crafted for the public website of ${domain}.`;

  // Heuristic values depending on domain name
  let primaryCol = "#121212";
  let secondaryCol = "#4F46E5"; // Indigo
  let accentCol = "#F59E0B"; // Amber
  let bgCol = "#F4F1EA"; // Editorial Warm Paper
  let surfaceCol = "#FFFFFF";
  let textCol = "#121212";
  let borderCol = "rgba(0,0,0,0.1)";
  let themeStyle = "Modern Minimalist SaaS";

  const lowerUrl = urlStr.toLowerCase();
  if (lowerUrl.includes("stripe")) {
    primaryCol = "#635BFF";
    secondaryCol = "#0A2540";
    accentCol = "#00D4B6";
    bgCol = "#F8F9FC";
    themeStyle = "Stripe Fluid Modernism";
  } else if (lowerUrl.includes("linear")) {
    primaryCol = "#121214";
    secondaryCol = "#5E6AD2";
    accentCol = "#FF80DF";
    bgCol = "#09090B";
    textCol = "#F4F4F5";
    borderCol = "#27272A";
    themeStyle = "Linear Dark Cosmic";
  } else if (lowerUrl.includes("vercel") || lowerUrl.includes("next")) {
    primaryCol = "#000000";
    secondaryCol = "#111111";
    accentCol = "#0070F3";
    bgCol = "#FAF9F6";
    themeStyle = "Geometrical Tech Monochromatic";
  } else if (lowerUrl.includes("apple")) {
    primaryCol = "#1D1D1F";
    secondaryCol = "#86868B";
    accentCol = "#0071E3";
    bgCol = "#F5F5F7";
    themeStyle = "Premium Industrial Editorial";
  }

  const colors = [
    {
      hex: primaryCol,
      name: "Brand Primary",
      category: "Theme Core",
      usage: "Hero headers, primary buttons, branding visual highlights, and active states."
    },
    {
      hex: secondaryCol,
      name: "Brand Secondary",
      category: "Accent UI",
      usage: "Interactive elements, tags, hover offsets, and highlighted feature text."
    },
    {
      hex: accentCol,
      name: "Visual Anchor",
      category: "Highlights",
      usage: "Key callouts, special notification alerts, badges, and attention points."
    },
    {
      hex: bgCol,
      name: "Canvas Backdrop",
      category: "Base Canvas",
      usage: "Outermost page backdrop defining the overarching depth of the layout."
    },
    {
      hex: surfaceCol,
      name: "Card Surface",
      category: "Surfaces",
      usage: "Responsive interactive grids, feature blocks, content cards, and modal backdrops."
    },
    {
      hex: textCol,
      name: "Primary Typography",
      category: "Typography",
      usage: "Main responsive labels, copy descriptions, tables, and headers hierarchy."
    }
  ];

  const typography = [
    {
      element: "Lobby Display Heading",
      fontName: "Space Grotesk, sans-serif",
      size: "48px / 3rem",
      weight: "Bold / 700",
      usage: "Hero headers designed for large displays, styled with close letter-tracking."
    },
    {
      element: "H2 Section Boundary",
      fontName: "Space Grotesk, sans-serif",
      size: "24px / 1.5rem",
      weight: "Semibold / 600",
      usage: "Main section titles and board grids separating structural layout topics."
    },
    {
      element: "Interactive Button Link",
      fontName: "Inter, sans-serif",
      size: "13px / 0.81rem",
      weight: "Medium / 500",
      usage: "Interactive items, buttons labels, list triggers, and auxiliary control tags."
    },
    {
      element: "Paragraph Legible Copy",
      fontName: "Inter, sans-serif",
      size: "15px / 0.93rem",
      weight: "Regular / 400",
      usage: "Primary page paragraphs, annotations descriptions, and grid descriptions."
    }
  ];

  const components = [
    {
      componentName: "Responsive Action Hero",
      explanation: `Premium landing hero layout representing ${brandName}'s design architecture. Fully optimized with spacing margins, visual indicators, and flex structures.`,
      tailwindCode: "<div className=\"relative py-16 px-8 rounded-3xl overflow-hidden bg-gradient-to-tr from-zinc-950 to-zinc-900 w-full flex flex-col items-center justify-center text-center text-white border border-white/10 shadow-2xl\">\n" +
        "  <div className=\"absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent pointer-events-none\"></div>\n" +
        "  <span className=\"mb-5 inline-flex items-center gap-1 px-3 py-1 rounded bg-white/5 border border-white/10 text-[10px] tracking-widest uppercase font-bold text-indigo-300\">\n" +
        "    ✦ HEURISTIC DESIGN SPEC\n" +
        "  </span>\n" +
        "  <h1 className=\"text-4xl md:text-5xl font-black tracking-tight max-w-2xl leading-none italic font-serif\">\n" +
        "    The visual DNA of " + brandName + "\n" +
        "  </h1>\n" +
        "  <p className=\"mt-4 text-xs text-zinc-350 max-w-md leading-relaxed font-serif\">\n" +
        "    We analyzed the branding aesthetics of " + domain + " to craft high-fidelity Tailwind components mimicking their core design system.\n" +
        "  </p>\n" +
        "  <div className=\"mt-8 flex flex-col sm:flex-row items-center gap-4\">\n" +
        "    <button className=\"px-6 py-3 bg-white text-zinc-950 font-bold text-xs uppercase tracking-widest rounded hover:bg-zinc-200 transition-all cursor-pointer\">\n" +
        "      Launch Dashboard\n" +
        "    </button>\n" +
        "    <button className=\"px-6 py-3 bg-zinc-900 border border-zinc-700 text-zinc-350 hover:text-white font-bold text-xs uppercase tracking-widest rounded hover:border-zinc-500 transition-all cursor-pointer\">\n" +
        "      Explore Specs\n" +
        "    </button>\n" +
        "  </div>\n" +
        "</div>"
    },
    {
      componentName: "Aesthetic Grid Card",
      explanation: "Features elegant spatial offsets, elevated borders, visual icon placeholders, and action triggers.",
      tailwindCode: "<div className=\"group p-6 rounded-xl bg-white border border-black/15 hover:border-black transition-all flex flex-col justify-between min-h-[300px] w-full max-w-sm cursor-pointer shadow-sm hover:shadow-md\">\n" +
        "  <div>\n" +
        "    <div className=\"h-10 w-10 flex items-center justify-center rounded bg-black text-white text-xs font-bold font-sans tracking-widest uppercase\">\n" +
        "      01\n" +
        "    </div>\n" +
        "    <h3 className=\"mt-6 text-lg font-bold font-serif italic text-zinc-950\">\n" +
        "      Adaptive Layout Systems\n" +
        "    </h3>\n" +
        "    <p className=\"mt-2 text-xs leading-relaxed text-zinc-650 font-serif\">\n" +
        "      Construct responsive visual components that mimic live web grids using pure Tailwind utilities.\n" +
        "    </p>\n" +
        "  </div>\n" +
        "  <div className=\"pt-4 border-t border-black/5 flex items-center justify-between\">\n" +
        "    <span className=\"text-[10px] uppercase tracking-wider font-bold text-zinc-400\">\n" +
        "      Interactive spec\n" +
        "    </span>\n" +
        "    <span className=\"text-xs group-hover:translate-x-1 transition-transform font-serif italic text-zinc-800 font-semibold\">\n" +
        "      Reveal ➔\n" +
        "    </span>\n" +
        "  </div>\n" +
        "</div>"
    },
    {
      componentName: "Header Navigation Core",
      explanation: "Compact flat responsive navigation frame, crafted with visual tags and precise outline buttons.",
      tailwindCode: "<div className=\"w-full flex items-center justify-between border border-black/10 rounded-lg bg-[#FAF9F6] px-6 py-4.5\">\n" +
        "  <div className=\"flex items-center gap-2.5\">\n" +
        "    <div className=\"h-2 w-2 rounded-full bg-black\"></div>\n" +
        "    <span className=\"text-xs font-serif font-black tracking-tight uppercase italic\">" + brandName + ".stilo</span>\n" +
        "  </div>\n" +
        "  <nav className=\"hidden sm:flex items-center gap-6 text-[10px] uppercase font-bold tracking-widest text-zinc-600\">\n" +
        "    <span className=\"hover:text-black cursor-pointer\">Overview</span>\n" +
        "    <span className=\"hover:text-black cursor-pointer\">Token Vault</span>\n" +
        "    <span className=\"hover:text-black cursor-pointer\">Playground</span>\n" +
        "  </nav>\n" +
        "  <button className=\"px-4 py-2 text-[10px] font-sans font-bold tracking-widest bg-black hover:bg-zinc-850 text-white uppercase\">\n" +
        "    Deploy\n" +
        "  </button>\n" +
        "</div>"
    }
  ];

  const markdownContent = `# Architectural Design System: ${brandName}

## Executive Architecture Overview
Stilo has reverse-engineered the spatial DNA and styling patterns of **${brandName}** (${domain}). 

The design presents a sophisticated **${themeStyle}** aesthetic. It integrates clean grids, crisp micro-borders, and high-contrast styling boundaries, delivering an elegant responsive desktop document layout.

## Visual Language Blueprint
- **Shapes & Grids**: Elements of layout are styled with customized boundary corners (ranging from micro radii at \`0.375rem\` to card frames at \`1.5rem\`).
- **Gradients & Backdrop**: Utilizes quiet gradient frames paired with thin borders (\`border-black/10\` or \`border-white/5\`), providing robust visibility and structure.
- **Grids & Offsets**: Promotes negative spatial boundaries that feel light, responsive, and completely polished on ultra-wide screens.

## Interactive Component Audits
- **Action Triggers**: CTA triggers are constructed with bold dark elements, offering immediate micro-translation hover feedbacks.
- **Surface Cards**: Employs responsive panels that morph gracefully, providing excellent visual cues.
- **Navbars**: Elegant navigation segments equipped with clean status nodes and outline branding tags.

## Tailwind Implementation Playbook
Deploy these reverse engineered color hex tokens inside your \`tailwind.config.js\` and apply the structured inline HTML layout templates. Utilize standard typographic scales to preserve visual breathing space.
`;

  return {
    appName: `${brandName} (Heuristic Spec)`,
    description: finalDesc,
    markdownContent,
    colors,
    typography,
    components,
    isHeuristicFallback: true
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // API Endpoints
  app.post("/api/generate-design-md", async (req, res) => {
    const { url, apiProvider, userApiKey, selectedModel, apiBaseUrl } = req.body || {};

    if (!url) {
      return res.status(400).json({ error: "A valid website URL is required." });
    }

    // Format URL correctly
    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    let pageTitle = "";
    let pageDescription = "";
    let pageCleanHtml = "";
    let fetchErrorMsg = "";

    console.log(`Analyzing website URL: ${targetUrl} via Provider: ${apiProvider || "gemini"}`);

    async function attemptFetch(urlToFetch: string): Promise<{ ok: boolean; text?: string; statusMsg?: string }> {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(urlToFetch, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
          }
        });
        clearTimeout(id);

        if (response.ok) {
          const text = await response.text();
          return { ok: true, text };
        } else {
          return { ok: false, statusMsg: `HTTP Status ${response.status} ${response.statusText}` };
        }
      } catch (err: any) {
        return { ok: false, statusMsg: err.message || "Network request failed" };
      }
    }

    try {
      let fetchResult = await attemptFetch(targetUrl);
      
      // If the initial https:// request fails, try http:// as a robust fallback
      if (!fetchResult.ok && targetUrl.startsWith("https://")) {
        const httpTargetUrl = "http://" + targetUrl.substring(8);
        console.log(`Initial HTTPS fetch failed (${fetchResult.statusMsg}). Retrying via HTTP fallback: ${httpTargetUrl}...`);
        const fallbackResult = await attemptFetch(httpTargetUrl);
        if (fallbackResult.ok) {
          fetchResult = fallbackResult;
          targetUrl = httpTargetUrl; // Update target URL reference
        }
      }

      if (fetchResult.ok && fetchResult.text) {
        const text = fetchResult.text;
        // Match simple titles
        const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
        pageTitle = titleMatch ? titleMatch[1].trim() : "";

        // Match og:description or description
        const descMatch = text.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i) ||
                          text.match(/<meta[^>]+content="([^"]+)"[^>]+name="description"/i) ||
                          text.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i);
        pageDescription = descMatch ? descMatch[1].trim() : "";

        pageCleanHtml = cleanHtml(text);
      } else {
        fetchErrorMsg = fetchResult.statusMsg || "Unknown fetch failure";
      }
    } catch (err: any) {
      console.warn("Could not fetch target page directly:", err.message);
      fetchErrorMsg = err.message || "Network request aborted or failed.";
    }

    // Query Context.dev Brand Intelligence if CONTEXT_DEV_API_KEY is available
    let contextDevBrandData = null;
    try {
      contextDevBrandData = await fetchContextDevBrand(targetUrl);
    } catch (err: any) {
      console.warn("[Context.dev Endpoint Query] Inquiry failed:", err.message || err);
    }

    const contextDevSection = contextDevBrandData ? `
### Context.dev Official Brand Profile Metadata
Here is verified brand intelligence retrieved from Context.dev for "${contextDevBrandData.domain || targetUrl}":
- Brand Name: ${contextDevBrandData.title || ""}
- Slogan: ${contextDevBrandData.slogan || ""}
- Description: ${contextDevBrandData.description || ""}
- Official Brand Colors: ${JSON.stringify(contextDevBrandData.brandColors || [])}
- Logo Colors: ${JSON.stringify(contextDevBrandData.logoColors || [])}
- Industry: ${contextDevBrandData.industries ? contextDevBrandData.industries.map((ind: any) => `${ind.industry} (${ind.subindustry})`).join(", ") : ""}
- Brand Logo URL: ${contextDevBrandData.logoUrl || ""}
- Social Network Links: ${contextDevBrandData.socials ? contextDevBrandData.socials.map((s: any) => `${s.type}: ${s.url}`).join(", ") : ""}

Please strictly prioritize compiling official brand colors (represented above with exact hex tokens) and incorporating them into the design specifications, apps name, typography guidelines, and demo components.
` : "";

    const analysisPromptA = `
You are a world-class Lead UX Designer and Design System Director.
Perform an incredibly precise, high-fidelity reverse-engineering analysis of the website's design language, visual aesthetic, color palette, and typography from the fetched page.

${pageCleanHtml ? `Here is the clean HTML markup and metadata fetched from the homepage of the target website (${targetUrl}):
Title: ${pageTitle}
Description: ${pageDescription}
Cleaned HTML:
${pageCleanHtml}
` : `Note: Due to network restrictions or site policies, we were unable to fetch the source markup directly (Error: ${fetchErrorMsg}). 
Please use Google Search grounding or your pre-trained aesthetic knowledge to formulate an incredibly precise design system specification for the public website of brand: ${targetUrl}.
`}

${contextDevSection}

Please analyze the brand and create:
1. "appName": The name of the brand.
2. "description": An elegant, high-level overview of the brand's aesthetic.
3. "markdownContent": An incredibly comprehensive, beautiful, structured "Design System Specification" document in Markdown format. The Markdown MUST include:
   - **Executive Architecture Overview**: A conceptual statement on the brand's aesthetic vibe (e.g., minimalist SaaS elegant, corporate trusted slate, creative editorial serif, bold brutalist mono).
   - **Visual Language Blueprint**: In-depth analysis of shadows, borders, rounded corners, blur effects, glassmorphic elements, grid layout spacing, padding constraints, and transitions.
   - **Interactive Component Audits**: Structural explanation of the hero, cards, navigations, form inputs, buttons, and state indicators.
   - **Tailwind Implementation Playbook**: Actionable guide explaining how a developer should setup their Tailwind config and apply classes to replicate this brand essence.

4. "colors": A list of key Color Swatches (**colors** array) used in the design. Must include accurate Hex codes representing the theme (e.g., Primary, Background, Secondary, Text, Borders, Accents) with naming and explicit layout usage details.
5. "typography": A list of Typography tokens (**typography** array) detailing the selectors/elements (e.g., Hero Header, H2 Component Header, Body Font, Buttons, Technical Mono) containing the recommended font name, precise font sizes, weight tags, and exact placement rules.

Ensure your JSON matches the requested schema precisely.
`;

    const analysisPromptB = `
You are a Lead Frontend Architect and Tailwind CSS UI Developer.
Analyse the website styling choices, spatial hierarchies, layouts, and aesthetics to construct three premium production-ready components.

${pageCleanHtml ? `Here is the clean HTML markup and metadata fetched from the homepage of the target website (${targetUrl}):
Title: ${pageTitle}
Description: ${pageDescription}
Cleaned HTML:
${pageCleanHtml}
` : `Note: Due to network restrictions, we were unable to fetch the source markup directly (Error: ${fetchErrorMsg}).
Construct components representing the public website of brand: ${targetUrl}. Use your pre-trained aesthetic knowledge.
`}

${contextDevSection}

Please design and output exactly three key custom Tailwind HTML elements styled perfectly to represent the components from the target website (e.g., a beautiful Hero CTA section, an Interactive Bento/Feature card, and a gorgeous Header Nav bar or Status Board). These components should be production-ready and fully written inline with premium Tailwind styles.

Ensure your JSON matches the requested schema precisely.
`;

    const schemaA = {
      type: Type.OBJECT,
      properties: {
        appName: { type: Type.STRING },
        description: { type: Type.STRING },
        markdownContent: { type: Type.STRING },
        colors: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              hex: { type: Type.STRING },
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              usage: { type: Type.STRING }
            },
            required: ["hex", "name", "category", "usage"]
          }
        },
        typography: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              element: { type: Type.STRING },
              fontName: { type: Type.STRING },
              size: { type: Type.STRING },
              weight: { type: Type.STRING },
              usage: { type: Type.STRING }
            },
            required: ["element", "fontName", "size", "weight", "usage"]
          }
        }
      },
      required: ["appName", "description", "markdownContent", "colors", "typography"]
    };

    const schemaB = {
      type: Type.OBJECT,
      properties: {
        components: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              componentName: { type: Type.STRING },
              tailwindCode: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["componentName", "tailwindCode", "explanation"]
          }
        }
      },
      required: ["components"]
    };

    const systemPromptA = `You are a world-class Lead UX Designer, Frontend Architect, and Design System Director.
You MUST reply ONLY with valid JSON conforming strictly to the requested schema. Do NOT include any intro, markdown wrappers, conversational fluff, or text outside the raw JSON code block.

JSON Schema format required:
{
  "appName": "string",
  "description": "string",
  "markdownContent": "string (A complete spec sheeting layout instructions focusing on spatial systems)",
  "colors": [
    { "hex": "string", "name": "string", "category": "string", "usage": "string" }
  ],
  "typography": [
    { "element": "string", "fontName": "string", "size": "string", "weight": "string", "usage": "string" }
  ]
}`;

    const systemPromptB = `You are a Lead Frontend Architect and Tailwind CSS UI Developer.
You MUST reply ONLY with valid JSON conforming strictly to the requested schema. Do NOT include any intro, markdown wrappers, conversational fluff, or text outside the raw JSON code block.

JSON Schema format required:
{
  "components": [
    { "componentName": "string", "tailwindCode": "string (HTML layout written with inline utility styles)", "explanation": "string" }
  ]
}`;

    try {
      let taskAResult: any = null;
      let taskBResult: any = null;
      let partialFallbackTriggered = false;

      console.log(`Executing concurrent extraction tasks (Task A - Core, Task B - UI Components) for direct optimization...`);

      try {
        const results = await Promise.all([
          executeLLMTask({
            apiProvider,
            userApiKey,
            selectedModel,
            apiBaseUrl,
            systemPrompt: systemPromptA,
            userPrompt: analysisPromptA,
            geminiSchema: schemaA,
            taskName: "TaskA-CoreSpecs"
          }).catch(err => {
            console.warn("Task A (Core Specs) execution failed. Caught:", err.message || err);
            return null;
          }),
          executeLLMTask({
            apiProvider,
            userApiKey,
            selectedModel,
            apiBaseUrl,
            systemPrompt: systemPromptB,
            userPrompt: analysisPromptB,
            geminiSchema: schemaB,
            taskName: "TaskB-UIComponents"
          }).catch(err => {
            console.warn("Task B (UI Components) execution failed. Caught:", err.message || err);
            return null;
          })
        ]);

        taskAResult = results[0];
        taskBResult = results[1];
      } catch (parallelErr: any) {
        console.error("Unknown exception during parallel Promise.all:", parallelErr);
      }

      // If either task failed, fill in from the heuristic generator as resilient fallback
      if (!taskAResult || !taskBResult) {
        console.warn("One or both parallel LLM extraction tasks were unsuccessful. Generating premium heuristic fallback content.");
        partialFallbackTriggered = true;
        const localHeuristic = generateHeuristicDesignSystem(targetUrl, pageTitle, pageDescription);

        if (!taskAResult) {
          taskAResult = {
            appName: localHeuristic.appName,
            description: localHeuristic.description,
            markdownContent: localHeuristic.markdownContent,
            colors: localHeuristic.colors,
            typography: localHeuristic.typography
          };
        }
        if (!taskBResult) {
          taskBResult = {
            components: localHeuristic.components
          };
        }
      }

      const parsedData = {
        appName: taskAResult.appName || `${targetUrl.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0]} Brand`,
        description: taskAResult.description || "Synthesized visual layout specifications referencing live color patterns, spatial constraints, and high-fidelity structures.",
        markdownContent: taskAResult.markdownContent || "",
        colors: taskAResult.colors || [],
        typography: taskAResult.typography || [],
        components: taskBResult.components || [],
        isLiveAnalysis: !partialFallbackTriggered,
        rateLimitInfo: partialFallbackTriggered ? "Parallel task failure or rate limit active" : undefined,
        contextDevBrandData: contextDevBrandData || undefined
      };

      res.json(parsedData);

    } catch (err: any) {
      console.log("Stilo heuristic feedback module triggered: rate limit or provider exception caught:", err.message || err);
      const finalFallback: any = generateHeuristicDesignSystem(targetUrl, pageTitle, pageDescription);
      finalFallback.isLiveAnalysis = false;
      finalFallback.rateLimitInfo = String(err.message || err);
      finalFallback.contextDevBrandData = contextDevBrandData || undefined;
      res.json(finalFallback);
    }
  });

  // Focused Endpoint to verify Context.dev integration is working properly
  app.get("/api/test-context-dev", async (req, res) => {
    const domain = (req.query.domain as string) || "stripe.com";
    const apiKey = process.env.CONTEXT_DEV_API_KEY;

    if (!apiKey) {
      // Mock simulation mode when API key is not configured yet
      return res.json({
        success: true,
        isMock: true,
        message: "CONTEXT_DEV_API_KEY is not defined in environment secrets. Displaying simulation data (Dry Run mode).",
        brandData: {
          title: "Stripe",
          domain: "stripe.com",
          slogan: "Financial infrastructure for the internet",
          description: "Stripe is a suite of APIs powering online payment processing and commerce solutions for internet businesses.",
          logoUrl: "https://logo.clearbit.com/stripe.com",
          backdropUrl: "",
          logoColors: [
            { hex: "#635BFF", name: "Stripe Blurple" },
            { hex: "#0A2540", name: "Stripe Dark Indigo" }
          ],
          brandColors: [
            { hex: "#635BFF", name: "Primary Blurple" },
            { hex: "#00D4B2", name: "Accent Turquoise" },
            { hex: "#7A8C8E", name: "Cool Grey" }
          ],
          socials: [
            { type: "x", url: "https://x.com/stripe" },
            { type: "linkedin", url: "https://linkedin.com/company/stripe" }
          ],
          industries: [
            { industry: "Finance", subindustry: "Payments & Money Movement" }
          ]
        }
      });
    }

    try {
      console.log(`[Context.dev API Check] Attempting brand intelligence retrieval for domain: ${domain}...`);
      const client = new ContextDev({ apiKey });
      const response = await client.brand.retrieve({ domain });

      return res.json({
        success: true,
        isMock: false,
        message: `Successfully connected with Context.dev live API and retrieved brand profile metadata for ${domain}!`,
        response
      });
    } catch (err: any) {
      console.error(`[Context.dev API Check Failed] Error:`, err.message || err);
      return res.status(500).json({
        success: false,
        message: `Context.dev live API call failed: ${err.message || err}`,
        error: err.toString()
      });
    }
  });

  // API Refinement Endpoint for AI iteration over Tailwind Component layout specs
  app.post("/api/refine-component", async (req, res) => {
    const { component, prompt, apiProvider, userApiKey, selectedModel, apiBaseUrl } = req.body || {};

    if (!component || !prompt) {
      return res.status(400).json({ error: "Active component object and custom refinement prompt are required." });
    }

    const refinementPrompt = `
You are a Lead Frontend Designer and Tailwind HTML architect.
Review this interactive spec template:
Component Name: "${component.componentName}"
Explanation: "${component.explanation}"
Source HTML Code:
\`\`\`html
${component.tailwindCode}
\`\`\`

The user has requested the following direct styling refinement, aesthetic iteration, or visual transformation:
"${prompt}"

Please implement this enhancement while maintaining high fidelity, clean layout boundaries, responsive sizing, and authentic design rules with Tailwind CSS classes. Avoid introducing raw CSS script blocks or custom tailwind configs. Respond ONLY with valid JSON conforming to the structural schema below. Do not wrap code inside extra explanatory paragraphs.

Required JSON Output Schema:
{
  "componentName": "string (The optimized/refined component name)",
  "tailwindCode": "string (The complete modified responsive HTML template code with inline utility classes)",
  "explanation": "string (A direct summary explaining the visual choices and what you added/improved)"
}
`;

    try {
      let parsedOutput: any = null;

      if (!apiProvider || apiProvider === "gemini") {
        const ai = getGenAI(userApiKey);
        const modelName = selectedModel && selectedModel !== "default" ? selectedModel : "gemini-2.5-flash";
        console.log(`Sending design refinement request to Gemini '${modelName}'...`);
        
        const geminiRes = await ai.models.generateContent({
          model: modelName,
          contents: refinementPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                componentName: { type: Type.STRING },
                tailwindCode: { type: Type.STRING },
                explanation: { type: Type.STRING }
              },
              required: ["componentName", "tailwindCode", "explanation"]
            }
          }
        });

        if (geminiRes && geminiRes.text) {
          parsedOutput = JSON.parse(geminiRes.text.trim());
        }
      } else if (apiProvider === "openai") {
        const openaiKey = userApiKey ? userApiKey.trim() : process.env.OPENAI_API_KEY;
        if (!openaiKey) {
          throw new Error("Missing OpenAI API Certificate.");
        }
        const modelName = selectedModel === "default" ? "gpt-4o-mini" : selectedModel;
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: "system", content: "You respond ONLY with a raw JSON object matching the requested schema. No conversational fillers." },
              { role: "user", content: refinementPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2
          })
        });

        if (response.ok) {
          const resJson = await response.json();
          const cleanTxt = cleanJsonResponse(resJson.choices?.[0]?.message?.content || "");
          parsedOutput = JSON.parse(cleanTxt);
        }
      } else if (apiProvider === "openrouter") {
        const openrouterKey = userApiKey ? userApiKey.trim() : process.env.OPENROUTER_API_KEY;
        if (!openrouterKey) {
          throw new Error("Missing OpenRouter API Key.");
        }
        const modelName = selectedModel === "default" ? "meta-llama/llama-3.3-70b-instruct" : selectedModel;
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openrouterKey}`,
            "HTTP-Referer": "https://stilo.design",
            "X-Title": "Stilo Design System"
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: "system", content: "You respond ONLY with a raw JSON object matching the requested schema." },
              { role: "user", content: refinementPrompt }
            ]
          })
        });

        if (response.ok) {
          const resJson = await response.json();
          const cleanTxt = cleanJsonResponse(resJson.choices?.[0]?.message?.content || "");
          parsedOutput = JSON.parse(cleanTxt);
        }
      }

      if (!parsedOutput) {
        throw new Error("Unsuccessful design engine generation response.");
      }

      res.json(parsedOutput);

    } catch (err: any) {
      console.warn("Component refinement falling back to local string replacement engine:", err.message);
      
      // Smart Heuristic inline text replacement fallback if LLMs are offline or quota-limited
      let updatedCode = component.tailwindCode;
      let note = "Refined using Stilo's local heuristic parser: ";
      
      const lowerPrompt = prompt.toLowerCase();
      if (lowerPrompt.includes("round") || lowerPrompt.includes("border") || lowerPrompt.includes("radius")) {
        updatedCode = updatedCode.replace(/rounded-xl/g, "rounded-3xl").replace(/rounded-lg/g, "rounded-2xl").replace(/rounded-none/g, "rounded-xl");
        note += "increased container border radius sizes globally. ";
      }
      if (lowerPrompt.includes("dark") || lowerPrompt.includes("black") || lowerPrompt.includes("midnight") || lowerPrompt.includes("inverted")) {
        updatedCode = updatedCode.replace(/bg-white/g, "bg-zinc-950").replace(/text-zinc-950/g, "text-white").replace(/text-[#121212]/g, "text-zinc-100").replace(/border-black\/15/g, "border-white/10").replace(/bg-gray-50/g, "bg-zinc-900");
        note += "substituted light backdrop classes with premium matte dark styling variables. ";
      }
      if (lowerPrompt.includes("shadow") || lowerPrompt.includes("elevat")) {
        updatedCode = updatedCode.replace(/shadow-sm/g, "shadow-xl").replace(/shadow-md/g, "shadow-2xl").replace(/shadow-none/g, "shadow-lg");
        note += "enhanced structural elevation container drop shadows. ";
      }
      if (lowerPrompt.includes("blue") || lowerPrompt.includes("indigo") || lowerPrompt.includes("primary")) {
        updatedCode = updatedCode.replace(/bg-black/g, "bg-indigo-600").replace(/bg-zinc-900/g, "bg-indigo-900");
        note += "swapped neutral buttons with vibrant styling tones. ";
      }

      res.json({
        componentName: `${component.componentName} (Heuristic Spec)`,
        tailwindCode: updatedCode,
        explanation: `${note}Refined to support: "${prompt}".`
      });
    }
  });

  // Global API error handler to catch throw/compile errors on server-side routes and ensure JSON format is returned instead of HTML
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[Express Global Catch-All Error Handler] url: ${req.url}`, err);
    if (res.headersSent) {
      return next(err);
    }
    if (req.path.startsWith("/api/")) {
      return res.status(err.status || 500).json({
        error: err.message || "An unexpected server-side error occurred while compiling your design specification."
      });
    }
    next(err);
  });

  // Serve static assets in production, leverage Vite in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind to port 3000 and 0.0.0.0
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal Server Startup Error:", err);
});
