import {
  EmptyState,
  LoadingState,
  ErrorState,
} from "../../components/page-state";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

type RankingEntry = {
  id: string;
  position: number;
  adventurerName: string;
  currentXp: number;
  rank: string;
  className?: string | null;
  avatarUrl?: string | null;
  hqCoins?: number;
  equippedTitle?: string | null;
  equippedFrame?: string | null;
  equippedBadge?: string | null;
  equippedTheme?: string | null;
};

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let canceled = false;

    api
      .get("/profile/ranking")
      .then((res) => {
        if (!canceled) setRanking(res.ranking);
      })
      .catch((err) => {
        if (!canceled)
          setError(
            err instanceof Error ? err.message : "Erro ao carregar ranking.",
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
  if (error) return <ErrorState message={error} />;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Ranking da Guilda</h1>
        <p className="text-neutral-400 mt-2">
          Aventureiros da guilda ordenados por XP acumulado e distinções honoríficas.
        </p>
      </div>

      {ranking.length === 0 ? (
        <EmptyState message="Ainda não há aventureiros no ranking." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-800">
          {ranking.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center gap-3 sm:gap-4 border-b border-neutral-800 p-4 last:border-b-0 card-theme ${
                entry.equippedTheme ?? "bg-neutral-900"
              }`}
            >
              <span className="w-9 shrink-0 text-center text-xl font-bold text-yellow-400">
                #{entry.position}
              </span>

              <div
                className={`player-avatar avatar-frame ${entry.equippedFrame ?? ""} w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm bg-[#162734] shrink-0 text-[#edbf6b]`}
              >
                {entry.avatarUrl ? (
                  <img
                    src={entry.avatarUrl}
                    alt={entry.adventurerName}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  entry.adventurerName[0]?.toUpperCase() ?? "A"
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className={`font-semibold ${
                      entry.equippedBadge ? `badge-text ${entry.equippedBadge}` : ""
                    }`}
                  >
                    {entry.adventurerName}
                  </p>
                  {entry.equippedTitle && (
                    <span className="text-xs text-amber-300/90 italic hidden sm:inline">
                      « {entry.equippedTitle} »
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400">
                  {entry.className ?? "Sem classe"} · Rank {entry.rank}
                </p>
              </div>

              <span className="shrink-0 text-sm sm:text-base font-bold text-green-400">
                {entry.currentXp.toLocaleString("pt-BR")} XP
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
