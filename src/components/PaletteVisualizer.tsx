import { useState } from "react";
import { ColorSwatch } from "../types";
import { Copy, Check, Info, Search, ShieldCheck, Eye, EyeOff } from "lucide-react";

interface PaletteVisualizerProps {
  colors: ColorSwatch[];
}

// Math formulas for authentic WCAG 2 relative luminance and contrast ratios
function getLuminance(hex: string): number {
  try {
    const cleanHex = hex.replace("#", "").trim();
    if (cleanHex.length !== 6 && cleanHex.length !== 3) return 0.5;
    
    let rStr = cleanHex.length === 6 ? cleanHex.substring(0, 2) : cleanHex[0] + cleanHex[0];
    let gStr = cleanHex.length === 6 ? cleanHex.substring(2, 4) : cleanHex[1] + cleanHex[1];
    let bStr = cleanHex.length === 6 ? cleanHex.substring(4, 6) : cleanHex[2] + cleanHex[2];

    const r = parseInt(rStr, 16) / 255;
    const g = parseInt(gStr, 16) / 255;
    const b = parseInt(bStr, 16) / 255;

    const a = [r, g, b].map(v => {
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  } catch (err) {
    return 0.5;
  }
}

function getContrast(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}

// Daltonization algorithms for simulating deuteranopia, protanopia, tritanopia, and achromatopsia
function simulateColorBlindness(hex: string, mode: string): string {
  if (mode === "normal") return hex;
  try {
    const cleanHex = hex.replace("#", "").trim();
    if (cleanHex.length !== 6 && cleanHex.length !== 3) return hex;
    
    let rStr = cleanHex.length === 6 ? cleanHex.substring(0, 2) : cleanHex[0] + cleanHex[0];
    let gStr = cleanHex.length === 6 ? cleanHex.substring(2, 4) : cleanHex[1] + cleanHex[1];
    let bStr = cleanHex.length === 6 ? cleanHex.substring(4, 6) : cleanHex[2] + cleanHex[2];

    let r = parseInt(rStr, 16);
    let g = parseInt(gStr, 16);
    let b = parseInt(bStr, 16);

    let nr = r, ng = g, nb = b;

    if (mode === "deuteranopia") {
      nr = Math.round(r * 0.625 + g * 0.375 + b * 0);
      ng = Math.round(r * 0.7 + g * 0.3 + b * 0);
      nb = Math.round(r * 0 + g * 0.3 + b * 0.7);
    } else if (mode === "protanopia") {
      nr = Math.round(r * 0.567 + g * 0.433 + b * 0);
      ng = Math.round(r * 0.558 + g * 0.442 + b * 0);
      nb = Math.round(r * 0 + g * 0.242 + b * 0.758);
    } else if (mode === "tritanopia") {
      nr = Math.round(r * 0.95 + g * 0.05 + b * 0);
      ng = Math.round(r * 0 + g * 0.433 + b * 0.567);
      nb = Math.round(r * 0 + g * 0.475 + b * 0.525);
    } else if (mode === "achromatopsia") {
      const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
      nr = gray;
      ng = gray;
      nb = gray;
    }

    const clamp = (v: number) => Math.max(0, Math.min(255, v));
    const toHexVal = (x: number) => {
      const val = clamp(x).toString(16);
      return val.length === 1 ? "0" + val : val;
    };
    return "#" + toHexVal(nr) + toHexVal(ng) + toHexVal(nb);
  } catch (err) {
    return hex;
  }
}

export function PaletteVisualizer({ colors }: PaletteVisualizerProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isCopyingConfig, setIsCopyingConfig] = useState(false);
  const [isCopyingFigma, setIsCopyingFigma] = useState(false);
  
  // States for search and simulators
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [colorBlindMode, setColorBlindMode] = useState("normal");
  const [auditBaseline, setAuditBaseline] = useState<"light" | "dark">("light");

  const copyToClipboard = async (hex: string, index: number) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch (err) {
      console.error("Failed to copy color code", err);
    }
  };

  const getTailwindThemeCode = () => {
    const config: Record<string, string> = {};
    colors.forEach(c => {
      const sanitizedName = c.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      config[sanitizedName] = c.hex;
    });
    return JSON.stringify(config, null, 2);
  };

  const copyTailwindTheme = async () => {
    try {
      await navigator.clipboard.writeText(getTailwindThemeCode());
      setIsCopyingConfig(true);
      setTimeout(() => setIsCopyingConfig(false), 2000);
    } catch (err) {
      console.error("Failed to copy tailwind config", err);
    }
  };

  // Feature 3: Figma Friendly Design Tokens Structuring
  const getFigmaTokensCode = () => {
    const tokens: Record<string, any> = {
      color: {}
    };
    colors.forEach(c => {
      const sanitizedName = c.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      tokens.color[sanitizedName] = {
        value: c.hex,
        type: "color",
        description: `${c.category || "Design"} accent brand token evaluated by Stilo.`
      };
    });
    return JSON.stringify(tokens, null, 2);
  };

  const copyFigmaTokens = async () => {
    try {
      await navigator.clipboard.writeText(getFigmaTokensCode());
      setIsCopyingFigma(true);
      setTimeout(() => setIsCopyingFigma(false), 2000);
    } catch (err) {
      console.error("Failed to copy figma tokens", err);
    }
  };

  // Category list evaluation
  const categories = ["all", ...Array.from(new Set(colors.map(c => c.category?.toLowerCase() || "general")))];

  // Filter swatches based on query and category selector
  const filteredColors = colors.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.hex.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.usage.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || 
                            (c.category?.toLowerCase() || "general") === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8">
      
      {/* Search and Filters Hub */}
      <div className="bg-white border border-black/10 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search design colors by name, hex, or application rule..."
              className="w-full bg-[#FAF9F6] border border-black/10 focus:border-black rounded-xl pl-9 pr-4 py-2.5 text-xs font-serif italic focus:outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Color Blind mode dropdown validator */}
            <div className="flex items-center gap-1.5 bg-[#FAF9F6] border border-black/10 rounded-xl px-3 py-1.5">
              <Eye size={12} className="text-black/50" />
              <select
                value={colorBlindMode}
                onChange={(e) => setColorBlindMode(e.target.value)}
                className="bg-transparent text-[11px] font-sans font-semibold uppercase tracking-wider text-black focus:outline-none cursor-pointer"
                title="Color Vision Deficiency Simulator"
              >
                <option value="normal">Normal Vision</option>
                <option value="deuteranopia">Deuteranopia (Pro Range)</option>
                <option value="protanopia">Protanopia (Red Range)</option>
                <option value="tritanopia">Tritanopia (Blue Range)</option>
                <option value="achromatopsia">Achromatopsia (Grayscale)</option>
              </select>
            </div>

            {/* Accessibility Contrast baseline toggle */}
            <div className="flex items-center gap-1 bg-[#FAF9F6] border border-black/10 rounded-xl p-0.5 text-xs">
              <button
                onClick={() => setAuditBaseline("light")}
                className={`px-3 py-1 text-[10px] font-sans uppercase font-bold tracking-wider rounded ${
                  auditBaseline === "light" ? "bg-black text-white" : "text-black/60 hover:text-black"
                }`}
              >
                WCAG vs Light
              </button>
              <button
                onClick={() => setAuditBaseline("dark")}
                className={`px-3 py-1 text-[10px] font-sans uppercase font-bold tracking-wider rounded ${
                  auditBaseline === "dark" ? "bg-black text-white" : "text-black/60 hover:text-black"
                }`}
              >
                WCAG vs Dark
              </button>
            </div>
          </div>
        </div>

        {/* Tab Filters for Categories */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black/5">
          <span className="text-[9px] font-sans tracking-widest text-black/40 uppercase font-bold mr-2">Filters:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-[10px] font-sans font-bold uppercase tracking-wider border rounded-lg transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-black text-white border-black"
                  : "bg-transparent text-black/55 border-black/10 hover:border-black/30 hover:text-black"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Visual swatches Grid layout with real calculations */}
      {filteredColors.length === 0 ? (
        <div className="p-12 text-center bg-[#FAF9F6] rounded-2xl border border-black/10">
          <p className="text-xs font-serif italic text-black/50">No colors matched your filter parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
          {filteredColors.map((color, idx) => {
            const isCopied = copiedIndex === idx;
            // Simulated Color based on color blindness selection
            const simulatedHex = simulateColorBlindness(color.hex, colorBlindMode);
            const relativeTypeHex = auditBaseline === "light" ? "#FFFFFF" : "#121212";
            const contrastRatio = getContrast(color.hex, relativeTypeHex);

            // WCAG standards evaluator
            let rating = "Fail";
            let compliantStyle = "text-red-700 bg-red-50 border-red-200/50";
            if (contrastRatio >= 7) {
              rating = "AAA (Excellent)";
              compliantStyle = "text-emerald-700 bg-emerald-50 border-emerald-200/50";
            } else if (contrastRatio >= 4.5) {
              rating = "AA (Pass)";
              compliantStyle = "text-indigo-700 bg-indigo-50 border-indigo-200/50";
            } else if (contrastRatio >= 3) {
              rating = "AA Large Only";
              compliantStyle = "text-amber-700 bg-amber-50 border-amber-200/50";
            }

            return (
              <div
                key={idx}
                className="group relative bg-[#F4F1EA] border border-black/10 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                {/* Swatch color header block */}
                <div
                  className="h-32 w-full relative cursor-pointer border-b border-black/10 transition-colors duration-200"
                  style={{ backgroundColor: simulatedHex }}
                  onClick={() => copyToClipboard(color.hex, idx)}
                  title="Click to copy hex code"
                >
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white text-[#121212] border border-black px-4 py-2 text-[10px] font-sans font-bold tracking-widest uppercase shadow-sm">
                      {isCopied ? "Copied!" : `Copy ${color.hex}`}
                    </span>
                  </div>
                  
                  {colorBlindMode !== "normal" && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/75 backdrop-blur-sm rounded text-[9px] font-mono text-white tracking-wider flex items-center gap-1">
                      <Eye size={9} />
                      Simulated
                    </div>
                  )}
                </div>

                {/* Informative description Area with dynamic WCAG contrast metrics (Feature 1) */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-block px-2.5 py-0.5 text-[9px] font-sans font-bold uppercase tracking-[0.15em] bg-white border border-black/10 text-black/60 rounded">
                        {color.category || "General"}
                      </span>
                      <span className="font-mono text-xs text-black/50 select-all font-semibold">
                        {color.hex}
                      </span>
                    </div>
                    
                    <div>
                      <h4 className="font-serif font-bold text-lg text-[#121212]">
                        {color.name}
                      </h4>
                      <p className="text-xs text-black/65 font-serif leading-relaxed mt-1 text-pretty">
                        {color.usage}
                      </p>
                    </div>

                    {/* True WCAG contrast calculator meter pill */}
                    <div className={`p-2.5 rounded-lg border flex items-center justify-between text-[10px] font-mono ${compliantStyle}`}>
                      <div className="flex items-center gap-1">
                        <ShieldCheck size={11} />
                        <span>vs {auditBaseline.toUpperCase()} (Luminance)</span>
                      </div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{contrastRatio}:1</span>
                        <span>•</span>
                        <span className="uppercase">{rating}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-black/5 flex items-center justify-between">
                    <span className="text-[9px] text-black/40 font-sans tracking-wide inline-flex items-center gap-1 uppercase">
                      <Info size={11} />
                      Interactive Swatch
                    </span>
                    <button
                      onClick={() => copyToClipboard(color.hex, idx)}
                      className="p-1 px-3 text-[10px] font-sans tracking-widest font-bold uppercase border border-black text-[#121212] bg-white hover:bg-black hover:text-white transition-all cursor-pointer"
                    >
                      {isCopied ? "Success" : color.hex}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Exporters panel - Config/Figma splits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        
        {/* Tailwind Theme Config Array */}
        <div className="bg-white border border-black/10 p-6 shadow-sm rounded-2xl space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-black/10 pb-4">
            <div className="flex items-baseline gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-black"></span>
              <span className="font-sans font-bold text-[#121212] tracking-wider uppercase text-[10px]">
                Tailwind.config.ext
              </span>
            </div>
            <button
              onClick={copyTailwindTheme}
              className="font-sans text-[10px] uppercase tracking-widest border border-black px-4 py-1.5 bg-transparent hover:bg-black hover:text-white transition-all cursor-pointer"
            >
              {isCopyingConfig ? "Copied" : "Copy Theme Ext"}
            </button>
          </div>
          
          <p className="text-black/70 text-xs font-serif leading-relaxed">
            Stitch guidelines require proper theme scaling. Include these color swatches directly under your code file context:
          </p>

          <div className="bg-[#FAF9F6] p-4 rounded-xl border border-black/5 font-mono text-[11px] text-[#121212]/95 overflow-hidden">
            <pre className="overflow-x-auto leading-relaxed max-h-48">
              {getTailwindThemeCode()}
            </pre>
          </div>
        </div>

        {/* Feature 3: Figma Tokens Importer */}
        <div className="bg-white border border-black/10 p-6 shadow-sm rounded-2xl space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-black/10 pb-4">
            <div className="flex items-baseline gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
              <span className="font-sans font-bold text-[#121212] tracking-wider uppercase text-[10px]">
                Figma Design Tokens JSON
              </span>
            </div>
            <button
              onClick={copyFigmaTokens}
              className="font-sans text-[10px] uppercase tracking-widest border border-indigo-600 px-4 py-1.5 bg-transparent text-indigo-700 hover:bg-indigo-650 hover:text-white hover:border-indigo-650 transition-all cursor-pointer font-bold"
            >
              {isCopyingFigma ? "Copied Tokens" : "Copy Figma Tokens"}
            </button>
          </div>
          
          <p className="text-black/70 text-xs font-serif leading-relaxed">
            Allows instant design syncs. Copy this token JSON payload directly in your <strong>Figma Token Studio</strong> plugin workspace ruleset:
          </p>

          <div className="bg-indigo-50/20 p-4 rounded-xl border border-indigo-100/50 font-mono text-[11px] text-[#121212]/95 overflow-hidden">
            <pre className="overflow-x-auto leading-relaxed max-h-48">
              {getFigmaTokensCode()}
            </pre>
          </div>
        </div>

      </div>

    </div>
  );
}


