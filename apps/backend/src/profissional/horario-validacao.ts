import { BadRequestException } from '@nestjs/common';

export const REGEX_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export interface JanelaHorarioInput {
  horaInicio?: string | null;
  horaFim?: string | null;
  horaAlmocoInicio?: string | null;
  horaAlmocoFim?: string | null;
  tempoSlotMinutos?: number | string | null;
}

export interface JanelaHorarioNormalizada {
  horaInicio: string;
  horaFim: string;
  horaAlmocoInicio: string | null;
  horaAlmocoFim: string | null;
  tempoSlotMinutos: number | null;
}

// Valida e normaliza uma janela de horario (agenda base do profissional,
// override semanal ou excecao de data). Quando `tempoSlotMinutosObrigatorio`
// e false, a ausencia de tempoSlotMinutos e aceita (o chamador deve cair de
// volta para o valor padrao do profissional) -- usado pelos overrides, que
// podem customizar so o horario e manter o slot padrao.
export function normalizarJanelaHorario(
  body: JanelaHorarioInput,
  { tempoSlotMinutosObrigatorio }: { tempoSlotMinutosObrigatorio: boolean },
): JanelaHorarioNormalizada {
  const horaInicio = (body?.horaInicio ?? '').trim();
  const horaFim = (body?.horaFim ?? '').trim();

  if (!REGEX_HORA.test(horaInicio) || !REGEX_HORA.test(horaFim)) {
    throw new BadRequestException('Hora de inicio/fim invalida. Use HH:mm.');
  }

  const inicioJanela = horaParaMinutos(horaInicio);
  const fimJanela = horaParaMinutos(horaFim);

  if (fimJanela <= inicioJanela) {
    throw new BadRequestException('Hora fim deve ser maior que a hora inicio.');
  }

  const tempoSlotMinutos = normalizarTempoSlot(
    body?.tempoSlotMinutos,
    tempoSlotMinutosObrigatorio,
  );

  const { horaAlmocoInicio, horaAlmocoFim } = normalizarAlmoco(
    body,
    inicioJanela,
    fimJanela,
  );

  return {
    horaInicio,
    horaFim,
    horaAlmocoInicio,
    horaAlmocoFim,
    tempoSlotMinutos,
  };
}

function normalizarTempoSlot(
  bruto: number | string | null | undefined,
  obrigatorio: boolean,
): number | null {
  if (bruto === undefined || bruto === null || bruto === '') {
    if (obrigatorio) {
      throw new BadRequestException(
        'Tempo de corte deve estar entre 5 e 120 minutos.',
      );
    }
    return null;
  }

  const tempoSlotMinutos = Number(bruto);
  if (
    !Number.isInteger(tempoSlotMinutos) ||
    tempoSlotMinutos < 5 ||
    tempoSlotMinutos > 120
  ) {
    throw new BadRequestException(
      'Tempo de corte deve estar entre 5 e 120 minutos.',
    );
  }

  return tempoSlotMinutos;
}

function normalizarAlmoco(
  body: JanelaHorarioInput,
  inicioJanela: number,
  fimJanela: number,
): { horaAlmocoInicio: string | null; horaAlmocoFim: string | null } {
  const horaAlmocoInicioBruta = (body?.horaAlmocoInicio ?? '').trim();
  const horaAlmocoFimBruta = (body?.horaAlmocoFim ?? '').trim();

  if (!horaAlmocoInicioBruta && !horaAlmocoFimBruta) {
    return { horaAlmocoInicio: null, horaAlmocoFim: null };
  }

  if (!horaAlmocoInicioBruta || !horaAlmocoFimBruta) {
    throw new BadRequestException(
      'Informe inicio e fim do horario de almoco, ou deixe ambos em branco.',
    );
  }

  if (
    !REGEX_HORA.test(horaAlmocoInicioBruta) ||
    !REGEX_HORA.test(horaAlmocoFimBruta)
  ) {
    throw new BadRequestException('Horario de almoco invalido. Use HH:mm.');
  }

  const inicioAlmoco = horaParaMinutos(horaAlmocoInicioBruta);
  const fimAlmoco = horaParaMinutos(horaAlmocoFimBruta);

  if (fimAlmoco <= inicioAlmoco) {
    throw new BadRequestException(
      'O fim do almoco deve ser maior que o inicio.',
    );
  }

  if (inicioAlmoco < inicioJanela || fimAlmoco > fimJanela) {
    throw new BadRequestException(
      'O horario de almoco deve estar dentro da janela de atendimento.',
    );
  }

  return {
    horaAlmocoInicio: horaAlmocoInicioBruta,
    horaAlmocoFim: horaAlmocoFimBruta,
  };
}
