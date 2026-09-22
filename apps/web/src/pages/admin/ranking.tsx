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
          Aventureiros ordenados por XP acumulado.
        </p>
      </div>

      {ranking.length === 0 ? (
        <EmptyState message="Ainda não há aventureiros no ranking." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-800">
          {ranking.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 sm:gap-4 border-b border-neutral-800 bg-neutral-900 p-4 last:border-b-0"
            >
              <span className="w-9 shrink-0 text-center text-xl font-bold text-yellow-400">
                #{entry.position}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{entry.adventurerName}</p>
                <p className="text-sm text-neutral-400">
                  {entry.className ?? "Sem classe"} · Rank {entry.rank}
                </p>
              </div>
              <span className="shrink-0 text-sm sm:text-base font-bold text-green-400">
                {entry.currentXp} XP
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
