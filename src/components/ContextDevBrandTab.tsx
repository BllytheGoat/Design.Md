import { ContextDevBrandData } from "../types";
import { 
  Building2, 
  MapPin, 
  Link2, 
  Sparkles, 
  Globe, 
  ShieldCheck, 
  Compass,
  ArrowUpRight
} from "lucide-react";

interface ContextDevBrandTabProps {
  brandData?: ContextDevBrandData;
}

export function ContextDevBrandTab({ brandData }: ContextDevBrandTabProps) {
  if (!brandData) {
    return (
      <div id="no-brand-data" className="bg-[#FAF9F6] border border-black/10 p-8 rounded-3xl text-center max-w-lg mx-auto my-12">
        <Globe className="mx-auto text-black/40 mb-3" size={32} />
        <h4 className="font-serif font-bold text-lg text-black mb-1">
          No live brand intelligence fetched
        </h4>
        <p className="font-sans text-xs text-black/60 leading-relaxed">
          Provide a valid website URL and configure your <code className="bg-black/5 px-1 py-0.5 rounded">CONTEXT_DEV_API_KEY</code> to enable live, structured brand profiling directly from the Context.dev APIs network.
        </p>
      </div>
    );
  }

  const {
    title,
    domain,
    slogan,
    description,
    logoUrl,
    backdropUrl,
    brandColors,
    logoColors,
    socials,
    address,
    industries
  } = brandData;

  // Social icon/style resolver
  const getSocialStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case "x":
      case "twitter":
        return { bg: "bg-black hover:bg-black/80 text-white", label: "X" };
      case "linkedin":
        return { bg: "bg-[#0A66C2] hover:bg-[#0A66C2]/80 text-white", label: "LinkedIn" };
      case "github":
        return { bg: "bg-[#24292F] hover:bg-[#24292F]/80 text-white", label: "GitHub" };
      case "facebook":
        return { bg: "bg-[#1877F2] hover:bg-[#1877F2]/80 text-white", label: "Facebook" };
      case "instagram":
        return { bg: "bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] text-white", label: "Instagram" };
      case "youtube":
        return { bg: "bg-[#FF0000] hover:bg-[#FF0000]/80 text-white", label: "YouTube" };
      default:
        return { bg: "bg-neutral-100 hover:bg-neutral-200 text-black border border-black/5", label: type.toUpperCase() };
    }
  };

  return (
    <div id="context-dev-brand" className="space-y-8 animate-fade-in text-left">
      {/* Visual backdrop cover and primary brand launcher panel */}
      <div className="relative rounded-3xl overflow-hidden border border-black/15 bg-white shadow-sm">
        {backdropUrl ? (
          <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${backdropUrl})` }} />
        ) : (
          <div className="h-28 bg-gradient-to-r from-neutral-100 via-neutral-50 to-neutral-100" />
        )}

        <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-10 md:-mt-12 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-5">
            {logoUrl ? (
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white border border-black/10 rounded-2xl flex items-center justify-center p-3 shadow-md">
                <img 
                  src={logoUrl} 
                  alt={`${title} logo`} 
                  className="max-w-full max-h-full object-contain rounded-lg"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-20 h-20 md:w-24 md:h-24 bg-neutral-900 border border-black text-white rounded-2xl flex items-center justify-center font-serif text-3xl font-black shadow-md uppercase">
                {title ? title.charAt(0) : "B"}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-serif font-black text-3xl text-black tracking-tight leading-none">
                  {title || "Brand Profile"}
                </h4>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-sans font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border border-emerald-200/50 flex items-center gap-1">
                  <ShieldCheck size={10} />
                  <span>Context.dev Live</span>
                </span>
              </div>
              <p className="text-black/50 text-xs font-mono font-medium mt-1 flex items-center gap-1">
                <Globe size={11} className="text-black/30" />
                <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-0.5">
                  {domain}
                  <ArrowUpRight size={10} />
                </a>
              </p>
            </div>
          </div>

          <div className="flex-1 md:text-right max-w-sm">
            {slogan && (
              <p className="italic font-serif text-sm text-neutral-600 leading-snug border-l-2 md:border-l-0 md:border-r-2 border-[#635BFF] pl-3 md:pl-0 md:pr-3 py-0.5">
                “{slogan}”
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: General Brand Metadata & Description */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-black/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
            <div>
              <span className="text-[10px] font-sans tracking-widest font-black uppercase text-neutral-400 block mb-2">
                Profile Description
              </span>
              <p className="font-serif text-sm text-neutral-800 leading-relaxed text-pretty">
                {description || "No official visual profile summary returned from the verified registries."}
              </p>
            </div>

            {industries && industries.length > 0 && (
              <div className="pt-4 border-t border-black/5">
                <span className="text-[10px] font-sans tracking-widest font-black uppercase text-neutral-400 block mb-3">
                  Industry Classification
                </span>
                <div className="flex flex-wrap gap-2">
                  {industries.map((ind, i) => (
                    <div key={i} className="flex flex-col bg-neutral-50 border border-black/5 rounded-xl px-4 py-2 text-xs">
                      <span className="font-sans font-bold text-black/80 flex items-center gap-1">
                        <Building2 size={12} className="text-[#635BFF]" />
                        {ind.industry}
                      </span>
                      <span className="font-mono text-[10px] text-neutral-500 mt-0.5">
                        {ind.subindustry}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {address && (
              <div className="pt-4 border-t border-black/5">
                <span className="text-[10px] font-sans tracking-widest font-black uppercase text-neutral-400 block mb-3">
                  Headquarters
                </span>
                <div className="flex gap-2.5 text-xs text-neutral-700">
                  <MapPin size={14} className="text-black/40 mt-0.5 shrink-0" />
                  <div>
                    {address.street && <p className="font-sans">{address.street}</p>}
                    <p className="font-sans font-medium text-black">
                      {[address.city, address.state_province, address.postal_code].filter(Boolean).join(", ")}
                    </p>
                    {address.country && (
                      <p className="font-mono text-[10px] text-neutral-500 uppercase mt-0.5">
                        {address.country}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Connected Social Channels */}
          {socials && socials.length > 0 && (
            <div className="bg-white border border-black/10 rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
              <span className="text-[10px] font-sans tracking-widest font-black uppercase text-neutral-400 block">
                Verified Social Footprints
              </span>
              <div className="flex flex-wrap gap-2">
                {socials.map((soc, i) => {
                  const style = getSocialStyle(soc.type);
                  return (
                    <a
                      key={i}
                      href={soc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-4 py-2 rounded-xl text-xs font-sans tracking-wide font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-sm ${style.bg}`}
                    >
                      <Link2 size={12} />
                      <span>{style.label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Exact Colors Retonified */}
        <div className="space-y-6">
          <div className="bg-white border border-black/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
            <div>
              <div className="flex items-center gap-1.5 mb-1 bg-black/5 rounded-lg px-2 py-1 select-none w-max">
                <Compass size={11} className="text-[#635BFF]" />
                <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-neutral-600">
                  Official Brand Palette
                </span>
              </div>
              <h5 className="font-serif font-black text-xl text-black tracking-tight">
                Brand Colors
              </h5>
              <p className="text-black/50 text-[11px] font-sans mt-1">
                Exact hex codes associated with the target brand in Context.dev's global catalog.
              </p>
            </div>

            <div className="space-y-3">
              {brandColors && brandColors.length > 0 ? (
                brandColors.map((col, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-neutral-50 border border-black/5 p-2 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl shadow-inner border border-black/10" 
                        style={{ backgroundColor: col.hex }}
                      />
                      <div>
                        <p className="font-sans font-bold text-xs text-black">
                          {col.name || `Color #${idx + 1}`}
                        </p>
                        <p className="font-mono text-[10px] text-neutral-400 uppercase">
                          {col.hex}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigator.clipboard.writeText(col.hex)}
                      className="text-[9px] font-mono uppercase bg-white hover:bg-neutral-100 border border-black/10 text-neutral-600 font-bold px-2 py-1 rounded-lg cursor-pointer transition-all active:scale-95"
                    >
                      Copy
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-neutral-400 font-serif">No basic color tokens fetched.</p>
              )}
            </div>

            {logoColors && logoColors.length > 0 && (
              <div className="pt-6 border-t border-black/5">
                <h5 className="font-serif font-black text-lg text-black tracking-tight mb-3">
                  Logo Accent Colors
                </h5>
                <div className="space-y-3">
                  {logoColors.map((col, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-neutral-50 border border-black/5 p-2 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl shadow-inner border border-black/10" 
                          style={{ backgroundColor: col.hex }}
                        />
                        <div>
                          <p className="font-sans font-bold text-xs text-black">
                            {col.name || `Accent #${idx + 1}`}
                          </p>
                          <p className="font-mono text-[10px] text-neutral-400 uppercase">
                            {col.hex}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => navigator.clipboard.writeText(col.hex)}
                        className="text-[9px] font-mono uppercase bg-white hover:bg-neutral-100 border border-black/10 text-neutral-600 font-bold px-2 py-1 rounded-lg cursor-pointer transition-all active:scale-95"
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
