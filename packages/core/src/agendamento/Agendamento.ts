import { Profissional } from "../profissional";
import { Servico } from "../servico";

export type StatusAgendamento = "PENDENTE" | "CONFIRMADO" | "CONCLUIDO" | "CANCELADO";

export default interface Agendamento {
  id: number;
  emailCliente: string;
  nomeCliente?: string;
  status?: StatusAgendamento;
  data: Date;
  profissional: Profissional;
  servicos: Servico[];
}
