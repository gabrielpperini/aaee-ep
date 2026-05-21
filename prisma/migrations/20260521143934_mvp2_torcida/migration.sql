-- CreateEnum
CREATE TYPE "Course" AS ENUM ('CIVIL', 'ELETRICA', 'MECANICA', 'COMPUTACAO', 'CONTROLE_AUTOMACAO', 'MATERIAIS', 'CARTOGRAFICA', 'ENERGIA', 'METALURGICA', 'QUIMICA', 'PRODUCAO', 'AMBIENTAL', 'FISICA');

-- CreateEnum
CREATE TYPE "AssignmentRole" AS ENUM ('SUPPORTER', 'CAPTAIN', 'MATERIAL_LEAD', 'SUPPORT');

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "course" "Course",
ADD COLUMN     "semester" INTEGER;

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "slotStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "eventId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" "AssignmentRole" NOT NULL DEFAULT 'SUPPORTER',
    "isCaptain" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("eventId","personId")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "eventId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("eventId","personId")
);

-- CreateIndex
CREATE INDEX "AvailabilitySlot_day_slotStart_idx" ON "AvailabilitySlot"("day", "slotStart");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilitySlot_personId_slotStart_key" ON "AvailabilitySlot"("personId", "slotStart");

-- CreateIndex
CREATE INDEX "Assignment_personId_idx" ON "Assignment"("personId");

-- CreateIndex
CREATE INDEX "Assignment_eventId_isCaptain_idx" ON "Assignment"("eventId", "isCaptain");

-- CreateIndex
CREATE INDEX "CheckIn_personId_idx" ON "CheckIn"("personId");

-- CreateIndex
CREATE INDEX "CheckIn_eventId_idx" ON "CheckIn"("eventId");

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
