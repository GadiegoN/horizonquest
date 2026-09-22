import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../../lib/api";
import { useResource } from "../../hooks/use-resource";
import { useToast } from "../../context/toast-context";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../components/page-state";
import {
  fieldClass,
  buttonClass,
  cardClass,
  Pagination,
  projectStatuses,
} from "../../components/community-ui";

type Project = {
  id: string;
  name: string;
  description: string;
  status: string;
  createdBy: { adventurerName: string };
  _count: { members: number };
};
export default function ProjectsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [mine, setMine] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", repoUrl: "" });
  const params = new URLSearchParams({
    page: String(page),
    q: search,
    mine: String(mine),
    ...(status ? { status } : {}),
  });
  const { data, loading, error } = useResource<{
    projects: Project[];
    hasMore: boolean;
  }>(`/projects?${params}`);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await api.post("/projects", form);
      showToast("Projeto criado.");
      navigate(`/dashboard/projects/${result.project.id}`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao criar projeto.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Projetos da guilda</h1>
          <p className="mt-2 text-neutral-400">
            Tire uma ideia do papel e desenvolva com outros aventureiros.
          </p>
        </div>
        <button className={buttonClass} onClick={() => setCreating(!creating)}>
          {creating ? "Fechar" : "Novo projeto"}
        </button>
      </div>
      {creating && (
        <form onSubmit={create} className={`${cardClass} space-y-4`}>
          <label className="block">
            Nome
            <input
              className={fieldClass}
              required
              minLength={3}
              maxLength={100}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block">
            Descrição
            <textarea
              className={fieldClass}
              required
              minLength={10}
              maxLength={5000}
              rows={4}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <label className="block">
            Repositório (opcional)
            <input
              type="url"
              className={fieldClass}
              value={form.repoUrl}
              onChange={(e) => setForm({ ...form, repoUrl: e.target.value })}
            />
          </label>
          <button disabled={saving} className={buttonClass}>
            {saving ? "Criando..." : "Criar projeto"}
          </button>
        </form>
      )}
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(query);
          setPage(1);
        }}
      >
        <input
          aria-label="Buscar projetos"
          className={`${fieldClass} sm:max-w-xs`}
          placeholder="Buscar projetos"
          maxLength={100}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className={buttonClass}>Buscar</button>
        <select
          aria-label="Status do projeto"
          className={`${fieldClass} sm:max-w-xs`}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos os status</option>
          {Object.entries(projectStatuses).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-neutral-300">
          <input
            type="checkbox"
            checked={mine}
            onChange={(e) => {
              setMine(e.target.checked);
              setPage(1);
            }}
          />
          Meus projetos
        </label>
      </form>
      {error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <LoadingState />
      ) : !data?.projects.length ? (
        <EmptyState message="Nenhum projeto encontrado. Crie uma ideia ou altere os filtros." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.projects.map((project) => (
            <Link
              key={project.id}
              to={`/dashboard/projects/${project.id}`}
              className={`${cardClass} hover:border-blue-500`}
            >
              <span className="text-sm text-blue-300">
                {projectStatuses[project.status] ?? project.status}
              </span>
              <h2 className="mt-2 text-xl font-bold wrap-break-words">
                {project.name}
              </h2>
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-neutral-400">
                {project.description}
              </p>
              <p className="mt-4 text-sm text-neutral-500">
                {project.createdBy.adventurerName} · {project._count.members}{" "}
                participantes
              </p>
            </Link>
          ))}
        </div>
      )}
      <Pagination
        page={page}
        hasMore={data?.hasMore ?? false}
        onChange={setPage}
        disabled={loading}
      />
    </div>
  );
}
