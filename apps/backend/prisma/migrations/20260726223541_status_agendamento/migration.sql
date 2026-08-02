-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('PENDENTE', 'CONFIRMADO', 'CANCELADO');

-- AlterTable
ALTER TABLE "agendamento" ADD COLUMN     "status" "StatusAgendamento" NOT NULL DEFAULT 'PENDENTE';
