-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MEMBER', 'FOLLOW_UP_TEAM', 'PRAYER_TEAM', 'LEADER', 'PASTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('SALVATION', 'REDEDICATION', 'BAPTISM', 'MEMBERSHIP', 'PRAYER_REQUEST');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'CONTACTED', 'MEETING_SET', 'DISCIPLESHIP_STARTED', 'COMPLETED', 'LOST_CONTACT');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED');

-- CreateEnum
CREATE TYPE "PrayerCategory" AS ENUM ('SALVATION', 'HEALING', 'FINANCES', 'FAMILY', 'RELATIONSHIPS', 'GUIDANCE', 'THANKSGIVING', 'GENERAL');

-- CreateEnum
CREATE TYPE "PrayerUrgency" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "PrayerVisibility" AS ENUM ('PUBLIC', 'MEMBERS_ONLY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "PrayerStatus" AS ENUM ('ACTIVE', 'ANSWERED', 'ARCHIVED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "TestimonyCategory" AS ENUM ('SALVATION', 'HEALING', 'PROVISION', 'BREAKTHROUGH', 'OTHER');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "page_contents" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "content" TEXT NOT NULL,
    "meta" JSONB,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "availableForFollowUp" BOOLEAN NOT NULL DEFAULT true,
    "birthDate" TIMESTAMP(3),
    "parentalConsent" BOOLEAN NOT NULL DEFAULT false,
    "bannedAt" TIMESTAMP(3),
    "bannedReason" TEXT,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salvation_decisions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "decision" "DecisionType" NOT NULL DEFAULT 'SALVATION',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stepGospel" BOOLEAN NOT NULL DEFAULT false,
    "stepPrayer" BOOLEAN NOT NULL DEFAULT false,
    "stepContact" BOOLEAN NOT NULL DEFAULT false,
    "stepFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "followUpTeamId" TEXT,
    "assignedToId" TEXT,
    "notes" TEXT,
    "followUpStatus" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "discipleshipStarted" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salvation_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "assignedById" TEXT,
    "notes" TEXT,
    "lastContact" TIMESTAMP(3),
    "nextContact" TIMESTAMP(3),
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discipleship_courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'BEGINNER',
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discipleship_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discipleship_weeks" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discipleship_weeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discipleship_lessons" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "bibleVerses" TEXT[],
    "videoUrl" TEXT,
    "audioUrl" TEXT,
    "reflectionQuestions" TEXT[],
    "quiz" JSONB,
    "resources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discipleship_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discipleship_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "completedLessons" TEXT[],
    "currentWeek" INTEGER NOT NULL DEFAULT 1,
    "currentLesson" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "CourseStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "notes" TEXT,
    "mentorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discipleship_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prayer_requests" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "PrayerCategory" NOT NULL DEFAULT 'GENERAL',
    "urgency" "PrayerUrgency" NOT NULL DEFAULT 'NORMAL',
    "visibility" "PrayerVisibility" NOT NULL DEFAULT 'PUBLIC',
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "verse" TEXT,
    "imageUrl" TEXT,
    "prayerCount" INTEGER NOT NULL DEFAULT 0,
    "status" "PrayerStatus" NOT NULL DEFAULT 'ACTIVE',
    "answeredAt" TIMESTAMP(3),
    "answerNote" TEXT,
    "groupId" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "needsPastoralFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnResponse" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prayer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prayer_logs" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT,
    "actorKey" TEXT NOT NULL,
    "viaPrayerTeam" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prayer_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prayer_responses" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "authorId" TEXT,
    "guestName" TEXT,
    "content" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prayer_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prayer_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "meetingTime" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "shareRequests" BOOLEAN NOT NULL DEFAULT true,
    "leaderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prayer_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prayer_group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prayer_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prayer_group_posts" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prayer_group_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "TestimonyCategory" NOT NULL DEFAULT 'OTHER',
    "authorId" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "rejectReason" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimony_likes" (
    "id" TEXT NOT NULL,
    "testimonyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "testimony_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimony_comments" (
    "id" TEXT NOT NULL,
    "testimonyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "testimony_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "page_contents_slug_key" ON "page_contents"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_role_availableForFollowUp_idx" ON "users"("role", "availableForFollowUp");

-- CreateIndex
CREATE INDEX "salvation_decisions_followUpStatus_idx" ON "salvation_decisions"("followUpStatus");

-- CreateIndex
CREATE INDEX "salvation_decisions_assignedToId_idx" ON "salvation_decisions"("assignedToId");

-- CreateIndex
CREATE INDEX "salvation_decisions_createdAt_idx" ON "salvation_decisions"("createdAt");

-- CreateIndex
CREATE INDEX "follow_ups_assignedToId_status_idx" ON "follow_ups"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "follow_ups_decisionId_idx" ON "follow_ups"("decisionId");

-- CreateIndex
CREATE UNIQUE INDEX "discipleship_courses_slug_key" ON "discipleship_courses"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "discipleship_weeks_courseId_weekNumber_key" ON "discipleship_weeks"("courseId", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "discipleship_lessons_slug_key" ON "discipleship_lessons"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "discipleship_lessons_weekId_order_key" ON "discipleship_lessons"("weekId", "order");

-- CreateIndex
CREATE INDEX "discipleship_progress_mentorId_idx" ON "discipleship_progress"("mentorId");

-- CreateIndex
CREATE UNIQUE INDEX "discipleship_progress_userId_courseId_key" ON "discipleship_progress"("userId", "courseId");

-- CreateIndex
CREATE INDEX "prayer_requests_status_visibility_createdAt_idx" ON "prayer_requests"("status", "visibility", "createdAt");

-- CreateIndex
CREATE INDEX "prayer_requests_category_idx" ON "prayer_requests"("category");

-- CreateIndex
CREATE INDEX "prayer_requests_urgency_status_idx" ON "prayer_requests"("urgency", "status");

-- CreateIndex
CREATE INDEX "prayer_requests_groupId_idx" ON "prayer_requests"("groupId");

-- CreateIndex
CREATE INDEX "prayer_logs_userId_idx" ON "prayer_logs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "prayer_logs_requestId_actorKey_key" ON "prayer_logs"("requestId", "actorKey");

-- CreateIndex
CREATE INDEX "prayer_responses_requestId_createdAt_idx" ON "prayer_responses"("requestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "prayer_groups_slug_key" ON "prayer_groups"("slug");

-- CreateIndex
CREATE INDEX "prayer_group_members_userId_idx" ON "prayer_group_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "prayer_group_members_groupId_userId_key" ON "prayer_group_members"("groupId", "userId");

-- CreateIndex
CREATE INDEX "prayer_group_posts_groupId_createdAt_idx" ON "prayer_group_posts"("groupId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "testimonies_slug_key" ON "testimonies"("slug");

-- CreateIndex
CREATE INDEX "testimonies_status_createdAt_idx" ON "testimonies"("status", "createdAt");

-- CreateIndex
CREATE INDEX "testimonies_isFeatured_status_idx" ON "testimonies"("isFeatured", "status");

-- CreateIndex
CREATE UNIQUE INDEX "testimony_likes_testimonyId_userId_key" ON "testimony_likes"("testimonyId", "userId");

-- CreateIndex
CREATE INDEX "testimony_comments_testimonyId_createdAt_idx" ON "testimony_comments"("testimonyId", "createdAt");

-- AddForeignKey
ALTER TABLE "salvation_decisions" ADD CONSTRAINT "salvation_decisions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salvation_decisions" ADD CONSTRAINT "salvation_decisions_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "salvation_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discipleship_weeks" ADD CONSTRAINT "discipleship_weeks_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "discipleship_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discipleship_lessons" ADD CONSTRAINT "discipleship_lessons_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "discipleship_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discipleship_progress" ADD CONSTRAINT "discipleship_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discipleship_progress" ADD CONSTRAINT "discipleship_progress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "discipleship_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discipleship_progress" ADD CONSTRAINT "discipleship_progress_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_requests" ADD CONSTRAINT "prayer_requests_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_requests" ADD CONSTRAINT "prayer_requests_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "prayer_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_logs" ADD CONSTRAINT "prayer_logs_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "prayer_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_logs" ADD CONSTRAINT "prayer_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_responses" ADD CONSTRAINT "prayer_responses_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "prayer_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_responses" ADD CONSTRAINT "prayer_responses_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_groups" ADD CONSTRAINT "prayer_groups_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_group_members" ADD CONSTRAINT "prayer_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "prayer_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_group_members" ADD CONSTRAINT "prayer_group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_group_posts" ADD CONSTRAINT "prayer_group_posts_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "prayer_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_group_posts" ADD CONSTRAINT "prayer_group_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonies" ADD CONSTRAINT "testimonies_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonies" ADD CONSTRAINT "testimonies_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_likes" ADD CONSTRAINT "testimony_likes_testimonyId_fkey" FOREIGN KEY ("testimonyId") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_likes" ADD CONSTRAINT "testimony_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_comments" ADD CONSTRAINT "testimony_comments_testimonyId_fkey" FOREIGN KEY ("testimonyId") REFERENCES "testimonies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimony_comments" ADD CONSTRAINT "testimony_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
