export type RoleUsuario = "CLIENTE" | "BARBEIRO" | "DONO";

export default interface Usuario {
  email: string;
  nome: string;
  telefone?: string;
  pushToken?: string | null;
  role?: RoleUsuario;
  profissionalId?: number | null;
  token?: string;
}
