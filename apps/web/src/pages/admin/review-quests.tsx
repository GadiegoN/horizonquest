import { LoadingState, ErrorState } from "../../components/page-state";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/date";

export default function ReviewListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterClass, setFilterClass] = useState("");

  useEffect(() => {
    let canceled = false;

    async function load() {
      if (!canceled) setLoading(true);

      try {
        const query = new URLSearchParams({
          difficulty: filterDifficulty,
          type: filterType,
          classId: filterClass,
        });
        const res = await api.get(`/quests/review/pending?${query}`);
        if (!canceled) {
          setItems(res.instances);
          setError("");
          if (!filterDifficulty && !filterType && !filterClass)
            setOptions(res.instances);
        }
      } catch (err) {
        console.error(err);
        if (!canceled) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar revisões.",
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
  }, [filterDifficulty, filterType, filterClass]);

  const filtered = items;

  return (
    <div className="space-y-8">
      {error && <ErrorState message={error} />}
      <h1 className="text-2xl font-bold">Quests Pendentes para Revisão</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          className="bg-neutral-900 border border-neutral-700 px-3 py-2 rounded-md"
          aria-label="Dificuldade"
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
        >
          <option value="">Todas Dificuldades</option>
          {[...new Set(options.map((item) => item.questTemplate.difficulty))]
            .sort()
            .map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
        </select>

        <select
          className="bg-neutral-900 border border-neutral-700 px-3 py-2 rounded-md"
          aria-label="Classe"
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
        >
          <option value="">Todas as Classes</option>
          {[
            ...new Map(
              options
                .filter((item: any) => item.guildProfile.class)
                .map((item: any) => [
                  item.guildProfile.class.id,
                  item.guildProfile.class.name,
                ]),
            ),
          ].map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>

        <select
          className="bg-neutral-900 border border-neutral-700 px-3 py-2 rounded-md"
          aria-label="Tipo"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Todos os Tipos</option>
          {[...new Set(options.map((item) => item.questTemplate.type))]
            .sort()
            .map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
        </select>
      </div>

      {error ? null : loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <p className="text-neutral-400">
          {!filterDifficulty && !filterType && !filterClass
            ? "Nenhuma quest pendente para revisão."
            : "Nenhuma quest corresponde aos filtros selecionados."}
        </p>
      ) : (
        <div className="space-y-4">
          {filtered.map((item: any) => (
            <Link
              key={item.id}
              to={`/dashboard/quests/review/${item.id}`}
              className="block bg-neutral-900 border border-neutral-800 p-4 rounded-xl hover:bg-neutral-800"
            >
              <h3 className="font-bold text-lg">{item.questTemplate.title}</h3>

              <p className="text-neutral-400 text-sm">
                Jogador: {item.guildProfile.adventurerName} (
                {item.guildProfile.user.email})
              </p>

              <p className="text-neutral-400 text-sm mt-1">
                Submetido em: {formatDateTime(item.submittedAt)}
              </p>

              <p className="text-neutral-400 text-sm mt-1">
                Dificuldade:{" "}
                <span className="text-blue-400">
                  {item.questTemplate.difficulty}
                </span>
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
