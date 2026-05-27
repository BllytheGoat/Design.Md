import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Globe,
  ArrowRight,
  Info,
  Sparkles,
  AlertCircle,
  Code,
  FolderOpen,
  Layout,
  RefreshCw,
  Palette,
  Type,
  FileText,
  Bookmark,
  CheckCircle,
  Download,
  Settings,
  Key,
  Cpu,
  X,
  FileCode,
  FileJson
} from "lucide-react";

import { DesignSystemData, HistoryEntry } from "./types";
import { MarkdownRenderer } from "./components/MarkdownRenderer";
import { PaletteVisualizer } from "./components/PaletteVisualizer";
import { TypographySpec } from "./components/TypographySpec";
import { TailwindComponents } from "./components/TailwindComponents";
import { DEFAULT_STITCH_DATA } from "./DEFAULT_STITCH_DATA";
import { SandboxWorkspace } from "./components/SandboxWorkspace";
import { ContextDevBrandTab } from "./components/ContextDevBrandTab";
import { HistoryTab } from "./components/HistoryTab";
import { executeClientSideOllamaDesign } from "./lib/ollamaClient";

// Preset sites with customized metadata to allow rapid user interaction and flawless demonstrations
const PRESETS = [
  { name: "Linear", url: "https://linear.app", tag: "Tech Dark Minimalist" },
  { name: "Stripe", url: "https://stripe.com", tag: "Modern Corporate Gradient" },
  { name: "Vercel", url: "https://vercel.com", tag: "Strict Minimal Mono" },
  { name: "Airbnb", url: "https://airbnb.com", tag: "Soft Lifestyle Warm" },
  { name: "Apple", url: "https://apple.com", tag: "Premium Sleek Contrast" },
  { name: "GitHub", url: "https://github.com", tag: "Developer Density Dark" }
];

const LOADING_STAGES = [
  "Resolving URL target format and initializing metadata...",
  "Sending server-side network ping to target website...",
  "Scraping homepage elements & layout structure...",
  "Formatting layout tags to send to Gemini...",
  "Summoning Gemini 3.5 Flash design analysis core...",
  "Reverse-engineering visual palette and HEX ranges...",
  "Deducing typographic scale & font hierarchies...",
  "Generating responsive Tailwind CSS components...",
  "Stitching design markdown specification blueprints...",
  "Finalizing layout token parameters..."
];

