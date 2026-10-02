-- AlterTable
ALTER TABLE "GuildProfile" ADD COLUMN     "equippedBadge" TEXT,
ADD COLUMN     "equippedFrame" TEXT,
ADD COLUMN     "equippedTheme" TEXT,
ADD COLUMN     "equippedTitle" TEXT,
ADD COLUMN     "hqCoins" INTEGER NOT NULL DEFAULT 100;

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "icon" TEXT,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCosmetic" (
    "id" TEXT NOT NULL,
    "guildProfileId" TEXT NOT NULL,
    "shopItemId" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCosmetic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoinTransaction" (
    "id" TEXT NOT NULL,
    "guildProfileId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoinTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopItem_code_key" ON "ShopItem"("code");

-- CreateIndex
CREATE INDEX "UserCosmetic_guildProfileId_idx" ON "UserCosmetic"("guildProfileId");

-- CreateIndex
CREATE INDEX "UserCosmetic_shopItemId_idx" ON "UserCosmetic"("shopItemId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCosmetic_guildProfileId_shopItemId_key" ON "UserCosmetic"("guildProfileId", "shopItemId");

-- CreateIndex
CREATE INDEX "CoinTransaction_guildProfileId_idx" ON "CoinTransaction"("guildProfileId");

-- AddForeignKey
ALTER TABLE "UserCosmetic" ADD CONSTRAINT "UserCosmetic_guildProfileId_fkey" FOREIGN KEY ("guildProfileId") REFERENCES "GuildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCosmetic" ADD CONSTRAINT "UserCosmetic_shopItemId_fkey" FOREIGN KEY ("shopItemId") REFERENCES "ShopItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_guildProfileId_fkey" FOREIGN KEY ("guildProfileId") REFERENCES "GuildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
