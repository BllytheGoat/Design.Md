import { useState } from "react";
import { DesignComponent } from "../types";
import { Code, Eye, Laptop, ArrowRight, Smartphone, Tablet, Monitor, Wand2, Sparkles, RefreshCw, Moon, Sun } from "lucide-react";
import { executeClientSideOllamaRefine } from "../lib/ollamaClient";

interface TailwindComponentsProps {
  components: DesignComponent[];
  onUpdateComponent?: (index: number, updatedComp: DesignComponent) => void;
  // Secrets parameters
  apiProvider?: string;
  userApiKey?: string;
  selectedModel?: string;
  apiBaseUrl?: string;
}

export function TailwindComponents({ 
  components, 
  onUpdateComponent,
  apiProvider,
  userApiKey,
  selectedModel,
  apiBaseUrl
}: TailwindComponentsProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // Feature 4: Breakpoint simulator state
  const [viewportSize, setViewportSize] = useState<"mobile" | "tablet" | "desktop">("desktop");
  
  // Feature 9: Dark / Light Mode simulator state
  const [simulateDark, setSimulateDark] = useState(false);

  // Feature 8: AI refinement prompt state
  const [refinePrompt, setRefinePrompt] = useState("");
  const [customRefining, setCustomRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);

  const activeComponent = components[activeIndex] || components[0] || null;

  const handleCopyCode = async () => {
    if (!activeComponent) return;
    try {
      await navigator.clipboard.writeText(activeComponent.tailwindCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy component's tailwind code", err);
    }
  };

  const handleRefineWithAI = async () => {
    if (!refinePrompt.trim() || !activeComponent) return;
    setCustomRefining(true);
    setRefineError(null);
    try {
      const response = await fetch("/api/refine-component", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          component: activeComponent,
          prompt: refinePrompt,
          apiProvider,
          userApiKey,
          selectedModel,
          apiBaseUrl
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to contact design refinement engine: HTTP Status ${response.status}`);
      }

      let parsed = await response.json();
      if (parsed && parsed.needsClientSideLlm) {
        console.log("Local Ollama endpoint intercepted during refinement. Running client-side model fetch...");
        try {
          parsed = await executeClientSideOllamaRefine(parsed, selectedModel || "", apiBaseUrl || "", userApiKey || "");
        } catch (ollamaErr: any) {
          console.warn("Client-side Ollama refiner failed. Falling back to backend heuristic replacements...", ollamaErr.message || ollamaErr);
          const fallbackRes = await fetch("/api/refine-component", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              component: activeComponent,
              prompt: refinePrompt,
              apiProvider,
              userApiKey,
              selectedModel,
              apiBaseUrl,
              forceHeuristic: true
            })
          });
          if (fallbackRes.ok) {
            parsed = await fallbackRes.json();
          } else {
            throw new Error(`Ollama refiner completed with connection failure, and automatic heuristic fallback failed: ${ollamaErr.message || ollamaErr}`);
          }
        }
      }

      if (parsed && parsed.tailwindCode) {
        if (onUpdateComponent) {
          onUpdateComponent(activeIndex, {
            componentName: parsed.componentName || activeComponent.componentName,
            tailwindCode: parsed.tailwindCode,
            explanation: parsed.explanation || activeComponent.explanation
          });
        }
        setRefinePrompt("");
      } else {
        throw new Error("Design server returned invalid schema template.");
      }
    } catch (err: any) {
      setRefineError(err.message || "Unknown error encountered.");
    } finally {
      setCustomRefining(false);
    }
  };

  const getViewportWidthClass = () => {
    if (viewportSize === "mobile") return "max-w-[360px]";
    if (viewportSize === "tablet") return "max-w-[680px]";
    return "w-full";
  };

  if (components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-[#F4F1EA] rounded-2xl border border-black/10 shadow-sm">
        <Code size={40} className="text-black/30 animate-pulse" />
        <p className="mt-4 text-xs font-sans uppercase tracking-widest text-black/50 font-bold">No component specifications generated.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Component Picker Side Panel list (4 cols) */}
      <div className="lg:col-span-4 space-y-5 text-left">
        <div>
          <h4 className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-black/50 mb-3 block">
            COMPONENTS AUDITED ({components.length})
          </h4>
          <div className="space-y-2">
            {components.map((comp, idx) => {
              const isSelected = activeIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveIndex(idx);
                    setCopied(false);
                    setRefineError(null);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all text-xs flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? "bg-black text-white border-black font-medium shadow-md"
                      : "bg-[#F4F1EA] text-[#121212] border-black/10 hover:bg-[#EBE8E0] hover:border-black/20"
                  }`}
                >
                  <div className="truncate pr-3">
                    <h5 className="font-serif font-bold italic text-sm truncate">{comp.componentName}</h5>
                    <p className={`text-[10px] mt-0.5 truncate ${isSelected ? "text-gray-300" : "text-black/55"}`}>
                      {comp.explanation}
                    </p>
                  </div>
                  <ArrowRight size={13} className={isSelected ? "text-white" : "text-black/40"} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Feature 10: Radius & Shadows Token inspections panel */}
        <div className="bg-[#EBE8E0]/40 border border-black/10 rounded-2xl p-5 space-y-4">
          <span className="text-[9px] font-sans font-bold tracking-[0.25em] text-black/45 block uppercase">
            STRUCTURE TOKENS INSPECTOR
          </span>

          {/* Border Radiuses */}
          <div className="space-y-2">
            <span className="text-[8px] font-bold text-black/40 block">BORDER RADIUS COMPLIANCES</span>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white border border-black/5 p-2 rounded text-center" title="rounded-sm">
                <div className="h-6 w-full bg-black/10 rounded-sm mb-1"></div>
                <span className="text-[7px] font-mono block">sm (4px)</span>
              </div>
              <div className="bg-white border border-black/5 p-2 rounded text-center" title="rounded-md">
                <div className="h-6 w-full bg-black/10 rounded-md mb-1"></div>
                <span className="text-[7px] font-mono block">md (6px)</span>
              </div>
              <div className="bg-white border border-black/5 p-2 rounded text-center" title="rounded-xl">
                <div className="h-6 w-full bg-black/10 rounded-xl mb-1"></div>
                <span className="text-[7px] font-mono block">xl (12px)</span>
              </div>
              <div className="bg-white border border-black/5 p-2 rounded text-center" title="rounded-3xl">
                <div className="h-6 w-full bg-black/10 rounded-3xl mb-1"></div>
                <span className="text-[7px] font-mono block">3xl (24px)</span>
              </div>
            </div>
          </div>

          {/* Shadow elevations */}
          <div className="space-y-2">
            <span className="text-[8px] font-bold text-black/40 block">ELEVATION/SHADOW HARDENING</span>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white border border-black/5 p-2 rounded text-center shadow-sm" title="shadow-sm">
                <span className="text-[8px] font-sans font-semibold text-black/40">sm shadow</span>
              </div>
              <div className="bg-white border border-black/5 p-2 rounded text-center shadow-md" title="shadow-md">
                <span className="text-[8px] font-sans font-semibold text-black/40">md shadow</span>
              </div>
              <div className="bg-white border border-black/5 p-2 rounded text-center shadow-xl" title="shadow-xl">
                <span className="text-[8px] font-sans font-semibold text-black/40">xl shadow</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Component Sandbox Container (8 cols) */}
      <div className="lg:col-span-8 flex flex-col space-y-6 text-left">
        {activeComponent && (
          <>
            <div className="bg-white border border-black/10 rounded-2xl overflow-hidden shadow-sm">
              {/* Header Tab controllers */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/10 px-5 py-4 gap-3">
                <div className="flex items-center gap-2">
                  <Laptop size={14} className="text-black/40" />
                  <h4 className="font-serif font-bold italic text-[#121212] text-sm truncate max-w-[200px] sm:max-w-none">
                    {activeComponent.componentName}
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  
                  {/* Feature 9: Light/Dark Scheme Simulator Toggle */}
                  <button
                    onClick={() => setSimulateDark(!simulateDark)}
                    className="p-1 px-2 border border-black/10 hover:border-black rounded text-[10px] font-sans tracking-tight uppercase flex items-center gap-1 cursor-pointer bg-[#FAF9F6]"
                    title="Simulate Light/Dark Backdrops"
                  >
                    {simulateDark ? (
                      <>
                        <Sun size={11} className="text-amber-600" />
                        <span>View Light</span>
                      </>
                    ) : (
                      <>
                        <Moon size={11} className="text-slate-700" />
                        <span>View Dark</span>
                      </>
                    )}
                  </button>

                  {/* Feature 4 Viewport Breakpoint controller */}
                  <div className="flex p-0.5 bg-[#F4F1EA] rounded border border-black/5 text-[10px]">
                    <button
                      onClick={() => setViewportSize("mobile")}
                      className={`p-1 px-2 rounded cursor-pointer transition-all flex items-center gap-1 ${
                        viewportSize === "mobile" ? "bg-white text-black font-bold shadow-sm" : "text-black/50"
                      }`}
                      title="Simulate Mobile Device Port"
                    >
                      <Smartphone size={11} />
                      <span className="hidden sm:inline">Mobile</span>
                    </button>
                    <button
                      onClick={() => setViewportSize("tablet")}
                      className={`p-1 px-2 rounded cursor-pointer transition-all flex items-center gap-1 ${
                        viewportSize === "tablet" ? "bg-white text-black font-bold shadow-sm" : "text-black/50"
                      }`}
                      title="Simulate Tablet Port"
                    >
                      <TFTab size={11} />
                      <span className="hidden sm:inline">Tablet</span>
                    </button>
                    <button
                      onClick={() => setViewportSize("desktop")}
                      className={`p-1 px-2 rounded cursor-pointer transition-all flex items-center gap-1 ${
                        viewportSize === "desktop" ? "bg-white text-black font-bold shadow-sm" : "text-black/50"
                      }`}
                      title="Desktop Workspace Full View"
                    >
                      <Monitor size={11} />
                      <span className="hidden sm:inline">Desktop</span>
                    </button>
                  </div>

                  {/* Selector tabs between Canvas and Source */}
                  <div className="flex p-0.5 bg-[#F4F1EA] rounded border border-black/5">
                    <button
                      onClick={() => setActiveTab("preview")}
                      className={`px-3 py-1 text-[10px] font-sans uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1 ${
                        activeTab === "preview"
                          ? "bg-black text-white shadow-sm font-bold"
                          : "text-black/55 hover:text-black"
                      }`}
                    >
                      <Eye size={12} />
                      <span>Live Canvas</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("code")}
                      className={`px-3 py-1 text-[10px] font-sans uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1 ${
                        activeTab === "code"
                          ? "bg-black text-white shadow-sm font-bold"
                          : "text-black/55 hover:text-black"
                      }`}
                    >
                      <Code size={12} />
                      <span>JSX Code</span>
                    </button>
                  </div>

                  {/* Clipboard action */}
                  <button
                    onClick={handleCopyCode}
                    className="font-sans text-[10px] uppercase tracking-widest border border-black px-4 py-1.5 bg-white hover:bg-black hover:text-white transition-all cursor-pointer font-bold"
                    title="Copy source code"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Rendering canvas body block (Fluid Breakpoint frame viewport simulator) */}
              {activeTab === "preview" ? (
                <div 
                  className={`p-6 sm:p-8 flex items-center justify-center overflow-x-auto border-b border-black/5 transition-all duration-300 ${
                    simulateDark ? "bg-[#111111]" : "bg-[#EBE8E0]/40"
                  }`}
                >
                  <div 
                    className={`w-full transition-all duration-300 border rounded-2xl shadow-sm overflow-hidden p-6 relative ${getViewportWidthClass()} ${
                      simulateDark 
                        ? "bg-[#18181b] border-white/5 text-white" 
                        : "bg-white border-black/10 text-neutral-900"
                    }`}
                  >
                    <div className={`absolute top-2 left-2 text-[8px] tracking-wider font-sans uppercase ${
                      simulateDark ? "text-white/30" : "text-black/30"
                    }`}>
                      Viewport: {viewportSize.toUpperCase()} {viewportSize === "mobile" && "• 360px"} {viewportSize === "tablet" && "• 680px"}
                    </div>
                    
                    {/* Raw injection style sandbox layout */}
                    <div className="w-full select-none pt-4">
                      {/* Process JSX tag format inside visual previews safeties */}
                      <div
                        dangerouslySetInnerHTML={{ 
                          __html: activeComponent.tailwindCode
                            .replace(/className=/g, "class=")
                            .replace(/\{(\s*["']([^"']*)["']\s*)\}/g, "$2") // Strip simple brace bindings if returned by third parties
                        }}
                        className="w-full flex justify-center"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Source Text Block code container */
                <div className="relative font-mono text-[11px] bg-[#121212] p-5 overflow-x-auto min-h-[300px]">
                  <pre className="text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">
                    <code>{activeComponent.tailwindCode}</code>
                  </pre>
                </div>
              )}
            </div>

            {/* Feature 8: Smart AI component Refinement drawer card console */}
            <div className="bg-white border border-black/10 rounded-2xl p-5 md:p-6 space-y-4 shadow-sm text-left">
              <div className="flex items-center gap-2">
                <div className="p-1 px-2.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-700">
                  <Wand2 size={13} />
                </div>
                <div>
                  <h4 className="font-serif italic font-bold text-sm text-indigo-950 flex items-center gap-1">
                    Refine with Design AI
                    <span className="text-[9px] font-sans uppercase font-bold text-indigo-500 bg-indigo-50 px-1.5 rounded">Feature 8</span>
                  </h4>
                  <p className="text-[10px] font-sans uppercase tracking-wider text-black/40">Ask Stilo's design assistant to modify layout classes instantly</p>
                </div>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={refinePrompt}
                  onChange={(e) => setRefinePrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !customRefining) handleRefineWithAI();
                  }}
                  disabled={customRefining}
                  placeholder="e.g. Change primary buttons code to indigo gradient pills / add high-contrast borders..."
                  className="flex-1 bg-[#FAF9F6] border border-black/10 rounded-xl px-4 py-2.5 text-xs text-neutral-800 italic focus:outline-none focus:border-indigo-600 disabled:opacity-60 transition-all font-serif"
                />
                <button
                  onClick={handleRefineWithAI}
                  disabled={customRefining || !refinePrompt.trim()}
                  className="px-5 bg-black text-white hover:bg-zinc-950 text-[10px] font-sans font-bold uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-40 select-none flex items-center gap-1.5 transition-all"
                >
                  {customRefining ? (
                    <>
                      <RefreshCw size={11} className="animate-spin" />
                      <span>Refining...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={11} />
                      <span>Tweak Spec</span>
                    </>
                  )}
                </button>
              </div>

              {refineError && (
                <p className="text-[10px] font-serif text-red-700 italic">{refineError}</p>
              )}
            </div>

            {/* Explanation footer card styled in modern vintage paper format */}
            <div className="bg-[#F4F1EA] rounded-xl border border-black/10 p-5 text-xs text-[#121212] leading-relaxed">
              <span className="font-sans font-bold text-[9px] uppercase tracking-[0.25em] text-black/50 block mb-1.5">
                ARCHITECTURE NOTES
              </span>
              <p className="font-serif text-pretty">{activeComponent.explanation}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Inner helper icon definition for Tablet because Lucide tablet renamed or varies in standard packages
function TFTab({ size, className }: { size?: number, className?: string }) {
  return (
    <svg 
      width={size || 11} 
      height={size || 11} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12" y2="18.01" />
    </svg>
  );
}


