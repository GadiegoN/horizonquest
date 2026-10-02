import { prisma } from "./lib/prisma";
import { calculateRank } from "./lib/xp";

const classes = [
  {
    name: "Frontend",
    description: "Especialista em interfaces e experiências web.",
  },
  {
    name: "Backend",
    description: "Construtor de APIs, serviços e regras de negócio.",
  },
  {
    name: "Full Stack",
    description: "Atua de ponta a ponta no desenvolvimento de produtos.",
  },
  {
    name: "QA",
    description: "Guardião da qualidade, testes e confiabilidade.",
  },
  {
    name: "DevOps",
    description:
      "Responsável por automação, infraestrutura e entrega contínua.",
  },
];

const achievements = [
  {
    code: "first_quest",
    name: "Primeira Quest",
    description: "Complete seu perfil de aventureiro.",
    conditionType: "profile",
  },
  {
    code: "five_quests",
    name: "Aventureiro Consistente",
    description: "Complete cinco quests.",
    conditionType: "completed_quests",
  },
  {
    code: "first_silver_quest",
    name: "Prata na Espada",
    description: "Complete uma quest de dificuldade prata.",
    conditionType: "difficulty",
  },
  {
    code: "first_gold_quest",
    name: "Ouro na Espada",
    description: "Complete uma quest de dificuldade ouro.",
    conditionType: "difficulty",
  },
  {
    code: "first_rejection",
    name: "Aprendizado na Forja",
    description: "Receba sua primeira rejeição e tente novamente.",
    conditionType: "rejections",
  },
  {
    code: "xp_100",
    name: "Centurião",
    description: "Alcance 100 XP.",
    conditionType: "xp",
  },
  {
    code: "xp_500",
    name: "Veterano",
    description: "Alcance 500 XP.",
    conditionType: "xp",
  },
  {
    code: "xp_1000",
    name: "Mestre da Guilda",
    description: "Alcance 1000 XP.",
    conditionType: "xp",
  },
];

