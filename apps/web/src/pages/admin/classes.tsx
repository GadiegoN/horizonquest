import { useToast } from "../../context/toast-context";
import {
  EmptyState,
  LoadingState,
  ErrorState,
} from "../../components/page-state";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

type ClassType = {
  id: string;
  name: string;
  description?: string | null;
};

export default function ClassesPage() {
  const { showToast } = useToast();
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
  });

  const [saving, setSaving] = useState(false);

  async function loadClasses() {
    const data = await api.get("/classes");
    setClasses(data.classes);
    setLoading(false);
  }

  useEffect(() => {
    loadClasses()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setForm({
      id: "",
      name: "",
      description: "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (form.id) {
        await api.put(`/classes/${form.id}`, {
          name: form.name,
          description: form.description,
        });
      } else {
        await api.post("/classes", {
          name: form.name,
          description: form.description,
        });
      }

      showToast("Classe salva.");
      resetForm();
      await loadClasses();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar classe.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c: ClassType) {
    setForm({
      id: c.id,
      name: c.name,
      description: c.description ?? "",
    });
  }

  async function deleteClass(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta classe?")) return;

    setDeleting(id);
    try {
      await api.delete(`/classes/${id}`);
      await loadClasses();
      showToast("Classe excluída.");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir classe.",
        "error",
      );
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-10 max-w-3xl">
      {error && <ErrorState message={error} />}
      <h1 className="text-3xl font-bold">Gerenciar Classes</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-4"
      >
        <h2 className="text-xl font-semibold">
          {form.id ? "Editar Classe" : "Criar Classe"}
        </h2>

        <div>
          <label className="text-neutral-300 text-sm">Nome</label>
          <input
            className="w-full bg-neutral-800 border border-neutral-700 px-3 py-2 rounded-md"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Guerreiro, Arcanista..."
          />
        </div>

        <div>
          <label className="text-neutral-300 text-sm">Descrição</label>
          <textarea
            className="w-full bg-neutral-800 border border-neutral-700 px-3 py-2 rounded-md"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <button
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-md w-full"
        >
          {saving
            ? "Salvando..."
            : form.id
              ? "Salvar Alterações"
              : "Criar Classe"}
        </button>

        {form.id && (
          <button
            type="button"
            onClick={resetForm}
            className="w-full mt-2 bg-neutral-700 hover:bg-neutral-600 px-4 py-2 rounded-md"
          >
            Cancelar Edição
          </button>
        )}
      </form>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Lista de Classes</h2>

        {loading ? (
          <LoadingState />
        ) : classes.length === 0 ? (
          <EmptyState message="Nenhuma classe cadastrada." />
        ) : (
          <div className="space-y-3">
            {classes.map((c) => (
              <div
                key={c.id}
                className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 flex flex-wrap gap-4 justify-between items-center"
              >
                <div>
                  <p className="font-bold">{c.name}</p>
                  <p className="text-neutral-400 text-sm">{c.description}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => startEdit(c)}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Editar
                  </button>

                  <button
                    disabled={deleting !== null}
                    onClick={() => deleteClass(c.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
