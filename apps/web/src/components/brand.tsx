export function HorizonMark({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M32 3 57 17v30L32 61 7 47V17L32 3Z" stroke="currentColor" strokeWidth="2" /><path d="M17 39 32 17l15 22H17Z" fill="currentColor" opacity=".15" /><path d="m17 39 15-22 15 22M12 44h40M22 50h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="32" cy="30" r="4" fill="currentColor" /></svg>;
}

export function Brand() {
  return <span className="brand"><HorizonMark className="brand-mark" /><span><strong>Horizon<span>Quest</span></strong><small>DESENVOLVA SUA JORNADA</small></span></span>;
}

const paths = {
  home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  quests: "m14 3 7 0v7L9 22l-7-7L14 3ZM14 3l7 7M3 21l3-3",
  book: "M4 3h6l2 2 2-2h6v17h-6l-2 2-2-2H4V3Zm8 2v17",
  trophy: "M8 3h8v8a4 4 0 0 1-8 0V3Zm0 2H3v3a4 4 0 0 0 5 4m8-7h5v3a4 4 0 0 1-5 4M12 15v6m-5 0h10",
  chart: "M4 21V11h4v10m2 0V3h4v18m2 0V7h4v14M2 21h20",
  project: "M3 7h7l2-3h9v16H3V7Zm5 5h8m-8 4h5",
  chat: "M4 3h16v14H9l-5 4V3Zm4 5h8m-8 4h5",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
  history: "M3 10a9 9 0 1 1 1 7M3 4v6h6m3-4v6l4 2",
  shield: "m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Zm-4 10 3 3 5-6",
  grid: "M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "m6 6 12 12M6 18 18 6",
  logout: "M9 3H4v18h5m5-14 5 5-5 5M9 12h12",
};
export type IconName = keyof typeof paths;
export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return <svg className={`hq-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
