import { DesignSystemData } from "./types";

export const DEFAULT_STITCH_DATA: DesignSystemData = {
  appName: "Google Stitch Design",
  description: "The authoritative visual language ruleset powering Google's interactive developer utilities and workspace properties. Evaluated on extreme typographic layout density, strict monospace labels, and high-contrast WCAG-compliant color systems.",
  markdownContent: `# Stitch Web Visual Standards

Welcome to the Stitch Web specifications guide. This documentation compiles the authoritative visual variables, color schemas, density rules, and components used across Google Developer networks.

## Core Directives
1. **Typographic Contrast**: Perfect AA or AAA scores on deep ink types.
2. **Technical Accents**: Utilizing monospace tracking for metadata pill indicators.
3. **Structured Sizing**: Strict 8-pixel container padding boundaries.
4. **Elevation Honesty**: Prefer clean borders and flat fills over extensive shadows.
`,
  colors: [
    {
      hex: "#1A73E8",
      name: "Stitch Blue Prime",
      category: "Brand Accent",
      usage: "Primary interactive triggers, action buttons, hyperlinked paths, and keyboard focus outlines."
    },
    {
      hex: "#121212",
      name: "High Contrast Ink",
      category: "Core Editorial text",
      usage: "Primary typographic headings, active interface copy, titles, and legible table texts."
    },
    {
      hex: "#3C4043",
      name: "Muted Steel Charcoal",
      category: "Neutral Content",
      usage: "Standard documentation secondary paragraphs, subheadings, and status indicators."
    },
    {
      hex: "#FAF9F6",
      name: "Minimal Warm Offset",
      category: "Core Canvas Backspace",
      usage: "Primary application backdrops, sidebar sheets, and ambient sections."
    },
    {
      hex: "#F8F9FA",
      name: "Stitch Surface Gray",
      category: "Surface Material",
      usage: "Subtle component bounding boxes, card frames, code previewers, and data panels."
    },
    {
      hex: "#E8F0FE",
      name: "Light Blue Bleed",
      category: "Decorative Accent",
      usage: "Light inline highlights, focused active menu items, and alert badge backgrounds."
    }
  ],
  typography: [
    {
      element: "H1 / Display Header",
      fontName: "Google Sans Display / Inter",
      size: "32px",
      weight: "700 Bold",
      usage: "Primary section landing highlights, promotional headers, and main title blocks."
    },
    {
      element: "H2 / System Section",
      fontName: "Google Sans / Inter",
      size: "20px",
      weight: "600 SemiBold",
      usage: "Interactive tab containers, visual index guides, and category section headers."
    },
    {
      element: "H3 / Module Subtitle",
      fontName: "Google Sans / Serif Italic",
      size: "16px",
      weight: "500 Medium",
      usage: "Functional card headers, settings panel labels, and summary statistics."
    },
    {
      element: "Body Copy text",
      fontName: "Roboto / Inter sans-serif",
      size: "14px",
      weight: "400 Normal",
      usage: "Extensive descriptive documentation copy, paragraphs, and detail specs."
    },
    {
      element: "Monospace code block",
      fontName: "JetBrains Mono / Source Code Pro",
      size: "12px",
      weight: "500 Medium",
      usage: "Inline design token descriptors, code strings, variables, and tabular lists."
    }
  ],
  components: [
    {
      componentName: "Stitch Status Hero Grid",
      explanation: "A clean, high-contrast grid display compiling critical active parameters with high density border lines and elegant metadata pills.",
      tailwindCode: `<div class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-2xl bg-white border border-[#121212]/10 rounded-2xl p-6 text-left shadow-sm">
  <div class="border-b md:border-b-0 md:border-r border-[#121212]/5 pb-4 md:pb-0 md:pr-4">
    <span class="text-[9px] font-mono uppercase tracking-widest text-[#121212]/40 block mb-1">Contrast Score</span>
    <span class="text-2xl font-serif font-black italic text-[#121212] block">14.2 : 1</span>
    <p class="text-[10px] text-[#121212]/60 mt-1">Perfect AAA WCAG compliance across all layouts.</p>
  </div>
  <div class="border-b md:border-b-0 md:border-r border-[#121212]/5 py-4 md:py-0 md:px-4">
    <span class="text-[9px] font-mono uppercase tracking-widest text-[#121212]/40 block mb-1">Active Rules</span>
    <span class="text-2xl font-serif font-black italic text-[#1A73E8] block">Stitch v3</span>
    <p class="text-[10px] text-[#121212]/60 mt-1">Configured for Google Developer experience standards.</p>
  </div>
  <div class="pt-4 md:pt-0 md:pl-4">
    <span class="text-[9px] font-mono uppercase tracking-widest text-[#121212]/40 block mb-1">Tokens Monitored</span>
    <span class="text-2xl font-serif font-black italic text-[#121212] block">42 Items</span>
    <p class="text-[10px] text-[#121212]/60 mt-1">Validated across active CSS properties.</p>
  </div>
</div>`
    },
    {
      componentName: "Interactive Tabbed Deck",
      explanation: "A modular, highly accessible tab section featuring clean buttons, descriptive subtitle lines, and micro active notifications in Stitch Blue.",
      tailwindCode: `<div class="flex flex-col space-y-4 w-full max-w-md bg-[#FAF9F6] border border-[#121212]/15 rounded-3xl p-6 text-left">
  <div class="flex items-center justify-between border-b border-[#121212]/5 pb-3">
    <div class="flex gap-2">
      <span class="h-2 w-2 rounded-full bg-[#1A73E8]"></span>
      <span class="text-[9px] font-mono tracking-wider uppercase text-[#121212]/55">Stitch Dashboard Module</span>
    </div>
    <span class="text-[8px] font-mono font-bold bg-[#1A73E8]/10 text-[#1A73E8] px-2 py-0.5 rounded">Active</span>
  </div>
  <h4 class="text-lg font-serif font-bold italic text-[#121212]">Typography Scaler View</h4>
  <p class="text-xs text-[#121212]/70 leading-relaxed font-serif">
    Select standard text multipliers or preview layout sizes on device viewpoints. This component maintains crisp rendering even on high density screens.
  </p>
  <div class="flex gap-3 pt-2">
    <button class="flex-1 py-2 bg-[#121212] hover:bg-black text-white text-[10px] font-sans font-bold tracking-wider uppercase rounded-xl transition-all">
      Save Config
    </button>
    <button class="flex-1 py-2 bg-white hover:bg-[#FAF9F6] text-[#121212] border border-[#121212]/10 text-[10px] font-sans font-bold tracking-wider uppercase rounded-xl transition-all">
      Reset Scale
    </button>
  </div>
</div>`
    }
  ]
};
