import { AuthService } from './auth.service';
import { PrismaService } from 'src/db/prisma.service';
import { RoleUsuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  function criarService() {
    const prisma = {
      usuario: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      profissional: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    } as unknown as PrismaService;

    return { service: new AuthService(prisma), prisma };
  }

  describe('resetarSenha', () => {
    it('permite DONO resetar a senha de qualquer usuario, sem checar o role do alvo', async () => {
      const { service, prisma } = criarService();
      (prisma.usuario.update as jest.Mock).mockResolvedValue({
        id: 7,
        nome: 'Barbeiro',
        email: 'barbeiro@teste.com',
      });

      const resultado = await service.resetarSenha(7, {
        role: RoleUsuario.DONO,
      });

      expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
      expect(prisma.usuario.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { senha: null },
        select: { id: true, nome: true, email: true },
      });
      expect(resultado.email).toBe('barbeiro@teste.com');
    });

    it('permite BARBEIRO resetar a senha de um cliente', async () => {
      const { service, prisma } = criarService();
      (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({
        role: RoleUsuario.CLIENTE,
      });
      (prisma.usuario.update as jest.Mock).mockResolvedValue({
        id: 9,
        nome: 'Cliente',
        email: 'cliente@teste.com',
      });

      const resultado = await service.resetarSenha(9, {
        role: RoleUsuario.BARBEIRO,
      });

      expect(resultado.email).toBe('cliente@teste.com');
    });

    it('rejeita FUNCIONARIO tentando resetar a senha de um barbeiro', async () => {
      const { service, prisma } = criarService();
      (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({
        role: RoleUsuario.BARBEIRO,
      });

      await expect(
        service.resetarSenha(3, { role: RoleUsuario.FUNCIONARIO }),
      ).rejects.toThrow('Você só pode resetar a senha de contas de cliente.');

      expect(prisma.usuario.update).not.toHaveBeenCalled();
    });

    it('rejeita BARBEIRO tentando resetar a senha de outro dono', async () => {
      const { service, prisma } = criarService();
      (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({
        role: RoleUsuario.DONO,
      });

      await expect(
        service.resetarSenha(1, { role: RoleUsuario.BARBEIRO }),
      ).rejects.toThrow('Você só pode resetar a senha de contas de cliente.');

      expect(prisma.usuario.update).not.toHaveBeenCalled();
    });

    it('rejeita id de usuario invalido', async () => {
      const { service } = criarService();

      await expect(
        service.resetarSenha(0, { role: RoleUsuario.DONO }),
      ).rejects.toThrow('Usuário informado é inválido.');
    });
  });

  describe('login', () => {
    it('bloqueia o cadastro novo quando o telefone ja pertence a outra conta', async () => {
      const { service, prisma } = criarService();
      (prisma.usuario.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.usuario.findFirst as jest.Mock).mockImplementation(
        async ({ where }: any) => {
          if (where.telefone) return { email: 'ruan@gmail.com' };
          return null;
        },
      );

      await expect(
        service.login({
          email: 'ruan@gmail.com.br',
          nome: 'Ruan Teste',
          telefone: '75988887777',
          senha: 'senha123',
        }),
      ).rejects.toThrow('Já existe um cadastro com esse telefone');

      expect(prisma.usuario.create).not.toHaveBeenCalled();
    });

    it('cadastra e retorna um aviso (sem bloquear) quando so o nome bate com outra conta', async () => {
      const { service, prisma } = criarService();
      (prisma.usuario.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.usuario.findFirst as jest.Mock).mockImplementation(
        async ({ where }: any) => {
          if (where.telefone) return null;
          if (where.nome) return { email: 'ruan@gmail.com' };
          return null;
        },
      );
      (prisma.usuario.create as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'ruan@gmail.com.br',
        nome: 'Ruan Silva',
        role: RoleUsuario.CLIENTE,
        profissionalId: null,
      });

      const resultado = await service.login({
        email: 'ruan@gmail.com.br',
        nome: 'Ruan Silva',
        telefone: '75999990000',
        senha: 'senha123',
      });

      expect(prisma.usuario.create).toHaveBeenCalled();
      expect(resultado.aviso).toContain('nome parecido');
    });

    it('cadastra sem aviso quando nao ha nome nem telefone duplicado', async () => {
      const { service, prisma } = criarService();
      (prisma.usuario.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.usuario.create as jest.Mock).mockResolvedValue({
        id: 2,
        email: 'novo@teste.com',
        nome: 'Fulano',
        role: RoleUsuario.CLIENTE,
        profissionalId: null,
      });

      const resultado = await service.login({
        email: 'novo@teste.com',
        nome: 'Fulano',
        telefone: '75911112222',
        senha: 'senha123',
      });

      expect(resultado.aviso).toBeUndefined();
    });

    it('login de conta ja existente nao roda a checagem de cadastro duplicado', async () => {
      const { service, prisma } = criarService();
      const senhaHash = await bcrypt.hash('senha123', 10);
      (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({
        id: 5,
        email: 'a@a.com',
        nome: 'A',
        telefone: null,
        senha: senhaHash,
        role: RoleUsuario.CLIENTE,
        profissionalId: null,
      });

      await service.login({ email: 'a@a.com', senha: 'senha123' });

      expect(prisma.usuario.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('cadastrarBarbeiro', () => {
    it('bloqueia o cadastro novo quando o telefone ja pertence a outra conta', async () => {
      const { service, prisma } = criarService();
      (prisma.usuario.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.usuario.findFirst as jest.Mock).mockImplementation(
        async ({ where }: any) => {
          if (where.telefone) return { email: 'ruan@gmail.com' };
          return null;
        },
      );

      await expect(
        service.cadastrarBarbeiro({
          nome: 'Outro Func',
          email: 'novo@teste.com',
          telefone: '75988887777',
          role: RoleUsuario.FUNCIONARIO,
        }),
      ).rejects.toThrow('Já existe um cadastro com esse telefone');

      expect(prisma.usuario.upsert).not.toHaveBeenCalled();
    });

    it('cadastra e retorna um aviso (sem bloquear) quando so o nome bate com outra conta', async () => {
      const { service, prisma } = criarService();
      (prisma.usuario.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.usuario.findFirst as jest.Mock).mockImplementation(
        async ({ where }: any) => {
          if (where.telefone) return null;
          if (where.nome) return { email: 'ruan@gmail.com' };
          return null;
        },
      );
      (prisma.usuario.upsert as jest.Mock).mockResolvedValue({
        id: 9,
        email: 'novo@teste.com',
        nome: 'Ruan Silva',
        role: RoleUsuario.FUNCIONARIO,
        profissionalId: null,
      });

      const resultado = await service.cadastrarBarbeiro({
        nome: 'Ruan Silva',
        email: 'novo@teste.com',
        telefone: '75999990000',
        role: RoleUsuario.FUNCIONARIO,
      });

      expect(resultado.aviso).toContain('nome parecido');
    });

    it('nao roda a checagem de duplicado ao editar um cadastro ja existente', async () => {
      const { service, prisma } = criarService();
      (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({ id: 9 });
      (prisma.usuario.upsert as jest.Mock).mockResolvedValue({
        id: 9,
        email: 'existente@teste.com',
        nome: 'Ruan Silva',
        role: RoleUsuario.FUNCIONARIO,
        profissionalId: null,
      });

      const resultado = await service.cadastrarBarbeiro({
        nome: 'Ruan Silva',
        email: 'existente@teste.com',
        telefone: '75999990000',
        role: RoleUsuario.FUNCIONARIO,
      });

      expect(prisma.usuario.findFirst).not.toHaveBeenCalled();
      expect(resultado.aviso).toBeUndefined();
    });
  });
});
