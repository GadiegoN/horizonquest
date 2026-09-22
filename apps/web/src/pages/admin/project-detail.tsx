import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../../lib/api";
import { useResource } from "../../hooks/use-resource";
import { useAuth } from "../../hooks/use-auth";
import { useToast } from "../../context/toast-context";
import { LoadingState, ErrorState } from "../../components/page-state";
import {
  buttonClass,
  cardClass,
  fieldClass,
  projectStatuses,
} from "../../components/community-ui";

type Project = {
  id: string;
  name: string;
  description: string;
  repoUrl: string | null;
  status: string;
  createdByGuildProfileId: string;
  createdBy: { adventurerName: string };
  members: {
    id: string;
    guildProfileId: string;
    role: string;
    guildProfile: { adventurerName: string; rank: string };
  }[];
};
export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { data, loading, error, refresh } = useResource<{ project: Project }>(
    `/projects/${id}`,
  );
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    repoUrl: "",
    status: "idea",
  });
  async function mutate(
    action: () => Promise<unknown>,
    message: string,
    deleted = false,
  ) {
    setBusy(true);
    try {
      await action();
      showToast(message);
      setEditing(false);
      if (deleted) navigate("/dashboard/projects");
      else refresh();
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar o projeto.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;
  const project = data.project;
  const owner = project.createdByGuildProfileId === user?.guildProfile?.id;
  const member = project.members.some(
    (item) => item.guildProfileId === user?.guildProfile?.id,
  );
  return (
    <div className="max-w-4xl space-y-6">
      <Link to="/dashboard/projects" className="text-blue-400">
        ← Projetos da guilda
      </Link>
      <section className={cardClass}>
        <p className="text-blue-300">
          {projectStatuses[project.status] ?? project.status}
        </p>
        <h1 className="mt-2 text-3xl font-bold wrap-break-words">
          {project.name}
        </h1>
        <p className="mt-4 whitespace-pre-wrap wrap-break-words text-neutral-300">
          {project.description}
        </p>
        <p className="mt-4 text-sm text-neutral-500">
          Criado por {project.createdBy.adventurerName}
        </p>
        {project.repoUrl && (
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-blue-400 underline"
          >
            Abrir repositório
          </a>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          {owner ? (
            <>
              <button
                disabled={busy}
                className={buttonClass}
                onClick={() => {
                  setForm({
                    name: project.name,
                    description: project.description,
                    repoUrl: project.repoUrl ?? "",
                    status: project.status,
                  });
                  setEditing(!editing);
                }}
              >
                Editar projeto
              </button>
              <button
                disabled={busy}
                className="rounded-md bg-red-950 px-4 py-2 text-red-300"
                onClick={() => {
                  if (window.confirm("Excluir o projeto e sua equipe?"))
                    void mutate(
                      () => api.delete(`/projects/${id}`),
                      "Projeto excluído.",
                      true,
                    );
                }}
              >
                Excluir
              </button>
            </>
          ) : member ? (
            <button
              disabled={busy}
              className={buttonClass}
              onClick={() =>
                void mutate(
                  () =>
                    api.delete(
                      `/projects/${id}/members/${user!.guildProfile!.id}`,
                    ),
                  "Você saiu do projeto.",
                )
              }
            >
              Sair da equipe
            </button>
          ) : ["idea", "active"].includes(project.status) ? (
            <button
              disabled={busy}
              className={buttonClass}
              onClick={() =>
                void mutate(
                  () => api.post(`/projects/${id}/join`, {}),
                  "Você entrou na equipe.",
                )
              }
            >
              Participar do projeto
            </button>
          ) : (
            <p className="text-neutral-400">
              Este projeto não está recebendo participantes.
            </p>
          )}
        </div>
      </section>
      {editing && (
        <form
          className={`${cardClass} space-y-4`}
          onSubmit={(e) => {
            e.preventDefault();
            void mutate(
              () => api.put(`/projects/${id}`, form),
              "Projeto atualizado.",
            );
          }}
        >
          <label className="block">
            Nome
            <input
              required
              minLength={3}
              maxLength={100}
              className={fieldClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block">
            Descrição
            <textarea
              required
              minLength={10}
              maxLength={5000}
              rows={6}
              className={fieldClass}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <label className="block">
            Repositório
            <input
              type="url"
              className={fieldClass}
              value={form.repoUrl}
              onChange={(e) => setForm({ ...form, repoUrl: e.target.value })}
            />
          </label>
          <label className="block">
            Status
            <select
              className={fieldClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {Object.entries(projectStatuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className={buttonClass} disabled={busy}>
            {busy ? "Salvando..." : "Salvar alterações"}
          </button>
          <button
            type="button"
            className="ml-3 text-neutral-400"
            onClick={() => setEditing(false)}
          >
            Cancelar
          </button>
        </form>
      )}
      <section className={cardClass}>
        <h2 className="text-xl font-bold">Equipe · {project.members.length}</h2>
        <div className="mt-4 space-y-3">
          {project.members.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap justify-between gap-3 rounded-lg bg-neutral-800 p-3"
            >
              <div>
                <p>{item.guildProfile.adventurerName}</p>
                <p className="text-sm text-neutral-400">
                  Rank {item.guildProfile.rank} ·{" "}
                  {item.guildProfileId === project.createdByGuildProfileId
                    ? "Criador"
                    : "Colaborador"}
                </p>
              </div>
              {owner &&
                item.guildProfileId !== project.createdByGuildProfileId && (
                  <button
                    disabled={busy}
                    className="text-sm text-red-300"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Remover ${item.guildProfile.adventurerName} da equipe?`,
                        )
                      )
                        void mutate(
                          () =>
                            api.delete(
                              `/projects/${id}/members/${item.guildProfileId}`,
                            ),
                          "Participante removido.",
                        );
                    }}
                  >
                    Remover
                  </button>
                )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
