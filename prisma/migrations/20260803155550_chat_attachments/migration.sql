-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "messageId" TEXT,
    "conversationId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attachments_messageId_idx" ON "attachments"("messageId");

-- CreateIndex
CREATE INDEX "attachments_conversationId_idx" ON "attachments"("conversationId");

-- CreateIndex
CREATE INDEX "attachments_messageId_createdAt_idx" ON "attachments"("messageId", "createdAt");

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
