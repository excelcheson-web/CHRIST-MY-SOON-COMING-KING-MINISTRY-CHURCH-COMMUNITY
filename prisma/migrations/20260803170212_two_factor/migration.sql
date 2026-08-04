-- AlterTable
ALTER TABLE "users" ADD COLUMN     "twoFactorEnabledAt" TIMESTAMP(3),
ADD COLUMN     "twoFactorRecovery" TEXT[],
ADD COLUMN     "twoFactorSecret" TEXT;
