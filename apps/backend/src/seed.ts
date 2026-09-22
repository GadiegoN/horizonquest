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

  const profiles = await prisma.guildProfile.findMany({
    select: { id: true, currentXp: true },
  });
  for (const profile of profiles) {
    await prisma.guildProfile.update({
      where: { id: profile.id },
      data: { rank: calculateRank(profile.currentXp) },
    });
  }

  console.log(
    `Seed concluído: ${classes.length} classes e ${achievements.length} achievements.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