const shopItems = [
  // Títulos
  {
    code: "title_code_master",
    name: "Mestre do Código",
    description: "Para aqueles que dominam a arte da sintaxe limpa e sem bugs.",
    type: "title",
    price: 50,
    rarity: "rare",
    icon: "code",
    config: { tag: "Título de Honra" },
  },
  {
    code: "title_abyss_explorer",
    name: "Explorador do Abismo",
    description: "Navegou pelas profundezas dos logs e retornou vitorioso.",
    type: "title",
    price: 75,
    rarity: "epic",
    icon: "compass",
    config: { tag: "Título de Honra" },
  },
  {
    code: "title_tavern_lord",
    name: "Lorde da Taverna",
    description: "Presença ilustre e ouvinte fiel das histórias da guilda.",
    type: "title",
    price: 40,
    rarity: "common",
    icon: "beer",
    config: { tag: "Título de Honra" },
  },
  {
    code: "title_horizon_vanguard",
    name: "Vanguarda de Horizon",
    description: "A frente de batalha da guilda. Líder, guerreiro e pioneiro.",
    type: "title",
    price: 120,
    rarity: "legendary",
    icon: "shield",
    config: { tag: "Título de Honra" },
  },

  // Molduras de Avatar
  {
    code: "frame_gold",
    name: "Borda Dourada Imperial",
    description: "Aro brilhante forjado com o ouro e a honra da guilda.",
    type: "frame",
    price: 60,
    rarity: "rare",
    icon: "sparkles",
    config: { cssClass: "frame-gold" },
  },
  {
    code: "frame_fire",
    name: "Fogo Cósmico",
    description: "Chamas estelares incandescentes dançando ao redor do avatar.",
    type: "frame",
    price: 90,
    rarity: "epic",
    icon: "flame",
    config: { cssClass: "frame-fire" },
  },
  {
    code: "frame_cyber",
    name: "Neon Cyberpunk",
    description: "Borda luminescente com pulsos ciano e esmeralda de alta frequência.",
    type: "frame",
    price: 80,
    rarity: "rare",
    icon: "zap",
    config: { cssClass: "frame-cyber" },
  },
  {
    code: "frame_void",
    name: "Vórtice Sombrio",
    description: "Energia do abismo estelar com partículas arcanas giratórias.",
    type: "frame",
    price: 150,
    rarity: "legendary",
    icon: "moon",
    config: { cssClass: "frame-void" },
  },

  // Cores & Badges de Nome
  {
    code: "badge_emerald",
    name: "Esmeralda Guardiã",
    description: "Destaque verde místico para o nome do jogador com ícone de folha estelar.",
    type: "badge",
    price: 35,
    rarity: "common",
    icon: "leaf",
    config: { cssClass: "badge-emerald", color: "#53d8ba", tag: "🍃 Guardião" },
  },
  {
    code: "badge_mystic",
    name: "Púrpura Místico",
    description: "Brilho ametista arcana que emana sabedoria e mistério cósmico.",
    type: "badge",
    price: 70,
    rarity: "rare",
    icon: "gem",
    config: { cssClass: "badge-mystic", color: "#c084fc", tag: "🔮 Místico" },
  },
  {
    code: "badge_legendary",
    name: "Dourado Lendário",
    description: "Coroa brilhante e tipografia resplandecente em ouro solar.",
    type: "badge",
    price: 110,
    rarity: "legendary",
    icon: "crown",
    config: { cssClass: "badge-legendary", color: "#fbbf24", tag: "👑 Lenda" },
  },
  {
    code: "badge_cyber",
    name: "Ciano Cósmico",
    description: "Energia de néon cintilante pulsando no nome do aventureiro.",
    type: "badge",
    price: 50,
    rarity: "rare",
    icon: "sparkle",
    config: { cssClass: "badge-cyber", color: "#38bdf8", tag: "⚡ Hiper" },
  },

  // Temas do Cartão de Aventureiro
  {
    code: "theme_nebula",
    name: "Nebulosa Noturna",
    description: "Fundo cósmico com poeira estelar, estrelas azuis e constelações.",
    type: "theme",
    price: 75,
    rarity: "rare",
    icon: "stars",
    config: { cssClass: "theme-nebula" },
  },
  {
    code: "theme_forge",
    name: "Forja de Vulcano",
    description: "Bordas em brasa incandescente e atmosfera de forja lendária.",
    type: "theme",
    price: 95,
    rarity: "epic",
    icon: "fire",
    config: { cssClass: "theme-forge" },
  },
  {
    code: "theme_aurora",
    name: "Aurora Boreal",
    description: "Gradiente sublime de esmeralda, turquesa e céu polar iluminado.",
    type: "theme",
    price: 130,
    rarity: "legendary",
    icon: "sparkles",
    config: { cssClass: "theme-aurora" },
  },
  {
    code: "theme_dawn",
    name: "Alvorada Dourada",
    description: "Os primeiros raios solares sobre a fortaleza da guilda.",
    type: "theme",
    price: 65,
    rarity: "common",
    icon: "sun",
    config: { cssClass: "theme-dawn" },
  },
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const reviewerEmail = process.env.REVIEWER_EMAIL?.trim().toLowerCase();
  if (adminEmail) {
    await prisma.user.updateMany({
      where: { email: adminEmail },
      data: { role: "admin" },
    });
  }

  if (reviewerEmail) {
    await prisma.user.updateMany({
      where: { email: reviewerEmail },
      data: { role: "reviewer" },
    });
  }

  for (const entry of classes) {
    await prisma.class.upsert({
      where: { name: entry.name },
      update: { description: entry.description },
      create: entry,
    });
  }

  for (const entry of achievements) {
    await prisma.achievement.upsert({
      where: { code: entry.code },
      update: entry,
      create: entry,
    });
  }

  for (const entry of shopItems) {
    await prisma.shopItem.upsert({
      where: { code: entry.code },
      update: entry,
      create: entry,
    });
  }

  const profiles = await prisma.guildProfile.findMany({
    select: { id: true, currentXp: true, hqCoins: true },
  });
  for (const profile of profiles) {
    const updateData: { rank: string; hqCoins?: number } = {
      rank: calculateRank(profile.currentXp),
    };
    if (profile.hqCoins < 100) {
      updateData.hqCoins = 100;
    }
    await prisma.guildProfile.update({
      where: { id: profile.id },
      data: updateData,
    });
  }

  console.log(
    `Seed concluído: ${classes.length} classes, ${achievements.length} achievements e ${shopItems.length} itens na loja.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
