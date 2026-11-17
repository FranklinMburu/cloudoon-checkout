// Minimal inline icon set (24×24, stroke-based). Icons are decorative and are
// always paired with a visible text label, so they are hidden from screen readers.

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Check = (p: IconProps) => <Svg {...p}><path d="M20 6 9 17l-5-5" /></Svg>;
export const X = (p: IconProps) => <Svg {...p}><path d="M18 6 6 18M6 6l12 12" /></Svg>;
export const ChevronDown = (p: IconProps) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>;
export const ChevronUp = (p: IconProps) => <Svg {...p}><path d="m18 15-6-6-6 6" /></Svg>;
export const ArrowLeft = (p: IconProps) => <Svg {...p}><path d="M19 12H5M12 19l-7-7 7-7" /></Svg>;
export const ArrowRight = (p: IconProps) => <Svg {...p}><path d="M5 12h14M12 5l7 7-7 7" /></Svg>;
export const Lock = (p: IconProps) => <Svg {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Svg>;
export const Search = (p: IconProps) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>;
export const Info = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></Svg>;
export const Alert = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></Svg>;
export const Trash = (p: IconProps) => <Svg {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></Svg>;
export const Plus = (p: IconProps) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const Minus = (p: IconProps) => <Svg {...p}><path d="M5 12h14" /></Svg>;
export const Tag = (p: IconProps) => <Svg {...p}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><path d="M7.5 7.5h.01" /></Svg>;
export const Globe = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></Svg>;
export const Server = (p: IconProps) => <Svg {...p}><rect x="3" y="3" width="18" height="8" rx="2" /><rect x="3" y="13" width="18" height="8" rx="2" /><path d="M7 7h.01M7 17h.01" /></Svg>;
export const Cloud = (p: IconProps) => <Svg {...p}><path d="M17.5 19H7a5 5 0 1 1 1.1-9.9A6 6 0 0 1 19.5 11 4 4 0 0 1 17.5 19Z" /></Svg>;
export const Layers = (p: IconProps) => <Svg {...p}><path d="m12 2 10 5-10 5L2 7l10-5Z" /><path d="m2 17 10 5 10-5M2 12l10 5 10-5" /></Svg>;
export const Cpu = (p: IconProps) => <Svg {...p}><rect x="5" y="5" width="14" height="14" rx="2" /><path d="M9 9h6v6H9zM9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4" /></Svg>;
export const Shield = (p: IconProps) => <Svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></Svg>;
export const Mail = (p: IconProps) => <Svg {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" /></Svg>;
export const Database = (p: IconProps) => <Svg {...p}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3" /></Svg>;
export const Zap = (p: IconProps) => <Svg {...p}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" /></Svg>;
export const Card = (p: IconProps) => <Svg {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></Svg>;
export const Phone = (p: IconProps) => <Svg {...p}><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M11 18h2" /></Svg>;
export const Key = (p: IconProps) => <Svg {...p}><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.7 12.3 9.3-9.3M17 6l3 3M14 9l2 2" /></Svg>;
export const MapPin = (p: IconProps) => <Svg {...p}><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></Svg>;
export const Receipt = (p: IconProps) => <Svg {...p}><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 .7V2l-1 .7-3-2-3 2-3-2-3 2-3-2Z" /><path d="M8 7h8M8 11h8M8 15h5" /></Svg>;

export function Spinner({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`animate-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* Brand marks for OAuth buttons (official colours, simplified). */
export const GoogleMark = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8Z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
    <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
  </svg>
);

export const GitHubMark = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.7 1.7.3 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
  </svg>
);
