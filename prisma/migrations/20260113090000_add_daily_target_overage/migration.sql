-- AlterTable
ALTER TABLE "DailyTarget" ADD COLUMN "caloriesAllowOver" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DailyTarget" ADD COLUMN "proteinAllowOver" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DailyTarget" ADD COLUMN "carbsAllowOver" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DailyTarget" ADD COLUMN "fatAllowOver" BOOLEAN NOT NULL DEFAULT false;
