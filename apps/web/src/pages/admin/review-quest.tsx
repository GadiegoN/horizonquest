import { LoadingState, ErrorState } from "../../components/page-state";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { api } from "../../lib/api";
import { useToast } from "../../context/toast-context";

export default function ReviewQuestPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [instance, setInstance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    let canceled = false;

    async function load() {
      if (!canceled) setLoading(true);

      try {
        const res = await api.get(`/quests/instance/${id}`);
        if (!canceled) {
          setInstance(res.instance);
          setReviewComment(res.instance.reviewComment ?? "");
        }
      } catch (err) {
        console.error(err);
        if (!canceled) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar a revisão.",
          );
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    }

    load();
    return () => {
      canceled = true;
    };
  }, [id]);

  async function handleReview(approved: boolean) {
    if (saving) return;
    setSaving(true);
    try {
      await api.post(`/quests/review/${id}`, {
        approved,
        reviewComment,
      });

      showToast(approved ? "Quest aprovada." : "Quest rejeitada.");
      navigate("/dashboard/quests/review");
    } catch (err) {
      console.error(err);
      showToast(
        err instanceof Error ? err.message : "Erro ao enviar revisão.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!instance) return <p>Quest não encontrada.</p>;

  const t = instance.questTemplate;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Revisar Quest: {t.title}</h1>

      <section className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
        <h2 className="text-lg font-semibold mb-2">Submissão</h2>

        {instance.submission ? (
          <>
            {instance.submission.repoUrl && (
              <p className="text-neutral-400">
                Repo:{" "}
                <a
                  className="text-blue-400 underline"
                  href={instance.submission.repoUrl}
                  target="_blank"
                >
                  {instance.submission.repoUrl}
                </a>
              </p>
            )}

            {instance.submission.liveDemoUrl && (
              <p className="text-neutral-400">
                Live Demo:{" "}
                <a
                  className="text-blue-400 underline"
                  href={instance.submission.liveDemoUrl}
                  target="_blank"
                >
                  {instance.submission.liveDemoUrl}
                </a>
              </p>
            )}

            {instance.submission.notes && (
              <p className="text-neutral-300 mt-3">
                {instance.submission.notes}
              </p>
            )}
          </>
        ) : (
          <p className="text-neutral-500">Nenhuma submissão encontrada.</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Comentário do Revisor</h2>
        <textarea
          className="bg-neutral-900 border border-neutral-700 w-full p-3 rounded-md"
          rows={4}
          value={reviewComment}
          onChange={(e) => setReviewComment(e.target.value)}
          maxLength={5000}
          placeholder="Descreva sua avaliação. Obrigatório ao rejeitar."
        />
      </section>

      <div className="flex gap-4">
        <button
          disabled={saving || instance.status !== "submitted"}
          onClick={() => handleReview(true)}
          className="bg-green-600 hover:bg-green-500 px-5 py-2 rounded-md"
        >
          Aprovar
        </button>

        <button
          disabled={saving || instance.status !== "submitted"}
          onClick={() => handleReview(false)}
          className="bg-red-600 hover:bg-red-500 px-5 py-2 rounded-md"
        >
          Rejeitar
        </button>
      </div>
    </div>
  );
}
