import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { Prisma, RoleUsuario, Usuario } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';

const TAMANHO_MINIMO_SENHA = 6;

interface LoginInput {
  email: string;
  nome?: string;
  telefone?: string;
  senha?: string;
}

interface AtualizarPerfilInput {
  role: RoleUsuario;
  profissionalId?: number | null;
}

interface CadastrarBarbeiroInput {
  email: string;
  nome: string;
  telefone?: string;
  role?: RoleUsuario;
  profissionalId?: number | null;
  novoProfissional?: {
    nome: string;
    descricao: string;
    imagemUrl: string;
  };
}

interface AtualizarBarbeiroInput {
  email: string;
  nome: string;
  telefone?: string;
}

export interface AuthPayload {
  id: number;
  email: string;
  nome: string;
  role: RoleUsuario;
  profissionalId: number | null;
}

@Injectable()
export class AuthService {
  private readonly googleClient = new OAuth2Client();

  constructor(private readonly prisma: PrismaService) {}

  async login(input: LoginInput) {
    const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
    const email = (input.email ?? '').trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('E-mail é obrigatório.');
    }

    const senha = (input.senha ?? '').trim();
    if (!senha) {
      throw new BadRequestException('Senha é obrigatória.');
    }
    if (senha.length < TAMANHO_MINIMO_SENHA) {
      throw new BadRequestException(
        `A senha deve ter ao menos ${TAMANHO_MINIMO_SENHA} caracteres.`,
      );
    }

