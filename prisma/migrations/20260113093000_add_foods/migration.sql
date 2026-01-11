-- CreateTable
CREATE TABLE "Food" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "barcode" TEXT,
    "calories" REAL NOT NULL,
    "protein" REAL NOT NULL,
    "carbs" REAL NOT NULL,
    "fat" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "servingSize" TEXT,
    "servingsPerContainer" TEXT,
    "saturatedFat" REAL,
    "transFat" REAL,
    "cholesterolMg" REAL,
    "sodiumMg" REAL,
    "dietaryFiber" REAL,
    "totalSugars" REAL,
    "addedSugars" REAL,
    "vitaminDMcg" REAL,
    "calciumMg" REAL,
    "ironMg" REAL,
    "potassiumMg" REAL,
    "ingredientsList" TEXT,
    "vitamins" TEXT,
    "allergens" TEXT,
    "deletedAt" DATETIME,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Food_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "LogEntry" ADD COLUMN "foodId" INTEGER;

-- CreateIndex
CREATE INDEX "Food_userId_idx" ON "Food"("userId");

-- CreateIndex
CREATE INDEX "Food_userId_deletedAt_idx" ON "Food"("userId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Food_userId_barcode_key" ON "Food"("userId", "barcode");

-- CreateIndex
CREATE INDEX "LogEntry_foodId_idx" ON "LogEntry"("foodId");
