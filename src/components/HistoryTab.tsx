import { motion } from "motion/react";
import { 
  Trash2, 
  ExternalLink, 
  Clock, 
  Sparkles, 
  Globe, 
  Eye, 
  ArrowRight,
  Database
} from "lucide-react";
import { HistoryEntry } from "../types";

interface HistoryTabProps {
  historyList: HistoryEntry[];
  onSelectEntry: (entry: HistoryEntry) => void;
  onDeleteEntry: (id: string) => void;
  onClearHistory: () => void;
  onLoadPreset: (url: string) => void;
}

export function HistoryTab({
  historyList,
  onSelectEntry,
  onDeleteEntry,
  onClearHistory,
  onLoadPreset
}: HistoryTabProps) {
  
  const formatDate = (timestamp: number) => {
    try {
      return new Date(timestamp).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "Recently";
    }
  };

  const getCleanDomain = (url: string) => {
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      return parsed.hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  return (
    <div id="stilo-history-workspace" className="space-y-8 animate-fade-in text-left">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-black/10 pb-6">
        <div className="space-y-1.5">
          <span className="text-[10px] tracking-widest font-sans font-bold text-black/40 uppercase block">
            Visual DNA Log Archive
          </span>
          <h2 className="text-3xl font-serif font-bold italic tracking-tight text-[#121212]">
            Extraction History
          </h2>
          <p className="text-sm text-black/60 font-serif leading-relaxed max-w-2xl">
            A secure cache of your previously analysed platforms. Click any entry below to restore its full color palette, typography tokens, custom Tailwind specs, and sandboxed previews immediately.
          </p>
        </div>

        {historyList.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to completely clear your local extraction logs archive? This action cannot be undone.")) {
                onClearHistory();
              }
            }}
            className="self-start sm:self-auto px-4 py-2 hover:bg-red-50 text-red-700 border border-red-200 hover:border-red-300 text-xs font-sans font-bold tracking-widest uppercase transition-colors flex items-center gap-1.5 focus:outline-none select-none cursor-pointer"
          >
            <Trash2 size={12} />
            <span>Clear Archive</span>
          </button>
        )}
      </div>

      {/* History List or Empty State */}
      {historyList.length === 0 ? (
        <div className="bg-white border border-black/10 rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto space-y-6 shadow-[10px_10px_0_rgba(0,0,0,0.02)]">
          <div className="h-12 w-12 mx-auto flex items-center justify-center border border-dashed border-black/20 rounded-full text-black/40">
            <Clock size={20} />
          </div>

          <div className="space-y-2">
            <h4 className="font-serif font-black italic text-lg text-[#121212]">
              No extraction log entries found
            </h4>
            <p className="text-xs text-black/60 font-serif leading-relaxed max-w-md mx-auto">
              You haven't extracted any design architecture profiles yet. Enter a website URL in the **Explorer** tab to reverse-engineer color metrics and component specifications.
            </p>
          </div>

          {/* Prompt presets */}
          <div className="border-t border-black/5 pt-6 space-y-3">
            <p className="text-[10px] font-sans font-bold tracking-widest uppercase text-black/40">
              Immediately populate history using visual presets
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { name: "Linear", url: "https://linear.app" },
                { name: "Stripe", url: "https://stripe.com" },
                { name: "Airbnb", url: "https://airbnb.com" }
              ].map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => onLoadPreset(preset.url)}
                  className="px-4 py-2 bg-[#F4F1EA] hover:bg-black text-black hover:text-white border border-black/10 rounded-lg text-xs font-sans font-medium transition-all cursor-pointer"
                >
                  Analyze {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {historyList.map((entry, index) => {
            const domain = getCleanDomain(entry.url);
            
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="group relative bg-white border border-black/10 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-black/20 transition-all text-left flex flex-col justify-between"
              >
                {/* Meta row */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <span className="text-[9px] font-mono text-black/40 flex items-center gap-1">
                    <Clock size={10} />
                    <span>{formatDate(entry.timestamp)}</span>
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteEntry(entry.id);
                    }}
                    className="p-1.5 text-black/40 hover:text-red-650 hover:bg-red-50 rounded transition-colors cursor-pointer"
                    title="Delete entry from history"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Main Content */}
                <div className="space-y-3 flex-1 mb-6">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xl font-serif font-black italic text-[#121212] group-hover:text-black transition-colors">
                        {entry.data.appName}
                      </h3>
                      {entry.data.isHeuristicFallback && (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200/50 text-[8px] font-bold px-1.5 py-0.5 rounded font-sans uppercase uppercase-widest">
                          Heuristic
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-black/55 font-mono select-all mt-0.5">
                      <Globe size={10} />
                      <span>{domain}</span>
                    </div>
                  </div>

                  <p className="text-xs text-black/65 font-serif line-clamp-2 leading-relaxed">
                    {entry.data.description}
                  </p>

                  {/* Colors Swatches Preview list */}
                  {entry.data.colors && entry.data.colors.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                      {entry.data.colors.slice(0, 5).map((color, cIdx) => (
                        <span 
                          key={cIdx}
                          className="w-4 h-4 rounded-full border border-black/10 flex-shrink-0"
                          style={{ backgroundColor: color.hex }}
                          title={`${color.name}: ${color.hex}`}
                        />
                      ))}
                      {entry.data.colors.length > 5 && (
                        <span className="text-[9px] font-mono text-black/40 ml-1">
                          +{entry.data.colors.length - 5}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Primary load actions row */}
                <div className="border-t border-black/5 pt-4 flex items-center justify-between mt-auto">
                  <span className="text-[9px] font-sans font-bold tracking-widest text-[#635BFF] uppercase bg-[#635BFF]/5 border border-[#635BFF]/10 px-2 py-0.5 rounded-full">
                    {entry.data.components?.length || 0} Components
                  </span>

                  <button
                    onClick={() => onSelectEntry(entry)}
                    className="px-4 py-2 bg-[#121212] hover:bg-black text-white text-[10px] font-sans font-bold tracking-wider uppercase transition-colors flex items-center gap-1 select-none cursor-pointer"
                  >
                    <span>Restore Specs</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
