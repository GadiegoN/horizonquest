import { useEffect, useRef, useState } from "react";
import { NavLink, Link, Outlet, Navigate, useLocation } from "react-router";
import { useAuth } from "../hooks/use-auth";
import { ErrorState, LoadingState } from "../components/page-state";
import { Brand, Icon, type IconName } from "../components/brand";

type Item = { path: string; label: string; icon: IconName; roles?: string[] };
const groups: { label: string; items: Item[] }[] = [
  { label: "SUA JORNADA", items: [
    { path: "", label: "Visão geral", icon: "home" },
    { path: "quests", label: "Explorar missões", icon: "quests" },
    { path: "quests/my", label: "Minhas missões", icon: "book" },
    { path: "achievements", label: "Conquistas", icon: "trophy" },
    { path: "ranking", label: "Ranking", icon: "chart" },
  ] },
  { label: "NA GUILDA", items: [
    { path: "projects", label: "Projetos", icon: "project" },
    { path: "journal", label: "Diário", icon: "book" },
    { path: "tavern", label: "Taverna", icon: "chat" },
    { path: "activity", label: "Histórico", icon: "history" },
  ] },
  { label: "GESTÃO DA GUILDA", items: [
    { path: "quests/review", label: "Revisar missões", icon: "shield", roles: ["admin", "reviewer"] },
    { path: "quest-templates", label: "Templates", icon: "quests", roles: ["admin"] },
    { path: "classes", label: "Classes", icon: "grid", roles: ["admin"] },
    { path: "audit", label: "Auditoria", icon: "shield", roles: ["admin"] },
  ] },
];

export default function DashboardLayout() {
  const { logout, user, loading, isAuthenticated, error } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = drawer.current;
    if (!menuOpen || !dialog) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const media = window.matchMedia("(min-width: 1100px)");
    const closeOnDesktop = () => { if (media.matches) setMenuOpen(false); };
    media.addEventListener("change", closeOnDesktop);
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; media.removeEventListener("change", closeOnDesktop); };
  }, [menuOpen]);
  if (loading) return <div className="boot-screen"><Brand /><LoadingState /></div>;
  if (error && !user) return <div className="boot-screen"><Brand /><ErrorState message={error} /></div>;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  const profile = user?.guildProfile;
  const current = groups.flatMap(group => group.items).filter(item => item.path && pathname.startsWith(`/dashboard/${item.path}`)).sort((a, b) => b.path.length - a.path.length)[0];
  const pageTitle = pathname === "/dashboard/profile" ? "Meu perfil" : current?.label ?? "Visão geral";
  const navigation = <>
    <div className="sidebar-brand"><Link to="/dashboard" onClick={() => setMenuOpen(false)} aria-label="HorizonQuest — início"><Brand /></Link></div>
    <nav aria-label="Navegação principal" className="guild-nav">{groups.map(group => {
      const items = group.items.filter(item => !item.roles || item.roles.includes(user?.role ?? "user"));
      return items.length > 0 && <div key={group.label} className="nav-group"><p className="nav-label">{group.label}</p>{items.map(item => <NavLink key={item.path} end={item.path === "" || item.path === "quests"} to={`/dashboard${item.path ? `/${item.path}` : ""}`} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`}><Icon name={item.icon} /><span>{item.label}</span></NavLink>)}</div>;
    })}</nav>
    <div className="sidebar-footer"><Link className="player-link" to="/dashboard/profile" onClick={() => setMenuOpen(false)}><span className="player-avatar">{profile?.adventurerName?.slice(0, 1).toUpperCase() ?? "A"}</span><span className="player-name"><strong>{profile?.adventurerName}</strong><small>Rank {profile?.rank ?? "D"} · Meu perfil</small></span></Link><button className="icon-button" aria-label="Sair da conta" onClick={() => { setMenuOpen(false); logout(); }}><Icon name="logout" /></button></div>
  </>;
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
    <aside className="desktop-sidebar">{navigation}</aside>
    <dialog ref={drawer} className="mobile-drawer" aria-label="Menu da guilda" onCancel={() => setMenuOpen(false)} onClose={() => setMenuOpen(false)} onClick={event => { if (event.target === event.currentTarget) setMenuOpen(false); }}><div className="drawer-content"><button className="icon-button drawer-close" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}><Icon name="close" /></button>{navigation}</div></dialog>
    <div className="app-workspace"><header className="app-header"><div className="header-location"><button className="icon-button menu-toggle" aria-label="Abrir menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Icon name="menu" /></button><span className="header-guild">Guilda <span>/</span></span><span className="header-title">{pageTitle}</span></div><Link className="header-profile" to="/dashboard/profile"><span className="xp-chip">{(profile?.currentXp ?? 0).toLocaleString("pt-BR")} <small>XP</small></span><span className="rank-chip">{profile?.rank ?? "D"}</span><span className="sr-only">Ver meu perfil</span></Link></header>
    <main id="main-content" tabIndex={-1} className="page-content">{error && <ErrorState message={error} />}<Outlet /></main><footer className="app-footer"><span>HORIZONQUEST</span><span>Uma missão de cada vez.</span></footer></div>
  </div>;
}
