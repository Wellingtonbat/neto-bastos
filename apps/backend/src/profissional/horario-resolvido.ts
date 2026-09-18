import { BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { horaParaMinutos } from './horario-validacao';

export interface HorarioResolvido {
  fechado: boolean;
  horaInicio: string;
  horaFim: string;
  horaAlmocoInicio: string | null;
  horaAlmocoFim: string | null;
  tempoSlotMinutos: number;
}

// Mesma tecnica de DataUtils.limitesDoDiaNoFuso (packages/core): extrai o
// dia-calendario de `data` sempre no fuso do Brasil, independente do fuso
// do runtime que executa o codigo.
export function formatarDataISONoFuso(
  data: Date,
  fusoHorario = 'America/Sao_Paulo',
): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fusoHorario,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(data);

  const mapa: Record<string, string> = {};
  for (const parte of partes) {
    mapa[parte.type] = parte.value;
  }

  return `${mapa.year}-${mapa.month}-${mapa.day}`;
}

function diaSemanaNoFuso(
  data: Date,
  fusoHorario = 'America/Sao_Paulo',
): number {
  const dias: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: fusoHorario,
    weekday: 'short',
  }).format(data);
  return dias[weekday] ?? data.getDay();
}

// Resolve o horario efetivo de um profissional para uma data especifica,
// aplicando a precedencia: excecao da data > override semanal do dia da
// semana > horario base do profissional. Retorna null se o profissional
// nao existe, ou fechado=true se a data cai fora do expediente (dia que
// nao esta em diasTrabalho, ou excecao marcada como fechada).
export async function resolverHorarioDoDia(
  prisma: PrismaService,
  profissionalId: number,
  data: Date,
): Promise<HorarioResolvido | null> {
  const profissional = await prisma.profissional.findUnique({
    where: { id: profissionalId },
    select: {
      diasTrabalho: true,
      horaInicio: true,
      horaFim: true,
      horaAlmocoInicio: true,
      horaAlmocoFim: true,
      tempoSlotMinutos: true,
    },
  });

  if (!profissional) return null;

  const diaSemana = diaSemanaNoFuso(data);
  const dataISO = formatarDataISONoFuso(data);

  const excecao = await prisma.excecaoAgenda.findUnique({
    where: {
      profissionalId_data: {
        profissionalId,
        data: new Date(`${dataISO}T00:00:00.000Z`),
      },
    },
  });

  if (excecao?.fechado) {
    return {
      fechado: true,
      horaInicio: profissional.horaInicio,
      horaFim: profissional.horaFim,
      horaAlmocoInicio: profissional.horaAlmocoInicio,
      horaAlmocoFim: profissional.horaAlmocoFim,
      tempoSlotMinutos: profissional.tempoSlotMinutos,
    };
  }

  if (!profissional.diasTrabalho.includes(diaSemana)) {
    return {
      fechado: true,
      horaInicio: profissional.horaInicio,
      horaFim: profissional.horaFim,
      horaAlmocoInicio: profissional.horaAlmocoInicio,
      horaAlmocoFim: profissional.horaAlmocoFim,
      tempoSlotMinutos: profissional.tempoSlotMinutos,
    };
  }

  if (excecao) {
    return {
      fechado: false,
      horaInicio: excecao.horaInicio ?? profissional.horaInicio,
      horaFim: excecao.horaFim ?? profissional.horaFim,
      horaAlmocoInicio:
        excecao.horaAlmocoInicio ?? profissional.horaAlmocoInicio,
      horaAlmocoFim: excecao.horaAlmocoFim ?? profissional.horaAlmocoFim,
      tempoSlotMinutos:
        excecao.tempoSlotMinutos ?? profissional.tempoSlotMinutos,
    };
  }

  const semanal = await prisma.horarioSemanal.findUnique({
    where: { profissionalId_diaSemana: { profissionalId, diaSemana } },
  });

  if (semanal) {
    return {
      fechado: false,
      horaInicio: semanal.horaInicio,
      horaFim: semanal.horaFim,
      horaAlmocoInicio: semanal.horaAlmocoInicio,
      horaAlmocoFim: semanal.horaAlmocoFim,
      tempoSlotMinutos:
        semanal.tempoSlotMinutos ?? profissional.tempoSlotMinutos,
    };
  }

  return {
    fechado: false,
    horaInicio: profissional.horaInicio,
    horaFim: profissional.horaFim,
    horaAlmocoInicio: profissional.horaAlmocoInicio,
    horaAlmocoFim: profissional.horaAlmocoFim,
    tempoSlotMinutos: profissional.tempoSlotMinutos,
  };
}

// Valida um horario "HH:mm" contra um HorarioResolvido: dia fechado, fora
// da janela de atendimento, fora do alinhamento de slot, ou dentro do
// almoco. Usado tanto na criacao de um agendamento avulso quanto na
// criacao/edicao de uma serie recorrente. Lanca BadRequestException com a
// mesma mensagem em ambos os casos.
export function validarHorarioResolvido(
  horario: HorarioResolvido,
  horaMinuto: string,
): void {
  if (horario.fechado) {
    throw new BadRequestException(
      'Profissional nao atende no dia selecionado.',
    );
  }

  const minutosSelecionados = horaParaMinutos(horaMinuto);
  const inicioJanela = horaParaMinutos(horario.horaInicio);
  const fimJanela = horaParaMinutos(horario.horaFim);

  if (minutosSelecionados < inicioJanela || minutosSelecionados >= fimJanela) {
    throw new BadRequestException(
      'Horario fora da janela de atendimento do profissional.',
    );
  }

  if ((minutosSelecionados - inicioJanela) % horario.tempoSlotMinutos !== 0) {
    throw new BadRequestException(
      'Horario invalido para a agenda do profissional.',
    );
  }

  if (horario.horaAlmocoInicio && horario.horaAlmocoFim) {
    const inicioAlmoco = horaParaMinutos(horario.horaAlmocoInicio);
    const fimAlmoco = horaParaMinutos(horario.horaAlmocoFim);

    if (
      minutosSelecionados >= inicioAlmoco &&
      minutosSelecionados < fimAlmoco
    ) {
      throw new BadRequestException(
        'Profissional esta no horario de almoco neste horario.',
      );
    }
  }
}
