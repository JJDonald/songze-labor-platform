-- Preserve existing achievements as published history while introducing review metadata.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Achievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT,
    "courseTitle" TEXT,
    "taskGroupId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reflection" TEXT,
    "images" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewComment" TEXT,
    "reviewedAt" DATETIME,
    "reviewedById" TEXT,
    "evalAttitude" INTEGER NOT NULL DEFAULT 0,
    "evalSkill" INTEGER NOT NULL DEFAULT 0,
    "evalResult" INTEGER NOT NULL DEFAULT 0,
    "avgAttitude" REAL NOT NULL DEFAULT 0,
    "avgSkill" REAL NOT NULL DEFAULT 0,
    "avgResult" REAL NOT NULL DEFAULT 0,
    "evalCount" INTEGER NOT NULL DEFAULT 0,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Achievement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Achievement_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Achievement" (
    "id", "studentId", "courseId", "courseTitle", "taskGroupId", "title", "description",
    "reflection", "images", "isPublic", "reviewStatus", "evalAttitude", "evalSkill",
    "evalResult", "avgAttitude", "avgSkill", "avgResult", "evalCount", "likesCount",
    "createdAt", "updatedAt"
)
SELECT
    a."id", a."studentId", a."courseId", a."courseTitle",
    (SELECT c."taskGroupId" FROM "Course" c WHERE c."id" = a."courseId"),
    a."title", a."description", a."reflection", a."images", a."isPublic", 'APPROVED',
    a."evalAttitude", a."evalSkill", a."evalResult", a."avgAttitude", a."avgSkill",
    a."avgResult", a."evalCount", a."likesCount", a."createdAt", a."updatedAt"
FROM "Achievement" a;

DROP TABLE "Achievement";
ALTER TABLE "new_Achievement" RENAME TO "Achievement";
CREATE INDEX "Achievement_studentId_idx" ON "Achievement"("studentId");
CREATE INDEX "Achievement_reviewStatus_isPublic_createdAt_idx" ON "Achievement"("reviewStatus", "isPublic", "createdAt");
CREATE INDEX "Achievement_studentId_reviewStatus_idx" ON "Achievement"("studentId", "reviewStatus");
CREATE INDEX "Achievement_taskGroupId_reviewStatus_idx" ON "Achievement"("taskGroupId", "reviewStatus");

CREATE TABLE "new_Badge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "taskGroupId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Badge_taskGroupId_fkey" FOREIGN KEY ("taskGroupId") REFERENCES "TaskGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Badge" (
    "id", "key", "name", "emoji", "description", "category", "taskGroupId",
    "threshold", "sortOrder", "createdAt"
)
SELECT
    "id",
    CASE "category"
        WHEN 'cook' THEN 'cook-3'
        WHEN 'farm' THEN 'farm-2'
        WHEN 'craft' THEN 'craft-3'
        WHEN 'appliance' THEN 'appliance-2'
        WHEN 'volunteer' THEN 'volunteer-5'
        WHEN 'tech' THEN 'tech-1'
        ELSE "category" || '-1'
    END,
    "name", "emoji", "description", "category", "category",
    CASE "category"
        WHEN 'cook' THEN 3
        WHEN 'farm' THEN 2
        WHEN 'craft' THEN 3
        WHEN 'appliance' THEN 2
        WHEN 'volunteer' THEN 5
        ELSE 1
    END,
    CASE "category"
        WHEN 'cook' THEN 1
        WHEN 'farm' THEN 2
        WHEN 'craft' THEN 3
        WHEN 'appliance' THEN 4
        WHEN 'volunteer' THEN 5
        WHEN 'tech' THEN 6
        ELSE 99
    END,
    "createdAt"
FROM "Badge";

DROP TABLE "Badge";
ALTER TABLE "new_Badge" RENAME TO "Badge";
CREATE UNIQUE INDEX "Badge_key_key" ON "Badge"("key");
CREATE UNIQUE INDEX "Badge_name_key" ON "Badge"("name");
CREATE INDEX "Badge_taskGroupId_sortOrder_idx" ON "Badge"("taskGroupId", "sortOrder");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
