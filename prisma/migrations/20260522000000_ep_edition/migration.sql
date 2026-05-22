-- Tabela singleton para a edição atual do EP (3 dias principais + ônibus na ida/volta).
CREATE TABLE "EpEdition" (
    "id" TEXT NOT NULL DEFAULT 'current',
    "name" TEXT,
    "dayMinus1" TIMESTAMP(3),
    "day0" TIMESTAMP(3),
    "day1" TIMESTAMP(3),
    "day2" TIMESTAMP(3),
    "day3" TIMESTAMP(3),
    "day4" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EpEdition_pkey" PRIMARY KEY ("id")
);
