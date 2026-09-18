import { AgendamentoController } from './agendamento.controller';
import { AgendamentoRepository } from './agendamento.repository';
import { PrismaService } from 'src/db/prisma.service';
import { PushNotificationService } from 'src/notificacao/push-notification.service';
import { RoleUsuario, StatusAgendamento } from '@prisma/client';

describe('AgendamentoController', () => {
  function criarController() {
    const repo = {
      buscarPorId: jest.fn(),
      atualizarStatus: jest.fn(),
    } as unknown as AgendamentoRepository;

    const prisma = {
      usuario: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;

    const push = {
      enviarParaTokens: jest.fn().mockResolvedValue(undefined),
    } as unknown as PushNotificationService;

    return {
      controller: new AgendamentoController(repo, prisma, push),
      repo,
      prisma,
      push,
    };
  }

  describe('atualizarStatus (cancelamento pelo cliente)', () => {
    it('notifica o profissional quando o cliente cancela o proprio agendamento', async () => {
      const { controller, repo, prisma, push } = criarController();

      (repo.buscarPorId as jest.Mock).mockResolvedValue({
        id: 42,
        emailCliente: 'cliente@teste.com',
        profissionalId: 7,
        data: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      (repo.atualizarStatus as jest.Mock).mockResolvedValue({
        id: 42,
        emailCliente: 'cliente@teste.com',
        profissionalId: 7,
        data: new Date('2026-09-20T12:00:00Z'),
        status: StatusAgendamento.CANCELADO,
      });
      (prisma.usuario.findFirst as jest.Mock).mockImplementation(
        ({ where }: any) => {
          if (where.profissionalId === 7) {
            return Promise.resolve({
              pushToken: 'ExponentPushToken[barbeiro]',
            });
          }
          return Promise.resolve({ nome: 'Cliente Teste' });
        },
      );

      const req = {
        user: {
          email: 'cliente@teste.com',
          role: RoleUsuario.CLIENTE,
          profissionalId: null,
        },
      };

      const resultado = await controller.atualizarStatus(
        req,
        '42',
        StatusAgendamento.CANCELADO,
      );

      expect(repo.atualizarStatus).toHaveBeenCalledWith(
        42,
        StatusAgendamento.CANCELADO,
      );
      expect(resultado.status).toBe(StatusAgendamento.CANCELADO);

      // notificacao e fire-and-forget (`void`): espera as microtasks pendentes.
      await new Promise((resolve) => setImmediate(resolve));

      expect(push.enviarParaTokens).toHaveBeenCalledWith(
        ['ExponentPushToken[barbeiro]'],
        expect.any(String),
        expect.stringContaining('Cliente Teste'),
        expect.objectContaining({ tipo: 'CANCELAMENTO_CLIENTE_BARBEIRO' }),
      );
    });

    it('rejeita cancelamento de agendamento de outro cliente', async () => {
      const { controller, repo } = criarController();
      (repo.buscarPorId as jest.Mock).mockResolvedValue({
        id: 42,
        emailCliente: 'outro@teste.com',
        profissionalId: 7,
      });

      const req = {
        user: {
          email: 'cliente@teste.com',
          role: RoleUsuario.CLIENTE,
          profissionalId: null,
        },
      };

      await expect(
        controller.atualizarStatus(req, '42', StatusAgendamento.CANCELADO),
      ).rejects.toThrow();
    });

    it('rejeita cancelamento de agendamento que ja passou', async () => {
      const { controller, repo } = criarController();
      (repo.buscarPorId as jest.Mock).mockResolvedValue({
        id: 42,
        emailCliente: 'cliente@teste.com',
        profissionalId: 7,
        data: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });

      const req = {
        user: {
          email: 'cliente@teste.com',
          role: RoleUsuario.CLIENTE,
          profissionalId: null,
        },
      };

      await expect(
        controller.atualizarStatus(req, '42', StatusAgendamento.CANCELADO),
      ).rejects.toThrow(
        'Não é possível cancelar um agendamento que já passou.',
      );
      expect(repo.atualizarStatus).not.toHaveBeenCalled();
    });

    it('rejeita cliente tentando mudar status para algo diferente de CANCELADO', async () => {
      const { controller, repo } = criarController();
      (repo.buscarPorId as jest.Mock).mockResolvedValue({
        id: 42,
        emailCliente: 'cliente@teste.com',
        profissionalId: 7,
      });

      const req = {
        user: {
          email: 'cliente@teste.com',
          role: RoleUsuario.CLIENTE,
          profissionalId: null,
        },
      };

      await expect(
        controller.atualizarStatus(req, '42', StatusAgendamento.CONFIRMADO),
      ).rejects.toThrow();
    });
  });
});
