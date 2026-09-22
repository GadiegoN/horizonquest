/* eslint-disable react-refresh/only-export-components */
export const fieldClass =
  "w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-white";
export const buttonClass =
  "inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50";
export const cardClass =
  "rounded-xl border border-neutral-800 bg-neutral-900 p-5";
export const projectStatuses: Record<string, string> = {
  idea: "Ideia",
  active: "Em desenvolvimento",
  completed: "Concluído",
  archived: "Arquivado",
};

export function Pagination({
  page,
  hasMore,
  onChange,
  disabled = false,
}: {
  page: number;
  hasMore: boolean;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (page === 1 && !hasMore) return null;
  return (
    <nav
      aria-label="Paginação"
      className="flex items-center justify-between gap-3"
    >
      <button
        disabled={disabled || page === 1}
        className={buttonClass}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </button>
      <span className="text-sm text-neutral-400">Página {page}</span>
      <button
        disabled={disabled || !hasMore}
        className={buttonClass}
        onClick={() => onChange(page + 1)}
      >
        Próxima
      </button>
    </nav>
  );
}
