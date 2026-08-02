import { Profissional } from "../profissional";
import { Servico } from "../servico";

export type StatusAgendamento = "PENDENTE" | "CONFIRMADO" | "CANCELADO";

export default interface Agendamento {
  id: number;
  emailCliente: string;
  status?: StatusAgendamento;
  data: Date;
  profissional: Profissional;
  servicos: Servico[];
}
