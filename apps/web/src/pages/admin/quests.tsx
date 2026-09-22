import { EmptyState, LoadingState } from "../../components/page-state";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Link } from "react-router";
import { useToast } from "../../context/toast-context";

type QuestTemplate = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  baseXpReward: number;
  type: string;
};

type QuestInstance = {
  id: string;
  status: string;
  startedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  questTemplate: QuestTemplate;
};

export default function QuestsPage() {
  const [templates, setTemplates] = useState<QuestTemplate[]>([]);
  const [instances, setInstances] = useState<QuestInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const t = await api.get("/quests/templates");
        const m = await api.get("/quests/my");

        setTemplates(t.templates);
        setInstances(m.instances);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar as quests.",
        );
      }

      setLoading(false);
    }

    load();
  }, []);

  const activeInstance = instances.find((inst) =>
    ["in_progress", "submitted"].includes(inst.status),
  );

  async function startQuest(templateId: string) {
    try {
      setStarting(templateId);
      setError("");

      await api.post(`/quests/start/${templateId}`);

      const m = await api.get("/quests/my");
      setInstances(m.instances);
      showToast("Quest iniciada com sucesso.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível iniciar a quest.",
      );
      showToast(
        err instanceof Error
          ? err.message
          : "Não foi possível iniciar a quest.",
        "error",
      );
    }

    setStarting(null);
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-md border border-red-900 bg-red-950/40 p-3 text-red-300">
          {error}
        </p>
      )}
      <h1 className="text-3xl font-bold mb-2">Missões</h1>

      <section>
        <h2 className="text-xl font-semibold mb-3">Missões Disponíveis</h2>

        {templates.length === 0 && (
          <EmptyState message="Nenhuma quest disponível no momento." />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((q) => {
            const disabled = !!activeInstance || starting !== null;
            const alreadyStarted = activeInstance?.questTemplate.id === q.id;

            return (
              <div
                key={q.id}
                className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl"
              >
                <h3 className="text-lg font-bold">{q.title}</h3>
                <p className="text-neutral-400 text-sm">{q.description}</p>

                <div className="flex flex-wrap gap-2 justify-between mt-3 text-sm text-neutral-400">
                  <span>Dificuldade: {q.difficulty}</span>
                  <span>XP: {q.baseXpReward}</span>
                </div>

                <button
                  disabled={disabled}
                  onClick={() => startQuest(q.id)}
                  className={`mt-4 w-full py-2 rounded-md transition
                    ${
                      disabled
                        ? "bg-neutral-700 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-500"
                    }
                  `}
                >
                  {starting === q.id
                    ? "Iniciando..."
                    : alreadyStarted
                      ? "Já iniciada"
                      : activeInstance
                        ? "Conclua sua missão atual"
                        : "Iniciar Quest"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Minhas Missões</h2>

        {instances.length === 0 && (
          <EmptyState message="Você ainda não iniciou nenhuma quest." />
        )}

        <div className="space-y-3">
          {instances.map((inst) => (
            <div
              key={inst.id}
              className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl"
            >
              <h3 className="font-bold text-lg">{inst.questTemplate.title}</h3>

              <p className="text-neutral-400 text-sm mt-1 mb-6">
                Status:{" "}
                <span className="text-blue-400 capitalize">{inst.status}</span>
              </p>

              {inst.status === "in_progress" && (
                <Link
                  to={`/dashboard/quests/instance/${inst.id}`}
                  className="bg-green-600 hover:bg-green-500 px-3 py-2 rounded-md"
                >
                  Enviar Quest
                </Link>
              )}

              {inst.status === "submitted" && (
                <p className="text-yellow-400 text-sm mt-2">
                  Aguardando revisão...
                </p>
              )}

              {inst.status === "completed" && (
                <p className="text-green-400 text-sm mt-2">
                  ✔ Quest concluída!
                </p>
              )}

              {inst.status === "rejected" && (
                <p className="text-red-400 text-sm mt-2">
                  ✖ Quest rejeitada — revise e reenvie
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
