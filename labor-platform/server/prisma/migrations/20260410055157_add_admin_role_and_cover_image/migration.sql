-- AlterTable
ALTER TABLE "Course" ADD COLUMN "coverImage" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatarEmoji" TEXT NOT NULL DEFAULT '🌟',
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "gradeId" INTEGER NOT NULL,
    "classCode" TEXT NOT NULL,
    "totalAchievements" INTEGER NOT NULL DEFAULT 0,
    "totalLikes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Student" ("avatarEmoji", "classCode", "createdAt", "gradeId", "id", "nickname", "password", "studentId", "totalAchievements", "totalLikes", "updatedAt") SELECT "avatarEmoji", "classCode", "createdAt", "gradeId", "id", "nickname", "password", "studentId", "totalAchievements", "totalLikes", "updatedAt" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE UNIQUE INDEX "Student_studentId_key" ON "Student"("studentId");
CREATE INDEX "Student_gradeId_classCode_idx" ON "Student"("gradeId", "classCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
