const FUSO_HORARIO_PADRAO = "America/Sao_Paulo";

const DIAS_SEMANA: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export default class DataUtils {
  static hoje() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return hoje;
  }

  // Extrai hora/minuto/dia-da-semana de um instante SEMPRE no fuso do Brasil,
  // independente do fuso configurado no processo que executa o codigo (no
  // servidor, geralmente UTC). Evita o deslocamento de horario que ocorre ao
  // usar getHours()/getDay()/toTimeString(), que respeitam o fuso local do
  // runtime em vez do fuso da barbearia.
  static horaNoFuso(
    data: Date,
    fusoHorario: string = FUSO_HORARIO_PADRAO,
  ): { hora: number; minuto: number; diaSemana: number } {
    const partes = new Intl.DateTimeFormat("en-US", {
      timeZone: fusoHorario,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      weekday: "short",
    }).formatToParts(data);

    const mapa: Record<string, string> = {};
    for (const parte of partes) {
      mapa[parte.type] = parte.value;
    }

    const hora = Number(mapa.hour) % 24;
    const minuto = Number(mapa.minute);
    const diaSemana = DIAS_SEMANA[mapa.weekday] ?? data.getDay();

    return { hora, minuto, diaSemana };
  }

  static horaMinutoNoFuso(
    data: Date,
    fusoHorario: string = FUSO_HORARIO_PADRAO,
  ): string {
    const { hora, minuto } = DataUtils.horaNoFuso(data, fusoHorario);
    return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
  }

  static formatarData(data: Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(data);
  }

  // new Date(), '09:45'
  static aplicarHorario(data: Date, horario: string): Date {
    const novaData = new Date(data);
    const partes = horario.split(":");
    novaData.setHours(parseInt(partes[0]!), parseInt(partes[1]!));
    return novaData;
  }

  // Calcula inicio/fim (00:00:00 a 23:59:59.999) do dia-calendario de
  // `data` no fuso informado (Brasil por padrao), independente do fuso do
  // runtime que executa o codigo. Usado pra filtrar agendamentos "do dia"
  // sem sofrer o deslocamento de horario de um servidor rodando em UTC.
  static limitesDoDiaNoFuso(
    data: Date,
    fusoHorario: string = FUSO_HORARIO_PADRAO,
  ): { inicioDoDia: Date; fimDoDia: Date } {
    const partes = new Intl.DateTimeFormat("en-CA", {
      timeZone: fusoHorario,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(data);

    const mapa: Record<string, string> = {};
    for (const parte of partes) {
      mapa[parte.type] = parte.value;
    }

    const dataFormatoISO = `${mapa.year}-${mapa.month}-${mapa.day}`;
    const inicioDoDia = new Date(`${dataFormatoISO}T00:00:00-03:00`);
    const fimDoDia = new Date(`${dataFormatoISO}T23:59:59.999-03:00`);

    return { inicioDoDia, fimDoDia };
  }
}
