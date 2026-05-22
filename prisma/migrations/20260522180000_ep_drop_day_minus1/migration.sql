-- Remove o conceito de "véspera". Dias do EP passam a ser 0..4:
--   0 = ida / chegada
--   1, 2, 3 = competição
--   4 = volta
-- Eventos antigos com day=-1 (ida) e day=0 (véspera) são fundidos em day=0.
UPDATE "Event" SET "day" = 0 WHERE "day" IN (-1, 0);

ALTER TABLE "EpEdition" DROP COLUMN "dayMinus1";
