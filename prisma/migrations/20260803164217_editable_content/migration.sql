-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "name" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactAddress" TEXT NOT NULL,
    "serviceTimes" JSONB NOT NULL,
    "socials" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gospel_content" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "steps" JSONB NOT NULL,
    "prayerTitle" TEXT NOT NULL,
    "prayerIntro" TEXT NOT NULL,
    "prayerLines" TEXT[],
    "prayerAfter" TEXT NOT NULL,
    "afterVerseReference" TEXT NOT NULL,
    "afterVerseText" TEXT NOT NULL,
    "nextSteps" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gospel_content_pkey" PRIMARY KEY ("id")
);
