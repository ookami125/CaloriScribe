-- CreateTable
CREATE TABLE "DailyTarget" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "calories" REAL,
    "protein" REAL,
    "carbs" REAL,
    "fat" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
