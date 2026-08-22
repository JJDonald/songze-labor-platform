-- CreateTable
CREATE TABLE "StudentRosterEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gradeId" INTEGER NOT NULL,
    "classCode" TEXT NOT NULL,
    "claimedStudentId" TEXT,
    "claimedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentRosterEntry_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StudentRosterEntry_claimedStudentId_fkey" FOREIGN KEY ("claimedStudentId") REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentRosterEntry_studentId_key" ON "StudentRosterEntry"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentRosterEntry_claimedStudentId_key" ON "StudentRosterEntry"("claimedStudentId");

-- CreateIndex
CREATE INDEX "StudentRosterEntry_gradeId_idx" ON "StudentRosterEntry"("gradeId");

-- Seed default registration mode (OPEN)
INSERT OR IGNORE INTO "SystemSetting" ("key", "value", "updatedAt", "createdAt")
VALUES ('registration.mode', 'OPEN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
