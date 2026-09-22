import { activityLabels as labels } from "../../lib/activity";
import { Link } from "react-router";
import {
  EmptyState,
  LoadingState,
  ErrorState,
} from "../../components/page-state";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/date";

type Activity = {
  id: string;
  type: string;
  meta?: Record<string, unknown> | null;
  createdAt: string;
  guildProfile?: { adventurerName: string };
};

export default function ActivityPage({ audit = false }: { audit?: boolean }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;

    api
      .get(audit ? "/profile/audit" : "/profile/activity")
      .then((res) => {
        if (!canceled) setActivities(res.activities);
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
  }, [audit]);

  if (loading) return <LoadingState />;

  if (error) return <ErrorState message={error} />;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          {audit ? "Auditoria da guilda" : "Histórico de atividades"}
        </h1>
        <p className="text-neutral-400 mt-2">
          {audit
            ? "Últimos 100 eventos da guilda, com responsáveis e resultados."
            : "Suas últimas 100 movimentações na guilda."}
        </p>
      </div>

      {activities.length === 0 ? (
        <EmptyState message="Nenhuma atividade registrada ainda." />
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <article
              key={activity.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col items-start sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                {audit && (
                  <p className="text-sm text-blue-300">
                    {activity.guildProfile?.adventurerName}
                  </p>
                )}
                <p className="font-medium">
                  {labels[activity.type] ?? activity.type}
                </p>
                {audit && typeof activity.meta?.actorId === "string" && (
                  <p className="text-xs text-neutral-500 break-all">
                    Responsável: {activity.meta.actorId}
                  </p>
                )}
                {typeof activity.meta?.title === "string" && (
                  <p className="text-sm text-neutral-400">
                    {activity.meta.title}
                  </p>
                )}
                {typeof activity.meta?.name === "string" && (
                  <p className="text-sm text-blue-300">{activity.meta.name}</p>
                )}
                {typeof activity.meta?.reviewComment === "string" &&
                  activity.meta.reviewComment && (
                    <p className="text-sm text-neutral-400">
                      {activity.meta.reviewComment}
                    </p>
                  )}
                {!audit && typeof activity.meta?.instanceId === "string" && (
                  <Link
                    className="text-sm text-blue-400 underline"
                    to={`/dashboard/quests/instance/${activity.meta.instanceId}`}
                  >
                    Ver quest
                  </Link>
                )}
                {typeof activity.meta?.projectId === "string" && <Link className="text-sm text-blue-400 underline" to={`/dashboard/projects/${activity.meta.projectId}`}>Ver projeto</Link>}
                {typeof activity.meta?.xp === "number" && (
                  <p className="text-green-400 text-sm mt-1">
                    +{activity.meta.xp} XP
                  </p>
                )}
              </div>
              <time className="text-neutral-500 text-xs sm:text-sm sm:whitespace-nowrap">
                {formatDateTime(activity.createdAt)}
              </time>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
