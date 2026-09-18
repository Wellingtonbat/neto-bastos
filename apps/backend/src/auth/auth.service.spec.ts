import { AuthService } from './auth.service';
import { PrismaService } from 'src/db/prisma.service';
import { RoleUsuario } from '@prisma/client';

describe('AuthService', () => {
  function criarService() {
    const prisma = {
      usuario: {
        findUnique: jest.fn(),
        update: jest.fn(),
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
});
