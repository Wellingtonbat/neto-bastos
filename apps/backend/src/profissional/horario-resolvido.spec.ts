import { resolverHorarioDoDia } from './horario-resolvido';
import { PrismaService } from 'src/db/prisma.service';

// 2026-09-21 e uma segunda-feira (diaSemana=1 no fuso America/Sao_Paulo).
const SEGUNDA_FEIRA = new Date('2026-09-21T15:00:00Z');

const PROFISSIONAL_BASE = {
  diasTrabalho: [1, 2, 3, 4, 5],
  horaInicio: '08:00',
  horaFim: '19:00',
  horaAlmocoInicio: null,
  horaAlmocoFim: null,
  tempoSlotMinutos: 15,
};

function criarPrismaMock() {
  return {
    profissional: { findUnique: jest.fn() },
    excecaoAgenda: { findUnique: jest.fn() },
    horarioSemanal: { findUnique: jest.fn() },
  } as unknown as PrismaService & {
    profissional: { findUnique: jest.Mock };
    excecaoAgenda: { findUnique: jest.Mock };
    horarioSemanal: { findUnique: jest.Mock };
  };
}

describe('resolverHorarioDoDia', () => {
  it('retorna null quando o profissional nao existe', async () => {
    const prisma = criarPrismaMock();
    prisma.profissional.findUnique.mockResolvedValue(null);

    const resultado = await resolverHorarioDoDia(prisma, 999, SEGUNDA_FEIRA);

    expect(resultado).toBeNull();
  });

  it('usa o horario base quando nao ha override nenhum', async () => {
    const prisma = criarPrismaMock();
    prisma.profissional.findUnique.mockResolvedValue(PROFISSIONAL_BASE);
    prisma.excecaoAgenda.findUnique.mockResolvedValue(null);
    prisma.horarioSemanal.findUnique.mockResolvedValue(null);

    const resultado = await resolverHorarioDoDia(prisma, 1, SEGUNDA_FEIRA);

    expect(resultado).toEqual({
      fechado: false,
      horaInicio: '08:00',
      horaFim: '19:00',
      horaAlmocoInicio: null,
      horaAlmocoFim: null,
      tempoSlotMinutos: 15,
    });
  });

  it('marca fechado quando o dia nao esta em diasTrabalho', async () => {
    const prisma = criarPrismaMock();
    prisma.profissional.findUnique.mockResolvedValue({
      ...PROFISSIONAL_BASE,
      diasTrabalho: [2, 3, 4, 5], // sem segunda (1)
    });
    prisma.excecaoAgenda.findUnique.mockResolvedValue(null);

    const resultado = await resolverHorarioDoDia(prisma, 1, SEGUNDA_FEIRA);

    expect(resultado?.fechado).toBe(true);
  });

  it('usa o override semanal quando existe para o dia', async () => {
    const prisma = criarPrismaMock();
    prisma.profissional.findUnique.mockResolvedValue(PROFISSIONAL_BASE);
    prisma.excecaoAgenda.findUnique.mockResolvedValue(null);
    prisma.horarioSemanal.findUnique.mockResolvedValue({
      horaInicio: '14:00',
      horaFim: '20:00',
      horaAlmocoInicio: null,
      horaAlmocoFim: null,
      tempoSlotMinutos: null, // cai no padrao do profissional
    });

    const resultado = await resolverHorarioDoDia(prisma, 1, SEGUNDA_FEIRA);

    expect(resultado?.horaInicio).toBe('14:00');
    expect(resultado?.horaFim).toBe('20:00');
    expect(resultado?.tempoSlotMinutos).toBe(15);
  });

  it('excecao da data tem prioridade sobre o override semanal', async () => {
    const prisma = criarPrismaMock();
    prisma.profissional.findUnique.mockResolvedValue(PROFISSIONAL_BASE);
    prisma.excecaoAgenda.findUnique.mockResolvedValue({
      fechado: false,
      horaInicio: '10:00',
      horaFim: '16:00',
      horaAlmocoInicio: null,
      horaAlmocoFim: null,
      tempoSlotMinutos: 20,
    });

    const resultado = await resolverHorarioDoDia(prisma, 1, SEGUNDA_FEIRA);

    expect(resultado?.horaInicio).toBe('10:00');
    expect(resultado?.tempoSlotMinutos).toBe(20);
    // excecao ja resolveu o dia: nao precisa nem consultar o override semanal.
    expect(prisma.horarioSemanal.findUnique).not.toHaveBeenCalled();
  });

  it('excecao fechada marca o dia como fechado mesmo sendo dia de trabalho', async () => {
    const prisma = criarPrismaMock();
    prisma.profissional.findUnique.mockResolvedValue(PROFISSIONAL_BASE);
    prisma.excecaoAgenda.findUnique.mockResolvedValue({
      fechado: true,
      horaInicio: null,
      horaFim: null,
      horaAlmocoInicio: null,
      horaAlmocoFim: null,
      tempoSlotMinutos: null,
    });

    const resultado = await resolverHorarioDoDia(prisma, 1, SEGUNDA_FEIRA);

    expect(resultado?.fechado).toBe(true);
  });
});
