import { ErrorState, LoadingState } from "../../components/page-state";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/use-auth";
import { useToast } from "../../context/toast-context";

type ClassItem = { id: string; name: string; description?: string | null };

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [pageLoading, setPageLoading] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    adventurerName: "",
    classId: "",
    avatarUrl: "",
    bio: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, classRes] = await Promise.all([
          api.get("/profile/me"),
          api.get("/classes"),
        ]);
        setClasses(classRes.classes);
        setForm({
          adventurerName: profileRes.profile.adventurerName ?? "",
          classId: profileRes.profile.classId ?? "",
          avatarUrl: profileRes.profile.avatarUrl ?? "",
          bio: profileRes.profile.bio ?? "",
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao carregar perfil.",
        );
      } finally {
        setPageLoading(false);
      }
    }
    load();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await api.put("/profile/update", form);
      await refreshUser();
      showToast(
        res.xpGained
          ? `Perfil completo! +${res.xpGained} XP.`
          : "Perfil atualizado.",
      );
      setEditing(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao salvar perfil.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading || pageLoading)
    return <LoadingState message="Carregando perfil..." />;
  if (!user?.guildProfile)
    return <p className="text-red-400">Perfil não encontrado.</p>;

  const profile = user.guildProfile;
  const xp = profile.currentXp;
  const nextXp = profile.nextRankXp ?? xp;
  const previousXp =
    profile.rank === "D"
      ? 0
      : ((
          { C: 100, B: 250, A: 500, S: 1000, SS: 2000, SSS: 3500 } as Record<
            string,
            number
          >
        )[profile.rank] ?? 0);
  const progress =
    nextXp > previousXp
      ? Math.min(100, ((xp - previousXp) / (nextXp - previousXp)) * 100)
      : 100;

  return (
    <div className="max-w-5xl space-y-8">
      {error && <ErrorState message={error} />}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-linear-to-br from-blue-950 via-neutral-900 to-neutral-950 p-5 sm:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
          <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-blue-500/50 bg-neutral-800 flex items-center justify-center text-4xl font-bold text-blue-300">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              profile.adventurerName[0]?.toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm uppercase tracking-[0.2em] text-blue-300">
              Ficha de aventureiro
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold break-words">
              {profile.adventurerName}
            </h1>
            <p className="mt-2 text-neutral-400">
              {profile.className ?? "Sem classe definida"}
            </p>
          </div>
          <div className="rounded-xl border border-blue-400/20 bg-black/20 px-8 py-4 text-center">
            <p className="text-xs uppercase tracking-widest text-neutral-400">
              Rank
            </p>
            <p className="text-5xl font-black text-blue-300">{profile.rank}</p>
          </div>
        </div>
        <div className="relative mt-8">
          <div className="mb-2 flex flex-wrap gap-2 justify-between text-sm">
            <span className="text-neutral-300">Progressão de XP</span>
            <span className="text-green-400">
              {xp} XP {profile.nextRankXp ? `/ ${profile.nextRankXp}` : ""}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full rounded-full bg-linear-to-r from-blue-600 to-cyan-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {profile.nextRankXp
              ? `${Math.max(profile.nextRankXp - xp, 0)} XP até o próximo rank`
              : "Rank máximo alcançado"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="text-sm text-neutral-400">Quests concluídas</p>
          <p className="mt-2 text-3xl font-bold">
            {profile.stats?.totalQuestsCompleted ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="text-sm text-neutral-400">XP acumulado</p>
          <p className="mt-2 text-3xl font-bold text-green-400">
            {profile.stats?.totalXp ?? xp}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="text-sm text-neutral-400">Conquistas</p>
          <p className="mt-2 text-3xl font-bold">
            {profile.stats?.totalAchievements ?? 0}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Sobre o aventureiro</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Informações públicas do seu perfil.
            </p>
          </div>
          <button
            onClick={() => setEditing((value) => !value)}
            className="rounded-md bg-blue-600 px-4 py-2 hover:bg-blue-500"
          >
            {editing ? "Fechar edição" : "Editar perfil"}
          </button>
        </div>
        <p className="mt-6 whitespace-pre-wrap text-neutral-300">
          {profile.bio || "Este aventureiro ainda não escreveu uma biografia."}
        </p>
      </section>

      {editing && (
        <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
          <h2 className="text-2xl font-bold">Editar perfil</h2>
          {error && <p className="mt-4 text-red-400">{error}</p>}
          <form
            onSubmit={handleSubmit}
            className="mt-6 grid gap-4 md:grid-cols-2"
          >
            <label className="space-y-1 text-sm text-neutral-300">
              Nome de aventureiro
              <input
                required
                minLength={3}
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2"
                value={form.adventurerName}
                onChange={(e) =>
                  setForm({ ...form, adventurerName: e.target.value })
                }
              />
            </label>
            <label className="space-y-1 text-sm text-neutral-300">
              Classe
              <select
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2"
                value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value })}
              >
                <option value="">Selecione uma classe</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm text-neutral-300 md:col-span-2">
              Avatar (URL)
              <input
                type="url"
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2"
                value={form.avatarUrl}
                onChange={(e) =>
                  setForm({ ...form, avatarUrl: e.target.value })
                }
              />
            </label>
            <label className="space-y-1 text-sm text-neutral-300 md:col-span-2">
              Biografia
              <textarea
                maxLength={300}
                rows={4}
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </label>
            <button
              disabled={saving}
              className="rounded-md bg-green-600 px-4 py-2 font-medium hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-neutral-700 md:col-span-2"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
