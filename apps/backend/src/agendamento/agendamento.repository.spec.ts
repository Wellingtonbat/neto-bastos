import { AgendamentoRepository } from './agendamento.repository';
import { PrismaService } from 'src/db/prisma.service';
import { StatusAgendamento } from '@prisma/client';

// 2026-09-21 e uma segunda-feira (diaSemana=1 no fuso America/Sao_Paulo).
const PROFISSIONAL_BASE = {
  id: 1,
  diasTrabalho: [1, 2, 3, 4, 5],
  horaInicio: '08:00',
  horaFim: '19:00',
  horaAlmocoInicio: null,
  horaAlmocoFim: null,
  tempoSlotMinutos: 15,
};

describe('AgendamentoRepository', () => {
  function criarRepositorio() {
    const prisma = {
      agendamento: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(undefined),
      },
      servico: {
        findMany: jest.fn().mockResolvedValue([{ qtdeSlots: 1 }]),
      },
      profissional: {
        findUnique: jest.fn().mockResolvedValue(PROFISSIONAL_BASE),
      },
      excecaoAgenda: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      horarioSemanal: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;

    return { repositorio: new AgendamentoRepository(prisma), prisma };
  }

  function agendamentoPara(dataISOComHora: string) {
    return {
      id: 0,
      emailCliente: 'cliente@teste.com',
      data: new Date(dataISOComHora) as any,
      profissional: { id: 1 } as any,
      servicos: [{ id: 1, qtdeSlots: 1 }] as any,
    };
  }

  describe('criar (validacao de agenda por dia)', () => {
    it('rejeita horario fora da janela quando ha override semanal para o dia', async () => {
      const { repositorio, prisma } = criarRepositorio();
      (prisma.horarioSemanal.findUnique as jest.Mock).mockResolvedValue({
        horaInicio: '14:00',
        horaFim: '20:00',
        horaAlmocoInicio: null,
        horaAlmocoFim: null,
        tempoSlotMinutos: null,
      });

      // Segunda-feira 10:00 no fuso de Brasilia -- dentro do horario base
      // (08:00-19:00), mas fora do override semanal (14:00-20:00).
      await expect(
        repositorio.criar(agendamentoPara('2026-09-21T13:00:00Z')),
      ).rejects.toThrow(
        'Horario fora da janela de atendimento do profissional.',
      );
    });

    it('aceita horario dentro do override semanal para o dia', async () => {
      const { repositorio, prisma } = criarRepositorio();
      (prisma.horarioSemanal.findUnique as jest.Mock).mockResolvedValue({
        horaInicio: '14:00',
        horaFim: '20:00',
        horaAlmocoInicio: null,
        horaAlmocoFim: null,
        tempoSlotMinutos: null,
      });

      // Segunda-feira 14:00 no fuso de Brasilia -- inicio do override.
      await repositorio.criar(agendamentoPara('2026-09-21T17:00:00Z'));

      expect(prisma.agendamento.create).toHaveBeenCalled();
    });

    it('rejeita agendamento em dia fechado por excecao pontual', async () => {
      const { repositorio, prisma } = criarRepositorio();
      (prisma.excecaoAgenda.findUnique as jest.Mock).mockResolvedValue({
        fechado: true,
        horaInicio: null,
        horaFim: null,
        horaAlmocoInicio: null,
        horaAlmocoFim: null,
        tempoSlotMinutos: null,
      });

      await expect(
        repositorio.criar(agendamentoPara('2026-09-21T13:00:00Z')),
      ).rejects.toThrow('Profissional nao atende no dia selecionado.');
    });
  });

  describe('criar (conflito de horario)', () => {
    it('rejeita quando ja existe um agendamento nao cancelado no mesmo horario', async () => {
      const { repositorio, prisma } = criarRepositorio();
      (prisma.agendamento.findMany as jest.Mock).mockResolvedValue([
        {
          data: new Date('2026-09-21T13:00:00Z'),
          servicos: [{ qtdeSlots: 1 }],
        },
      ]);

      await expect(
        repositorio.criar(agendamentoPara('2026-09-21T13:00:00Z')),
      ).rejects.toThrow(
        'Este horario acabou de ser reservado por outro cliente. Escolha outro horario.',
      );
      expect(prisma.agendamento.create).not.toHaveBeenCalled();
    });

    it('rejeita quando o novo agendamento (varios slots) sobrepoe o fim de um agendamento existente', async () => {
      const { repositorio, prisma } = criarRepositorio();
      // Existente as 10:00, 1 slot de 15min -> ocupa 10:00-10:15.
      (prisma.agendamento.findMany as jest.Mock).mockResolvedValue([
        {
          data: new Date('2026-09-21T13:00:00Z'), // 10:00 em Brasilia
          servicos: [{ qtdeSlots: 1 }],
        },
      ]);
      // A duracao vem do banco (por id), nunca do corpo da requisicao.
      (prisma.servico.findMany as jest.Mock).mockResolvedValue([
        { qtdeSlots: 2 },
      ]);

      const novo = agendamentoPara('2026-09-21T12:45:00Z'); // 09:45 em Brasilia
      novo.servicos = [{ id: 1, qtdeSlots: 2 }] as any; // ocupa 09:45-10:15

      await expect(repositorio.criar(novo)).rejects.toThrow(
        'Este horario acabou de ser reservado por outro cliente. Escolha outro horario.',
      );
    });

    it('ignora o qtdeSlots vindo do corpo da requisicao e usa o valor real do banco', async () => {
      const { repositorio, prisma } = criarRepositorio();
      // Existente as 10:00, 1 slot de 15min -> ocupa 10:00-10:15.
      (prisma.agendamento.findMany as jest.Mock).mockResolvedValue([
        {
          data: new Date('2026-09-21T13:00:00Z'),
          servicos: [{ qtdeSlots: 1 }],
        },
      ]);
      // corpo da requisicao mente e diz qtdeSlots:1 (nao colidiria), mas o
      // servico de verdade no banco tem qtdeSlots:2 (colide as 09:45-10:15).
      (prisma.servico.findMany as jest.Mock).mockResolvedValue([
        { qtdeSlots: 2 },
      ]);

      const novo = agendamentoPara('2026-09-21T12:45:00Z'); // 09:45 em Brasilia
      novo.servicos = [{ id: 1, qtdeSlots: 1 }] as any;

      await expect(repositorio.criar(novo)).rejects.toThrow(
        'Este horario acabou de ser reservado por outro cliente. Escolha outro horario.',
      );
    });

    it('aceita quando nao ha sobreposicao com nenhum agendamento existente', async () => {
      const { repositorio, prisma } = criarRepositorio();
      (prisma.agendamento.findMany as jest.Mock).mockResolvedValue([
        {
          data: new Date('2026-09-21T13:00:00Z'), // 10:00 em Brasilia
          servicos: [{ qtdeSlots: 1 }],
        },
      ]);

      const novo = agendamentoPara('2026-09-21T14:00:00Z'); // 11:00 em Brasilia
      novo.servicos = [{ id: 1, qtdeSlots: 1 }] as any;

      await repositorio.criar(novo);

      expect(prisma.agendamento.create).toHaveBeenCalled();
    });
  });

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