    const roleForcado =
      ownerEmail && email === ownerEmail ? RoleUsuario.DONO : undefined;

    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { email },
    });

    let usuario: Usuario;

    if (!usuarioExistente) {
      // Cadastro novo.
      const nome = (input.nome ?? '').trim();
      if (!nome) {
        throw new BadRequestException('Nome é obrigatório para o cadastro.');
      }

      const senhaHash = await bcrypt.hash(senha, 10);
      usuario = await this.prisma.usuario.create({
        data: {
          email,
          nome,
          telefone: input.telefone,
          senha: senhaHash,
          role: roleForcado ?? RoleUsuario.CLIENTE,
        },
      });
    } else if (!usuarioExistente.senha) {
      // Conta criada antes de a senha existir (ou via Google): a primeira
      // tentativa de login com senha define a senha da conta. Isso nao piora
      // a seguranca em relacao ao login anterior (so por e-mail, sem
      // nenhuma verificacao) -- so passa a exigir senha dali em diante.
      const senhaHash = await bcrypt.hash(senha, 10);
      usuario = await this.prisma.usuario.update({
        where: { email },
        data: {
          senha: senhaHash,
          nome: (input.nome ?? '').trim() || usuarioExistente.nome,
          telefone: input.telefone ?? usuarioExistente.telefone,
          role: roleForcado,
        },
      });
    } else {
      const senhaValida = await bcrypt.compare(senha, usuarioExistente.senha);
      if (!senhaValida) {
        throw new UnauthorizedException('E-mail ou senha inválidos.');
      }

      usuario =
        roleForcado && usuarioExistente.role !== roleForcado
          ? await this.prisma.usuario.update({
              where: { email },
              data: { role: roleForcado },
            })
          : usuarioExistente;
    }

    return this.emitirToken(usuario);
  }

  private async upsertAutenticadoPorProvedor(input: {
    email: string;
    nome: string;
    telefone?: string;
  }) {
    const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
    const email = input.email.trim().toLowerCase();
    const roleForcado =
      ownerEmail && email === ownerEmail ? RoleUsuario.DONO : undefined;

    const usuario = await this.prisma.usuario.upsert({
      where: { email },
      create: {
        email,
        nome: input.nome,
        telefone: input.telefone,
        role: roleForcado ?? RoleUsuario.CLIENTE,
      },
      update: {
        nome: input.nome,
        telefone: input.telefone,
        role: roleForcado,
      },
    });

    return this.emitirToken(usuario);
  }

  private emitirToken(usuario: Usuario) {
    const payload: AuthPayload = {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      role: usuario.role,
      profissionalId: usuario.profissionalId,
    };

    const token = jwt.sign(payload, this.obterSegredo(), { expiresIn: '7d' });

    return {
      ...payload,
      token,
    };
  }

  async loginGoogle(idToken: string) {
    if (!idToken) {
      throw new BadRequestException('Token do Google não informado.');
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      throw new BadRequestException(
        'GOOGLE_CLIENT_ID não configurado no backend.',
      );
    }

    // O app mobile (Android nativo) autentica com um client id proprio,
    // diferente do client id usado pelo site (web). O token emitido pelo
    // Google carrega o client id de origem no campo "aud", entao aceitamos
    // qualquer um deles como audiencia valida. GOOGLE_CLIENT_ID_ANDROID
    // aceita multiplos ids separados por virgula (ex: producao + debug local).
    const clientIdsAndroid = (process.env.GOOGLE_CLIENT_ID_ANDROID ?? '')
      .split(',')
      .map((valor) => valor.trim())
      .filter((valor) => !!valor);
    const audiencias = [googleClientId, ...clientIdsAndroid];

    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: audiencias,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new UnauthorizedException('Token Google inválido: e-mail ausente.');
    }

    if (!payload.email_verified) {
      throw new UnauthorizedException('E-mail do Google não verificado.');
    }

    const dominioPermitido = process.env.GOOGLE_ALLOWED_DOMAIN;
    if (dominioPermitido) {
      const email = payload.email.toLowerCase();
      const dominio = dominioPermitido.toLowerCase();
      if (!email.endsWith(`@${dominio}`)) {
        throw new UnauthorizedException('Domínio de e-mail não permitido.');
      }
    }

    return this.upsertAutenticadoPorProvedor({
      email: payload.email,
      nome: payload.name ?? payload.email,
    });
  }

  async obterUsuarioAtual(auth: AuthPayload) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        email: true,
        nome: true,
        role: true,
        profissionalId: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuário da sessão não encontrado.');
    }

    // Emite novo token para refletir eventuais mudanças de perfil sem exigir novo login.
    const payload: AuthPayload = {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      role: usuario.role,
      profissionalId: usuario.profissionalId,
    };

    const token = jwt.sign(payload, this.obterSegredo(), { expiresIn: '7d' });

    return {
      ...payload,
      token,
    };
  }

  async atualizarPushToken(auth: AuthPayload, pushToken?: string | null) {
    const tokenNormalizado = (pushToken ?? '').trim();

    return this.prisma.usuario.update({
      where: { id: auth.id },
      data: {
        pushToken: tokenNormalizado || null,
      },
      select: {
        id: true,
        email: true,
        nome: true,
        role: true,
        profissionalId: true,
        pushToken: true,
      },
    });
  }

  validarToken(token: string): AuthPayload {
    try {
      return jwt.verify(token, this.obterSegredo()) as AuthPayload;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
  }

  async atualizarPerfil(usuarioId: number, input: AtualizarPerfilInput) {
    if (input.role === RoleUsuario.BARBEIRO && !input.profissionalId) {
      throw new BadRequestException(
        'Perfil BARBEIRO exige profissionalId informado.',
      );
    }

    const usuario = await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        role: input.role,
        profissionalId:
          input.role === RoleUsuario.BARBEIRO || input.role === RoleUsuario.DONO
            ? (input.profissionalId ?? null)
            : null,
      },
    });

    return {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      role: usuario.role,
      profissionalId: usuario.profissionalId,
    };
  }

  async resetarSenha(usuarioId: number) {
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      throw new BadRequestException('Usuário informado é inválido.');
    }

    // Nao ha recuperacao de senha por e-mail (o app nao envia e-mails).
    // Limpar a senha faz a conta voltar ao estado "sem senha definida":
    // na proxima tentativa de login com e-mail + senha, a nova senha
    // informada e adotada, igual ao fluxo de primeiro login.
    const usuario = await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { senha: null },
      select: { id: true, nome: true, email: true },
    });

    return usuario;
  }

  async cadastrarBarbeiro(input: CadastrarBarbeiroInput) {
    const email = (input.email ?? '').trim().toLowerCase();
    const nome = (input.nome ?? '').trim();
    const role = input.role ?? RoleUsuario.BARBEIRO;

    if (!email || !nome) {
      throw new BadRequestException('Nome e e-mail sao obrigatorios.');
    }

    const rolesValidos: RoleUsuario[] = [
      RoleUsuario.BARBEIRO,
      RoleUsuario.DONO,
      RoleUsuario.FUNCIONARIO,
    ];
    if (!rolesValidos.includes(role)) {
      throw new BadRequestException('Perfil informado e invalido.');
    }

    // BARBEIRO e DONO sao agendaveis: exigem profissional (existente ou novo).
    const exigeProfissional =
      role === RoleUsuario.BARBEIRO || role === RoleUsuario.DONO;
    let profissionalId: number | null = null;

    if (exigeProfissional) {
      if (input.profissionalId) {
        const id = Number(input.profissionalId);
        if (!Number.isInteger(id) || id <= 0) {
          throw new BadRequestException('Profissional informado e invalido.');
        }
        const profissional = await this.prisma.profissional.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!profissional) {
          throw new BadRequestException('Profissional informado não existe.');
        }
        profissionalId = id;
      } else if (input.novoProfissional) {
        const nomeProf = (input.novoProfissional.nome ?? '').trim();
        const descricaoProf = (input.novoProfissional.descricao ?? '').trim();
        const imagemProf = (input.novoProfissional.imagemUrl ?? '').trim();
        if (!nomeProf || !descricaoProf || !imagemProf) {
          throw new BadRequestException(
            'Nome, descricao e imagem do profissional sao obrigatorios.',
          );
        }
        const criado = await this.prisma.profissional.create({
          data: {
            nome: nomeProf,
            descricao: descricaoProf,
            imagemUrl: imagemProf,
            avaliacao: 5,
            quantidadeAvaliacoes: 0,
          },
          select: { id: true },
        });
        profissionalId = criado.id;
      } else {
        throw new BadRequestException(
          'Vincule a um profissional existente ou informe os dados de um novo.',
        );
      }

      const vinculoExistente = await this.prisma.usuario.findFirst({
        where: { profissionalId },
        select: { id: true, email: true },
      });
      if (vinculoExistente && vinculoExistente.email !== email) {
        throw new BadRequestException(
          'Este profissional ja esta vinculado a outro usuario.',
        );
      }
    }

    let usuario;
    try {
      usuario = await this.prisma.usuario.upsert({
        where: { email },
        create: {
          email,
          nome,
          telefone: input.telefone,
          role,
          profissionalId,
        },
        update: {
          nome,
          telefone: input.telefone,
          role,
          profissionalId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException(
            'Nao foi possivel vincular: profissional ja esta em uso.',
          );
        }
      }
      throw error;
    }

    return {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      role: usuario.role,
      profissionalId: usuario.profissionalId,
    };
  }

  async listarClientes() {
    return this.prisma.usuario.findMany({
      where: {
        role: RoleUsuario.CLIENTE,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
      },
      orderBy: {
        nome: 'asc',
      },
    });
  }

  async listarBarbeiros() {
    return this.prisma.usuario.findMany({
      where: {
        role: {
          in: [
            RoleUsuario.BARBEIRO,
            RoleUsuario.DONO,
            RoleUsuario.FUNCIONARIO,
          ],
        },
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        role: true,
        profissionalId: true,
        profissional: {
          select: {
            id: true,
            nome: true,
            descricao: true,
            imagemUrl: true,
          },
        },
      },
      orderBy: {
        nome: 'asc',
      },
    });
  }

  async listarBarbeirosInativos() {
    return this.prisma.usuario.findMany({
      where: {
        role: RoleUsuario.CLIENTE,
        profissionalId: {
          not: null,
        },
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        role: true,
        profissionalId: true,
        profissional: {
          select: {
            id: true,
            nome: true,
            descricao: true,
            imagemUrl: true,
          },
        },
      },
      orderBy: {
        nome: 'asc',
      },
    });
  }

  async atualizarBarbeiro(usuarioId: number, input: AtualizarBarbeiroInput) {
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      throw new BadRequestException('Barbeiro informado e invalido.');
    }

    const nome = (input.nome ?? '').trim();
    const email = (input.email ?? '').trim().toLowerCase();
    const telefone = (input.telefone ?? '').trim();

    if (!nome || !email) {
      throw new BadRequestException(
        'Nome e e-mail do barbeiro sao obrigatorios.',
      );
    }

    const barbeiroAtual = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, role: true },
    });

    const rolesGerenciaveis: RoleUsuario[] = [
      RoleUsuario.BARBEIRO,
      RoleUsuario.DONO,
      RoleUsuario.FUNCIONARIO,
    ];
    if (!barbeiroAtual || !rolesGerenciaveis.includes(barbeiroAtual.role)) {
      throw new BadRequestException('Barbeiro informado nao existe.');
    }

    const conflitoEmail = await this.prisma.usuario.findUnique({
      where: { email },
      select: { id: true },
    });

    if (conflitoEmail && conflitoEmail.id !== usuarioId) {
      throw new BadRequestException('Ja existe um usuario com este e-mail.');
    }

    const usuario = await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        nome,
        email,
        telefone: telefone || null,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        role: true,
        profissionalId: true,
      },
    });

    return usuario;
  }

  async inativarBarbeiro(usuarioId: number) {
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      throw new BadRequestException('Barbeiro informado e invalido.');
    }

    const barbeiroAtual = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, role: true },
    });

    if (!barbeiroAtual || barbeiroAtual.role !== RoleUsuario.BARBEIRO) {
      throw new BadRequestException('Barbeiro informado nao existe.');
    }

    return this.prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        role: RoleUsuario.CLIENTE,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        profissionalId: true,
      },
    });
  }

  async reativarBarbeiro(usuarioId: number) {
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      throw new BadRequestException('Barbeiro informado e invalido.');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        role: true,
        profissionalId: true,
      },
    });

    if (!usuario || usuario.role !== RoleUsuario.CLIENTE) {
      throw new BadRequestException(
        'Usuario informado nao pode ser reativado.',
      );
    }

    if (!usuario.profissionalId) {
      throw new BadRequestException(
        'Nao existe profissional vinculado para reativar este barbeiro.',
      );
    }

    const conflito = await this.prisma.usuario.findFirst({
      where: {
        id: { not: usuarioId },
        role: RoleUsuario.BARBEIRO,
        profissionalId: usuario.profissionalId,
      },
      select: { id: true },
    });

    if (conflito) {
      throw new BadRequestException(
        'Ja existe um barbeiro ativo vinculado a este profissional.',
      );
    }

    return this.prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        role: RoleUsuario.BARBEIRO,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        profissionalId: true,
      },
    });
  }

  private obterSegredo() {
    return process.env.JWT_SECRET || 'dev-secret-change-me';
  }
}
