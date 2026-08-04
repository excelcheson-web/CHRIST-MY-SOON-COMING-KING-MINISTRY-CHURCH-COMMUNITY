-- CreateEnum
CREATE TYPE "SermonStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('GENERAL', 'PRAYER', 'TESTIMONY', 'QUESTION', 'ENCOURAGEMENT');

-- CreateEnum
CREATE TYPE "PostVisibility" AS ENUM ('PUBLIC', 'MEMBERS', 'MINISTRY', 'SMALL_GROUP');

-- CreateTable
CREATE TABLE "sermon_series" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sermon_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sermons" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "speaker" TEXT NOT NULL,
    "speakerBio" TEXT,
    "speakerImage" TEXT,
    "seriesId" TEXT,
    "ministryId" TEXT,
    "biblePassage" TEXT,
    "bibleText" TEXT,
    "preachedAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "videoUrl" TEXT,
    "audioUrl" TEXT,
    "transcript" TEXT,
    "notes" TEXT,
    "studyQuestions" TEXT[],
    "topics" TEXT[],
    "tags" TEXT[],
    "image" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "status" "SermonStatus" NOT NULL DEFAULT 'DRAFT',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sermons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sermon_views" (
    "id" TEXT NOT NULL,
    "sermonId" TEXT NOT NULL,
    "userId" TEXT,
    "actorKey" TEXT NOT NULL,
    "watchSeconds" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sermon_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "PostType" NOT NULL DEFAULT 'GENERAL',
    "body" TEXT NOT NULL,
    "videoUrl" TEXT,
    "imageKey" TEXT,
    "imageWidth" INTEGER,
    "imageHeight" INTEGER,
    "visibility" "PostVisibility" NOT NULL DEFAULT 'PUBLIC',
    "ministryId" TEXT,
    "smallGroupId" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "parentId" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_likes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_reports" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sermon_series_slug_key" ON "sermon_series"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "sermons_slug_key" ON "sermons"("slug");

-- CreateIndex
CREATE INDEX "sermons_status_preachedAt_idx" ON "sermons"("status", "preachedAt");

-- CreateIndex
CREATE INDEX "sermons_seriesId_idx" ON "sermons"("seriesId");

-- CreateIndex
CREATE INDEX "sermons_speaker_idx" ON "sermons"("speaker");

-- CreateIndex
CREATE INDEX "sermons_isFeatured_status_idx" ON "sermons"("isFeatured", "status");

-- CreateIndex
CREATE INDEX "sermon_views_userId_idx" ON "sermon_views"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sermon_views_sermonId_actorKey_key" ON "sermon_views"("sermonId", "actorKey");

-- CreateIndex
CREATE INDEX "posts_visibility_deletedAt_createdAt_idx" ON "posts"("visibility", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "posts_authorId_createdAt_idx" ON "posts"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "posts_ministryId_createdAt_idx" ON "posts"("ministryId", "createdAt");

-- CreateIndex
CREATE INDEX "posts_smallGroupId_createdAt_idx" ON "posts"("smallGroupId", "createdAt");

-- CreateIndex
CREATE INDEX "posts_pinned_createdAt_idx" ON "posts"("pinned", "createdAt");

-- CreateIndex
CREATE INDEX "post_comments_postId_createdAt_idx" ON "post_comments"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "post_comments_parentId_idx" ON "post_comments"("parentId");

-- CreateIndex
CREATE INDEX "post_likes_userId_idx" ON "post_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "post_likes_postId_userId_key" ON "post_likes"("postId", "userId");

-- CreateIndex
CREATE INDEX "post_reports_status_createdAt_idx" ON "post_reports"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "post_reports_postId_reportedById_key" ON "post_reports"("postId", "reportedById");

-- AddForeignKey
ALTER TABLE "sermons" ADD CONSTRAINT "sermons_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "sermon_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sermons" ADD CONSTRAINT "sermons_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "ministries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sermon_views" ADD CONSTRAINT "sermon_views_sermonId_fkey" FOREIGN KEY ("sermonId") REFERENCES "sermons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sermon_views" ADD CONSTRAINT "sermon_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "ministries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_smallGroupId_fkey" FOREIGN KEY ("smallGroupId") REFERENCES "small_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
