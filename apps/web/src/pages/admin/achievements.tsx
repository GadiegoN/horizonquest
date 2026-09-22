import { Icon } from "../../components/brand";
import {
  EmptyState,
  LoadingState,
  ErrorState,
} from "../../components/page-state";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/date";

type Achievement = {
  id: string;
  name: string;
  description: string;
  icon?: string | null;
  unlocked: boolean;
  unlockedAt?: string | null;
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;

    api
      .get("/profile/achievements")
      .then((res) => {
        if (!canceled) setAchievements(res.achievements);
      })
      .catch((err) => {
        if (!canceled)
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar os dados.",
          );
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, []);

  if (loading) return <LoadingState />;

  const unlockedCount = achievements.filter(
    (achievement) => achievement.unlocked,
  ).length;

  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Conquistas</h1>
        <p className="text-neutral-400 mt-2">
          {unlockedCount} de {achievements.length} desbloqueadas
        </p>
      </div>

      {achievements.length === 0 ? (
        <EmptyState message="Nenhuma conquista cadastrada." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {achievements.map((achievement) => (
            <article
              key={achievement.id}
              className={`rounded-xl border p-5 ${
                achievement.unlocked
                  ? "border-yellow-600 bg-yellow-950/30"
                  : "border-neutral-800 bg-neutral-900"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{achievement.name}</h2>
                  <p className="text-neutral-400 mt-2">
                    {achievement.description}
                  </p>
                </div>
                <span className="shrink-0 rounded-xl border border-neutral-700 bg-neutral-800 p-3 text-yellow-300" aria-hidden="true"><Icon name={achievement.unlocked ? "trophy" : "shield"} /></span>
              </div>
              <p className={`mt-4 text-xs font-semibold ${achievement.unlocked ? "text-yellow-300" : "text-neutral-400"}`}>{achievement.unlocked ? "CONQUISTA DESBLOQUEADA" : "AINDA POR CONQUISTAR"}</p>
              {achievement.unlockedAt && (
                <p className="text-xs text-yellow-300 mt-4">
                  Desbloqueada em {formatDate(achievement.unlockedAt)}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
