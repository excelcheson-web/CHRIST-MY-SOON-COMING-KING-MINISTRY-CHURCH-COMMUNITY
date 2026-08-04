-- CreateEnum
CREATE TYPE "GroupKind" AS ENUM ('SMALL_GROUP', 'NEIGHBOURHOOD', 'INTEREST', 'SERVICE_TIME', 'SUPPORT', 'LEADERSHIP');

-- CreateEnum
CREATE TYPE "PostChannel" AS ENUM ('FEED', 'ENCOURAGEMENT', 'VERSE', 'CHALLENGE', 'WORSHIP');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('PRAYING', 'LOVE', 'ENCOURAGED', 'AMEN', 'REJOICING');

-- CreateEnum
CREATE TYPE "HelpKind" AS ENUM ('REQUEST', 'OFFER');

-- CreateEnum
CREATE TYPE "HelpStatus" AS ENUM ('OPEN', 'CLAIMED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HelpCategory" AS ENUM ('TRANSPORT', 'MOVING', 'MEALS', 'CHILDCARE', 'REPAIRS', 'TECH', 'TUTORING', 'ADMIN', 'CLEANING', 'OTHER');

-- CreateEnum
CREATE TYPE "CareKind" AS ENUM ('QUESTION', 'BENEVOLENCE', 'PASTORAL_VISIT');

-- CreateEnum
CREATE TYPE "CareStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'ANSWERED', 'CLOSED');

-- CreateEnum
CREATE TYPE "InitiativeKind" AS ENUM ('READING_PLAN', 'FAST', 'CHALLENGE');

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "anonymous" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "channel" "PostChannel" NOT NULL DEFAULT 'FEED',
ADD COLUMN     "praisedId" TEXT;

-- AlterTable
ALTER TABLE "small_groups" ADD COLUMN     "allowAnonymous" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inviteOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" "GroupKind" NOT NULL DEFAULT 'SMALL_GROUP';

-- CreateTable
CREATE TABLE "member_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "neighbourhood" TEXT,
    "phone" TEXT,
    "spiritualGifts" TEXT[],
    "interests" TEXT[],
    "skills" TEXT[],
    "mentorAvailable" BOOLEAN NOT NULL DEFAULT false,
    "seekingMentor" BOOLEAN NOT NULL DEFAULT false,
    "listed" BOOLEAN NOT NULL DEFAULT true,
    "showEmail" BOOLEAN NOT NULL DEFAULT false,
    "showPhone" BOOLEAN NOT NULL DEFAULT false,
    "showBirthday" BOOLEAN NOT NULL DEFAULT false,
    "showNeighbourhood" BOOLEAN NOT NULL DEFAULT true,
    "dndUntil" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "households" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_members" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isGuardian" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "household_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_reactions" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL DEFAULT 'LOVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_posts" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" "HelpKind" NOT NULL,
    "category" "HelpCategory" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "timeframe" TEXT,
    "area" TEXT,
    "status" "HelpStatus" NOT NULL DEFAULT 'OPEN',
    "claimedById" TEXT,
    "claimedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_replies" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "help_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_requests" (
    "id" TEXT NOT NULL,
    "authorId" TEXT,
    "replyToEmail" TEXT,
    "kind" "CareKind" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "CareStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "initiatives" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "InitiativeKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "details" TEXT,
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "initiatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "initiative_days" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT,
    "reference" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "initiative_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "initiative_members" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "intent" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "initiative_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "initiative_logs" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "dayId" TEXT,
    "userId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "initiative_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_verses" (
    "id" TEXT NOT NULL,
    "showOn" TIMESTAMP(3) NOT NULL,
    "reference" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "reflection" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_verses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polls" (
    "id" TEXT NOT NULL,
    "postId" TEXT,
    "question" TEXT NOT NULL,
    "multiple" BOOLEAN NOT NULL DEFAULT false,
    "closesAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_options" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_votes" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "member_profiles_userId_key" ON "member_profiles"("userId");

-- CreateIndex
CREATE INDEX "member_profiles_listed_lastActiveAt_idx" ON "member_profiles"("listed", "lastActiveAt");

-- CreateIndex
CREATE INDEX "member_profiles_mentorAvailable_idx" ON "member_profiles"("mentorAvailable");

-- CreateIndex
CREATE INDEX "household_members_userId_idx" ON "household_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "household_members_householdId_userId_key" ON "household_members"("householdId", "userId");

-- CreateIndex
CREATE INDEX "post_reactions_postId_type_idx" ON "post_reactions"("postId", "type");

-- CreateIndex
CREATE INDEX "post_reactions_userId_idx" ON "post_reactions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "post_reactions_postId_userId_key" ON "post_reactions"("postId", "userId");

-- CreateIndex
CREATE INDEX "help_posts_kind_status_createdAt_idx" ON "help_posts"("kind", "status", "createdAt");

-- CreateIndex
CREATE INDEX "help_posts_authorId_idx" ON "help_posts"("authorId");

-- CreateIndex
CREATE INDEX "help_replies_postId_createdAt_idx" ON "help_replies"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "care_requests_status_createdAt_idx" ON "care_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "care_requests_kind_status_idx" ON "care_requests"("kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "initiatives_slug_key" ON "initiatives"("slug");

-- CreateIndex
CREATE INDEX "initiatives_kind_isActive_startsOn_idx" ON "initiatives"("kind", "isActive", "startsOn");

-- CreateIndex
CREATE UNIQUE INDEX "initiative_days_initiativeId_dayNumber_key" ON "initiative_days"("initiativeId", "dayNumber");

-- CreateIndex
CREATE INDEX "initiative_members_userId_idx" ON "initiative_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "initiative_members_initiativeId_userId_key" ON "initiative_members"("initiativeId", "userId");

-- CreateIndex
CREATE INDEX "initiative_logs_initiativeId_createdAt_idx" ON "initiative_logs"("initiativeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "initiative_logs_initiativeId_userId_dayNumber_key" ON "initiative_logs"("initiativeId", "userId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "daily_verses_showOn_key" ON "daily_verses"("showOn");

-- CreateIndex
CREATE INDEX "daily_verses_showOn_idx" ON "daily_verses"("showOn");

-- CreateIndex
CREATE UNIQUE INDEX "polls_postId_key" ON "polls"("postId");

-- CreateIndex
CREATE INDEX "poll_options_pollId_order_idx" ON "poll_options"("pollId", "order");

-- CreateIndex
CREATE INDEX "poll_votes_pollId_userId_idx" ON "poll_votes"("pollId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "poll_votes_optionId_userId_key" ON "poll_votes"("optionId", "userId");

-- CreateIndex
CREATE INDEX "posts_channel_deletedAt_createdAt_idx" ON "posts"("channel", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "small_groups_kind_isActive_idx" ON "small_groups"("kind", "isActive");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_praisedId_fkey" FOREIGN KEY ("praisedId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_posts" ADD CONSTRAINT "help_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_posts" ADD CONSTRAINT "help_posts_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_replies" ADD CONSTRAINT "help_replies_postId_fkey" FOREIGN KEY ("postId") REFERENCES "help_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_replies" ADD CONSTRAINT "help_replies_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_requests" ADD CONSTRAINT "care_requests_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_requests" ADD CONSTRAINT "care_requests_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initiative_days" ADD CONSTRAINT "initiative_days_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "initiatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initiative_members" ADD CONSTRAINT "initiative_members_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "initiatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initiative_members" ADD CONSTRAINT "initiative_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initiative_logs" ADD CONSTRAINT "initiative_logs_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "initiatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initiative_logs" ADD CONSTRAINT "initiative_logs_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "initiative_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initiative_logs" ADD CONSTRAINT "initiative_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
