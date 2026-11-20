-- CreateEnum
CREATE TYPE "MemberType" AS ENUM ('MPANDRAY', 'TSY_MPANDRAY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "memberType" "MemberType" NOT NULL DEFAULT 'MPANDRAY';

