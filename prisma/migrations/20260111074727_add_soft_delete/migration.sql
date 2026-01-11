-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN "deletedAt" DATETIME;

-- CreateIndex
CREATE INDEX "Ingredient_userId_deletedAt_idx" ON "Ingredient"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "Recipe_userId_deletedAt_idx" ON "Recipe"("userId", "deletedAt");
