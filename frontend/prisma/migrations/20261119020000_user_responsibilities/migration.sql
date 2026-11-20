-- CreateEnum
CREATE TYPE "Responsibility" AS ENUM ('BIRAO', 'DIAKONA', 'MPIARA_MIVAVAKA');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "responsibilities" "Responsibility"[] DEFAULT ARRAY[]::"Responsibility"[];

