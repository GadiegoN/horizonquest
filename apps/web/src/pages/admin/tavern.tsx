import { useState } from "react";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/date";
import { useAuth } from "../../hooks/use-auth";
import { useResource } from "../../hooks/use-resource";
import { useToast } from "../../context/toast-context";
import { LoadingState, ErrorState, EmptyState } from "../../components/page-state";
import { fieldClass, buttonClass, cardClass, Pagination } from "../../components/community-ui";

type Message = {
  id: string;
  guildProfileId: string;
  content: string;
  createdAt: string;
  guildProfile: {
    adventurerName: string;
    rank: string;
    avatarUrl?: string | null;
    equippedTitle?: string | null;
    equippedFrame?: string | null;
    equippedBadge?: string | null;
    equippedTheme?: string | null;
  };
  replyTo: { id: string; content: string; guildProfile: { adventurerName: string } } | null;
};
export default function TavernPage() {
  const { user } = useAuth(); const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(""); const [search, setSearch] = useState("");
  const [content, setContent] = useState("");
  const [reply, setReply] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, refresh } = useResource<{ messages: Message[]; hasMore: boolean }>(`/tavern?${new URLSearchParams({ page: String(page), q: search })}`, 15000);
  async function send(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      if (editing) await api.put(`/tavern/${editing.id}`, { content });
      else await api.post("/tavern", { content, ...(reply ? { replyToMessageId: reply.id } : {}) });
      setContent(""); setEditing(null); setReply(null); setPage(1); setSearch(""); setQuery(""); refresh(); showToast(editing ? "Mensagem editada." : "Mensagem publicada.");
    } catch (err) { showToast(err instanceof Error ? err.message : "Erro ao enviar mensagem.", "error"); }
    finally { setBusy(false); }
  }
  async function remove(message: Message) {
    if (!window.confirm("Excluir esta mensagem? As respostas serão preservadas.")) return;
    setBusy(true);
    try { await api.delete(`/tavern/${message.id}`); if (editing?.id === message.id) { setEditing(null); setContent(""); } if (reply?.id === message.id) setReply(null); if (data?.messages.length === 1 && page > 1) setPage(page - 1); else refresh(); showToast("Mensagem excluída."); }
    catch (err) { showToast(err instanceof Error ? err.message : "Erro ao excluir mensagem.", "error"); }
    finally { setBusy(false); }
  }
  return <div className="max-w-4xl space-y-6">
    <div><h1 className="text-3xl font-bold">Taverna</h1><p className="mt-2 text-neutral-400">Compartilhe descobertas e converse com a guilda. Novas mensagens aparecem a cada 15 segundos.</p></div>
    <form onSubmit={send} className={`${cardClass} space-y-3`}>
      {reply && <div className="border-l-2 border-blue-500 pl-3 text-sm text-neutral-400"><p>Respondendo a {reply.guildProfile.adventurerName}</p><p className="line-clamp-2 break-words">{reply.content}</p></div>}
      <label className="block">{editing ? "Editar mensagem" : "Sua mensagem"}<textarea required maxLength={2000} rows={4} className={fieldClass} value={content} onChange={e => setContent(e.target.value)} placeholder="O que aconteceu na sua aventura hoje?" /></label>
      <div className="flex flex-wrap items-center gap-4"><button disabled={busy || !content.trim()} className={buttonClass}>{busy ? "Enviando..." : editing ? "Salvar edição" : reply ? "Enviar resposta" : "Publicar"}</button>{(reply || editing) && <button type="button" disabled={busy} onClick={() => { setReply(null); setEditing(null); setContent(""); }} className="text-neutral-400">Cancelar</button>}<span className="ml-auto text-xs text-neutral-500">{content.length}/2.000</span></div>
    </form>
    <form className="flex gap-3" onSubmit={e => { e.preventDefault(); setSearch(query); setPage(1); }}><input aria-label="Buscar mensagens" maxLength={100} className={fieldClass} placeholder="Buscar na taverna" value={query} onChange={e => setQuery(e.target.value)} /><button className={buttonClass}>Buscar</button></form>
    {error ? <ErrorState message={error} /> : loading ? <LoadingState /> : !data?.messages.length ? <EmptyState message="Nenhuma mensagem encontrada. Comece uma conversa com a guilda." /> : data.messages.map(message => <article key={message.id} className={`${cardClass} space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={`player-avatar avatar-frame ${message.guildProfile.equippedFrame ?? ""} w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs bg-[#162734] shrink-0 text-[#edbf6b]`}>
            {message.guildProfile.avatarUrl ? <img src={message.guildProfile.avatarUrl} alt="" className="w-full h-full object-cover rounded-lg" /> : (message.guildProfile.adventurerName[0]?.toUpperCase() ?? "A")}
          </span>
          <p className="font-semibold text-sm">
            <span className={message.guildProfile.equippedBadge ? `badge-text ${message.guildProfile.equippedBadge}` : ""}>{message.guildProfile.adventurerName}</span>
            {message.guildProfile.equippedTitle && <span className="text-xs text-amber-300/90 italic ml-2">« {message.guildProfile.equippedTitle} »</span>}
            <span className="text-xs font-normal text-blue-300 ml-2">· Rank {message.guildProfile.rank}</span>
          </p>
        </div>
        <time className="text-xs text-neutral-500">{formatDateTime(message.createdAt)}</time>
      </div>
      {message.replyTo && <blockquote className="rounded-md border-l-2 border-blue-500 bg-neutral-800 p-3 text-sm text-neutral-400"><p className="font-medium">{message.replyTo.guildProfile.adventurerName}</p><p className="line-clamp-3 whitespace-pre-wrap break-words">{message.replyTo.content}</p></blockquote>}
      <p className="whitespace-pre-wrap break-words text-neutral-200">{message.content}</p>
      <div className="flex gap-4 text-sm"><button disabled={busy} className="text-blue-400" onClick={() => { setReply(message); setEditing(null); setContent(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Responder</button>{message.guildProfileId === user?.guildProfile?.id && <button disabled={busy} className="text-neutral-400" onClick={() => { setEditing(message); setReply(null); setContent(message.content); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button>}{(message.guildProfileId === user?.guildProfile?.id || user?.role === "admin") && <button disabled={busy} className="text-red-300" onClick={() => void remove(message)}>Excluir</button>}</div>
    </article>)}
    <Pagination page={page} hasMore={data?.hasMore ?? false} onChange={setPage} disabled={loading} />
  </div>;
}
