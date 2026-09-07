export default interface Profissional {
  id: number;
  nome: string;
  descricao: string;
  imagemUrl: string;
  avaliacao: number;
  quantidadeAvaliacoes: number;
  diasTrabalho?: number[];
  horaInicio?: string;
  horaFim?: string;
  horaAlmocoInicio?: string | null;
  horaAlmocoFim?: string | null;
  tempoSlotMinutos?: number;
}
