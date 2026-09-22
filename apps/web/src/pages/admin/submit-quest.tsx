import { LoadingState, ErrorState } from "../../components/page-state";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { api } from "../../lib/api";
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
  submission?: {
    repoUrl?: string | null;
    liveDemoUrl?: string | null;
    notes?: string | null;
  } | null;
  questTemplate: QuestTemplate;
};

export default function SubmitQuestPage() {
  const { instanceId } = useParams();
  const navigate = useNavigate();

  const [instance, setInstance] = useState<QuestInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  const [form, setForm] = useState({
    repoUrl: "",
    liveDemoUrl: "",
    notes: "",
  });

  useEffect(() => {
    if (!instanceId) return;

    let canceled = false;
    setLoading(true);

    api
      .get(`/quests/instance/${instanceId}`)
      .then((data) => {
        if (canceled) return;

        const inst: QuestInstance = data.instance;
        setInstance(inst);

        if (inst.submission) {
          setForm({
            repoUrl: inst.submission.repoUrl ?? "",
            liveDemoUrl: inst.submission.liveDemoUrl ?? "",
            notes: inst.submission.notes ?? "",
          });
        }
      })
      .catch((err) => {
        if (!canceled) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar a quest.",
          );
        }
      })
      .finally(() => {
        if (!canceled) {
          setLoading(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [instanceId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (error && !instance) return <ErrorState message={error} />;

    if (!instance) return;

    setError("");

    const status = instance.status;

    if (!["in_progress", "rejected"].includes(status)) {
      setError("Este status não permite submissão.");
      return;
    }

    try {
      setSubmitting(true);

      if (status === "in_progress") {
        await api.post(`/quests/submit/${instance.id}`, form);
      } else if (status === "rejected") {
        await api.post(`/quests/resubmit/${instance.id}`, form);
      }

      showToast(
        status === "rejected" ? "Submissão reenviada." : "Submissão enviada.",
      );
      navigate("/dashboard/quests/my");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao enviar submissão.",
      );
      showToast(
        err instanceof Error ? err.message : "Erro ao enviar submissão.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingState />;
  }

  if (!instance) {
    return <p className="text-red-400">Instância não encontrada.</p>;
  }

  const canSubmit = ["in_progress", "rejected"].includes(instance.status);

  return (
    <div className="max-w-2xl space-y-8">
      {error && <ErrorState message={error} />}
      <h1 className="text-3xl font-bold">Enviar Submissão</h1>

      <div className="bg-neutral-900 p-5 rounded-xl border border-neutral-800">
        <h2 className="text-xl font-semibold">
          {instance.questTemplate.title}
        </h2>

        <p className="text-neutral-400 mt-1">
          Status atual:
          <span className="text-blue-400"> {instance.status}</span>
        </p>

        {!canSubmit && (
          <p className="text-red-400 mt-3">
            Este status não permite submissão.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">
              Repositório (GitHub)
            </label>
            <input
              type="url"
              value={form.repoUrl}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, repoUrl: e.target.value }))
              }
              placeholder="https://github.com/seu-projeto"
              className="w-full bg-neutral-800 px-3 py-2 rounded-md border border-neutral-700"
              disabled={!canSubmit || submitting}
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">
              Deploy (Live Demo)
            </label>
            <input
              type="url"
              value={form.liveDemoUrl}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, liveDemoUrl: e.target.value }))
              }
              placeholder="https://seu-projeto.vercel.app"
              className="w-full bg-neutral-800 px-3 py-2 rounded-md border border-neutral-700"
              disabled={!canSubmit || submitting}
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">
              Notas adicionais
            </label>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              className="w-full bg-neutral-800 px-3 py-2 rounded-md border border-neutral-700"
              disabled={!canSubmit || submitting}
            />
          </div>

          {canSubmit && (
            <button
              className="w-full bg-green-600 hover:bg-green-500 py-2 rounded-md mt-4 disabled:bg-neutral-700 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting
                ? "Enviando..."
                : instance.status === "rejected"
                  ? "Re-enviar Submissão"
                  : "Enviar Submissão"}
            </button>
          )}
        </form>

        {instance.status === "rejected" && (
          <p className="text-yellow-400 mt-4 text-sm">
            Sua submissão foi rejeitada. Ajuste o projeto e envie novamente.
          </p>
        )}
      </div>
    </div>
  );
}
