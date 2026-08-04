-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP', 'MINISTRY', 'SMALL_GROUP', 'PRAYER_GROUP');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'ACTIONED', 'DISMISSED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "chatBanReason" TEXT,
ADD COLUMN     "chatBannedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL,
    "title" TEXT,
    "directKey" TEXT,
    "ministryId" TEXT,
    "smallGroupId" TEXT,
    "prayerGroupId" TEXT,
    "createdById" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_members" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isModerator" BOOLEAN NOT NULL DEFAULT false,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "lastReadSeq" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "replyToId" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "seq" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_reports" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_blocks" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "retentionDays" INTEGER,
    "bannedWords" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_directKey_key" ON "conversations"("directKey");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_ministryId_key" ON "conversations"("ministryId");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_smallGroupId_key" ON "conversations"("smallGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_prayerGroupId_key" ON "conversations"("prayerGroupId");

-- CreateIndex
CREATE INDEX "conversations_type_lastMessageAt_idx" ON "conversations"("type", "lastMessageAt");

-- CreateIndex
CREATE INDEX "conversation_members_userId_leftAt_idx" ON "conversation_members"("userId", "leftAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_members_conversationId_userId_key" ON "conversation_members"("conversationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "messages_seq_key" ON "messages"("seq");

-- CreateIndex
CREATE INDEX "messages_conversationId_seq_idx" ON "messages"("conversationId", "seq");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "message_reports_status_createdAt_idx" ON "message_reports"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "message_reports_messageId_reportedById_key" ON "message_reports"("messageId", "reportedById");

-- CreateIndex
CREATE INDEX "user_blocks_blockedId_idx" ON "user_blocks"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "user_blocks_blockerId_blockedId_key" ON "user_blocks"("blockerId", "blockedId");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "ministries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_smallGroupId_fkey" FOREIGN KEY ("smallGroupId") REFERENCES "small_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_prayerGroupId_fkey" FOREIGN KEY ("prayerGroupId") REFERENCES "prayer_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
