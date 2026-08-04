-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('SERVICE', 'CONFERENCE', 'CRUSADE', 'RETREAT', 'BAPTISM', 'MEMBERSHIP_CLASS', 'SMALL_GROUP', 'PRAYER_MEETING', 'OUTREACH', 'WORKSHOP', 'OTHER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('CONFIRMED', 'WAITLISTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CheckInMethod" AS ENUM ('QR', 'MANUAL', 'SELF');

-- CreateTable
CREATE TABLE "ministries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "leaderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ministries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ministry_members" (
    "id" TEXT NOT NULL,
    "ministryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ministry_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "small_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "meetingTime" TEXT,
    "location" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "capacity" INTEGER,
    "leaderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "small_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "small_group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "small_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" "EventType" NOT NULL DEFAULT 'SERVICE',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "locationName" TEXT,
    "address" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "onlineUrl" TEXT,
    "capacity" INTEGER,
    "price" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "ministryId" TEXT,
    "smallGroupId" TEXT,
    "image" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "requiresRegistration" BOOLEAN NOT NULL DEFAULT true,
    "registrationClosesAt" TIMESTAMP(3),
    "cancellationDeadline" TIMESTAMP(3),
    "allowGuests" BOOLEAN NOT NULL DEFAULT true,
    "maxGuestsPerRegistration" INTEGER NOT NULL DEFAULT 5,
    "allowWaitlist" BOOLEAN NOT NULL DEFAULT true,
    "collectAccessibility" BOOLEAN NOT NULL DEFAULT true,
    "collectDietary" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_registrations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "guests" INTEGER NOT NULL DEFAULT 0,
    "accessibilityNeeds" TEXT,
    "dietaryNotes" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "waitlistPosition" INTEGER,
    "token" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3),
    "checkInMethod" "CheckInMethod",
    "checkedInById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ministries_slug_key" ON "ministries"("slug");

-- CreateIndex
CREATE INDEX "ministry_members_userId_idx" ON "ministry_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ministry_members_ministryId_userId_key" ON "ministry_members"("ministryId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "small_groups_slug_key" ON "small_groups"("slug");

-- CreateIndex
CREATE INDEX "small_group_members_userId_idx" ON "small_group_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "small_group_members_groupId_userId_key" ON "small_group_members"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_status_startsAt_idx" ON "events"("status", "startsAt");

-- CreateIndex
CREATE INDEX "events_ministryId_idx" ON "events"("ministryId");

-- CreateIndex
CREATE INDEX "events_isFeatured_status_idx" ON "events"("isFeatured", "status");

-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_token_key" ON "event_registrations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_code_key" ON "event_registrations"("code");

-- CreateIndex
CREATE INDEX "event_registrations_eventId_status_idx" ON "event_registrations"("eventId", "status");

-- CreateIndex
CREATE INDEX "event_registrations_userId_idx" ON "event_registrations"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_eventId_email_key" ON "event_registrations"("eventId", "email");

-- AddForeignKey
ALTER TABLE "ministries" ADD CONSTRAINT "ministries_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ministry_members" ADD CONSTRAINT "ministry_members_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "ministries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ministry_members" ADD CONSTRAINT "ministry_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "small_groups" ADD CONSTRAINT "small_groups_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "small_group_members" ADD CONSTRAINT "small_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "small_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "small_group_members" ADD CONSTRAINT "small_group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "ministries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_smallGroupId_fkey" FOREIGN KEY ("smallGroupId") REFERENCES "small_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
