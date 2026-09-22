import { useToast } from "../../context/toast-context";
import { ErrorState } from "../../components/page-state";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../../lib/api";

export default function CreateQuestTemplatePage() {
  const nav = useNavigate();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "",
    difficulty: "",
    baseXpReward: 0,
  });

  function handle(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submit(e: any) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/quests/templates", {
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

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">Criar Template</h1>

      {error && <ErrorState message={error} />}
      <form onSubmit={submit} className="space-y-4">
        <input
          name="title"
          required
          minLength={3}
          aria-label="title"
          className="w-full p-2 bg-neutral-800 rounded"
          placeholder="Título"
          onChange={handle}
        />

        <textarea
          name="description"
          required
          minLength={10}
          aria-label="description"
          className="w-full p-2 bg-neutral-800 rounded"
          placeholder="Descrição"
          onChange={handle}
        />

        <input
          name="type"
          required
          minLength={1}
          aria-label="type"
          className="w-full p-2 bg-neutral-800 rounded"
          placeholder="Tipo"
          onChange={handle}
        />

        <input
          name="difficulty"
          required
          minLength={1}
          aria-label="difficulty"
          className="w-full p-2 bg-neutral-800 rounded"
          placeholder="Dificuldade"
          onChange={handle}
        />

        <input
          type="number"
          name="baseXpReward"
          required
          min={1}
          max={100000}
          aria-label="XP base"
          className="w-full p-2 bg-neutral-800 rounded"
          placeholder="XP Base"
          onChange={handle}
        />

        <button
          disabled={saving}
          className="px-4 py-2 bg-blue-600 rounded-md w-full"
        >
          {saving ? "Salvando..." : "Criar"}
        </button>
      </form>
    </div>
  );
}
