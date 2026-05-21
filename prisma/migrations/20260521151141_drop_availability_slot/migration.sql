/*
  Warnings:

  - You are about to drop the `AvailabilitySlot` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AvailabilitySlot" DROP CONSTRAINT "AvailabilitySlot_personId_fkey";

-- DropTable
DROP TABLE "AvailabilitySlot";
