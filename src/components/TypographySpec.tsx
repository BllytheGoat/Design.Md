import { useState } from "react";
import { TypographyToken } from "../types";
import { Copy, Check, Type, Eye, Sliders, Heading } from "lucide-react";

interface TypographySpecProps {
  typography: TypographyToken[];
}

export function TypographySpec({ typography }: TypographySpecProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [playgroundText, setPlaygroundText] = useState("Empowering people to build gorgeous web apps.");
  
  // Feature 5 Design parameters states
  const [fontSizeScale, setFontSizeScale] = useState<number>(1);
  const [letterSpacing, setLetterSpacing] = useState<string>("default");
  const [lineHeightScale, setLineHeightScale] = useState<number>(1.2);

  const handleCopy = async (tokenString: string, index: number) => {
    try {
      await navigator.clipboard.writeText(tokenString);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch (err) {
      console.error("Failed to copy typography token info", err);
    }
  };

  const getLetterSpacingClass = () => {
    if (letterSpacing === "tight") return "tracking-tight";
    if (letterSpacing === "wide") return "tracking-wide";
    if (letterSpacing === "widest") return "tracking-widest";
    return "";
  };

  return (
    <div className="space-y-8">
      {/* Dynamic Typography Testing Playground with classic Editorial italic prompt input */}
      <div className="bg-[#EBE8E0] border border-black/10 rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-black/5 rounded text-[#121212]">
              <Eye size={16} />
            </div>
            <div>
              <h4 className="font-serif italic font-bold text-lg text-[#121212]">Interactive Typography Playground</h4>
              <p className="text-[10px] font-sans tracking-wider uppercase opacity-55 text-zinc-650">Test live rendering within reverse engineered attributes</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-white/50 border border-black/5 rounded-xl p-1 text-[11px]">
            <span className="px-2 font-semibold">Scale Override:</span>
            <button onClick={() => setFontSizeScale(0.85)} className={`px-2 py-0.5 rounded ${fontSizeScale === 0.85 ? "bg-black text-white" : ""}`}>Small</button>
            <button onClick={() => setFontSizeScale(1)} className={`px-2 py-0.5 rounded ${fontSizeScale === 1 ? "bg-black text-white" : ""}`}>Base</button>
            <button onClick={() => setFontSizeScale(1.25)} className={`px-2 py-0.5 rounded ${fontSizeScale === 1.25 ? "bg-black text-white" : ""}`}>Fluid L</button>
            <button onClick={() => setFontSizeScale(1.5)} className={`px-2 py-0.5 rounded ${fontSizeScale === 1.5 ? "bg-black text-white" : ""}`}>Lobby X</button>
          </div>
        </div>

        <input
          type="text"
          value={playgroundText}
          onChange={(e) => setPlaygroundText(e.target.value)}
          placeholder="Type custom text..."
          className="w-full bg-transparent border-b border-black py-3 text-xl italic focus:outline-none placeholder-black/20 text-[#121212] font-serif transition-colors rounded-none"
        />

        {/* Sliders Container (Feature 5) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-black/10 text-xs">
          <div className="space-y-2 text-left">
            <span className="font-sans font-bold text-black/40 text-[9px] uppercase tracking-wider block">Scale Multiplier: {fontSizeScale}x</span>
            <input
              type="range"
              min="0.75"
              max="2.5"
              step="0.05"
              value={fontSizeScale}
              onChange={(e) => setFontSizeScale(Number(e.target.value))}
              className="w-full accent-black cursor-pointer"
            />
          </div>

          <div className="space-y-2 text-left">
            <span className="font-sans font-bold text-black/40 text-[9px] uppercase tracking-wider block">Relative Line Height: {lineHeightScale}</span>
            <input
              type="range"
              min="1"
              max="2.2"
              step="0.1"
              value={lineHeightScale}
              onChange={(e) => setLineHeightScale(Number(e.target.value))}
              className="w-full accent-black cursor-pointer"
            />
          </div>

          <div className="space-y-2 text-left">
            <span className="font-sans font-bold text-black/40 text-[9px] uppercase tracking-wider block">Tracking Scale (Letter-spacing)</span>
            <div className="flex bg-white/40 border border-black/5 rounded p-0.5">
              {["default", "tight", "wide", "widest"].map((track) => (
                <button
                  key={track}
                  onClick={() => setLetterSpacing(track)}
                  className={`flex-1 text-[9px] py-1 font-bold uppercase rounded transition-all ${
                    letterSpacing === track ? "bg-black text-white" : "text-black/60 hover:text-black"
                  }`}
                >
                  {track}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Typography Tokens List */}
      <div className="space-y-6">
        {typography.map((token, index) => {
          const isCopied = copiedIndex === index;
          const tokenDetails = `Font: ${token.fontName} | Size: ${token.size} | Weight: ${token.weight}`;

          // Formulating fallback inline sizes if standard pixel sizes were specified in text
          const sizeClean = token.size.toLowerCase();
          
          // Calculate dynamic scalable pixels
          let basePx = 16;
          if (sizeClean.includes("px")) {
            basePx = parseInt(sizeClean) || 16;
          } else if (sizeClean.includes("rem")) {
            const remVal = parseFloat(sizeClean) || 1;
            basePx = remVal * 16;
          }

          const computedFontSize = `${Math.round(basePx * fontSizeScale)}px`;

          return (
            <div
              key={index}
              className="bg-[#F4F1EA] border border-black/10 rounded-xl p-6 shadow-sm space-y-5 text-left"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3.5 border-b border-black/10">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-white border border-black/10 flex items-center justify-center text-[#121212] rounded">
                    <Type size={14} />
                  </div>
                  <div>
                    <span className="text-[9px] font-sans tracking-[0.25em] font-bold text-black/40 block uppercase">
                      TOKEN SELECTOR
                    </span>
                    <h4 className="font-serif italic font-bold text-[#121212] text-md">
                      {token.element}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs text-black/60 bg-white border border-black/10 px-2.5 py-1 rounded">
                    {token.fontName === "system-ui" || token.fontName === "" ? "System Font" : token.fontName}
                  </span>
                  <button
                    onClick={() => handleCopy(tokenDetails, index)}
                    className="p-1 px-3 text-[10px] font-sans tracking-widest font-bold uppercase border border-black bg-white hover:bg-black hover:text-white transition-all cursor-pointer"
                    title="Copy attributes style"
                  >
                    {isCopied ? "Copied" : "Copy Specs"}
                  </button>
                </div>
              </div>

              {/* Variable preview display styled depending on sizes parsed */}
              <div className="py-2.5 overflow-x-auto">
                <p 
                  className={`text-[#121212] break-words transition-all font-serif ${getLetterSpacingClass()}`}
                  style={{
                    fontSize: computedFontSize,
                    lineHeight: lineHeightScale,
                    fontWeight: sizeClean.includes("bold") || token.weight.toLowerCase().includes("bold") || token.weight.includes("700") || token.weight.includes("600") ? "700" : "400"
                  }}
                >
                  {playgroundText || "Live Spec Preview Type Box"}
                </p>
              </div>

              {/* Informative specs footbar designed as vintage layout blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white rounded-lg p-4 border border-black/5 text-[10px] text-black/60 font-sans tracking-wider uppercase font-semibold">
                <div className="border-b sm:border-b-0 sm:border-r border-black/5 pb-2.5 sm:pb-0 sm:pr-4">
                  <span className="text-[8px] tracking-[0.2em] font-bold text-black/35 block mb-1">
                    Derived Size ({fontSizeScale}x)
                  </span>
                  <span className="text-[#121212] font-bold">
                    {computedFontSize} <span className="text-black/30 font-normal">({token.size || "Inherit"})</span>
                  </span>
                </div>
                <div className="border-b sm:border-b-0 sm:border-r border-black/5 pb-2.5 sm:pb-0 sm:pr-4">
                  <span className="text-[8px] tracking-[0.2em] font-bold text-black/35 block mb-1">
                    Weight Config
                  </span>
                  <span className="text-[#121212] font-bold">
                    {token.weight || "Normal / 400"}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] tracking-[0.2em] font-bold text-black/35 block mb-1">
                    Operational Usage
                  </span>
                  <span className="text-[#121212] font-serif lowercase italic text-[11px] font-normal tracking-normal line-clamp-1 block text-pretty" title={token.usage}>
                    {token.usage}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

