import { useToast } from "../../context/toast-context";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../components/page-state";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../../lib/api";

export default function QuestTemplatesListPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    api
      .get("/quests/templates/all")
      .then((res) => {
        setTemplates(res.templates);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(id: string) {
    setBusy(true);
    try {
      await api.patch(`/quests/templates/${id}/toggle`);
      const res = await api.get("/quests/templates/all");
      setTemplates(res.templates);
      showToast("Template atualizado.");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao atualizar template.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (
      !window.confirm(
        "Excluir este template? Templates com quests serão apenas desativados.",
      )
    )
      return;
    setBusy(true);
    try {
      const result = await api.delete(`/quests/templates/${id}`);
      const res = await api.get("/quests/templates/all");
      setTemplates(res.templates);
      showToast(result.message);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir template.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 justify-between">
        <h1 className="text-2xl font-bold">Templates</h1>
        <Link
          to="/dashboard/quest-templates/create"
          className="px-4 py-2 bg-blue-600 rounded-md"
        >
          Novo Template
        </Link>
      </div>

      {templates.length === 0 && (
        <EmptyState message="Nenhum template cadastrado. Crie o primeiro desafio da guilda." />
      )}
      <div className="space-y-3">
        {templates.map((t: any) => (
          <div
            key={t.id}
            className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg"
          >
            <div className="flex flex-wrap gap-4 justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">{t.title}</h2>
                <p className="text-neutral-400 text-sm">
                  {t.isActive ? "Ativo" : "Inativo"} ·{" "}
                  {t._count?.instances ?? 0} quests
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {t.isActive && t._count?.instances === 0 && (
                  <Link
                    to={`/dashboard/quest-templates/edit/${t.id}`}
                    className="px-3 py-1 bg-yellow-600 rounded-md"
                  >
                    Editar
                  </Link>
                )}

                <button
                  disabled={busy}
                  onClick={() => toggle(t.id)}
                  className={`px-3 py-1 rounded-md ${
                    t.isActive ? "bg-red-600" : "bg-green-600"
                  }`}
                >
                  {t.isActive ? "Desativar" : "Ativar"}
                </button>
                <button
                  disabled={busy}
                  onClick={() => remove(t.id)}
                  className="px-3 py-1 text-red-300"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
