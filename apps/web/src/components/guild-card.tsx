import type { User } from "../context/auth-context";

type Props = {
  profile: User["guildProfile"];
};

const rankXpMap: Record<string, number> = {
  D: 0,
  C: 100,
  B: 250,
  A: 500,
  S: 1000,
  SS: 2000,
  SSS: 3500,
};

const rankOrder = ["D", "C", "B", "A", "S", "SS", "SSS"];

export default function GuildCard({ profile }: Props) {
  if (!profile) return null;

  const rank = rankOrder.includes(profile.rank) ? profile.rank : "D";
  const currentRankXp = rankXpMap[rank];
  const rankIndex = rankOrder.indexOf(rank);
  const nextRank = rankOrder[rankIndex + 1];
  const xpCap = nextRank ? rankXpMap[nextRank] : currentRankXp;
  const progress = nextRank
    ? Math.min(
        ((profile.currentXp - currentRankXp) / (xpCap - currentRankXp)) * 100,
        100,
      )
    : 100;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl max-w-lg w-full space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400">
          {profile.adventurerName[0]}
        </div>

        <div>
          <h2 className="text-xl font-bold">{profile.adventurerName}</h2>

          <p className="text-neutral-400 text-sm">
            {profile.className || "Sem classe definida"}
          </p>
        </div>

        <div className="ml-auto text-center">
          <p className="text-neutral-400 text-xs">Rank</p>
          <p className="text-2xl font-bold text-blue-400">{profile.rank}</p>
        </div>
      </div>

      <div>
        <p className="text-neutral-400 text-sm mb-1">
          XP: {profile.currentXp} / {xpCap}
        </p>
        <p className="text-neutral-500 text-xs mb-2">
          {profile.nextRankXp
            ? `Próximo rank em ${profile.nextRankXp} XP (${Math.max(profile.nextRankXp - profile.currentXp, 0)} restantes)`
            : "Rank máximo alcançado"}
        </p>

        <div className="w-full h-3 bg-neutral-800 rounded-md overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 text-center mt-4">
        <div>
          <p className="text-lg font-bold">
            {profile.stats?.totalQuestsCompleted ?? 0}
          </p>
          <p className="text-xs text-neutral-400">Quests</p>
        </div>

        <div>
          <p className="text-lg font-bold">
            {profile.stats?.totalXp ?? profile.currentXp}
          </p>
          <p className="text-xs text-neutral-400">XP Total</p>
        </div>

        <div>
          <p className="text-lg font-bold">{profile.rank}</p>
          <p className="text-xs text-neutral-400">Rank</p>
        </div>
      </div>
    </div>
  );
}
