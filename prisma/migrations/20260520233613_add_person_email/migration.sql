-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "email" TEXT;

-- CreateIndex
CREATE INDEX "Person_email_idx" ON "Person"("email");
