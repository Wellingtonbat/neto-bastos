-- CreateTable
CREATE TABLE "horario_semanal" (
    "id" SERIAL NOT NULL,
    "profissionalId" INTEGER NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "horaAlmocoInicio" TEXT,
    "horaAlmocoFim" TEXT,
    "tempoSlotMinutos" INTEGER,

    CONSTRAINT "horario_semanal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "excecao_agenda" (
    "id" SERIAL NOT NULL,
    "profissionalId" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "fechado" BOOLEAN NOT NULL DEFAULT false,
    "horaInicio" TEXT,
    "horaFim" TEXT,
    "horaAlmocoInicio" TEXT,
    "horaAlmocoFim" TEXT,
    "tempoSlotMinutos" INTEGER,

    CONSTRAINT "excecao_agenda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "horario_semanal_profissionalId_diaSemana_key" ON "horario_semanal"("profissionalId", "diaSemana");

-- CreateIndex
CREATE UNIQUE INDEX "excecao_agenda_profissionalId_data_key" ON "excecao_agenda"("profissionalId", "data");

-- AddForeignKey
ALTER TABLE "horario_semanal" ADD CONSTRAINT "horario_semanal_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "excecao_agenda" ADD CONSTRAINT "excecao_agenda_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
