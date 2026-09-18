import { AgendamentoRepository } from './agendamento.repository';
import { PrismaService } from 'src/db/prisma.service';
import { StatusAgendamento } from '@prisma/client';

describe('AgendamentoRepository', () => {
  function criarRepositorio() {
    const prisma = {
      agendamento: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaService;

    return { repositorio: new AgendamentoRepository(prisma), prisma };
  }

  describe('buscarPorProfissionalEData', () => {
    it('exclui agendamentos CANCELADO da busca de ocupacao', async () => {
      const { repositorio, prisma } = criarRepositorio();

      await repositorio.buscarPorProfissionalEData(
        1,
        new Date('2026-09-20T12:00:00Z'),
      );

      expect(prisma.agendamento.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            profissionalId: 1,
            status: { not: StatusAgendamento.CANCELADO },
          }),
        }),
      );
    });
  });
});
