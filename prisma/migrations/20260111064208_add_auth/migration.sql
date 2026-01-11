/*
  Warnings:

  - Added the required column `userId` to the `DailyTarget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Ingredient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `LogEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Recipe` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyTarget" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "calories" REAL,
    "protein" REAL,
    "carbs" REAL,
    "fat" REAL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DailyTarget" ("calories", "carbs", "createdAt", "fat", "id", "protein", "updatedAt") SELECT "calories", "carbs", "createdAt", "fat", "id", "protein", "updatedAt" FROM "DailyTarget";
DROP TABLE "DailyTarget";
ALTER TABLE "new_DailyTarget" RENAME TO "DailyTarget";
CREATE UNIQUE INDEX "DailyTarget_userId_key" ON "DailyTarget"("userId");
CREATE TABLE "new_Ingredient" (
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
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ingredient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Ingredient" ("addedSugars", "allergens", "barcode", "calciumMg", "calories", "carbs", "cholesterolMg", "createdAt", "dietaryFiber", "fat", "id", "ingredientsList", "ironMg", "name", "potassiumMg", "protein", "saturatedFat", "servingSize", "servingsPerContainer", "sodiumMg", "totalSugars", "transFat", "unit", "updatedAt", "vitaminDMcg", "vitamins") SELECT "addedSugars", "allergens", "barcode", "calciumMg", "calories", "carbs", "cholesterolMg", "createdAt", "dietaryFiber", "fat", "id", "ingredientsList", "ironMg", "name", "potassiumMg", "protein", "saturatedFat", "servingSize", "servingsPerContainer", "sodiumMg", "totalSugars", "transFat", "unit", "updatedAt", "vitaminDMcg", "vitamins" FROM "Ingredient";
DROP TABLE "Ingredient";
ALTER TABLE "new_Ingredient" RENAME TO "Ingredient";
CREATE INDEX "Ingredient_userId_idx" ON "Ingredient"("userId");
CREATE UNIQUE INDEX "Ingredient_userId_barcode_key" ON "Ingredient"("userId", "barcode");
CREATE TABLE "new_LogEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "consumedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "ingredientId" INTEGER,
    "recipeId" INTEGER,
    "notes" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LogEntry_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LogEntry_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LogEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LogEntry" ("consumedAt", "createdAt", "id", "ingredientId", "notes", "quantity", "recipeId", "unit") SELECT "consumedAt", "createdAt", "id", "ingredientId", "notes", "quantity", "recipeId", "unit" FROM "LogEntry";
DROP TABLE "LogEntry";
ALTER TABLE "new_LogEntry" RENAME TO "LogEntry";
CREATE INDEX "LogEntry_consumedAt_idx" ON "LogEntry"("consumedAt");
CREATE INDEX "LogEntry_userId_idx" ON "LogEntry"("userId");
CREATE TABLE "new_Recipe" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "servings" INTEGER NOT NULL DEFAULT 1,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Recipe" ("createdAt", "id", "name", "notes", "servings", "updatedAt") SELECT "createdAt", "id", "name", "notes", "servings", "updatedAt" FROM "Recipe";
DROP TABLE "Recipe";
ALTER TABLE "new_Recipe" RENAME TO "Recipe";
CREATE INDEX "Recipe_userId_idx" ON "Recipe"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
