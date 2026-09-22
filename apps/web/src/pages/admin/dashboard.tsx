import { Link } from "react-router";
import { calculateRank, nextRankXp, rankXpMap } from "@horizon/shared";
import { useAuth } from "../../hooks/use-auth";
import { useResource } from "../../hooks/use-resource";
import { LoadingState, ErrorState } from "../../components/page-state";
import { HorizonMark, Icon, type IconName } from "../../components/brand";
import { activityLabels } from "../../lib/activity";
import { formatDateTime } from "../../lib/date";

type Activity = { id: string; type: string; createdAt: string };
export default function Dashboard() {
  const { user } = useAuth();
  const activities = useResource<{ activities: Activity[] }>("/profile/activity");
  const quests = useResource<{ instances: { status: string }[] }>("/quests/my");
  const profile = user?.guildProfile;
  if (activities.loading || quests.loading) return <LoadingState message="Preparando sua jornada..." />;
  if (activities.error || quests.error) return <ErrorState message={activities.error || quests.error} />;
  if (!profile) return null;
  const count = (status: string) => quests.data?.instances.filter(item => item.status === status).length ?? 0;
  const currentRank = calculateRank(profile.currentXp);
  const nextXp = nextRankXp(currentRank);
  const progress = nextXp ? Math.min(100, Math.max(0, (profile.currentXp - rankXpMap[currentRank]) / (nextXp - rankXpMap[currentRank]) * 100)) : 100;
  const stats: { label: string; value: number; note: string; icon: IconName }[] = [
    { label: "Experiência", value: profile.currentXp, note: `Sua evolução · Rank ${currentRank}`, icon: "chart" },
    { label: "Em andamento", value: count("in_progress"), note: "O próximo passo é seu", icon: "quests" },
    { label: "Em revisão", value: count("submitted"), note: "Aguardando a guilda", icon: "shield" },
    { label: "Concluídas", value: count("completed"), note: "Desafios que viraram conquistas", icon: "trophy" },
  ];
  return <div className="space-y-7">
    <section className="journey-hero"><HorizonMark className="hero-emblem" /><div className="hero-copy"><p className="eyebrow">SEU MAPA DE AVENTURA</p><h1>Vamos além, {profile.adventurerName}.</h1><p>Cada desafio abre um novo caminho. Escolha sua próxima missão e transforme o que você sabe no que você pode construir.</p><div className="hero-actions"><Link className="hq-button" to="/dashboard/quests">Explorar missões<Icon name="arrow" /></Link><Link className="hq-button secondary" to="/dashboard/quests/my">Continuar minha jornada</Link></div></div></section>
    <section className="stat-grid" aria-label="Resumo da jornada">{stats.map(stat => <article className="stat-card" key={stat.label}><div className="stat-top"><span>{stat.label}</span><Icon name={stat.icon} /></div><p className="stat-value">{stat.value.toLocaleString("pt-BR")}</p><p className="stat-note">{stat.note}</p></article>)}</section>
    <div className="dashboard-columns"><section className="hq-panel"><div className="section-heading"><h2>Os últimos passos</h2><Link to="/dashboard/activity" className="text-link">Ver histórico<Icon name="arrow" /></Link></div>{activities.data?.activities.length ? activities.data.activities.slice(0, 5).map(activity => <div className="activity-row" key={activity.id}><span className="activity-dot"><Icon name={activity.type.includes("completed") ? "trophy" : "history"} /></span><div><p>{activityLabels[activity.type] ?? activity.type}</p><time>{formatDateTime(activity.createdAt)}</time></div></div>) : <div className="py-6 text-sm leading-7 text-neutral-400">Sua história começa no primeiro passo. Complete seu perfil ou inicie uma missão para registrar suas primeiras conquistas.</div>}</section>
      <div className="space-y-6"><section className="hq-panel"><div className="section-heading"><div><p className="eyebrow">EM CONSTANTE EVOLUÇÃO</p><h2 className="mt-3">Aventureiro de rank {currentRank}</h2></div><span className="rank-chip">{currentRank}</span></div><div role="progressbar" aria-label="Progresso até o próximo rank" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-neutral-800"><div className="h-full rounded-full bg-blue-400 transition-all duration-700" style={{ width: `${progress}%` }} /></div><p className="mt-3 text-xs text-neutral-400">{nextXp ? `${(nextXp - profile.currentXp).toLocaleString("pt-BR")} XP para alcançar o próximo rank.` : "Você alcançou o maior rank da guilda."}</p><Link to="/dashboard/achievements" className="text-link mt-3">Descobrir conquistas<Icon name="arrow" /></Link></section>
      <section className="hq-panel"><h2 className="text-lg font-bold">Além das missões</h2>{([{ path: "projects", title: "Construa em equipe", description: "Ideias que ganham vida na guilda", icon: "project" }, { path: "journal", title: "Registre a jornada", description: "Um espaço só seu para aprender", icon: "book" }, { path: "tavern", title: "Encontre sua guilda", description: "Uma conversa, novas possibilidades", icon: "chat" }] as const).map(item => <Link key={item.path} to={`/dashboard/${item.path}`} className="guild-shortcut"><Icon name={item.icon} /><div><strong>{item.title}</strong><small>{item.description}</small></div><Icon name="arrow" /></Link>)}</section></div>
    </div>
  </div>;
}
