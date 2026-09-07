export default class AgendaUtils {
  private static minutos = [0, 15, 30, 45];

  static horariosDoDia() {
    return {
      manha: this.gerarHorarios([8, 9, 10, 11]),
      tarde: this.gerarHorarios([13, 14, 15, 16, 17]),
      noite: this.gerarHorarios([18, 19]),
    };
  }

  private static gerarHorarios(horas: number[]) {
    return horas.reduce((horarios, hora) => {
      const todos = this.minutos.map((minuto) => {
        return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
      });
      return horarios.concat(todos);
    }, [] as string[]);
  }

  static horariosPorIntervalo(
    horaInicio: string,
    horaFim: string,
    tempoSlotMinutos: number,
    horaAlmocoInicio?: string | null,
    horaAlmocoFim?: string | null,
  ) {
    const [inicioHora, inicioMinuto] = horaInicio.split(":").map(Number);
    const [fimHora, fimMinuto] = horaFim.split(":").map(Number);

    const inicio = inicioHora * 60 + inicioMinuto;
    const fim = fimHora * 60 + fimMinuto;

    const almoco = this.obterJanelaAlmoco(horaAlmocoInicio, horaAlmocoFim);

    const horarios: string[] = [];

    for (
      let minutoAtual = inicio;
      minutoAtual < fim;
      minutoAtual += tempoSlotMinutos
    ) {
      if (almoco && minutoAtual >= almoco.inicio && minutoAtual < almoco.fim) {
        continue;
      }

      const hora = Math.floor(minutoAtual / 60);
      const minuto = minutoAtual % 60;
      horarios.push(
        `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`,
      );
    }

    return horarios;
  }

  private static obterJanelaAlmoco(
    horaAlmocoInicio?: string | null,
    horaAlmocoFim?: string | null,
  ) {
    if (!horaAlmocoInicio || !horaAlmocoFim) return null;

    const [almocoInicioHora, almocoInicioMinuto] = horaAlmocoInicio
      .split(":")
      .map(Number);
    const [almocoFimHora, almocoFimMinuto] = horaAlmocoFim
      .split(":")
      .map(Number);

    return {
      inicio: almocoInicioHora * 60 + almocoInicioMinuto,
      fim: almocoFimHora * 60 + almocoFimMinuto,
    };
  }

  static separarPorPeriodo(horarios: string[]) {
    const manha: string[] = [];
    const tarde: string[] = [];
    const noite: string[] = [];

    for (const horario of horarios) {
      const hora = Number(horario.split(":")[0]);
      if (hora < 12) {
        manha.push(horario);
      } else if (hora < 18) {
        tarde.push(horario);
      } else {
        noite.push(horario);
      }
    }

    return { manha, tarde, noite };
  }
}
