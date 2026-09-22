import {
  LoadingState,
  EmptyState,
  ErrorState,
} from "../../components/page-state";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Link } from "react-router";
import { useToast } from "../../context/toast-context";

type QuestTemplate = {
  id: string;
  title: string;
  difficulty: string;
  baseXpReward: number;
};

type QuestInstance = {
  id: string;
  status: string;
  startedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  questTemplate: QuestTemplate;
};

const STATUS_LABELS = {
  in_progress: "Em progresso",
  submitted: "Submetida",
  completed: "Concluída",
  rejected: "Rejeitada",
  canceled: "Cancelada",
};

export default function MyQuestsPage() {
  const [instances, setInstances] = useState<QuestInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const [error, setError] = useState("");
  const [canceling, setCanceling] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    let canceled = false;

    async function load() {
      try {
        const res = await api.get("/quests/my");
        if (!canceled) {
          setInstances(res.instances);
          setError("");
        }
      } catch (err) {
        if (!canceled)
          setError(
            err instanceof Error ? err.message : "Erro ao carregar quests.",
          );
      } finally {
        if (!canceled) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(load, 20000);
    window.addEventListener("focus", load);
    return () => {
      canceled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, []);

  function progress(inst: QuestInstance) {
    switch (inst.status) {
      case "in_progress":
        return 33;
      case "submitted":
      case "rejected":
        return 66;
      case "completed":
        return 100;
      case "canceled":
      default:
        return 0;
    }
  }

  const filtered =
    filter === "all" ? instances : instances.filter((i) => i.status === filter);

  async function cancelQuest(instanceId: string) {
    if (
      !window.confirm("Cancelar esta quest? Essa ação não pode ser desfeita.")
    )
      return;

    try {
      setCanceling(instanceId);
      await api.post(`/quests/cancel/${instanceId}`);
      const res = await api.get("/quests/my");
      setInstances(res.instances);
      showToast("Quest cancelada.");
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Não foi possível cancelar a quest.",
        "error",
      );
    } finally {
      setCanceling(null);
    }
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-8">
      {error && <ErrorState message={error} />}
      <h1 className="text-3xl font-bold">Minhas Missões</h1>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "Todas" },
          { id: "in_progress", label: "Em progresso" },
          { id: "submitted", label: "Submetidas" },
          { id: "completed", label: "Concluídas" },
          { id: "rejected", label: "Rejeitadas" },
          { id: "canceled", label: "Canceladas" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-md text-sm transition ${
              filter === f.id
                ? "bg-blue-600"
                : "bg-neutral-800 hover:bg-neutral-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((inst) => (
          <div
            key={inst.id}
            className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl"
          >
            <h2 className="text-xl font-bold">
              <Link
                className="hover:text-blue-400"
                to={`/dashboard/quests/instance/${inst.id}`}
              >
                {inst.questTemplate.title}
              </Link>
            </h2>

            <p className="text-neutral-400 mt-1">
              Status:{" "}
              <span className="text-blue-400">
                {STATUS_LABELS[inst.status as keyof typeof STATUS_LABELS]}
              </span>
            </p>

            <div className="mt-3">
              <div className="w-full bg-neutral-800 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${progress(inst)}%` }}
                />
              </div>
              <p className="text-sm text-neutral-500 mt-1">
                Progresso: {progress(inst)}%
              </p>
            </div>

            {inst.status === "in_progress" && (
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to={`/dashboard/quests/submit/${inst.id}`}
                  className="inline-block bg-green-600 hover:bg-green-500 px-4 py-2 rounded-md"
                >
                  Enviar Submissão
                </Link>
                <button
                  onClick={() => cancelQuest(inst.id)}
                  disabled={canceling === inst.id}
                  className="rounded-md bg-red-950 px-4 py-2 text-red-300 hover:bg-red-900 disabled:opacity-50"
                >
                  {canceling === inst.id ? "Cancelando..." : "Cancelar quest"}
                </button>
              </div>
            )}

            {inst.status === "rejected" && (
              <Link
                to={`/dashboard/quests/submit/${inst.id}`}
                className="inline-block mt-4 bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded-md"
              >
                Revisar & Re-submeter
              </Link>
            )}

            {inst.status === "rejected" && (
              <button
                disabled={canceling !== null}
                onClick={() => cancelQuest(inst.id)}
                className="ml-3 mt-4 rounded-md bg-red-950 px-4 py-2 text-red-300"
              >
                {canceling === inst.id ? "Cancelando..." : "Cancelar quest"}
              </button>
            )}

            {inst.status === "submitted" && (
              <p className="text-yellow-400 mt-3">Aguardando revisão...</p>
            )}

            {inst.status === "completed" && (
              <p className="text-green-400 mt-3">✔ Concluída com sucesso!</p>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <EmptyState message="Nenhuma missão encontrada." />
      )}
    </div>
  );
}
