import { useState, useEffect } from "react";
import { DesignSystemData, DesignComponent } from "../types";
import { 
  Code, 
  RotateCcw, 
  Sparkles, 
  Wand2, 
  Laptop, 
  Smartphone, 
  Monitor, 
  Sun, 
  Moon, 
  Play, 
  Copy, 
  Check, 
  Layers, 
  Palette, 
  Info,
  ExternalLink
} from "lucide-react";

interface SandboxWorkspaceProps {
  data: DesignSystemData;
  onUpdateComponent?: (index: number, updatedComp: DesignComponent) => void;
  apiProvider?: string;
  userApiKey?: string;
  selectedModel?: string;
  apiBaseUrl?: string;
}

export function SandboxWorkspace({
  data,
  onUpdateComponent,
  apiProvider,
  userApiKey,
  selectedModel,
  apiBaseUrl
}: SandboxWorkspaceProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [localCode, setLocalCode] = useState("");
  const [previewCode, setPreviewCode] = useState("");
  const [viewportSize, setViewportSize] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [simulateDark, setSimulateDark] = useState(false);
  const [copiedHexIndex, setCopiedHexIndex] = useState<number | null>(null);

  // AI Refinement states
  const [refinePrompt, setRefinePrompt] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const activeComponent = data.components[selectedIndex] || data.components[0] || null;

  // Sync code whenever changing components
  useEffect(() => {
    if (activeComponent) {
      setLocalCode(activeComponent.tailwindCode);
      setPreviewCode(activeComponent.tailwindCode);
      setRefineError(null);
    }
  }, [activeComponent, selectedIndex]);

  const handleApplyChanges = () => {
    setPreviewCode(localCode);
  };

  const handleReset = () => {
    if (activeComponent) {
      setLocalCode(activeComponent.tailwindCode);
      setPreviewCode(activeComponent.tailwindCode);
      setRefineError(null);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(localCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyColor = async (hex: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHexIndex(idx);
      setTimeout(() => setCopiedHexIndex(null), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRefineWithAI = async () => {
    if (!refinePrompt.trim() || !activeComponent) return;
    setIsRefining(true);
    setRefineError(null);
    try {
      const response = await fetch("/api/refine-component", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          component: {
            ...activeComponent,
            tailwindCode: localCode // Send the current edited code to refine on top of it!
          },
          prompt: refinePrompt,
          apiProvider,
          userApiKey,
          selectedModel,
          apiBaseUrl
        })
      });

      if (!response.ok) {
        throw new Error(`Design server returned status: ${response.status}`);
      }

      const parsed = await response.json();
      if (parsed && parsed.tailwindCode) {
        setLocalCode(parsed.tailwindCode);
        setPreviewCode(parsed.tailwindCode);
        setRefinePrompt("");

        // Also save it back to App's state if possible, so user can keep it!
        if (onUpdateComponent) {
          onUpdateComponent(selectedIndex, {
            componentName: parsed.componentName || activeComponent.componentName,
            tailwindCode: parsed.tailwindCode,
            explanation: parsed.explanation || activeComponent.explanation
          });
        }
      } else {
        throw new Error("Design server returned invalid schema template.");
      }
    } catch (err: any) {
      setRefineError(err.message || "Unknown error encountered.");
    } finally {
      setIsRefining(false);
    }
  };

  const getViewportWidthClass = () => {
    if (viewportSize === "mobile") return "max-w-[360px]";
    if (viewportSize === "tablet") return "max-w-[680px]";
    return "w-full";
  };

  if (data.components.length === 0) {
    return (
      <div className="p-12 text-center bg-white border border-black/10 rounded-3xl">
        <p className="text-xs font-serif italic text-black/50">No components available in this design system.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Introduction banner */}
      <div className="bg-white border border-black/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 text-[70px] text-black/[0.015] font-serif leading-none select-none italic font-black">
          Sandbox
        </div>
        <div className="space-y-1.5 text-left max-w-xl">
          <span className="p-1 px-2.5 text-[8px] uppercase font-sans font-bold tracking-widest bg-black text-white rounded">
            Interactive Workbench
          </span>
          <h3 className="text-2xl font-serif font-bold italic tracking-tight text-[#121212]">
            Tailwind Visual Sandbox
          </h3>
          <p className="text-xs text-black/60 font-serif leading-relaxed">
            Select, prototype, compose, and live-tweak responsive components reverse-engineered from <strong>{data.appName}</strong>. Edit the raw classes directly or direct the Assistant AI to apply stylistic modifications.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {data.colors.slice(0, 4).map((c, i) => (
            <button
              key={i}
              onClick={() => handleCopyColor(c.hex, i)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FAF9F6] border border-black/10 rounded-xl text-[10px] font-mono hover:border-black/30 transition-all cursor-pointer"
              title={`Click to copy ${c.name}`}
            >
              <span className="h-2 w-2 rounded-full border border-black/15 shadow-sm" style={{ backgroundColor: c.hex }} />
              <span>{copiedHexIndex === i ? "Copied" : c.hex}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Component Select drawer (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#EBE8E0]/40 border border-black/10 rounded-3xl p-5 space-y-3 text-left">
            <span className="text-[9px] font-sans font-bold tracking-[0.2em] text-black/50 block uppercase">
              SELECT ACTIVE COMPONENT
            </span>
            <div className="space-y-2">
              {data.components.map((comp, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedIndex(idx)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-black text-white border-black font-semibold shadow-md"
                        : "bg-white text-[#121212] border-black/15 hover:bg-[#EBE8E0]"
                    }`}
                  >
                    <div className="truncate pr-3">
                      <h5 className="font-serif font-bold italic text-xs truncate">{comp.componentName}</h5>
                      <span className={`text-[9px] block uppercase tracking-wide opacity-60 mt-0.5 mt-1`}>
                        {isSelected ? "Active Workspace" : "Click to load"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt AI Tweak Portal */}
          <div className="bg-white border border-black/10 rounded-3xl p-5 space-y-4 text-left">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-700">
                <Wand2 size={13} />
              </div>
              <div>
                <h4 className="font-serif italic font-bold text-sm text-indigo-950">
                  Assistant AI Composer
                </h4>
                <p className="text-[9px] font-sans uppercase tracking-wider text-black/40">Apply rapid styling rules on target tailwind block</p>
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isRefining && refinePrompt.trim()) handleRefineWithAI();
                }}
                disabled={isRefining}
                placeholder="e.g. Turn the cards dark-themed with thin border lines..."
                className="w-full bg-[#FAF9F6] border border-black/10 focus:border-indigo-600 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none disabled:opacity-60 transition-all font-serif italic"
              />
              <button
                onClick={handleRefineWithAI}
                disabled={isRefining || !refinePrompt.trim()}
                className="w-full py-2.5 bg-black hover:bg-zinc-950 text-white text-[10px] font-sans font-bold uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-40 select-none flex items-center justify-center gap-1.5 transition-all"
              >
                {isRefining ? (
                  <>
                    <RotateCcw size={11} className="animate-spin" />
                    <span>Tuning tokens...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={11} />
                    <span>Tweak component via AI</span>
                  </>
                )}
              </button>
            </div>

            {refineError && (
              <p className="text-[10px] font-serif text-red-700 italic mt-1">{refineError}</p>
            )}
            
            <p className="text-[10px] text-black/45 hover:text-black font-sans leading-relaxed transition-all cursor-help select-none">
              ℹ️ Assistant leverages your configured design models to execute precise CSS translations.
            </p>
          </div>
        </div>

        {/* Right Side: Visual Canvas & Textarea editor (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-black/10 rounded-3xl overflow-hidden shadow-sm text-left">
            
            {/* Visual Canvas header with simulation controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/10 px-5 py-3.5 gap-3 bg-[#FAF9F6]">
              <div className="flex items-center gap-2">
                <Laptop size={13} className="text-black/45" />
                <span className="font-serif font-bold italic text-xs text-[#121212]">
                  Interactive Sandbox Viewport
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Light/Dark Toggle */}
                <button
                  onClick={() => setSimulateDark(!simulateDark)}
                  className="p-1 px-2.5 border border-black/15 hover:border-black rounded text-[9px] font-sans tracking-tight uppercase flex items-center gap-1 cursor-pointer bg-white"
                >
                  {simulateDark ? (
                    <>
                      <Sun size={10} className="text-amber-600" />
                      <span>Light Canvas</span>
                    </>
                  ) : (
                    <>
                      <Moon size={10} className="text-slate-700" />
                      <span>Dark Canvas</span>
                    </>
                  )}
                </button>

                {/* Viewport size buttons */}
                <div className="flex p-0.5 bg-[#F4F1EA] rounded border border-black/5 text-[9px]">
                  <button
                    onClick={() => setViewportSize("mobile")}
                    className={`p-1 px-2.5 rounded cursor-pointer transition-all flex items-center gap-1 ${
                      viewportSize === "mobile" ? "bg-white text-black font-bold shadow-sm" : "text-black/50"
                    }`}
                  >
                    <Smartphone size={10} />
                    <span className="hidden sm:inline">Mobile</span>
                  </button>
                  <button
                    onClick={() => setViewportSize("tablet")}
                    className={`p-1 px-2.5 rounded cursor-pointer transition-all flex items-center gap-1 ${
                      viewportSize === "tablet" ? "bg-white text-black font-bold shadow-sm" : "text-black/50"
                    }`}
                  >
                    <Laptop size={10} />
                    <span className="hidden sm:inline">Tablet</span>
                  </button>
                  <button
                    onClick={() => setViewportSize("desktop")}
                    className={`p-1 px-2.5 rounded cursor-pointer transition-all flex items-center gap-1 ${
                      viewportSize === "desktop" ? "bg-white text-black font-bold shadow-sm" : "text-black/50"
                    }`}
                  >
                    <Monitor size={10} />
                    <span className="hidden sm:inline">Desktop</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Stage Body */}
            <div 
              className={`p-6 sm:p-10 flex items-center justify-center overflow-x-auto transition-colors duration-300 min-h-[280px] ${
                simulateDark ? "bg-[#111111]" : "bg-[#EBE8E0]/40"
              }`}
            >
              <div 
                className={`w-full transition-all duration-300 border rounded-2xl shadow-sm p-6 relative ${getViewportWidthClass()} ${
                  simulateDark 
                    ? "bg-[#1c1c1e] border-white/5 text-white" 
                    : "bg-white border-black/10 text-neutral-900"
                }`}
              >
                <div className={`absolute top-2 left-2 text-[8px] tracking-wider font-sans uppercase ${
                  simulateDark ? "text-white/30" : "text-black/30"
                }`}>
                  Live Preview Sandbox ({viewportSize.toUpperCase()})
                </div>

                <div className="w-full select-none pt-4 flex justify-center">
                  <div
                    dangerouslySetInnerHTML={{ 
                      __html: previewCode
                        .replace(/className=/g, "class=")
                        .replace(/\{(\s*["']([^"']*)["']\s*)\}/g, "$2")
                    }}
                    className="w-full flex justify-center"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Interactive Source editor */}
          <div className="bg-white border border-black/10 rounded-2xl overflow-hidden shadow-sm text-left">
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-3.5 bg-[#FAF9F6]">
              <div className="flex items-center gap-2">
                <Code size={13} className="text-black/45" />
                <span className="font-sans font-bold text-xs text-[#121212] uppercase tracking-wide">
                  Tailwind CSS Source Code (HTML)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleApplyChanges}
                  className="px-3.5 py-1.5 bg-black hover:bg-zinc-950 text-white text-[9px] font-sans font-bold tracking-wider uppercase rounded-lg transition-all flex items-center gap-1 select-none cursor-pointer"
                  title="Render changed text directly"
                >
                  <Play size={10} />
                  <span>Render Output</span>
                </button>
                <button
                  onClick={handleReset}
                  className="px-2.5 py-1.5 border border-black/15 hover:border-black text-[9px] font-sans font-bold tracking-wider uppercase rounded-lg bg-white transition-all flex items-center gap-1 select-none cursor-pointer"
                  title="Reset code to original analyzed layout"
                >
                  <RotateCcw size={10} />
                  <span>Reset</span>
                </button>
                <button
                  onClick={handleCopyCode}
                  className="px-2.5 py-1.5 border border-black/15 hover:border-black text-[9px] font-sans font-bold tracking-wider uppercase rounded-lg bg-white transition-all flex items-center gap-1 select-none cursor-pointer"
                >
                  {copiedCode ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
                  <span>{copiedCode ? "Copied" : "Copy Source"}</span>
                </button>
              </div>
            </div>

            <div className="p-4 relative">
              <span className="absolute top-2 right-4 text-[8px] font-mono uppercase bg-[#121212]/5 text-[#121212]/40 px-1 rounded select-none">
                Live Edit Enabled
              </span>
              <textarea
                value={localCode}
                onChange={(e) => setLocalCode(e.target.value)}
                rows={10}
                className="w-full bg-[#FAF9F6] text-slate-800 font-mono text-[11px] leading-relaxed p-4 border border-black/10 focus:border-black rounded-lg focus:outline-none focus:ring-1 focus:ring-black h-64 resize-y"
                placeholder="Paste or write custom responsive components utilizing Tailwind utility rules here..."
              />
            </div>
            
            <div className="border-t border-black/5 p-4 bg-[#FAF9F6] text-[10px] text-black/50 font-serif flex items-center justify-between">
              <span>Edit HTML above and click <strong>&quot;Render Output&quot;</strong> to watch updates instantly.</span>
              <span className="font-sans text-[8px] tracking-wider uppercase font-bold text-indigo-600 bg-indigo-50 px-1.5 rounded">Editable Sandbox</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
