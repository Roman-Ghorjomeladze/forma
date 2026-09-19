// Stroke icons on a 24px grid (inline SVG so they recolor with currentColor).
interface IconProps { size?: number; strokeWidth?: number; className?: string }

function Icon({ size = 22, strokeWidth = 2, className, children }: IconProps & { children: unknown }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children as any}
    </svg>
  );
}

export const IconHome = (p: IconProps) => <Icon {...p}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></Icon>;
export const IconMeals = (p: IconProps) => <Icon {...p}><path d="M4 3v18" /><path d="M4 3c3 0 4 2 4 5s-1 5-4 5" /><path d="M14 3l-2 8h6l-2-8" /><path d="M15 11v10" /></Icon>;
export const IconDumbbell = (p: IconProps) => <Icon {...p}><path d="M6 8v8" /><path d="M18 8v8" /><path d="M3 10v4" /><path d="M21 10v4" /><path d="M6 12h12" /></Icon>;
export const IconSettings = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></Icon>;
export const IconPlus = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const IconMinus = (p: IconProps) => <Icon {...p}><path d="M5 12h14" /></Icon>;
export const IconBack = (p: IconProps) => <Icon {...p}><path d="M15 5l-7 7 7 7" /></Icon>;
export const IconChevron = (p: IconProps) => <Icon {...p}><path d="M9 5l7 7-7 7" /></Icon>;
export const IconChevronDown = (p: IconProps) => <Icon {...p}><path d="M5 9l7 7 7-7" /></Icon>;
export const IconClose = (p: IconProps) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>;
export const IconCheck = (p: IconProps) => <Icon {...p}><path d="M5 12l5 5L20 7" /></Icon>;
export const IconEdit = (p: IconProps) => <Icon {...p}><path d="M4 20h4l10-10-4-4L4 16z" /><path d="M13 7l4 4" /></Icon>;
export const IconTrash = (p: IconProps) => <Icon {...p}><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></Icon>;
export const IconCopy = (p: IconProps) => <Icon {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a1 1 0 0 1 1-1h10" /></Icon>;
export const IconPlay = (p: IconProps) => <Icon {...p}><path d="M7 4l12 8-12 8z" fill="currentColor" stroke="none" /></Icon>;
export const IconPause = (p: IconProps) => <Icon {...p}><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor" stroke="none" /></Icon>;
export const IconNext = (p: IconProps) => <Icon {...p}><path d="M15 5h3v14h-3zM4 5l10 7-10 7z" fill="currentColor" stroke="none" /></Icon>;
export const IconPrev = (p: IconProps) => <Icon {...p}><path d="M6 5h3v14H6zM20 5l-10 7 10 7z" fill="currentColor" stroke="none" /></Icon>;
export const IconClock = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>;
export const IconFlame = (p: IconProps) => <Icon {...p}><path d="M12 3c1 4-3 5-3 9a3 3 0 0 0 6 0c0-2-1-3-1-3s3 2 3 5a5 5 0 0 1-10 0c0-5 5-6 5-11z" /></Icon>;
export const IconRepeat = (p: IconProps) => <Icon {...p}><path d="M4 4v6h6" /><path d="M20 20v-6h-6" /><path d="M4 10a8 8 0 0 1 14-3l2 3" /><path d="M20 14a8 8 0 0 1-14 3l-2-3" /></Icon>;
export const IconHourglass = (p: IconProps) => <Icon {...p}><path d="M6 4h12M6 20h12M8 4c0 6 8 6 8 12M16 4c0 6-8 6-8 12" /></Icon>;
export const IconDrag = (p: IconProps) => <Icon {...p}><path d="M5 8h14M5 12h14M5 16h14" /></Icon>;
export const IconCart = (p: IconProps) => <Icon {...p}><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6L5 3H2" /><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /></Icon>;
export const IconCalendar = (p: IconProps) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></Icon>;
export const IconHeart = (p: IconProps & { filled?: boolean }) => <Icon {...p}><path d="M12 20s-8-5-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6-8 11-8 11z" fill={p.filled ? 'currentColor' : 'none'} /></Icon>;
export const IconSearch = (p: IconProps) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></Icon>;
export const IconVolume = (p: IconProps & { off?: boolean }) => <Icon {...p}><path d="M11 5L6 9H3v6h3l5 4z" />{p.off ? <path d="M16 9l5 6M21 9l-5 6" /> : <path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" />}</Icon>;
export const IconImage = (p: IconProps) => <Icon {...p}><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-8 8" /></Icon>;
export const IconDownload = (p: IconProps) => <Icon {...p}><path d="M12 4v11" /><path d="M7 10l5 5 5-5" /><path d="M4 20h16" /></Icon>;
export const IconUpload = (p: IconProps) => <Icon {...p}><path d="M12 15V4" /><path d="M7 9l5-5 5 5" /><path d="M4 20h16" /></Icon>;
export const IconSun = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Icon>;
export const IconMoon = (p: IconProps) => <Icon {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></Icon>;
export const IconInfo = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Icon>;
export const IconHistory = (p: IconProps) => <Icon {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 8v4l3 2" /></Icon>;
export const IconMore = (p: IconProps) => <Icon {...p}><circle cx="5" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="19" cy="12" r="1.5" fill="currentColor" /></Icon>;
export const IconShare = (p: IconProps) => <Icon {...p}><path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" /></Icon>;
export const IconBowl = (p: IconProps) => <Icon {...p}><path d="M3 12a9 9 0 0 0 18 0" /><path d="M3 12h18" /><path d="M12 3v3" /></Icon>;
export const IconTarget = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></Icon>;
export const IconUser = (p: IconProps) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></Icon>;
export const IconStar = (p: IconProps) => <Icon {...p}><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" /></Icon>;
export const IconCamera = (p: IconProps) => <Icon {...p}><path d="M4 8h3l2-3h6l2 3h3v12H4z" /><circle cx="12" cy="13" r="3.5" /></Icon>;
export const IconMusic = (p: IconProps & { off?: boolean }) => <Icon {...p}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" />{p.off && <path d="M3 3l18 18" />}</Icon>;
export const IconMic = (p: IconProps & { off?: boolean }) => <Icon {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" />{p.off && <path d="M3 3l18 18" />}</Icon>;

// ---- launcher / Pocket / Family Tree ----
export const IconApps = (p: IconProps) => <Icon {...p}><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></Icon>;
export const IconWallet = (p: IconProps) => <Icon {...p}><path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v3H3z" /><path d="M3 10v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8z" /><circle cx="16.5" cy="15" r="1.4" fill="currentColor" stroke="none" /></Icon>;
export const IconTree = (p: IconProps) => <Icon {...p}><circle cx="12" cy="5" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M12 7.5V12M12 12H6v3.5M12 12h6v3.5" /></Icon>;
export const IconTag = (p: IconProps) => <Icon {...p}><path d="M3 12V4h8l9 9-8 8z" /><circle cx="7.5" cy="8.5" r="1.4" fill="currentColor" stroke="none" /></Icon>;
export const IconFit = (p: IconProps) => <Icon {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></Icon>;
export const IconLayers = (p: IconProps) => <Icon {...p}><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></Icon>;
export const IconArrowUp = (p: IconProps) => <Icon {...p}><path d="M12 19V5M5 12l7-7 7 7" /></Icon>;
export const IconArrowDown = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12l7 7 7-7" /></Icon>;
export const IconSiblings = (p: IconProps) => <Icon {...p}><circle cx="7" cy="9" r="3" /><circle cx="17" cy="9" r="3" /><path d="M2 20a5 5 0 0 1 10 0M12 20a5 5 0 0 1 10 0" /></Icon>;
export const IconUsers = (p: IconProps) => <Icon {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2 20a7 7 0 0 1 14 0" /><path d="M16 4a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-5-6.7" /></Icon>;
export const IconFilter = (p: IconProps) => <Icon {...p}><path d="M4 5h16l-6 8v6l-4-2v-4z" /></Icon>;
export const IconFile = (p: IconProps) => <Icon {...p}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></Icon>;
export const IconLink = (p: IconProps) => <Icon {...p}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></Icon>;

/** Icons available for Pocket categories, drawn by key. */
export function CategoryGlyph({ name, size = 20 }: { name: string; size?: number }) {
  const p = { size };
  switch (name) {
    case 'wrench': return <Icon {...p}><path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.4 2.4-2.1-.5-.5-2.1z" /></Icon>;
    case 'sofa': return <Icon {...p}><path d="M4 12V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" /><path d="M2 12h20v6H2z" /><path d="M6 18v2M18 18v2" /></Icon>;
    case 'hammer': return <Icon {...p}><path d="M14 4l6 6-2 2-6-6z" /><path d="M12 6L4 14l6 6 8-8" /></Icon>;
    case 'tag': return <IconTag {...p} />;
    case 'truck': return <Icon {...p}><path d="M2 6h12v10H2z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="6" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></Icon>;
    case 'bolt': return <Icon {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></Icon>;
    case 'drop': return <Icon {...p}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></Icon>;
    case 'paint': return <Icon {...p}><path d="M4 4h12v5H4z" /><path d="M16 6h3v5H9v3" /><path d="M8 14h2v6H8z" /></Icon>;
    case 'home': return <IconHome {...p} />;
    case 'doc': return <IconFile {...p} />;
    case 'cart': return <IconCart {...p} />;
    case 'heart': return <IconHeart {...p} />;
    case 'gift': return <Icon {...p}><rect x="3" y="8" width="18" height="4" /><path d="M5 12v9h14v-9M12 8v13" /><path d="M12 8c-2-4-6-4-6-1s4 1 6 1zM12 8c2-4 6-4 6-1s-4 1-6 1z" /></Icon>;
    case 'car': return <Icon {...p}><path d="M4 16l1.5-6h13L20 16" /><path d="M3 16h18v4h-2l-1-2H6l-1 2H3z" /></Icon>;
    case 'plane': return <Icon {...p}><path d="M2 14l8-2 4-8 2 1-2 8 7 2-1 2-7-1-3 5H8l1-6-7 1z" /></Icon>;
    default: return <Icon {...p}><path d="M3 8l9-4 9 4v9l-9 4-9-4z" /><path d="M3 8l9 4 9-4M12 12v9" /></Icon>;
  }
}
