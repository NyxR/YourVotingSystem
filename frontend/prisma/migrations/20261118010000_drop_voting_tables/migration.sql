-- DropForeignKey
ALTER TABLE "SessionItem" DROP CONSTRAINT "SessionItem_sessionId_fkey";

-- DropTable
DROP TABLE "Member";

-- DropTable
DROP TABLE "Session";

-- DropTable
DROP TABLE "SessionItem";

