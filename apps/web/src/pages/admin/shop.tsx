import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../hooks/use-auth";
import { useToast } from "../../context/toast-context";
import { api, ApiError } from "../../lib/api";
import { Icon } from "../../components/brand";
import { LoadingState, ErrorState } from "../../components/page-state";
import type { CosmeticType, CosmeticRarity } from "@horizon/shared";

type ShopItem = {
  id: string;
  code: string;
  name: string;
  description: string;
  type: CosmeticType;
  price: number;
  icon?: string | null;
  rarity: CosmeticRarity;
  config?: Record<string, unknown> | null;
  isOwned?: boolean;
  isEquipped?: boolean;
};

type EquippedState = {
  title: string | null;
  frame: string | null;
  badge: string | null;
  theme: string | null;
};

export default function ShopPage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [hqCoins, setHqCoins] = useState<number>(0);
  const [equipped, setEquipped] = useState<EquippedState>({
    title: null,
    frame: null,
    badge: null,
    theme: null,
  });
  const [preview, setPreview] = useState<EquippedState>({
    title: null,
    frame: null,
    badge: null,
    theme: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | CosmeticType | "owned">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<ShopItem | null>(null);

  const profile = user?.guildProfile;

  async function loadShopData() {
    try {
      const res = await api.get("/shop/items");
      setItems(res.items);
      setHqCoins(res.hqCoins);
      const eqState: EquippedState = {
        title: res.equipped?.title ?? null,
        frame: res.equipped?.frame ?? null,
        badge: res.equipped?.badge ?? null,
        theme: res.equipped?.theme ?? null,
      };
      setEquipped(eqState);
      setPreview(eqState);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível carregar os itens da loja.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadShopData();
  }, []);

  const isPreviewing = useMemo(() => {
    return (
      preview.title !== equipped.title ||
      preview.frame !== equipped.frame ||
      preview.badge !== equipped.badge ||
      preview.theme !== equipped.theme
    );
  }, [preview, equipped]);

  function handlePreviewItem(item: ShopItem) {
    setPreview((prev) => {
      const next = { ...prev };
      if (item.type === "title") next.title = item.name;
      if (item.type === "frame") next.frame = item.code;
      if (item.type === "badge") next.badge = item.code;
      if (item.type === "theme") next.theme = item.code;
      return next;
    });
    showToast(`Visualizando "${item.name}" no Espelho da Guilda!`, "success");
  }

  function handleResetPreview() {
    setPreview({ ...equipped });
  }

  async function handleBuy(item: ShopItem) {
    if (hqCoins < item.price) {
      showToast(
        `Saldo insuficiente! Você tem ${hqCoins} HQCoins e o item custa ${item.price} HQCoins.`,
        "error",
      );
      return;
    }

    try {
      setProcessingId(item.id);
      const res = await api.post(`/shop/buy/${item.id}`, {});
      setHqCoins(res.newBalance);
      setCelebration(item);
      showToast(`Parabéns! Você adquiriu ${item.name}!`, "success");

      // Atualiza lista local
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isOwned: true } : i)),
      );

      // Auto-preview do item comprado
      handlePreviewItem(item);

      await refreshUser();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Falha ao comprar o item.";
      showToast(message, "error");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleEquip(item: ShopItem, unequip = false) {
    try {
      setProcessingId(item.id);
      const res = await api.post("/shop/equip", {
        itemId: item.id,
        unequip,
      });

      const updatedEquipped: EquippedState = {
        title: res.equipped.equippedTitle ?? null,
        frame: res.equipped.equippedFrame ?? null,
        badge: res.equipped.equippedBadge ?? null,
        theme: res.equipped.equippedTheme ?? null,
      };

      setEquipped(updatedEquipped);
      setPreview(updatedEquipped);

      setItems((prev) =>
        prev.map((i) => {
          if (i.type === item.type) {
            return {
              ...i,
              isEquipped: !unequip && i.id === item.id,
            };
          }
          return i;
        }),
      );

      showToast(
        unequip
          ? `Item desequipado com sucesso.`
          : `Equipado: ${item.name}!`,
        "success",
      );

      await refreshUser();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Falha ao equipar o item.";
      showToast(message, "error");
    } finally {
      setProcessingId(null);
    }
  }

  const filteredItems = useMemo(() => {
    if (activeTab === "all") return items;
    if (activeTab === "owned") return items.filter((i) => i.isOwned);
    return items.filter((i) => i.type === activeTab);
  }, [items, activeTab]);

  const rarityMeta = {
    common: { label: "Comum", badgeColor: "bg-slate-800 text-slate-300 border-slate-700" },
    rare: { label: "Raro", badgeColor: "bg-sky-950/80 text-sky-300 border-sky-700" },
    epic: { label: "Épico", badgeColor: "bg-purple-950/80 text-purple-300 border-purple-700" },
    legendary: { label: "Lendário ★", badgeColor: "bg-amber-950/90 text-amber-300 border-amber-500 shadow-sm shadow-amber-500/30" },
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-10">
      {/* Header Banner com Saldo de HQCoins */}
      <div className="hq-panel relative overflow-hidden bg-gradient-to-r from-[#0d222e] via-[#102434] to-[#142d3d] border-[#294254]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <Icon name="shop" className="w-3.5 h-3.5" />
              <span>Mercado de Cosméticos de Horizon</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Loja da Guilda & Cosméticos
            </h1>
            <p className="text-sm text-[#aabcc5] leading-relaxed">
              Personalize sua identidade como aventureiro! Adquira títulos honoríficos, molduras de avatar
              cintilantes, cores exclusivas para seu nome e temas arcanos para seu cartão de perfil.
            </p>
          </div>

          <div className="bg-[#09131c]/90 border border-[#304957] rounded-xl p-4 md:p-5 flex flex-col items-center md:items-end justify-center gap-1.5 shrink-0 shadow-xl">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#8ce4ce]">
              Seu Saldo Atual
            </span>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl md:text-3xl font-extrabold text-[#fbbf24] tracking-tight drop-shadow-[0_0_12px_rgba(251,191,36,0.35)]">
                {hqCoins.toLocaleString("pt-BR")}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                HQCoins
              </span>
            </div>
            <small className="text-[11px] text-[#718b98]">
              Ganhe mais concluindo missões e revisões
            </small>
          </div>
        </div>
      </div>

      {/* Espelho da Guilda (Live Character Mirror) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="sparkles" className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">
              Espelho da Guilda · Pré-visualização ao Vivo
            </h2>
          </div>
          {isPreviewing && (
            <div className="flex items-center gap-2">
              <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full font-medium animate-pulse">
                Modo Provador Ativo
              </span>
              <button
                type="button"
                onClick={handleResetPreview}
                className="text-xs text-[#aabcc5] hover:text-white underline cursor-pointer"
              >
                Voltar ao Equipado
              </button>
            </div>
          )}
        </div>

        {/* Card do Aventureiro com o Tema e Moldura Aplicados */}
        <div
          className={`card-theme ${preview.theme ?? "bg-[#101f2a]"} border border-[#304957] rounded-2xl p-6 md:p-8 transition-all duration-300 shadow-2xl relative overflow-hidden`}
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
            {/* Avatar com Moldura */}
            <div className="relative shrink-0">
              <div
                className={`player-avatar avatar-frame ${preview.frame ?? ""} w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-extrabold bg-[#162734] transition-all duration-300`}
              >
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.adventurerName}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <span>{profile?.adventurerName?.slice(0, 1).toUpperCase() ?? "A"}</span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[#28291f] text-[#edbf6b] border border-[#75603c] text-xs font-bold px-2 py-0.5 rounded-md shadow-md">
                Rank {profile?.rank ?? "D"}
              </div>
            </div>

            {/* Informações de Perfil */}
            <div className="text-center sm:text-left space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3
                  className={`text-2xl font-bold transition-all ${
                    preview.badge ? `badge-text ${preview.badge}` : "text-white"
                  }`}
                >
                  {profile?.adventurerName ?? "Aventureiro"}
                </h3>
                {preview.badge && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/70 text-cyan-300 border border-cyan-700/60 font-medium">
                    Badge Ativa
                  </span>
                )}
              </div>

              <p className="text-sm font-medium text-amber-300/90 italic">
                {preview.title ? `« ${preview.title} »` : "Sem título honorífico equipado"}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-xs text-[#aabcc5]">
                <span className="px-2.5 py-1 rounded bg-[#09131c]/60 border border-[#243542]">
                  Classe: <strong className="text-white">{profile?.className ?? "Sem classe"}</strong>
                </span>
                <span className="px-2.5 py-1 rounded bg-[#09131c]/60 border border-[#243542]">
                  XP: <strong className="text-[#edbf6b]">{(profile?.currentXp ?? 0).toLocaleString("pt-BR")}</strong>
                </span>
                <span className="px-2.5 py-1 rounded bg-[#09131c]/60 border border-[#243542]">
                  Tema do Cartão: <strong className="text-white">{preview.theme ? preview.theme.replace("theme-", "") : "Padrão"}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação por Categorias */}
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2 border-b border-[#243542] pb-3">
          {[
            { key: "all", label: "Todos os Cosméticos" },
            { key: "title", label: "Títulos de Honra" },
            { key: "frame", label: "Molduras de Avatar" },
            { key: "badge", label: "Cores & Badges de Nome" },
            { key: "theme", label: "Temas do Cartão" },
            { key: "owned", label: `Meus Itens (${items.filter((i) => i.isOwned).length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as "all" | CosmeticType | "owned")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === tab.key
                  ? "bg-[#16352f] text-[#88e6cd] border border-[#245044] shadow-sm"
                  : "text-[#aabcc5] hover:text-white hover:bg-[#172733]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid de Itens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map((item) => {
            const meta = rarityMeta[item.rarity] || rarityMeta.common;
            const canAfford = hqCoins >= item.price;
            const isProcessing = processingId === item.id;

            return (
              <div
                key={item.id}
                className={`hq-panel bg-[#101f2a] border ${
                  item.isEquipped
                    ? "border-[#53d8ba] shadow-[0_0_15px_rgba(83,216,186,0.15)]"
                    : "border-[#243542]"
                } rounded-xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-[#385366]`}
              >
                <div className="space-y-4">
                  {/* Topo do Card: Rarity + Tipo */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${meta.badgeColor}`}
                    >
                      {meta.label}
                    </span>
                    <span className="text-[11px] text-[#718b98] uppercase tracking-wider font-semibold">
                      {item.type === "title" && "Título"}
                      {item.type === "frame" && "Moldura"}
                      {item.type === "badge" && "Nome / Badge"}
                      {item.type === "theme" && "Tema"}
                    </span>
                  </div>

                  {/* Demonstração Visual do Item */}
                  <div className="h-28 rounded-lg bg-[#09131c] border border-[#1e303d] flex items-center justify-center p-3 relative overflow-hidden group">
                    {item.type === "title" && (
                      <span className="text-center font-bold text-amber-300 italic text-sm px-2">
                        « {item.name} »
                      </span>
                    )}

                    {item.type === "frame" && (
                      <div
                        className={`player-avatar avatar-frame ${item.code} w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg bg-[#162734]`}
                      >
                        HQ
                      </div>
                    )}

                    {item.type === "badge" && (
                      <div className="text-center space-y-1">
                        <span className={`text-base font-bold badge-text ${item.code}`}>
                          {item.name}
                        </span>
                        <div className="text-[10px] text-cyan-400">Brilho místico</div>
                      </div>
                    )}

                    {item.type === "theme" && (
                      <div
                        className={`card-theme ${item.code} w-full h-full rounded-md flex items-center justify-center text-xs font-semibold text-white/90 border border-white/20`}
                      >
                        {item.name}
                      </div>
                    )}
                  </div>

                  {/* Nome e Descrição */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-base text-white">{item.name}</h4>
                    <p className="text-xs text-[#aabcc5] leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Ações e Preço */}
                <div className="mt-5 pt-4 border-t border-[#1e303d] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#91a5af]">Preço:</span>
                    {item.isOwned ? (
                      <span className="text-xs font-semibold text-[#53d8ba] bg-emerald-950/60 border border-emerald-700/50 px-2 py-0.5 rounded">
                        Adquirido
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 font-extrabold text-[#fbbf24] text-sm">
                        <Icon name="coin" className="w-4 h-4 text-amber-400" />
                        <span>{item.price} HQ</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handlePreviewItem(item)}
                      className="px-2.5 py-1.5 rounded-lg border border-[#304957] hover:bg-[#1a2d3a] text-xs font-medium text-[#c8d7df] transition-colors cursor-pointer"
                    >
                      Ver no Espelho
                    </button>

                    {item.isOwned ? (
                      item.isEquipped ? (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleEquip(item, true)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 hover:bg-amber-500/30 text-xs font-bold text-amber-300 transition-colors cursor-pointer"
                        >
                          {isProcessing ? "Salvando..." : "Desequipar"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleEquip(item, false)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#087564] hover:bg-[#0a8270] text-xs font-bold text-white transition-colors cursor-pointer"
                        >
                          {isProcessing ? "Equipando..." : "Equipar"}
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        disabled={!canAfford || isProcessing}
                        onClick={() => handleBuy(item)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          canAfford
                            ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black shadow-md shadow-amber-500/20"
                            : "bg-[#172733] text-[#607986] border border-[#243542] cursor-not-allowed"
                        }`}
                      >
                        {isProcessing
                          ? "Comprando..."
                          : canAfford
                            ? "Comprar"
                            : "Falta saldo"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Celebração ao Comprar */}
      {celebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#101f2a] border-2 border-amber-500/80 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-[0_0_30px_rgba(251,191,36,0.3)] text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/60 mx-auto flex items-center justify-center text-amber-400">
              <Icon name="sparkles" className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">
                Item Lendário Adquirido!
              </span>
              <h3 className="text-2xl font-extrabold text-white">{celebration.name}</h3>
              <p className="text-sm text-[#aabcc5]">{celebration.description}</p>
            </div>

            <div className="p-3 rounded-lg bg-[#09131c] border border-[#243542] text-xs text-[#8ce4ce]">
              O item já está disponível no seu inventário e foi adicionado ao Espelho da Guilda!
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  void handleEquip(celebration, false);
                  setCelebration(null);
                }}
                className="flex-1 py-2.5 rounded-lg bg-[#087564] hover:bg-[#0a8270] font-bold text-sm text-white transition-colors cursor-pointer"
              >
                Equipar Agora
              </button>
              <button
                type="button"
                onClick={() => setCelebration(null)}
                className="px-4 py-2.5 rounded-lg border border-[#304957] hover:bg-[#1a2d3a] text-sm text-[#aabcc5] font-medium transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
