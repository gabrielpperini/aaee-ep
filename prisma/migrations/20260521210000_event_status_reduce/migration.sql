-- Reduz EventStatus para 3 valores: CONFIRMED, CANCELLED, POSTPONED.
-- "Em andamento" e "Finalizado" passam a ser derivados de startTime/endTime vs now.
-- "Possível" passa a ser derivado de isConditional = true.

-- 1. Mapeia eventos existentes pros valores restantes.
UPDATE "Event"
SET "status" = 'CONFIRMED'
WHERE "status" IN ('POSSIBLE', 'IN_PROGRESS', 'FINISHED');

-- 2. Recria o enum sem os valores removidos.
ALTER TYPE "EventStatus" RENAME TO "EventStatus_old";

CREATE TYPE "EventStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'POSTPONED');

ALTER TABLE "Event"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "EventStatus" USING ("status"::text::"EventStatus"),
  ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';

DROP TYPE "EventStatus_old";
