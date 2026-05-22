-- Person.email vira UNIQUE (auto-linking determinístico).
-- O índice não-unique existente é redundante depois disso e é removido.
-- DropIndex
DROP INDEX IF EXISTS "Person_email_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Person_email_key" ON "Person"("email");

-- Event.locationId: SET NULL -> RESTRICT (mesma política que modalityId).
-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_locationId_fkey";

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
