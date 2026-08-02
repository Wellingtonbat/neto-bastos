export type RoleUsuario = "CLIENTE" | "BARBEIRO" | "DONO";

export default interface Usuario {
  email: string;
  nome: string;
  telefone?: string;
  role?: RoleUsuario;
  profissionalId?: number | null;
  token?: string;
}
