import { useToast } from "../../context/toast-context";
import { ErrorState, LoadingState } from "../../components/page-state";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useNavigate, useParams } from "react-router";

export default function EditQuestTemplatePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "",
    difficulty: "",
    baseXpReward: 0,
    isActive: true,
  });

  useEffect(() => {
    async function load() {
      const res = await api.get("/quests/templates/all");

      const t = res.templates.find((x: any) => x.id === id);

      if (!t) throw new Error("Template não encontrado.");
      if (t) {
        setForm({
          title: t.title ?? "",
          description: t.description ?? "",
          type: t.type ?? "",
          difficulty: t.difficulty ?? "",
          baseXpReward: t.baseXpReward ?? 0,
          isActive: t.isActive ?? true,
        });
      }
    }

    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  function handle(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submit(e: any) {
    e.preventDefault();

    setSaving(true);
    setError("");
    try {
      await api.put(`/quests/templates/${id}`, {
        ...form,
        baseXpReward: Number(form.baseXpReward),
      });

      showToast("Template salvo.");
      nav("/dashboard/quest-templates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar template.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">Editar Template</h1>

      {error && <ErrorState message={error} />}
      <form onSubmit={submit} className="space-y-4">
        <input
          name="title"
          required
          minLength={3}
          aria-label="title"
          value={form.title}
          className="w-full p-2 bg-neutral-800 rounded"
          onChange={handle}
        />

        <textarea
          name="description"
          required
          minLength={10}
          aria-label="description"
          value={form.description}
          className="w-full p-2 bg-neutral-800 rounded"
          onChange={handle}
        />

        <input
          name="type"
          required
          minLength={1}
          aria-label="type"
          value={form.type}
          className="w-full p-2 bg-neutral-800 rounded"
          onChange={handle}
        />

        <input
          name="difficulty"
          required
          minLength={1}
          aria-label="difficulty"
          value={form.difficulty}
          className="w-full p-2 bg-neutral-800 rounded"
          onChange={handle}
        />

        <input
          type="number"
          name="baseXpReward"
          required
          min={1}
          max={100000}
          aria-label="XP base"
          value={form.baseXpReward}
          className="w-full p-2 bg-neutral-800 rounded"
          onChange={handle}
        />

        <button
          disabled={saving}
          className="px-4 py-2 bg-yellow-600 rounded-md w-full"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
}
