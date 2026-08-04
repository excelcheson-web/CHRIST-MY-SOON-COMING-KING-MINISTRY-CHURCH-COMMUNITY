-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('PUBLIC', 'MEMBERS', 'MINISTRY');

-- AlterTable
ALTER TABLE "member_profiles" ADD COLUMN     "address" TEXT,
ADD COLUMN     "avatarKey" TEXT,
ADD COLUMN     "profession" TEXT,
ADD COLUMN     "showAddress" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showProfession" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "calendar_dates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "month" INTEGER,
    "day" INTEGER,
    "onceOn" TIMESTAMP(3),
    "imageKey" TEXT,
    "image" TEXT,
    "accent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "ministryId" TEXT,
    "imageKey" TEXT,
    "imageWidth" INTEGER,
    "imageHeight" INTEGER,
    "audience" "AnnouncementAudience" NOT NULL DEFAULT 'MEMBERS',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pastors_words" (
    "id" TEXT NOT NULL,
    "showOn" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "reference" TEXT,
    "author" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pastors_words_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calendar_dates_key_key" ON "calendar_dates"("key");

-- CreateIndex
CREATE INDEX "calendar_dates_isActive_order_idx" ON "calendar_dates"("isActive", "order");

-- CreateIndex
CREATE INDEX "announcements_audience_startsAt_endsAt_idx" ON "announcements"("audience", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "announcements_ministryId_startsAt_idx" ON "announcements"("ministryId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "pastors_words_showOn_key" ON "pastors_words"("showOn");

-- CreateIndex
CREATE INDEX "pastors_words_showOn_idx" ON "pastors_words"("showOn");

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "ministries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
