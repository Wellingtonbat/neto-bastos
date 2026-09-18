import { AgendamentoRecorrenteController } from './agendamento-recorrente.controller';
import { PrismaService } from 'src/db/prisma.service';
import { PushNotificationService } from 'src/notificacao/push-notification.service';
import { StatusAgendamento } from '@prisma/client';
import * as horarioResolvido from 'src/profissional/horario-resolvido';
import * as gerarOcorrenciasModule from './gerar-ocorrencias';

const HORARIO_ABERTO = {
  fechado: false,
  horaInicio: '08:00',
  horaFim: '20:00',
  horaAlmocoInicio: null,
  horaAlmocoFim: null,
  tempoSlotMinutos: 15,
};

describe('AgendamentoRecorrenteController', () => {
  function criarController() {
    const prisma = {
      usuario: { findFirst: jest.fn() },
      servico: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, qtdeSlots: 1 }]),
      },
      agendamentoRecorrente: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      agendamento: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(async (ops: Promise<any>[]) => Promise.all(ops)),
    } as unknown as PrismaService;

    const push = {
      enviarParaTokens: jest.fn().mockResolvedValue(undefined),
    } as unknown as PushNotificationService;

    return {
      controller: new AgendamentoRecorrenteController(prisma, push),
      prisma,
      push,
    };
  }

  beforeEach(() => {
    jest
      .spyOn(horarioResolvido, 'resolverHorarioDoDia')
      .mockResolvedValue(HORARIO_ABERTO);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('criar', () => {
    const bodyValido = {
      emailCliente: 'cliente@teste.com',
      nomeCliente: 'Cliente Teste',
      profissionalId: 1,
      diaSemana: 6, // sabado
      horario: '08:00',
      servicoIds: [1],
    };

    it('rejeita quando o cliente nao esta marcado como recorrente', async () => {
      const { controller, prisma } = criarController();
      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue({
        clienteRecorrente: false,
      });

      await expect(controller.criar(bodyValido as any)).rejects.toThrow(
        'Marque o cliente como recorrente no cadastro antes de criar a serie.',
      );
    });

    it('rejeita horario em formato invalido', async () => {
      const { controller } = criarController();

      await expect(
        controller.criar({ ...bodyValido, horario: '8h' } as any),
      ).rejects.toThrow('Horario invalido. Use HH:mm.');
    });

    it('rejeita horario fora da janela de atendimento', async () => {
      const { controller, prisma } = criarController();
      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue({
        clienteRecorrente: true,
      });
      jest.spyOn(horarioResolvido, 'resolverHorarioDoDia').mockResolvedValue({
        ...HORARIO_ABERTO,
        horaInicio: '14:00',
      });

      await expect(controller.criar(bodyValido as any)).rejects.toThrow(
        'Horario fora da janela de atendimento do profissional.',
      );
    });

    it('cria a serie com ocorrencias ja CONFIRMADO e notifica o profissional', async () => {
      const { controller, prisma, push } = criarController();
      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue({
        clienteRecorrente: true,
        pushToken: null,
      });
      (prisma.agendamentoRecorrente.create as jest.Mock).mockResolvedValue({
        id: 10,
        profissionalId: 1,
        nomeCliente: 'Cliente Teste',
        ocorrencias: [{ id: 1 }, { id: 2 }],
      });

      await controller.criar(bodyValido as any);

      expect(prisma.agendamentoRecorrente.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            emailCliente: 'cliente@teste.com',
            diaSemana: 6,
            horario: '08:00',
            ocorrencias: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  status: StatusAgendamento.CONFIRMADO,
                }),
              ]),
            }),
          }),
        }),
      );

      await new Promise((resolve) => setImmediate(resolve));
      expect(push.enviarParaTokens).toHaveBeenCalled();
    });

    it('pula ocorrencias que colidem com um agendamento ja existente, sem falhar a serie inteira', async () => {
      const { controller, prisma } = criarController();
      const dataComConflito = new Date('2026-09-26T11:00:00.000Z');
      const dataLivre = new Date('2026-10-03T11:00:00.000Z');
      jest
        .spyOn(gerarOcorrenciasModule, 'gerarDatasOcorrencias')
        .mockReturnValue([dataComConflito, dataLivre]);

      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue({
        clienteRecorrente: true,
      });
      (prisma.agendamento.findMany as jest.Mock).mockResolvedValue([
        { data: dataComConflito, servicos: [{ qtdeSlots: 1 }] },
      ]);
      (prisma.agendamentoRecorrente.create as jest.Mock).mockResolvedValue({
        id: 10,
        profissionalId: 1,
        nomeCliente: 'Cliente Teste',
        ocorrencias: [{ id: 1 }],
      });

      const resultado = await controller.criar(bodyValido as any);

      expect(prisma.agendamentoRecorrente.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ocorrencias: {
              create: [
                expect.objectContaining({ data: dataLivre }),
              ],
            },
          }),
        }),
      );
      expect((resultado as any).datasComConflito).toEqual(['2026-09-26']);
    });

    it('rejeita a serie quando todas as datas geradas colidem com agendamento existente', async () => {
      const { controller, prisma } = criarController();
      const dataComConflito = new Date('2026-09-26T11:00:00.000Z');
      jest
        .spyOn(gerarOcorrenciasModule, 'gerarDatasOcorrencias')
        .mockReturnValue([dataComConflito]);

      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue({
        clienteRecorrente: true,
      });
      (prisma.agendamento.findMany as jest.Mock).mockResolvedValue([
        { data: dataComConflito, servicos: [{ qtdeSlots: 1 }] },
      ]);

      await expect(controller.criar(bodyValido as any)).rejects.toThrow(
        'Todas as datas geradas para essa serie ja tem um agendamento existente para o profissional. Escolha outro dia/horario.',
      );
      expect(prisma.agendamentoRecorrente.create).not.toHaveBeenCalled();
    });
  });

  describe('editarSerie (escopo: proximas)', () => {
    it('cancela ocorrencias futuras nao personalizadas e cria as novas', async () => {
      const { controller, prisma } = criarController();
      (prisma.agendamentoRecorrente.findUnique as jest.Mock).mockResolvedValue({
        id: 5,
        ativo: true,
        profissionalId: 1,
        emailCliente: 'cliente@teste.com',
        diaSemana: 6,
        horario: '08:00',
        servicos: [{ id: 1 }],
      });
      (prisma.agendamentoRecorrente.update as jest.Mock).mockResolvedValue({
        id: 5,
        servicos: [{ id: 1 }],
      });

      await controller.editarSerie('5', { horario: '09:00' } as any);

      expect(prisma.agendamento.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            agendamentoRecorrenteId: 5,
            personalizado: false,
          }),
          data: { status: StatusAgendamento.CANCELADO },
        }),
      );
      expect(prisma.agendamentoRecorrente.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: expect.objectContaining({ horario: '09:00' }),
        }),
      );
    });

    it('rejeita serie inexistente ou inativa', async () => {
      const { controller, prisma } = criarController();
      (prisma.agendamentoRecorrente.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(controller.editarSerie('999', {} as any)).rejects.toThrow(
        'Serie recorrente nao encontrada.',
      );
    });
  });

  describe('cancelarSerie', () => {
    it('desativa a serie e cancela ocorrencias futuras nao personalizadas', async () => {
      const { controller, prisma } = criarController();
      (prisma.agendamentoRecorrente.findUnique as jest.Mock).mockResolvedValue({
        id: 5,
        ativo: true,
      });

      const resultado = await controller.cancelarSerie('5');

      expect(resultado).toEqual({ ok: true });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('editarOcorrencia (escopo: esta)', () => {
    it('marca personalizado=true e nao toca na serie', async () => {
      const { controller, prisma } = criarController();
      (prisma.agendamento.findUnique as jest.Mock).mockResolvedValue({
        id: 42,
        agendamentoRecorrenteId: 5,
        profissionalId: 1,
        data: new Date('2026-09-26T11:00:00Z'),
        servicos: [{ id: 1 }],
      });
      (prisma.agendamento.update as jest.Mock).mockResolvedValue({ id: 42 });

      await controller.editarOcorrencia('42', { horario: '09:00' } as any);

      expect(prisma.agendamento.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 42 },
          data: expect.objectContaining({ personalizado: true }),
        }),
      );
    });

    it('rejeita ocorrencia que nao pertence a uma serie recorrente', async () => {
      const { controller, prisma } = criarController();
      (prisma.agendamento.findUnique as jest.Mock).mockResolvedValue({
        id: 42,
        agendamentoRecorrenteId: null,
      });

      await expect(
        controller.editarOcorrencia('42', {} as any),
      ).rejects.toThrow('Ocorrencia de serie recorrente nao encontrada.');
    });
  });

  describe('cancelarOcorrencia', () => {
    it('cancela apenas a ocorrencia e marca personalizado', async () => {
      const { controller, prisma } = criarController();
      (prisma.agendamento.findUnique as jest.Mock).mockResolvedValue({
        id: 42,
        agendamentoRecorrenteId: 5,
      });
      (prisma.agendamento.update as jest.Mock).mockResolvedValue({ id: 42 });

      await controller.cancelarOcorrencia('42');

      expect(prisma.agendamento.update).toHaveBeenCalledWith({
        where: { id: 42 },
        data: { status: StatusAgendamento.CANCELADO, personalizado: true },
      });
    });
  });

  describe('renovar', () => {
    it('gera novas ocorrencias a partir do dia seguinte a ultima existente', async () => {
      const { controller, prisma } = criarController();
      (prisma.agendamentoRecorrente.findUnique as jest.Mock).mockResolvedValue({
        id: 5,
        ativo: true,
        emailCliente: 'cliente@teste.com',
        profissionalId: 1,
        diaSemana: 6,
        horario: '08:00',
        servicos: [{ id: 1, qtdeSlots: 1 }],
        ocorrencias: [{ data: new Date('2026-09-26T11:00:00Z') }],
      });
      (prisma.agendamentoRecorrente.update as jest.Mock).mockResolvedValue({});

      const resultado = await controller.renovar('5');

      expect(resultado.ok).toBe(true);
      expect(prisma.agendamentoRecorrente.update).toHaveBeenCalled();
    });

    it('pula novas ocorrencias que colidem com um agendamento ja existente', async () => {
      const { controller, prisma } = criarController();
      const dataGerada = new Date('2026-10-03T11:00:00.000Z');
      jest
        .spyOn(gerarOcorrenciasModule, 'gerarDatasOcorrencias')
        .mockReturnValue([dataGerada]);

      (prisma.agendamentoRecorrente.findUnique as jest.Mock).mockResolvedValue({
        id: 5,
        ativo: true,
        emailCliente: 'cliente@teste.com',
        profissionalId: 1,
        diaSemana: 6,
        horario: '08:00',
        servicos: [{ id: 1, qtdeSlots: 1 }],
        ocorrencias: [{ data: new Date('2026-09-26T11:00:00Z') }],
      });
      (prisma.agendamento.findMany as jest.Mock).mockResolvedValue([
        { data: dataGerada, servicos: [{ qtdeSlots: 1 }] },
      ]);

      const resultado = await controller.renovar('5');

      expect(resultado).toEqual(
        expect.objectContaining({ ok: true, criadas: 0 }),
      );
      expect((resultado as any).datasComConflito).toEqual(['2026-10-03']);
      expect(prisma.agendamentoRecorrente.update).not.toHaveBeenCalled();
    });
  });
});
