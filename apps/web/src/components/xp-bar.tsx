/* eslint-disable @typescript-eslint/no-explicit-any */
export function XpBar({ xp, maxXp }: { xp: any; maxXp: any }) {
  const pct = Math.min(100, (xp / maxXp) * 100);

  return (
    <div className="w-full bg-neutral-800 h-4 rounded-md overflow-hidden">
      <div
        className="bg-green-500 h-full transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