// Synthesize a beautiful, comprehensive Markdown document containing summary text, color swatches reference tables, typographic hierarchy scales, and complete responsive Tailwind UI components.
function buildFullMarkdown(data: DesignSystemData): string {
  if (!data) return "";
  let doc = "";
  if (data.markdownContent) {
    doc += data.markdownContent.trim() + "\n\n";
  } else {
    doc += `# Visual DNA Architectural Design System: ${data.appName}\n\n`;
    doc += `${data.description}\n\n`;
  }

  doc += `## 🎨 Extracted Color Palette\n\n`;
  doc += `Below are the precise color hex codes and custom semantic mappings specified for this design:\n\n`;
  doc += `| Color | Hex | Swatch Name | Category | Exact Application Rule |\n`;
  doc += `| :--- | :--- | :--- | :--- | :--- |\n`;
  if (data.colors && data.colors.length) {
    data.colors.forEach((color) => {
      doc += `| 🟥 | \`${color.hex}\` | **${color.name}** | \`${color.category}\` | ${color.usage} |\n`;
    });
  } else {
    doc += `| No colors extracted. |\n`;
  }
  doc += `\n`;

  doc += `## 📐 Typographic Scale & Hierarchy\n\n`;
  doc += `Recommended responsive font layout sizing rules to maintain spatial balance:\n\n`;
  doc += `| Element Selector | Font Family / Face | Dimension & Sizing | Weight Tag | Intended UI Treatment |\n`;
  doc += `| :--- | :--- | :--- | :--- | :--- |\n`;
  if (data.typography && data.typography.length) {
    data.typography.forEach((typo) => {
      doc += `| **${typo.element}** | \`${typo.fontName}\` | \`${typo.size}\` | ${typo.weight} | ${typo.usage} |\n`;
    });
  } else {
    doc += `| No typography tokens defined. |\n`;
  }
  doc += `\n`;

  doc += `## 🧩 Custom Visual Components\n\n`;
  doc += `Fully styled interactive layouts, copy-pasteable as responsive React/Tailwind elements:\n\n`;
  if (data.components && data.components.length) {
    data.components.forEach((comp) => {
      doc += `### ✦ ${comp.componentName}\n\n`;
      doc += `${comp.explanation}\n\n`;
      doc += `\`\`\`html\n${comp.tailwindCode}\n\`\`\`\n\n`;
    });
  } else {
    doc += `*No custom layouts built.*\n`;
  }

  return doc;
}

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DesignSystemData | null>(null);
  const [activeTab, setActiveTab] = useState<"markdown" | "palette" | "typography" | "components" | "brand">("markdown");
  const [globalTab, setGlobalTab] = useState<"explorer" | "specs" | "sandbox" | "history">("explorer");

  // Local extraction history state
  const [historyList, setHistoryList] = useState<HistoryEntry[]>(() => {
    try {
      const stored = localStorage.getItem("stilo_extraction_history");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("stilo_extraction_history", JSON.stringify(historyList));
  }, [historyList]);

  // Advanced LLM and Credentials Configuration
  const [apiProvider, setApiProvider] = useState(() => localStorage.getItem("stilo_api_provider") || "gemini");
  const [apiBaseUrl, setApiBaseUrl] = useState(() => localStorage.getItem("stilo_api_base_url") || "");
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem("stilo_custom_api_key") || "");
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem("stilo_custom_model") || "default");
  const [customModelName, setCustomModelName] = useState(() => localStorage.getItem("stilo_custom_model_name") || "");
  const resolvedModel = selectedModel === "custom" ? customModelName.trim() : selectedModel;
  const [showSettings, setShowSettings] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Sync state modifications with localStorage persistence
  useEffect(() => {
    localStorage.setItem("stilo_api_provider", apiProvider);
  }, [apiProvider]);

  useEffect(() => {
    localStorage.setItem("stilo_api_base_url", apiBaseUrl);
  }, [apiBaseUrl]);

  useEffect(() => {
    localStorage.setItem("stilo_custom_api_key", userApiKey);
  }, [userApiKey]);

  useEffect(() => {
    localStorage.setItem("stilo_custom_model", selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem("stilo_custom_model_name", customModelName);
  }, [customModelName]);

  // Cyclical loading progress stages to soothe waiting times
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setStageIndex((prev) => (prev < LOADING_STAGES.length - 1 ? prev + 1 : prev));
      }, 1500);
    } else {
      setStageIndex(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handlePresetClick = (presetUrl: string) => {
    setUrl(presetUrl);
    handleSubmit(presetUrl);
  };

  const handleProviderChange = (newProvider: string) => {
    setApiProvider(newProvider);
    setSelectedModel("default");
    if (newProvider === "ollama") {
      if (!apiBaseUrl || apiBaseUrl.trim() === "" || apiBaseUrl.includes("together.xyz")) {
        setApiBaseUrl("http://localhost:11434");
      }
    } else if (newProvider === "custom") {
      if (apiBaseUrl === "http://localhost:11434") {
        setApiBaseUrl("");
      }
    }
  };

  const handleSubmit = async (targetUrl = url) => {
    if (!targetUrl || !targetUrl.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);

    const finalModel = selectedModel === "custom" ? customModelName.trim() : selectedModel;
    const requestBody = {
      url: targetUrl,
      apiProvider,
      userApiKey: userApiKey.trim() || undefined,
      selectedModel: finalModel !== "default" ? finalModel : undefined,
      apiBaseUrl: apiBaseUrl.trim() || undefined
    };

    try {
      const response = await fetch("/api/generate-design-md", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      let resData: any = null;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        resData = await response.json();
      } else {
        const rawText = await response.text();
        const snippet = rawText.substring(0, 120);
        if (!response.ok) {
          throw new Error(`Server Error (Status ${response.status}): ${snippet}`);
        }
        throw new Error(`Returned unexpected non-JSON format: ${snippet}`);
      }

      if (!response.ok) {
        throw new Error(resData?.error || "Failed to generate design specifications.");
      }

      if (resData && resData.needsClientSideLlm) {
        console.log("Local Ollama endpoint intercepted. Running parallel design system specs extraction in user's browser...");
        try {
          const result = await executeClientSideOllamaDesign(resData, finalModel, apiBaseUrl, userApiKey);
          setData(result);
          
          const newEntry: HistoryEntry = {
            id: Date.now().toString(),
            url: targetUrl,
            timestamp: Date.now(),
            data: result
          };
          setHistoryList((prev) => {
            const filtered = prev.filter((item) => item.url.toLowerCase() !== targetUrl.toLowerCase());
            return [newEntry, ...filtered];
          });
          setLoading(false);
          return;
        } catch (ollamaErr: any) {
          console.warn("Local browser-side Ollama execution failed, falling back to premium heuristic engine:", ollamaErr.message || ollamaErr);
          
          // Request server-side premium heuristic fallback safely
          const fallbackResponse = await fetch("/api/generate-design-md", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...requestBody,
              forceHeuristic: true
            })
          });
          
          if (!fallbackResponse.ok) {
            throw new Error(`Failed to retrieve heuristic fallback after local Ollama error: ${ollamaErr.message || ollamaErr}`);
          }
          
          const fallbackData = await fallbackResponse.json();
          setData(fallbackData);
          
          const newEntry: HistoryEntry = {
            id: Date.now().toString(),
            url: targetUrl,
            timestamp: Date.now(),
            data: fallbackData
          };
          setHistoryList((prev) => {
            const filtered = prev.filter((item) => item.url.toLowerCase() !== targetUrl.toLowerCase());
            return [newEntry, ...filtered];
          });
          setLoading(false);
          return;
        }
      }

      setData(resData);
      
      // Save entry to extraction history
      const newEntry: HistoryEntry = {
        id: Date.now().toString(),
        url: targetUrl,
        timestamp: Date.now(),
        data: resData
      };
      setHistoryList((prev) => {
        const filtered = prev.filter((item) => item.url.toLowerCase() !== targetUrl.toLowerCase());
        return [newEntry, ...filtered];
      });
    } catch (err: any) {
      console.error("Analysis Error:", err);
      let errMsg = err.message || "A network layout or response issue occurred while performing deep-learning visual analyses.";
      if (errMsg.toLowerCase().includes("failed to fetch")) {
        errMsg = "A gateway connection timeout or network issue occurred (Failed to fetch). The requested website might be slow, blocked by a firewall, or the model provider queue is congested. You can try again shortly, or use a simpler URL.";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadMd = () => {
    const activeSpecsData = data || DEFAULT_STITCH_DATA;
    const fullText = buildFullMarkdown(activeSpecsData);
    const blob = new Blob([fullText], { type: "text/markdown;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const mockLink = document.createElement("a");
    mockLink.href = blobUrl;
    mockLink.download = `${activeSpecsData.appName.toLowerCase().replace(/\s+/g, "-")}-design-system.md`;
    document.body.appendChild(mockLink);
    mockLink.click();
    document.body.removeChild(mockLink);
    URL.revokeObjectURL(blobUrl);
  };

  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const handleDownloadJson = () => {
    const activeSpecsData = data || DEFAULT_STITCH_DATA;
    const jsonStr = JSON.stringify(activeSpecsData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const mockLink = document.createElement("a");
    mockLink.href = blobUrl;
    mockLink.download = `${activeSpecsData.appName.toLowerCase().replace(/\s+/g, "-")}-design-tokens.json`;
    document.body.appendChild(mockLink);
    mockLink.click();
    document.body.removeChild(mockLink);
    URL.revokeObjectURL(blobUrl);
  };

  const handleDownloadHtmlPdf = () => {
    const activeSpecsData = data || DEFAULT_STITCH_DATA;
    
    const colorsHtml = activeSpecsData.colors?.map(c => `
      <div class="border border-black/10 rounded-xl p-4 bg-white space-y-3 shadow-sm flex flex-col justify-between">
        <div class="h-16 w-full rounded-lg border border-black/10 shadow-inner" style="background-color: ${c.hex}"></div>
        <div>
          <h4 class="font-bold text-sm text-gray-950">${c.name}</h4>
          <p class="font-mono text-xs text-gray-400 mt-0.5">${c.hex}</p>
          <span class="inline-block px-1.5 py-0.5 text-[9px] bg-gray-100 text-gray-600 rounded font-sans uppercase mt-1.5">${c.category}</span>
          <p class="text-[11px] text-gray-650 mt-2 leading-relaxed">${c.usage}</p>
        </div>
      </div>
    `).join("") || "";

    const typographyHtml = activeSpecsData.typography?.map(t => `
      <tr class="border-b border-gray-100 hover:bg-gray-50/50">
        <td class="py-4 px-4 font-bold text-gray-900">${t.element}</td>
        <td class="py-4 px-4 font-serif italic text-gray-600">${t.fontName}</td>
        <td class="py-4 px-4 font-mono text-xs text-gray-600">${t.size}</td>
        <td class="py-4 px-4 text-xs font-semibold text-gray-800">${t.weight}</td>
        <td class="py-4 px-4 text-xs text-gray-600">${t.usage}</td>
      </tr>
    `).join("") || "";

    const componentsHtml = activeSpecsData.components?.map(c => `
      <div class="bg-gray-50 border border-gray-200/60 rounded-2xl p-6 md:p-8 space-y-6">
        <div>
          <span class="text-[10px] font-sans tracking-widest text-gray-400 uppercase font-bold">Interactive Specs</span>
          <h3 class="text-xl font-serif font-black italic tracking-tight text-gray-950 mt-1">${c.componentName}</h3>
          <p class="text-xs text-gray-600 mt-1 max-w-3xl">${c.explanation}</p>
        </div>
        
        <div class="bg-white border border-gray-100 p-6 md:p-8 rounded-xl relative shadow-sm overflow-hidden min-h-[140px] flex items-center justify-center">
          ${c.tailwindCode}
        </div>

        <div class="space-y-2">
          <label class="text-[9px] uppercase tracking-widest font-sans font-bold text-gray-400 block">Responsive Code Representation</label>
          <pre class="bg-gray-950 text-gray-100 rounded-lg p-4 text-[11px] overflow-x-auto font-mono leading-relaxed max-h-56"><code>${escapeHtml(c.tailwindCode)}</code></pre>
        </div>
      </div>
    `).join("") || "";

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${activeSpecsData.appName} - Design Specification Sheet (Stilo)</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      font-family: 'Inter', sans-serif;
    }
    .serif-font {
      font-family: 'Playfair Display', serif;
    }
    .mono-font {
      font-family: 'JetBrains Mono', monospace;
    }
    @media print {
      body {
        background-color: white !important;
        color: black !important;
      }
      .no-print {
        display: none !important;
      }
      .page-break {
        page-break-before: always;
      }
      .border-dashed {
        border-style: solid !important;
      }
    }
  </style>
</head>
<body class="bg-[#F9F8F6] text-gray-900 pb-20">

  <!-- Print Action Bar (Hidden when printed) -->
  <div class="no-print bg-white/95 border-b border-gray-200/60 p-4 sticky top-0 z-50 backdrop-blur-md">
    <div class="max-w-5xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="font-serif italic font-black text-xl text-black">Stilo.</span>
        <span class="text-xs bg-gray-100 text-gray-500 rounded px-2 py-0.5 tracking-wide uppercase font-semibold">Printable PDF Guide</span>
      </div>
      <div class="flex items-center gap-3">
        <button onclick="window.print()" class="px-5 py-2.5 bg-black hover:bg-gray-900 text-white rounded text-xs font-bold tracking-wider uppercase transition-all shadow-sm flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
          Print / Save as PDF
        </button>
      </div>
    </div>
  </div>

  <main class="max-w-5xl mx-auto px-6 md:px-12 mt-10 md:mt-16 space-y-16">
    
    <!-- Cover/Hero Page Header -->
    <div class="border-b border-gray-200 pb-12 space-y-6">
      <div class="flex flex-wrap items-center gap-3">
        <span class="p-1 px-2.5 text-[9px] uppercase font-bold tracking-widest bg-black text-white rounded">
          DEEP EXTRACTION SYSTEM SPEC
        </span>
        <span class="text-xs text-gray-500 font-mono">${url}</span>
      </div>
      
      <h1 class="serif-font text-5xl md:text-6xl font-black italic tracking-tight text-black">${activeSpecsData.appName}</h1>
      <p class="serif-font text-xl text-gray-650 leading-relaxed max-w-3xl">${activeSpecsData.description}</p>
      
      <div class="flex items-center gap-6 mt-8 p-4 bg-white border border-gray-100 rounded-xl w-fit">
        <div>
          <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Compiler Engine</span>
          <p class="text-xs font-semibold text-gray-800">Stilo Reverse-Engineering Core</p>
        </div>
        <div class="w-[1px] bg-gray-200 h-8"></div>
        <div>
          <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Extraction Date</span>
          <p class="text-xs font-semibold text-gray-800">${new Date().toLocaleDateString(undefined, {month: 'long', day: 'numeric', year: 'numeric'})}</p>
        </div>
      </div>
    </div>

    <!-- Section 1: Colors -->
    <div class="space-y-6 page-break">
      <div class="border-b border-gray-200 pb-3">
        <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Section 1.0</span>
        <h2 class="serif-font text-3xl font-bold text-black mt-1">Color Palette & Hex Mappings</h2>
      </div>
      <p class="text-sm text-gray-600 leading-relaxed max-w-3xl">
        This section documents the primary color schemes, active visual block swatches, semantic weights, and accent variables evaluated on the target website. Use these hex codes in CSS or Figma to synchronize brand consistency.
      </p>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-4">
        ${colorsHtml}
      </div>
    </div>

    <!-- Section 2: Typography -->
    <div class="space-y-6 page-break">
      <div class="border-b border-gray-200 pb-3">
        <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Section 2.0</span>
        <h2 class="serif-font text-3xl font-bold text-black mt-1">Typography System Scales</h2>
      </div>
      <p class="text-sm text-gray-600 leading-relaxed max-w-3xl">
        Evaluating the spatial systems, proportional heading weights, paragraph tracking, and UI copy sizing guidelines below to replicate authentic balance.
      </p>

      <div class="border border-gray-200 overflow-hidden rounded-xl bg-white shadow-sm mt-4">
        <table class="w-full text-left text-sm border-collapse">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-200">
              <th class="py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-500">Element Selector</th>
              <th class="py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-500">Font family</th>
              <th class="py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-500">Size</th>
              <th class="py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-500">Weight</th>
              <th class="py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-500">Exact Brand Use</th>
            </tr>
          </thead>
          <tbody>
            ${typographyHtml}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Section 3: Visual Elements and Components -->
    <div class="space-y-8 page-break">
      <div class="border-b border-gray-200 pb-3">
        <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Section 3.0</span>
        <h2 class="serif-font text-3xl font-bold text-black mt-1">Custom Responsive Component Layouts</h2>
      </div>
      <p class="text-sm text-gray-600 leading-relaxed max-w-3xl">
        The interactive widgets, container grids, headers, and dashboard blocks reverse-engineered from the target branding layout, packed as modular layouts utilizing utility inline classes.
      </p>

      <div class="space-y-12 pt-4">
        ${componentsHtml}
      </div>
    </div>

    <!-- Footer -->
    <div class="border-t border-gray-200 pt-10 text-center text-xs text-gray-400 font-sans tracking-wide">
      <p>Stilo visual extraction sheets are generated automatically via cascading deep intelligence engines.</p>
      <p class="mt-1">© ${new Date().getFullYear()} Stilo Design System. All Rights Reserved.</p>
    </div>

  </main>

</body>
</html>`;

    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const mockLink = document.createElement("a");
    mockLink.href = blobUrl;
    mockLink.download = `${activeSpecsData.appName.toLowerCase().replace(/\s+/g, "-")}-design-brand-kit.html`;
    document.body.appendChild(mockLink);
    mockLink.click();
    document.body.removeChild(mockLink);
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#121212] selection:bg-black selection:text-white font-serif antialiased pb-24">
      
      {/* Decorative Editorial Header with Brand Tag */}
      <header className="border-b border-black/10 py-8 px-6 lg:px-12 bg-[#F4F1EA]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-baseline justify-between gap-4">
          <div className="flex flex-col md:flex-row items-baseline gap-4">
            <h1 className="text-3xl font-serif font-black tracking-tighter uppercase italic text-[#121212]">
              Stilo.
            </h1>
            <span className="font-sans text-[10px] tracking-[0.25em] uppercase opacity-55">
              Website Design MD Generator // Extracting Visual DNA
            </span>
          </div>

          <nav className="flex gap-8 font-sans text-[10px] tracking-widest uppercase text-[#121212]">
            <button
              onClick={() => setGlobalTab("explorer")}
              className={`pb-1 cursor-pointer transition-all focus:outline-none select-none ${
                globalTab === "explorer" ? "border-b border-black font-bold opacity-100" : "opacity-45 hover:opacity-100"
              }`}
            >
              Explorer
            </button>
            <button
              onClick={() => setGlobalTab("specs")}
              className={`pb-1 cursor-pointer transition-all focus:outline-none select-none ${
                globalTab === "specs" ? "border-b border-black font-bold opacity-100" : "opacity-45 hover:opacity-100"
              }`}
            >
              Specs
            </button>
            <button
              onClick={() => setGlobalTab("sandbox")}
              className={`pb-1 cursor-pointer transition-all focus:outline-none select-none ${
                globalTab === "sandbox" ? "border-b border-black font-bold opacity-100" : "opacity-45 hover:opacity-100"
              }`}
            >
              Sandbox
            </button>
            <button
              onClick={() => setGlobalTab("history")}
              className={`pb-1 cursor-pointer transition-all focus:outline-none select-none ${
                globalTab === "history" ? "border-b border-black font-bold opacity-100" : "opacity-45 hover:opacity-100"
              }`}
            >
              History
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-12 mt-12 md:mt-16 space-y-12">
        
        {globalTab === "explorer" && (
          <div className="space-y-12">
            {/* URL Entry Form and presets wrapper */}
            <div className="bg-white rounded-3xl border border-black/10 p-8 md:p-12 shadow-[10px_10px_0_rgba(0,0,0,0.03)] max-w-4xl mx-auto space-y-8">
          <div className="space-y-3">
            <h2 className="text-2xl font-serif font-bold italic tracking-tight text-[#121212]">
              Analyze Website Design System
            </h2>
            <p className="text-black/60 font-serif text-sm leading-relaxed max-w-2xl">
              Type any public link, landing page, or domain below. Our server will extract essential CSS variables, markup frameworks, and color layouts, directing Gemini models to extract beautiful design tokens.
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
            <div className="relative flex flex-col sm:flex-row gap-6 items-end">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                  placeholder="e.g. stripe.com or https://linear.app"
                  className="w-full bg-transparent border-b border-black py-4 text-xl italic font-serif focus:outline-none placeholder-black/20 text-[#121212] rounded-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="w-full sm:w-auto px-8 py-4 bg-[#121212] hover:bg-black disabled:bg-black/10 text-white disabled:text-black/30 text-xs font-sans font-bold tracking-[0.2em] uppercase transition-all cursor-pointer select-none active:scale-[97%] min-w-[200px]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Analyzing...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    <span>Extract DNA</span>
                    <ArrowRight size={14} />
                  </span>
                )}
              </button>
            </div>

            {/* Expander Configuration Trigger Links */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-1.5 text-[9px] font-sans font-bold text-black/50 tracking-widest uppercase hover:text-black transition-colors focus:outline-none cursor-pointer"
              >
                <Settings size={11} className={showSettings ? "animate-spin" : ""} />
                <span>{showSettings ? "Hide credentials & model picker" : "Use custom API key / select LLM"}</span>
              </button>
            </div>

            {/* Expandable options Panel layout */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden border-t border-black/10 pt-5 space-y-5 text-left"
                >
                  <p className="text-[#121212]/70 font-serif text-xs leading-relaxed max-w-2xl">
                    Configure your design models. Stilo supports cascading platform defaults or customized keys. If you hit rate limits, paste your private credential key. Your private tokens stay safe in local state.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Choose API Provider */}
                    <div className="space-y-1.5 col-span-1">
                      <label className="text-[9px] uppercase tracking-widest font-sans font-bold text-black/65 flex items-center gap-1.5">
                        <Settings size={10} />
                        <span>API Provider</span>
                      </label>
                      <select
                        value={apiProvider}
                        onChange={(e) => handleProviderChange(e.target.value)}
                        className="w-full bg-[#FAF9F6] border border-black/15 focus:border-black rounded px-3 py-2 text-xs font-sans tracking-wide focus:outline-none transition-colors cursor-pointer"
                      >
                        <option value="gemini">Google Gemini (Default)</option>
                        <option value="openai">OpenAI Developer Suite</option>
                        <option value="anthropic">Anthropic Claude</option>
                        <option value="openrouter">OpenRouter Gateway</option>
                        <option value="ollama">Ollama (Local Orchestrator)</option>
                        <option value="custom">Custom OpenAI Endpoint...</option>
                      </select>
                    </div>

                    {/* API Key */}
                    <div className="space-y-1.5 col-span-1">
                      <label className="text-[9px] uppercase tracking-widest font-sans font-bold text-black/65 flex items-center gap-1.5">
                        <Key size={10} />
                        <span>
                          {apiProvider === "gemini" && "Custom Gemini Key (Optional)"}
                          {apiProvider === "openai" && "OpenAI Token (sk-...)"}
                          {apiProvider === "anthropic" && "Anthropic Token (x-api-...)"}
                          {apiProvider === "openrouter" && "OpenRouter Token (sk-...)"}
                          {apiProvider === "ollama" && "Ollama Credentials (Optional)"}
                          {apiProvider === "custom" && "Authorization Key (Bearer Token)"}
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type={showKey ? "text" : "password"}
                          value={userApiKey}
                          onChange={(e) => {
                            const val = e.target.value;
                            setUserApiKey(val);
                            const trimmed = val.trim();
                            if (trimmed.startsWith("sk-or-v1-")) {
                              handleProviderChange("openrouter");
                            } else if (trimmed.startsWith("sk-ant-")) {
                              handleProviderChange("anthropic");
                            } else if (trimmed.startsWith("sk-proj-") || (trimmed.startsWith("sk-") && !trimmed.startsWith("sk-or-v1-") && !trimmed.startsWith("sk-ant-"))) {
                              handleProviderChange("openai");
                            } else if (trimmed.startsWith("AIzaSy")) {
                              handleProviderChange("gemini");
                            }
                          }}
                          placeholder={
                            apiProvider === "gemini" ? "AIzaSy... (leave blank for default)" :
                            apiProvider === "openai" ? "sk-proj-... " :
                            apiProvider === "anthropic" ? "sk-ant-... " :
                            apiProvider === "openrouter" ? "sk-or-v1-... " :
                            apiProvider === "ollama" ? "Optional credentials/auth..." :
                            "Enter authorization key..."
                          }
                          className="w-full bg-[#FAF9F6] border border-black/15 focus:border-black rounded px-3 py-2 text-xs font-mono focus:outline-none transition-colors"
                        />
                        {userApiKey && (
                          <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-sans font-bold tracking-wider text-black/40 hover:text-black uppercase focus:outline-none cursor-pointer"
                          >
                            {showKey ? "Hide" : "Show"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Choose LLM Model */}
                    <div className="space-y-1.5 col-span-1">
                      <label className="text-[9px] uppercase tracking-widest font-sans font-bold text-black/65 flex items-center gap-1.5">
                        <Cpu size={10} />
                        <span>Model Selector</span>
                      </label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full bg-[#FAF9F6] border border-black/15 focus:border-black rounded px-3 py-2 text-xs font-sans tracking-wide focus:outline-none transition-colors cursor-pointer"
                      >
                        {apiProvider === "gemini" && (
                          <>
                            <option value="default">Default Cascade Routing (Recommended)</option>
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                            <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Expertise)</option>
                            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                            <option value="gemini-2.0-pro-exp-02-05">Gemini 2.0 Pro Experimental</option>
                            <option value="models/gemini-1.5-pro">Gemini 1.5 Pro</option>
                            <option value="models/gemini-1.5-flash">Gemini 1.5 Flash</option>
                          </>
                        )}

                        {apiProvider === "openai" && (
                          <>
                            <option value="default">Default (gpt-4o-mini)</option>
                            <option value="gpt-4o">gpt-4o (High Intelligence)</option>
                            <option value="gpt-4o-mini">gpt-4o-mini (Cost-Efficient)</option>
                            <option value="o1-mini">o1-mini (Reasoning)</option>
                            <option value="o3-mini">o3-mini (Advanced Speed)</option>
                          </>
                        )}

                        {apiProvider === "anthropic" && (
                          <>
                            <option value="default">Default (Claude 3.5 Sonnet)</option>
                            <option value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet</option>
                            <option value="claude-3-5-haiku-latest">Claude 3.5 Haiku</option>
                            <option value="claude-3-opus-latest">Claude 3 Opus</option>
                          </>
                        )}

                        {apiProvider === "openrouter" && (
                          <>
                            <option value="default">Default (Llama 3.3 70B)</option>
                            <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B Instruct</option>
                            <option value="deepseek/deepseek-chat">DeepSeek V3 (High Density)</option>
                            <option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option>
                            <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                          </>
                        )}

                        {apiProvider === "custom" && (
                          <>
                            <option value="default">Default Endpoint Model</option>
                          </>
                        )}

                        {apiProvider === "ollama" && (
                          <>
                            <option value="default">Default (llama3)</option>
                            <option value="llama3">Llama 3</option>
                            <option value="llama3.2">Llama 3.2</option>
                            <option value="llama3.1">Llama 3.1</option>
                            <option value="deepseek-r1">DeepSeek R1</option>
                            <option value="qwen2.5">Qwen 2.5</option>
                            <option value="mistral">Mistral</option>
                            <option value="gemma2">Gemma 2</option>
                            <option value="phi3">Phi 3</option>
                          </>
                        )}

                        <option value="custom">Other Custom Model Schema...</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-5">
                    {/* Custom/Ollama API Base URL */}
                    {(apiProvider === "custom" || apiProvider === "ollama") && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1.5 flex-1"
                      >
                        <label className="text-[9px] uppercase tracking-widest font-sans font-bold text-black/65">
                          {apiProvider === "ollama" ? "Ollama Connection Address" : "Custom Endpoint Base URL (OpenAI-compatible)"}
                        </label>
                        <input
                          type="text"
                          value={apiBaseUrl}
                          onChange={(e) => setApiBaseUrl(e.target.value)}
                          placeholder={apiProvider === "ollama" ? "e.g. http://localhost:11434" : "e.g. https://api.together.xyz/v1 or http://localhost:11434/v1"}
                          className="w-full bg-[#FAF9F6] border border-black/15 focus:border-black rounded px-3 py-2 text-xs font-mono focus:outline-none transition-colors"
                        />
                      </motion.div>
                    )}

                    {/* Other Custom model scheme trigger */}
                    {selectedModel === "custom" && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1.5 flex-1"
                      >
                        <label className="text-[9px] uppercase tracking-widest font-sans font-bold text-black/65">
                          Enter Custom Model Parameter String
                        </label>
                        <input
                          type="text"
                          value={customModelName}
                          onChange={(e) => setCustomModelName(e.target.value)}
                          placeholder={
                            apiProvider === "gemini" ? "models/gemini-1.5-pro-002" :
                            apiProvider === "openai" ? "gpt-4-turbo" :
                            apiProvider === "anthropic" ? "claude-3-haiku-20240307" :
                            apiProvider === "ollama" ? "llama3:8b" :
                            "e.g. meta-llama/llama-3-8b-instruct"
                          }
                          className="w-full bg-[#FAF9F6] border border-black/15 focus:border-black rounded px-3 py-2 text-xs font-mono focus:outline-none transition-colors"
                        />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Quick preset links row */}
          <div className="space-y-4 pt-6 border-t border-black/10">
            <div className="flex items-center gap-1.5 text-[9px] font-sans font-bold text-black/50 tracking-widest uppercase">
              <span>Select from notable visual presets</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetClick(preset.url)}
                  disabled={loading}
                  className="group py-3 px-4 bg-[#F4F1EA] hover:bg-black border border-black/15 hover:border-black rounded-lg transition-all text-left flex flex-col justify-between cursor-pointer"
                >
                  <span className="font-serif font-bold italic text-sm text-[#121212] group-hover:text-white transition-colors">
                    {preset.name}
                  </span>
                  <span className="text-[10px] font-sans tracking-wide text-black/45 truncate mt-1 group-hover:text-white/60 transition-colors uppercase">
                    {preset.tag}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic status loader, shown when fetching and generating */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-xl mx-auto bg-white border border-black/10 rounded-3xl p-8 md:p-12 shadow-sm text-center space-y-6"
            >
              <div className="h-10 w-10 mx-auto flex items-center justify-center border border-black rounded-full animate-spin">
                <RefreshCw size={14} className="text-black" />
              </div>

              <div className="space-y-2.5">
                <h3 className="font-serif font-bold italic text-[#121212] text-lg">Reverse Engineering DNA</h3>
                <p className="text-[10px] font-sans font-bold text-black/40 uppercase tracking-widest">
                  Stage {stageIndex + 1} of {LOADING_STAGES.length}
                </p>
                <p className="text-xs text-[#121212]/80 font-serif italic max-w-sm mx-auto min-h-[32px] leading-relaxed">
                  "{LOADING_STAGES[stageIndex]}"
                </p>
              </div>

              <div className="w-full bg-[#F4F1EA] h-[2px] overflow-hidden">
                <div 
                  className="bg-black h-full transition-all duration-500 ease-out" 
                  style={{ width: `${((stageIndex + 1) / LOADING_STAGES.length) * 100}%` }}
                />
              </div>
            </motion.div>
          )}

          {/* Supportive error handling component */}
          {error && !loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto bg-white border border-red-200/85 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left shadow-sm"
            >
              <div className="p-3 bg-red-50 text-red-700 rounded-lg">
                <AlertCircle size={24} />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-serif font-bold italic text-red-950 text-md">Failed to generate design system</h4>
                <p className="text-xs text-red-850 leading-relaxed font-serif text-pretty">
                  {error}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results layout container */}
        <AnimatePresence>
          {data && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-10"
            >
              {/* Brand Summary Banner */}
              <div className="bg-white rounded-3xl border border-black/10 p-8 md:p-12 shadow-sm flex flex-col md:flex-row md:items-baseline justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 text-[80px] text-black/[0.02] font-serif leading-none select-none italic font-black">
                  Stilo
                </div>

                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="p-1 px-2.5 text-[8px] uppercase font-sans font-bold tracking-widest bg-black text-white rounded">
                      Extracted DNA
                    </span>
                    {data.isHeuristicFallback && (
                      <span className="p-1 px-2.5 text-[8px] uppercase font-sans font-bold tracking-widest bg-amber-700 text-white rounded animate-pulse">
                        Heuristic Fallback Active
                      </span>
                    )}
                    <span className="text-[10px] text-black/50 font-mono select-all font-semibold">
                      {url}
                    </span>
                  </div>
                  <h3 className="text-3xl font-serif font-black italic tracking-tight text-[#121212]">
                    {data.appName}
                  </h3>
                  <p className="text-[#121212]/80 text-sm leading-relaxed max-w-2xl font-serif text-pretty">
                    {data.description}
                  </p>
                  {data.isHeuristicFallback && (
                    <div className="bg-amber-50/70 border border-amber-200/50 p-4 md:p-5 rounded-2xl text-xs font-serif leading-relaxed mt-3 text-amber-900 max-w-2xl space-y-1">
                      <p>
                        <strong>API Notice:</strong> Stilo automatically activated our <strong>Heuristic Schema Engine</strong> because the public Gemini API key quota is currently busy. Your design specification sheet, palette hex rules, and responsive custom Tailwind components have been reverse-engineered locally.
                      </p>
                      <p className="opacity-80">
                        To activate deep-learning live queries, you can optionally provide your personal Gemini key in <strong>Settings &gt; Secrets</strong>.
                      </p>
                    </div>
                  )}
                </div>

                {/* Primary specs download trigger */}
                <div className="flex items-center gap-3 self-end md:self-baseline">
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="px-6 py-3 bg-[#121212] hover:bg-black text-white text-xs font-sans font-bold tracking-widest uppercase cursor-pointer select-none transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Download size={13} />
                    <span>Export Specs</span>
                  </button>
                  <button
                    onClick={() => { setData(null); setUrl(""); }}
                    className="px-4 py-3 bg-[#F4F1EA] hover:bg-[#EBE8E0] border border-black/10 text-black text-xs font-sans font-bold tracking-widest uppercase cursor-pointer transition-all active:scale-95"
                    title="Reset workspace"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Main navigation tabs */}
              <div className="space-y-8">
                <div className="flex overflow-x-auto pb-1 border-b border-black/10 gap-4 scrollbar-none">
                  <button
                    onClick={() => setActiveTab("markdown")}
                    className={`py-3 px-5 text-[10px] font-sans tracking-widest font-bold uppercase border-b-2 transition-all cursor-pointer select-none shrink-0 ${
                      activeTab === "markdown"
                        ? "border-black text-black"
                        : "border-transparent text-black/45 hover:text-black hover:border-black/20"
                    }`}
                  >
                    Design Spec Markup
                  </button>

                  <button
                    onClick={() => setActiveTab("palette")}
                    className={`py-3 px-5 text-[10px] font-sans tracking-widest font-bold uppercase border-b-2 transition-all cursor-pointer select-none shrink-0 ${
                      activeTab === "palette"
                        ? "border-black text-black"
                        : "border-transparent text-black/45 hover:text-black hover:border-black/20"
                    }`}
                  >
                    Visual Palette
                  </button>

                  <button
                    onClick={() => setActiveTab("typography")}
                    className={`py-3 px-5 text-[10px] font-sans tracking-widest font-bold uppercase border-b-2 transition-all cursor-pointer select-none shrink-0 ${
                      activeTab === "typography"
                        ? "border-black text-black"
                        : "border-transparent text-black/45 hover:text-black hover:border-black/20"
                    }`}
                  >
                    Typography scale
                  </button>

                  <button
                    onClick={() => setActiveTab("components")}
                    className={`py-3 px-5 text-[10px] font-sans tracking-widest font-bold uppercase border-b-2 transition-all cursor-pointer select-none shrink-0 ${
                      activeTab === "components"
                        ? "border-black text-black"
                        : "border-transparent text-black/45 hover:text-black hover:border-black/20"
                    }`}
                  >
                    Tailwind Components
                  </button>

                  <button
                    onClick={() => setActiveTab("brand")}
                    className={`py-3 px-5 text-[10px] font-sans tracking-widest font-bold uppercase border-b-2 transition-all cursor-pointer select-none shrink-0 flex items-center gap-1.5 ${
                      activeTab === "brand"
                        ? "border-[#635BFF] text-[#635BFF]"
                        : "border-transparent text-black/45 hover:text-black hover:border-black/20"
                    }`}
                  >
                    <span>Context.dev Brand</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  </button>
                </div>

                {/* Tab content screens */}
                <div className="pt-2">
                  {activeTab === "markdown" && (
                    <MarkdownRenderer content={buildFullMarkdown(data)} />
                  )}

                  {activeTab === "palette" && (
                    <PaletteVisualizer colors={data.colors} />
                  )}

                  {activeTab === "typography" && (
                    <TypographySpec typography={data.typography} />
                  )}

                  {activeTab === "components" && (
                    <TailwindComponents 
                      components={data.components} 
                      onUpdateComponent={(index, updatedComp) => {
                        const updatedList = [...data.components];
                        updatedList[index] = updatedComp;
                        setData({ ...data, components: updatedList });
                      }}
                      apiProvider={apiProvider}
                      userApiKey={userApiKey}
                      selectedModel={resolvedModel}
                      apiBaseUrl={apiBaseUrl}
                    />
                  )}

                  {activeTab === "brand" && (
                    <ContextDevBrandTab brandData={data.contextDevBrandData} />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feature Highlights bottom section shown when no content is analyzed */}
        {!data && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-6">
            <div className="bg-white border border-black/10 rounded-2xl p-6 space-y-3 shadow-sm hover:shadow-md transition-all">
              <div className="text-white bg-black p-2.5 rounded w-fit">
                <Palette size={16} />
              </div>
              <h4 className="font-serif font-bold italic text-lg text-[#121212]">Visual Color Extraction</h4>
              <p className="text-xs text-black/65 font-serif leading-relaxed">
                Reverse-engineers exact brand hexadecimal numbers, compiling primary gradients, background blocks, and accent shades into clean, copyable Tailwind variables.
              </p>
            </div>

            <div className="bg-white border border-black/10 rounded-2xl p-6 space-y-3 shadow-sm hover:shadow-md transition-all">
              <div className="text-white bg-black p-2.5 rounded w-fit">
                <Type size={16} />
              </div>
              <h4 className="font-serif font-bold italic text-lg text-[#121212]">Typography Playground</h4>
              <p className="text-xs text-black/65 font-serif leading-relaxed">
                Extracts typeface names, weights, and configurations, loading them inside an elegant live playground canvas to test custom sample text and scales.
              </p>
            </div>

            <div className="bg-white border border-black/10 rounded-2xl p-6 space-y-3 shadow-sm hover:shadow-md transition-all">
              <div className="text-white bg-black p-2.5 rounded w-fit">
                <Code size={16} />
              </div>
              <h4 className="font-serif font-bold italic text-lg text-[#121212]">Tailwind Live Sandbox</h4>
              <p className="text-xs text-black/65 font-serif leading-relaxed">
                Translates raw elements into fully structured, editable web component sections, rendering them live on custom sandboxes alongside source codes.
              </p>
            </div>
          </div>
        )}
          </div>
        )}

        {globalTab === "specs" && (() => {
          const activeSpecs = data || DEFAULT_STITCH_DATA;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-10"
            >
              {/* Brand Summary Banner */}
              <div className="bg-white rounded-3xl border border-black/10 p-8 md:p-12 shadow-sm flex flex-col md:flex-row md:items-baseline justify-between gap-6 relative overflow-hidden text-left">
                <div className="absolute top-0 right-0 p-8 text-[80px] text-black/[0.02] font-serif leading-none select-none italic font-black">
                  Specs
                </div>

                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="p-1 px-2.5 text-[8px] uppercase font-sans font-bold tracking-widest bg-black text-white rounded">
                      {data ? "Extracted DNA Specs" : "Default Stitch Specs"}
                    </span>
                    {activeSpecs.isHeuristicFallback && (
                      <span className="p-1 px-2.5 text-[8px] uppercase font-sans font-bold tracking-widest bg-amber-700 text-white rounded">
                        Heuristic Schema Active
                      </span>
                    )}
                    {data && (
                      <span className="text-[10px] text-black/50 font-mono select-all font-semibold">
                        {url}
                      </span>
                    )}
                  </div>
                  <h3 className="text-3xl font-serif font-black italic tracking-tight text-[#121212]">
                    {activeSpecs.appName} System Specifications
                  </h3>
                  <p className="text-[#121212]/80 text-sm leading-relaxed max-w-2xl font-serif text-pretty">
                    {activeSpecs.description}
                  </p>
                  {!data && (
                    <div className="bg-[#FAF9F6]/90 border border-[#121212]/10 p-4 rounded-2xl text-xs text-neutral-800 font-serif leading-relaxed mt-2 max-w-xl">
                      💡 <strong>Default Stitch Framework Loaded:</strong> You are currently viewing Google's native developer specs. Type custom URLs in the <strong>Explorer</strong> tab to extract any public design system live!
                    </div>
                  )}
                </div>

                {/* Primary specs download trigger */}
                <div className="flex items-center gap-3 self-end md:self-baseline">
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="px-6 py-3 bg-[#121212] hover:bg-black text-white text-xs font-sans font-bold tracking-widest uppercase cursor-pointer select-none transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Download size={13} />
                    <span>Export Specs</span>
                  </button>
                </div>
              </div>

              {/* Render direct tabs on the specs page! */}
              <div className="space-y-8">
                <div className="flex overflow-x-auto pb-1 border-b border-black/10 gap-4 scrollbar-none">
                  {[
                    { key: "markdown", label: "Design Spec Markup" },
                    { key: "palette", label: "Visual Palette" },
                    { key: "typography", label: "Typography scale" },
                    { key: "components", label: "Tailwind Components" },
                    { key: "brand", label: "Context.dev Brand ✨" }
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key as any)}
                      className={`py-3 px-5 text-[10px] font-sans tracking-widest font-bold uppercase border-b-2 transition-all cursor-pointer select-none shrink-0 ${
                        activeTab === t.key
                          ? "border-[#635BFF] text-[#635BFF]"
                          : "border-transparent text-black/45 hover:text-black hover:border-black/20"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Tab content renderer inside Specs view */}
                <div className="pt-2 text-left">
                  {activeTab === "markdown" && (
                    <MarkdownRenderer content={buildFullMarkdown(activeSpecs)} />
                  )}

                  {activeTab === "palette" && (
                    <PaletteVisualizer colors={activeSpecs.colors} />
                  )}

                  {activeTab === "typography" && (
                    <TypographySpec typography={activeSpecs.typography} />
                  )}

                  {activeTab === "components" && (
                    <TailwindComponents 
                      components={activeSpecs.components} 
                      onUpdateComponent={(index, updatedComp) => {
                        if (data) {
                          const updatedList = [...data.components];
                          updatedList[index] = updatedComp;
                          setData({ ...data, components: updatedList });
                        } else {
                          const updatedList = [...DEFAULT_STITCH_DATA.components];
                          updatedList[index] = updatedComp;
                          DEFAULT_STITCH_DATA.components = updatedList;
                          setData(JSON.parse(JSON.stringify(DEFAULT_STITCH_DATA)));
                        }
                      }}
                      apiProvider={apiProvider}
                      userApiKey={userApiKey}
                      selectedModel={resolvedModel}
                      apiBaseUrl={apiBaseUrl}
                    />
                  )}

                  {activeTab === "brand" && (
                    <ContextDevBrandTab brandData={activeSpecs.contextDevBrandData} />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })()}

        {globalTab === "sandbox" && (
          <SandboxWorkspace
            data={data || DEFAULT_STITCH_DATA}
            onUpdateComponent={(index, updatedComp) => {
              if (data) {
                const updatedList = [...data.components];
                updatedList[index] = updatedComp;
                setData({ ...data, components: updatedList });
              } else {
                const updatedList = [...DEFAULT_STITCH_DATA.components];
                updatedList[index] = updatedComp;
                DEFAULT_STITCH_DATA.components = updatedList;
                setData(JSON.parse(JSON.stringify(DEFAULT_STITCH_DATA)));
              }
            }}
            apiProvider={apiProvider}
            userApiKey={userApiKey}
            selectedModel={resolvedModel}
            apiBaseUrl={apiBaseUrl}
          />
        )}

        {globalTab === "history" && (
          <HistoryTab
            historyList={historyList}
            onSelectEntry={(entry) => {
              setData(entry.data);
              setUrl(entry.url);
              setGlobalTab("specs");
            }}
            onDeleteEntry={(id) => {
              setHistoryList(prev => prev.filter(item => item.id !== id));
            }}
            onClearHistory={() => {
              setHistoryList([]);
            }}
            onLoadPreset={(presetUrl) => {
              setGlobalTab("explorer");
              handlePresetClick(presetUrl);
            }}
          />
        )}
      </main>

      {/* Export Options Modal for Markdown, JSON, and PDF */}
      <AnimatePresence>
        {showExportModal && (globalTab !== "explorer" || data) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white rounded-3xl border border-black/15 shadow-2xl max-w-2xl w-full p-8 relative overflow-hidden space-y-6 text-left"
            >
              {/* Decorative background logo */}
              <div className="absolute top-0 right-0 p-8 text-[120px] text-black/[0.01] font-serif leading-none select-none italic font-black">
                Stilo
              </div>

              <button
                onClick={() => setShowExportModal(false)}
                className="absolute top-6 right-6 p-2 bg-[#F4F1EA] hover:bg-[#EBE8E0] rounded-full text-black transition-colors cursor-pointer select-none"
                aria-label="Close export dialog"
              >
                <X size={14} />
              </button>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-sans font-bold tracking-[0.2em] text-black/50 block">Export Portal</span>
                <h3 className="text-2xl font-serif font-bold italic tracking-tight text-[#121212]">
                  Deliver System Specs
                </h3>
                <p className="text-xs text-black/60 font-serif leading-relaxed max-w-md">
                  Choose your desired format below to save {(data || DEFAULT_STITCH_DATA).appName}'s reverse-engineered visual specifications. All actions generate immediate download files locally.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Markdown Card */}
                <div className="border border-black/10 rounded-2xl p-5 bg-[#FAF9F6] space-y-4 flex flex-col justify-between hover:border-black/25 transition-all">
                  <div className="space-y-2">
                    <div className="p-2.5 bg-black text-white w-fit rounded-lg">
                      <FileText size={16} />
                    </div>
                    <h4 className="text-sm font-serif font-black italic text-[#121212]">Markdown (.md)</h4>
                    <p className="text-[11px] text-black/65 font-serif leading-relaxed">
                      Best for repositories, documentation tables, and dev wikis. Includes comprehensive inline styling rules.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      handleDownloadMd();
                      setShowExportModal(false);
                    }}
                    className="w-full py-2 bg-[#121212] hover:bg-black text-white text-[10px] font-sans font-bold tracking-wider uppercase cursor-pointer select-none transition-all active:scale-95"
                  >
                    Save Markdown
                  </button>
                </div>

                {/* JSON Card */}
                <div className="border border-black/10 rounded-2xl p-5 bg-[#FAF9F6] space-y-4 flex flex-col justify-between hover:border-black/25 transition-all">
                  <div className="space-y-2">
                    <div className="p-2.5 bg-black text-white w-fit rounded-lg">
                      <FileJson size={14} />
                    </div>
                    <h4 className="text-sm font-serif font-black italic text-[#121212]">Programmatic Spec</h4>
                    <p className="text-[11px] text-black/65 font-serif leading-relaxed">
                      Structured arrays containing exact hex swatches, size parameters, weight descriptions, and components.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      handleDownloadJson();
                      setShowExportModal(false);
                    }}
                    className="w-full py-2 bg-[#121212] hover:bg-black text-white text-[10px] font-sans font-bold tracking-wider uppercase cursor-pointer select-none transition-all active:scale-95"
                  >
                    Save JSON Spec
                  </button>
                </div>

                {/* PDF Card */}
                <div className="border border-black/10 rounded-2xl p-5 bg-[#FAF9F6] space-y-4 flex flex-col justify-between hover:border-black/25 transition-all">
                  <div className="space-y-2">
                    <div className="p-2.5 bg-black text-white w-fit rounded-lg">
                      <FileCode size={16} />
                    </div>
                    <h4 className="text-sm font-serif font-black italic text-[#121212]">Brand Kit (.html)</h4>
                    <p className="text-[11px] text-black/65 font-serif leading-relaxed">
                      Standalone HTML manual embedding color circles, font cards, code containers, optimized for local opening and print to PDF.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      handleDownloadHtmlPdf();
                      setShowExportModal(false);
                    }}
                    className="w-full py-2 bg-[#121212] hover:bg-black text-white text-[10px] font-sans font-bold tracking-wider uppercase cursor-pointer select-none transition-all active:scale-95"
                  >
                    Save Brand Kit
                  </button>
                </div>
              </div>

              <div className="border-t border-black/10 pt-4 flex items-center justify-between text-[10px] text-black/40 font-serif">
                <span>Engine: Stilo Visual DNA</span>
                <span>Form: Programmatic Deliverables</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
