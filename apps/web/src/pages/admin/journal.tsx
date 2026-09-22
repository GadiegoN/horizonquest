import { useState } from "react";
import { api } from "../../lib/api";
import { formatDate, formatDateTime } from "../../lib/date";
import { useResource } from "../../hooks/use-resource";
import { useToast } from "../../context/toast-context";
import { LoadingState, ErrorState, EmptyState } from "../../components/page-state";
import { fieldClass, buttonClass, cardClass, Pagination } from "../../components/community-ui";

type Entry = { id: string; title: string; content: string; weekReference: string | null; updatedAt: string };
const emptyForm = { title: "", content: "", weekReference: "" };
export default function JournalPage() {
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, refresh } = useResource<{ entries: Entry[]; hasMore: boolean }>(`/journal?${new URLSearchParams({ page: String(page), q: search })}`);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      if (editing === "new") await api.post("/journal", form); else await api.put(`/journal/${editing}`, form);
      showToast("Registro salvo."); setEditing(null); setForm(emptyForm); setPage(1); refresh();
    } catch (err) { showToast(err instanceof Error ? err.message : "Erro ao salvar registro.", "error"); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!window.confirm("Excluir este registro do diário?")) return;
    setBusy(true);
    try { await api.delete(`/journal/${id}`); showToast("Registro excluído."); if (editing === id) setEditing(null); if (data?.entries.length === 1 && page > 1) setPage(page - 1); else refresh(); }
    catch (err) { showToast(err instanceof Error ? err.message : "Erro ao excluir registro.", "error"); }
    finally { setBusy(false); }
  }
  return <div className="max-w-4xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Diário de aventura</h1><p className="mt-2 text-neutral-400">Anote aprendizados, metas e descobertas. Seus registros são privados.</p></div><button disabled={busy} className={buttonClass} onClick={() => { setForm(emptyForm); setEditing("new"); }}>Novo registro</button></div>
    {editing && <form onSubmit={save} className={`${cardClass} space-y-4`}>
      <h2 className="text-xl font-semibold">{editing === "new" ? "Novo registro" : "Editar registro"}</h2>
      <label className="block">Título<input required minLength={3} maxLength={150} className={fieldClass} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
      <label className="block">Data de referência (opcional)<input type="date" className={fieldClass} value={form.weekReference} onChange={e => setForm({ ...form, weekReference: e.target.value })} /></label>
      <label className="block">O que você aprendeu?<textarea required maxLength={20000} rows={9} className={fieldClass} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} /></label>
      <p className="text-xs text-neutral-500">{form.content.length}/20.000 caracteres</p><div className="flex gap-4"><button disabled={busy} className={buttonClass}>{busy ? "Salvando..." : "Salvar registro"}</button><button type="button" disabled={busy} onClick={() => setEditing(null)} className="text-neutral-400">Cancelar</button></div>
    </form>}
    <form onSubmit={e => { e.preventDefault(); setSearch(query); setPage(1); }} className="flex gap-3"><input aria-label="Buscar no diário" maxLength={100} className={fieldClass} placeholder="Buscar por título ou conteúdo" value={query} onChange={e => setQuery(e.target.value)} /><button className={buttonClass}>Buscar</button></form>
    {error ? <ErrorState message={error} /> : loading ? <LoadingState /> : !data?.entries.length ? <EmptyState message="Nenhum registro encontrado. Escreva o primeiro capítulo da sua aventura." /> : data.entries.map(entry => <article key={entry.id} className={`${cardClass} space-y-3`}><h2 className="text-xl font-bold break-words">{entry.title}</h2><p className="text-xs text-neutral-500">Atualizado em {formatDateTime(entry.updatedAt)}{entry.weekReference ? ` · Referência: ${formatDate(entry.weekReference)}` : ""}</p><p className="whitespace-pre-wrap break-words text-neutral-300">{entry.content}</p><div className="flex gap-4"><button disabled={busy} className="text-blue-400" onClick={() => { setEditing(entry.id); setForm({ title: entry.title, content: entry.content, weekReference: entry.weekReference?.slice(0, 10) ?? "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button><button disabled={busy} className="text-red-300" onClick={() => void remove(entry.id)}>Excluir</button></div></article>)}
    <Pagination page={page} hasMore={data?.hasMore ?? false} onChange={setPage} disabled={loading} />
  </div>;
}
