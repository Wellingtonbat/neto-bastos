export default class DataUtils {
  static hoje() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return hoje;
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
}
