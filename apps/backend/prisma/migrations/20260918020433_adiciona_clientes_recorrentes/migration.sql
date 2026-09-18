-- AlterTable
ALTER TABLE "agendamento" ADD COLUMN     "agendamentoRecorrenteId" INTEGER,
ADD COLUMN     "personalizado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "clienteRecorrente" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "agendamento_recorrente" (
    "id" SERIAL NOT NULL,
    "emailCliente" TEXT NOT NULL,
    "nomeCliente" TEXT NOT NULL,
    "telefoneCliente" TEXT,
    "profissionalId" INTEGER NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horario" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agendamento_recorrente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AgendamentoRecorrenteToServico" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_AgendamentoRecorrenteToServico_AB_unique" ON "_AgendamentoRecorrenteToServico"("A", "B");

-- CreateIndex
CREATE INDEX "_AgendamentoRecorrenteToServico_B_index" ON "_AgendamentoRecorrenteToServico"("B");

-- AddForeignKey
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_agendamentoRecorrenteId_fkey" FOREIGN KEY ("agendamentoRecorrenteId") REFERENCES "agendamento_recorrente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamento_recorrente" ADD CONSTRAINT "agendamento_recorrente_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AgendamentoRecorrenteToServico" ADD CONSTRAINT "_AgendamentoRecorrenteToServico_A_fkey" FOREIGN KEY ("A") REFERENCES "agendamento_recorrente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AgendamentoRecorrenteToServico" ADD CONSTRAINT "_AgendamentoRecorrenteToServico_B_fkey" FOREIGN KEY ("B") REFERENCES "servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
