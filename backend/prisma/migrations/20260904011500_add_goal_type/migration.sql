-- AlterTable: Add interestRate if not existing
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "interestRate" DECIMAL(5,2);

-- AlterTable: Add Goal type column if not existing
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'CUSTOM';

-- CreateTable: GoalContribution
CREATE TABLE IF NOT EXISTS "GoalContribution" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "isInitial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GoalContribution_goalId_idx" ON "GoalContribution"("goalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GoalContribution_date_idx" ON "GoalContribution"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GoalContribution_goalId_date_idx" ON "GoalContribution"("goalId", "date");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GoalContribution_goalId_fkey'
    ) THEN
        ALTER TABLE "GoalContribution" ADD CONSTRAINT "GoalContribution_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
