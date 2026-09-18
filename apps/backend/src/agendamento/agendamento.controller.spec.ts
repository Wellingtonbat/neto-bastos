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
      profissional: {
        findUnique: jest.fn(),
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

    it('rejeita cancelamento de agendamento ja concluido', async () => {
      const { controller, repo } = criarController();
      (repo.buscarPorId as jest.Mock).mockResolvedValue({
        id: 42,
        emailCliente: 'cliente@teste.com',
        profissionalId: 7,
        status: StatusAgendamento.CONCLUIDO,
        data: new Date(Date.now() - 60 * 60 * 1000),
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
        'Não é possível cancelar um agendamento que já foi concluído.',
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

  describe('obterDadosPix', () => {
    function agendamentoComServicos() {
      return {
        id: 42,
        emailCliente: 'cliente@teste.com',
        profissionalId: 7,
        profissional: { id: 7, nome: 'Rodrigo Neto Bastos' },
        servicos: [{ preco: 17 }, { preco: 7 }],
      };
    }

    it('monta o payload Pix usando o telefone cadastrado do profissional', async () => {
      const { controller, repo, prisma } = criarController();
      (repo.buscarPorId as jest.Mock).mockResolvedValue(
        agendamentoComServicos(),
      );
      (prisma.profissional.findUnique as jest.Mock).mockResolvedValue({
        usuario: { telefone: '(75) 99999-9999' },
      });

      const req = {
        user: { role: RoleUsuario.DONO, profissionalId: null },
      };

      const resultado = await controller.obterDadosPix(req, '42');

      expect(resultado.valor).toBe(24);
      expect(resultado.nomeProfissional).toBe('Rodrigo Neto Bastos');
      expect(resultado.payload).toContain('+5575999999999');
      expect(resultado.payload).toContain('FEIRA DE SANTAN'); // 15 chars max
      expect(resultado.payload).toContain('24.00');
    });

    it('rejeita quando o profissional nao tem telefone cadastrado', async () => {
      const { controller, repo, prisma } = criarController();
      (repo.buscarPorId as jest.Mock).mockResolvedValue(
        agendamentoComServicos(),
      );
      (prisma.profissional.findUnique as jest.Mock).mockResolvedValue({
        usuario: { telefone: null },
      });

      const req = {
        user: { role: RoleUsuario.DONO, profissionalId: null },
      };

      await expect(controller.obterDadosPix(req, '42')).rejects.toThrow(
        'Este profissional não tem telefone cadastrado',
      );
    });

    it('rejeita quando o profissional nao tem conta de usuario vinculada', async () => {
      const { controller, repo, prisma } = criarController();
      (repo.buscarPorId as jest.Mock).mockResolvedValue(
        agendamentoComServicos(),
      );
      (prisma.profissional.findUnique as jest.Mock).mockResolvedValue({
        usuario: null,
      });

      const req = {
        user: { role: RoleUsuario.DONO, profissionalId: null },
      };

      await expect(controller.obterDadosPix(req, '42')).rejects.toThrow(
        'Este profissional não tem telefone cadastrado',
      );
    });

    it('rejeita BARBEIRO tentando gerar Pix de agendamento de outro profissional', async () => {
      const { controller, repo } = criarController();
      (repo.buscarPorId as jest.Mock).mockResolvedValue(
        agendamentoComServicos(),
      );

      const req = {
        user: { role: RoleUsuario.BARBEIRO, profissionalId: 99 },
      };

      await expect(controller.obterDadosPix(req, '42')).rejects.toThrow(
        'Você só pode gerar o Pix de agendamentos do seu próprio calendário.',
      );
    });

    it('permite BARBEIRO gerar Pix do proprio agendamento', async () => {
      const { controller, repo, prisma } = criarController();
      (repo.buscarPorId as jest.Mock).mockResolvedValue(
        agendamentoComServicos(),
      );
      (prisma.profissional.findUnique as jest.Mock).mockResolvedValue({
        usuario: { telefone: '75999999999' },
      });

      const req = {
        user: { role: RoleUsuario.BARBEIRO, profissionalId: 7 },
      };

      const resultado = await controller.obterDadosPix(req, '42');
      expect(resultado.valor).toBe(24);
    });

    it('rejeita agendamento inexistente', async () => {
      const { controller, repo } = criarController();
      (repo.buscarPorId as jest.Mock).mockResolvedValue(null);

      const req = {
        user: { role: RoleUsuario.DONO, profissionalId: null },
      };

      await expect(controller.obterDadosPix(req, '999')).rejects.toThrow(
        'Agendamento não encontrado.',
      );
    });
  });
});
