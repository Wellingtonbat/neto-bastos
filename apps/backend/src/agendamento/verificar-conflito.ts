import { PrismaService } from 'src/db/prisma.service';
import { StatusAgendamento } from '@prisma/client';
import { DataUtils } from '@neto-bastos/core';

// Um agendamento ocupa `soma(servico.qtdeSlots) * tempoSlotMinutos` minutos
// a partir do horario marcado -- mesma conta que ObterHorariosOcupados (em
// packages/core) ja usa para colorir a agenda, só que aqui vira uma trava
// de verdade em vez de só indicação visual.
function duracaoEmMinutos(
  servicos: { qtdeSlots: number }[],
  tempoSlotMinutos: number,
): number {
  const slots = servicos.reduce((total, s) => total + s.qtdeSlots, 0);
  return Math.max(slots, 1) * tempoSlotMinutos;
}

export interface AgendamentoComServicos {
  data: Date;
  servicos: { qtdeSlots: number }[];
}

export function existeSobreposicao(
  existentes: AgendamentoComServicos[],
  novaData: Date,
  novosServicos: { qtdeSlots: number }[],
  tempoSlotMinutos: number,
): boolean {
  const inicioNovo = novaData.getTime();
  const fimNovo =
    inicioNovo + duracaoEmMinutos(novosServicos, tempoSlotMinutos) * 60000;

  return existentes.some((existente) => {
    const inicioExistente = existente.data.getTime();
    const fimExistente =
      inicioExistente +
      duracaoEmMinutos(existente.servicos, tempoSlotMinutos) * 60000;
    return inicioNovo < fimExistente && inicioExistente < fimNovo;
  });
}

export async function buscarAgendamentosNaoCanceladosDoDia(
  prisma: PrismaService,
  profissionalId: number,
  data: Date,
): Promise<AgendamentoComServicos[]> {
  const { inicioDoDia, fimDoDia } = DataUtils.limitesDoDiaNoFuso(data);

  return prisma.agendamento.findMany({
    where: {
      profissionalId,
      status: { not: StatusAgendamento.CANCELADO },
      data: { gte: inicioDoDia, lte: fimDoDia },
    },
    select: { data: true, servicos: { select: { qtdeSlots: true } } },
  });
}

export async function existeConflitoDeHorario(
  prisma: PrismaService,
  profissionalId: number,
  novaData: Date,
  novosServicos: { qtdeSlots: number }[],
  tempoSlotMinutos: number,
): Promise<boolean> {
  const existentes = await buscarAgendamentosNaoCanceladosDoDia(
    prisma,
    profissionalId,
    novaData,
  );
  return existeSobreposicao(existentes, novaData, novosServicos, tempoSlotMinutos);
}
