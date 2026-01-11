/*
  Warnings:

  - The `DailyTarget` table is removed. Data is migrated into `CustomTarget` rows.
  - The `target` column on `CustomTarget` is made nullable.
*/
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_CustomTarget" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "target" REAL,
    "allowOver" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_CustomTarget" ("id", "key", "label", "unit", "target", "allowOver", "userId", "createdAt", "updatedAt")
SELECT "id", "key", "label", "unit", "target", "allowOver", "userId", "createdAt", "updatedAt" FROM "CustomTarget";

DROP TABLE "CustomTarget";
ALTER TABLE "new_CustomTarget" RENAME TO "CustomTarget";

CREATE UNIQUE INDEX "CustomTarget_userId_key_key" ON "CustomTarget"("userId", "key");
CREATE INDEX "CustomTarget_userId_idx" ON "CustomTarget"("userId");

INSERT INTO "CustomTarget" ("key", "label", "unit", "target", "allowOver", "userId", "createdAt", "updatedAt")
SELECT
  'calories',
  'Calories',
  'cal',
  "calories",
  "caloriesAllowOver",
  "userId",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "DailyTarget"
WHERE NOT EXISTS (
  SELECT 1 FROM "CustomTarget"
  WHERE "CustomTarget"."userId" = "DailyTarget"."userId"
    AND "CustomTarget"."key" = 'calories'
);

INSERT INTO "CustomTarget" ("key", "label", "unit", "target", "allowOver", "userId", "createdAt", "updatedAt")
SELECT
  'protein',
  'Protein',
  'g',
  "protein",
  "proteinAllowOver",
  "userId",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "DailyTarget"
WHERE NOT EXISTS (
  SELECT 1 FROM "CustomTarget"
  WHERE "CustomTarget"."userId" = "DailyTarget"."userId"
    AND "CustomTarget"."key" = 'protein'
);

INSERT INTO "CustomTarget" ("key", "label", "unit", "target", "allowOver", "userId", "createdAt", "updatedAt")
SELECT
  'carbs',
  'Carbs',
  'g',
  "carbs",
  "carbsAllowOver",
  "userId",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "DailyTarget"
WHERE NOT EXISTS (
  SELECT 1 FROM "CustomTarget"
  WHERE "CustomTarget"."userId" = "DailyTarget"."userId"
    AND "CustomTarget"."key" = 'carbs'
);

INSERT INTO "CustomTarget" ("key", "label", "unit", "target", "allowOver", "userId", "createdAt", "updatedAt")
SELECT
  'fat',
  'Fat',
  'g',
  "fat",
  "fatAllowOver",
  "userId",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "DailyTarget"
WHERE NOT EXISTS (
  SELECT 1 FROM "CustomTarget"
  WHERE "CustomTarget"."userId" = "DailyTarget"."userId"
    AND "CustomTarget"."key" = 'fat'
);

DROP TABLE "DailyTarget";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
