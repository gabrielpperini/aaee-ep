-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'DIRECTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('CONFIRMED', 'POSSIBLE', 'IN_PROGRESS', 'FINISHED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "EventPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EventPhase" AS ENUM ('GROUP', 'ROUND_OF_16', 'QUARTER', 'SEMI', 'FINAL', 'THIRD_PLACE', 'HEAT', 'ELIMINATORY', 'OTHER');

-- CreateEnum
CREATE TYPE "ModalityCategory" AS ENUM ('SPORT', 'CULTURAL', 'CHEERING', 'LOGISTICS', 'GENERAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "phone" TEXT,
    "isAthlete" BOOLEAN NOT NULL DEFAULT false,
    "isSupporter" BOOLEAN NOT NULL DEFAULT true,
    "isDirector" BOOLEAN NOT NULL DEFAULT false,
    "isSupport" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modality" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ModalityCategory" NOT NULL DEFAULT 'SPORT',
    "priority" "EventPriority" NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Modality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModalityAthlete" (
    "modalityId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "ModalityAthlete_pkey" PRIMARY KEY ("modalityId","personId")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "modalityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "day" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "locationId" TEXT,
    "opponent" TEXT,
    "phase" "EventPhase" NOT NULL DEFAULT 'OTHER',
    "priority" "EventPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "EventStatus" NOT NULL DEFAULT 'CONFIRMED',
    "isConditional" BOOLEAN NOT NULL DEFAULT false,
    "desiredSupportersCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventAthlete" (
    "eventId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "EventAthlete_pkey" PRIMARY KEY ("eventId","personId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_authUserId_idx" ON "User"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Person_userId_key" ON "Person"("userId");

-- CreateIndex
CREATE INDEX "Person_name_idx" ON "Person"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Modality_name_key" ON "Modality"("name");

-- CreateIndex
CREATE INDEX "Event_day_startTime_idx" ON "Event"("day", "startTime");

-- CreateIndex
CREATE INDEX "Event_modalityId_idx" ON "Event"("modalityId");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModalityAthlete" ADD CONSTRAINT "ModalityAthlete_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "Modality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModalityAthlete" ADD CONSTRAINT "ModalityAthlete_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "Modality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAthlete" ADD CONSTRAINT "EventAthlete_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAthlete" ADD CONSTRAINT "EventAthlete_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
