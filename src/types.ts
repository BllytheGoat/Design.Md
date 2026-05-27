export interface ColorSwatch {
  hex: string;
  name: string;
  category: string;
  usage: string;
}

export interface TypographyToken {
  element: string;
  fontName: string;
  size: string;
  weight: string;
  usage: string;
}

export interface DesignComponent {
  componentName: string;
  tailwindCode: string;
  explanation: string;
}

export interface ContextDevBrandData {
  title?: string;
  domain?: string;
  slogan?: string;
  description?: string;
  logoUrl?: string;
  backdropUrl?: string;
  logoColors?: Array<{ hex: string; name: string }>;
  brandColors?: Array<{ hex: string; name: string }>;
  socials?: Array<{ type: string; url: string }>;
  address?: {
    street?: string;
    city?: string;
    state_province?: string;
    postal_code?: string;
    country?: string;
  };
  industries?: Array<{ industry: string; subindustry: string }>;
}

export interface DesignSystemData {
  appName: string;
  description: string;
  markdownContent: string;
  colors: ColorSwatch[];
  typography: TypographyToken[];
  components: DesignComponent[];
  isHeuristicFallback?: boolean;
  isLiveAnalysis?: boolean;
  rateLimitInfo?: string;
  contextDevBrandData?: ContextDevBrandData;
}

export interface HistoryEntry {
  id: string;
  url: string;
  timestamp: number;
  data: DesignSystemData;
}

