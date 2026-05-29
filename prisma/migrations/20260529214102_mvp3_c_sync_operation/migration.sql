-- CreateTable
CREATE TABLE "SyncOperation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncOperation_userId_status_idx" ON "SyncOperation"("userId", "status");

-- AddForeignKey
ALTER TABLE "SyncOperation" ADD CONSTRAINT "SyncOperation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
