-- CreateTable
CREATE TABLE "sermon_questions" (
    "id" TEXT NOT NULL,
    "sermonId" TEXT NOT NULL,
    "normalised" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "provider" TEXT,
    "passages" INTEGER[],
    "askCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sermon_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sermon_questions_sermonId_askCount_idx" ON "sermon_questions"("sermonId", "askCount");

-- CreateIndex
CREATE UNIQUE INDEX "sermon_questions_sermonId_normalised_key" ON "sermon_questions"("sermonId", "normalised");

-- AddForeignKey
ALTER TABLE "sermon_questions" ADD CONSTRAINT "sermon_questions_sermonId_fkey" FOREIGN KEY ("sermonId") REFERENCES "sermons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
