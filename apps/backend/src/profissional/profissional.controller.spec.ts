import { ProfissionalController } from './profissional.controller';
import { PrismaService } from 'src/db/prisma.service';
import { RoleUsuario } from '@prisma/client';
import * as horarioResolvido from './horario-resolvido';

describe('ProfissionalController', () => {
  function criarController() {
    const prisma = {
      horarioSemanal: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      excecaoAgenda: {
        upsert: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(async (ops: Promise<any>[]) => Promise.all(ops)),
    } as unknown as PrismaService;

    return { controller: new ProfissionalController(prisma), prisma };
  }

  describe('listarHorariosSemanais / listarExcecoesAgenda', () => {
    it('rejeita barbeiro consultando a agenda de outro profissional', async () => {
      const { controller } = criarController();
      const req = { user: { role: RoleUsuario.BARBEIRO, profissionalId: 5 } };

      await expect(controller.listarHorariosSemanais(req, '7')).rejects.toThrow(
        'Barbeiro só pode editar a propria agenda.',
      );
      await expect(controller.listarExcecoesAgenda(req, '7')).rejects.toThrow(
        'Barbeiro só pode editar a propria agenda.',
      );
    });

    it('lista os horarios semanais e excecoes do profissional', async () => {
      const { controller, prisma } = criarController();
      const req = { user: { role: RoleUsuario.DONO, profissionalId: null } };
      (prisma.horarioSemanal.findMany as jest.Mock).mockResolvedValue([
        { diaSemana: 1, horaInicio: '14:00', horaFim: '20:00' },
      ]);

      const resultado = await controller.listarHorariosSemanais(req, '1');

      expect(resultado).toEqual([
        { diaSemana: 1, horaInicio: '14:00', horaFim: '20:00' },
      ]);
      expect(prisma.horarioSemanal.findMany).toHaveBeenCalledWith({
        where: { profissionalId: 1 },
        orderBy: { diaSemana: 'asc' },
      });
    });
  });

  describe('substituirHorariosSemanais', () => {
    it('rejeita barbeiro editando a agenda de outro profissional', async () => {
      const { controller } = criarController();
      const req = {
        user: { role: RoleUsuario.BARBEIRO, profissionalId: 5 },
      };

      await expect(
        controller.substituirHorariosSemanais(req, '7', []),
      ).rejects.toThrow('Barbeiro só pode editar a propria agenda.');
    });

    it('rejeita dia da semana repetido', async () => {
      const { controller } = criarController();
      const req = { user: { role: RoleUsuario.DONO, profissionalId: null } };

      await expect(
        controller.substituirHorariosSemanais(req, '1', [
          { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' } as any,
          { diaSemana: 1, horaInicio: '14:00', horaFim: '18:00' } as any,
        ]),
      ).rejects.toThrow('Não é possível repetir o mesmo dia da semana.');
    });

    it('substitui todas as linhas existentes em uma transacao', async () => {
      const { controller, prisma } = criarController();
      const req = { user: { role: RoleUsuario.DONO, profissionalId: null } };

      await controller.substituirHorariosSemanais(req, '1', [
        { diaSemana: 1, horaInicio: '14:00', horaFim: '20:00' } as any,
      ]);

      expect(prisma.horarioSemanal.deleteMany).toHaveBeenCalledWith({
        where: { profissionalId: 1 },
      });
      expect(prisma.horarioSemanal.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            profissionalId: 1,
            diaSemana: 1,
            horaInicio: '14:00',
            horaFim: '20:00',
          }),
        ],
      });
    });
  });

  describe('upsertExcecaoAgenda', () => {
    it('rejeita data em formato invalido', async () => {
      const { controller } = criarController();
      const req = { user: { role: RoleUsuario.DONO, profissionalId: null } };

      await expect(
        controller.upsertExcecaoAgenda(req, '1', {
          data: '21-09-2026',
        } as any),
      ).rejects.toThrow('Data inválida. Use YYYY-MM-DD.');
    });

    it('aceita fechado=true sem exigir horario', async () => {
      const { controller, prisma } = criarController();
      const req = { user: { role: RoleUsuario.DONO, profissionalId: null } };
      (prisma.excecaoAgenda.upsert as jest.Mock).mockResolvedValue({
        fechado: true,
      });

      const resultado = await controller.upsertExcecaoAgenda(req, '1', {
        data: '2026-12-25',
        fechado: true,
      } as any);

      expect(resultado).toEqual({ fechado: true });
      expect(prisma.excecaoAgenda.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ fechado: true, horaInicio: null }),
        }),
      );
    });

    it('exige horario valido quando nao esta fechando o dia', async () => {
      const { controller } = criarController();
      const req = { user: { role: RoleUsuario.DONO, profissionalId: null } };

      await expect(
        controller.upsertExcecaoAgenda(req, '1', {
          data: '2026-09-22',
          horaInicio: '25:00',
          horaFim: '18:00',
        } as any),
      ).rejects.toThrow('Hora de inicio/fim invalida. Use HH:mm.');
    });
  });

  describe('removerExcecaoAgenda', () => {
    it('remove a excecao pela data informada', async () => {
      const { controller, prisma } = criarController();
      const req = { user: { role: RoleUsuario.DONO, profissionalId: null } };

      const resultado = await controller.removerExcecaoAgenda(
        req,
        '1',
        '2026-09-22',
      );

      expect(resultado).toEqual({ ok: true });
      expect(prisma.excecaoAgenda.deleteMany).toHaveBeenCalledWith({
        where: {
          profissionalId: 1,
          data: new Date('2026-09-22T00:00:00.000Z'),
        },
      });
    });
  });

  describe('buscarHorarioDoDia', () => {
    it('rejeita data em formato invalido', async () => {
      const { controller } = criarController();

      await expect(
        controller.buscarHorarioDoDia('1', 'amanha'),
      ).rejects.toThrow('Data inválida. Use YYYY-MM-DD.');
    });

    it('retorna o horario resolvido para o profissional e data', async () => {
      const { controller } = criarController();
      const esperado = {
        fechado: false,
        horaInicio: '08:00',
        horaFim: '19:00',
        horaAlmocoInicio: null,
        horaAlmocoFim: null,
        tempoSlotMinutos: 15,
      };
      jest
        .spyOn(horarioResolvido, 'resolverHorarioDoDia')
        .mockResolvedValue(esperado);

      const resultado = await controller.buscarHorarioDoDia('1', '2026-09-22');

      expect(resultado).toEqual(esperado);
    });
  });
});
