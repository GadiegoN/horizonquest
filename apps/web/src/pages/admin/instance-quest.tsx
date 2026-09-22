import { LoadingState, ErrorState } from "../../components/page-state";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { api } from "../../lib/api";
import { useToast } from "../../context/toast-context";

type QuestTemplate = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  baseXpReward: number;
};

type Submission = {
  repoUrl?: string | null;
  liveDemoUrl?: string | null;
  notes?: string | null;
};

type Reviewer = {
  id: string;
  email: string;
};

type QuestInstance = {
  id: string;
  status: string;
  reviewComment?: string | null;
  completedAt?: string | null;
  progress: number;
  questTemplate: QuestTemplate;
  submission?: Submission | null;
  reviewer?: Reviewer | null;
};

export default function QuestInstanceDetailsPage() {
  const { id: instanceId } = useParams();

  const [instance, setInstance] = useState<QuestInstance | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!instanceId) return;

    let canceled = false;
    api
      .get(`/quests/instance/${instanceId}`)
      .then((res) => {
        if (canceled) return;

        const inst = res.instance; // <- CORRETO

        if (!inst) {
          setInstance(null);
          return;
        }

        setInstance(inst);
      })
      .catch((err) => {
        if (!canceled)
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar a quest.",
          );
        setInstance(null);
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [instanceId]);

  async function cancelQuest() {
    if (
      !instance ||
      !window.confirm("Cancelar esta quest? Essa ação não pode ser desfeita.")
    )
      return;

    try {
      setCanceling(true);
      await api.post(`/quests/cancel/${instance.id}`);
      setInstance({ ...instance, status: "canceled", progress: 0 });
      showToast("Quest cancelada.");
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Não foi possível cancelar a quest.",
        "error",
      );
    } finally {
      setCanceling(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  if (!instance) return <p className="text-red-400">Quest não encontrada.</p>;

  const t = instance.questTemplate;
  const s = instance.submission;
  const reviewer = instance.reviewer;

  const xp =
    instance.status === "completed" ? instance.questTemplate.baseXpReward : 0;

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-3xl font-bold">Detalhes da Missão</h1>

      <div className="bg-neutral-900 p-5 rounded-xl border border-neutral-800">
        <h2 className="text-2xl font-semibold">{t.title}</h2>

        <p className="text-neutral-400 mt-2">{t.description}</p>

        <div className="flex flex-wrap gap-2 items-center justify-between mt-4 text-sm text-neutral-400">
          <span>Dificuldade: {t.difficulty}</span>
          <span>XP base: {t.baseXpReward}</span>
        </div>

        <div className="mt-4">
          <p className="text-neutral-300">
            Status: <span className="text-blue-400">{instance.status}</span>
          </p>

          <div className="w-full bg-neutral-800 h-3 rounded mt-2">
            <div
              className="bg-blue-600 h-3 rounded"
              style={{ width: `${instance.progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-neutral-900 p-5 rounded-xl border border-neutral-800">
        <h2 className="text-xl font-semibold">Submissão</h2>

        {!s && (
          <p className="text-neutral-400 mt-2">Nenhuma submissão ainda.</p>
        )}

        {s && (
          <div className="mt-3 space-y-2 text-neutral-300">
            {s.repoUrl && (
              <p>
                Repositório:{" "}
                <a
                  href={s.repoUrl}
                  target="_blank"
                  className="text-blue-400 hover:underline"
                >
                  {s.repoUrl}
                </a>
              </p>
            )}

            {s.liveDemoUrl && (
              <p>
                Live Demo:{" "}
                <a
                  href={s.liveDemoUrl}
                  target="_blank"
                  className="text-blue-400 hover:underline"
                >
                  {s.liveDemoUrl}
                </a>
              </p>
            )}

            {s.notes && <p className="text-neutral-400 italic">"{s.notes}"</p>}
          </div>
        )}

        {instance.status === "in_progress" && (
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to={`/dashboard/quests/submit/${instance.id}`}
              className="mt-4 inline-block bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-md"
            >
              Enviar Submissão
            </Link>
            <button
              onClick={cancelQuest}
              disabled={canceling}
              className="rounded-md bg-red-950 px-4 py-2 text-red-300 hover:bg-red-900 disabled:opacity-50"
            >
              {canceling ? "Cancelando..." : "Cancelar quest"}
            </button>
          </div>
        )}

        {instance.status === "rejected" && (
          <Link
            to={`/dashboard/quests/submit/${instance.id}`}
            className="mt-4 inline-block bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded-md"
          >
            Re-enviar Submissão
          </Link>
        )}
      </div>

      {instance.status === "rejected" && (
        <button
          onClick={cancelQuest}
          disabled={canceling}
          className="rounded-md bg-red-950 px-4 py-2 text-red-300"
        >
          {canceling ? "Cancelando..." : "Cancelar quest"}
        </button>
      )}

      <div className="bg-neutral-900 p-5 rounded-xl border border-neutral-800">
        <h2 className="text-xl font-semibold">Revisão</h2>

        {!reviewer && (
          <p className="text-neutral-400">Nenhuma revisão realizada ainda.</p>
        )}

        {reviewer && (
          <div className="mt-3 space-y-2">
            <p className="text-neutral-300">
              Revisor: <span className="text-blue-400">{reviewer.email}</span>
            </p>

            {instance.reviewComment && (
              <p className="text-neutral-400 italic">
                "{instance.reviewComment}"
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-neutral-900 p-5 rounded-xl border border-neutral-800">
        <h2 className="text-xl font-semibold">Recompensa</h2>

        {xp === 0 ? (
          <p className="text-neutral-400">XP ainda não ganho.</p>
        ) : (
          <p className="text-green-400 text-lg font-bold">+{xp} XP ganhos!</p>
        )}
      </div>
    </div>
  );
}
