import { existeSobreposicao } from './verificar-conflito';

describe('existeSobreposicao', () => {
  const TEMPO_SLOT = 15;

  it('detecta conflito quando o novo agendamento comeca exatamente no mesmo horario', () => {
    const existentes = [
      { data: new Date('2026-09-21T13:00:00Z'), servicos: [{ qtdeSlots: 1 }] },
    ];

    const resultado = existeSobreposicao(
      existentes,
      new Date('2026-09-21T13:00:00Z'),
      [{ qtdeSlots: 1 }],
      TEMPO_SLOT,
    );

    expect(resultado).toBe(true);
  });

  it('detecta conflito quando o novo agendamento (varios slots) invade o meio de um existente', () => {
    // existente: 10:00-10:30 (2 slots de 15min)
    const existentes = [
      { data: new Date('2026-09-21T13:00:00Z'), servicos: [{ qtdeSlots: 2 }] },
    ];

    // novo: 10:15-10:30 -- comeca dentro da janela do existente
    const resultado = existeSobreposicao(
      existentes,
      new Date('2026-09-21T13:15:00Z'),
      [{ qtdeSlots: 1 }],
      TEMPO_SLOT,
    );

    expect(resultado).toBe(true);
  });

  it('nao detecta conflito quando o novo agendamento comeca exatamente onde o existente termina', () => {
    // existente: 10:00-10:15 (1 slot)
    const existentes = [
      { data: new Date('2026-09-21T13:00:00Z'), servicos: [{ qtdeSlots: 1 }] },
    ];

    // novo: 10:15-10:30 -- adjacente, sem sobreposicao
    const resultado = existeSobreposicao(
      existentes,
      new Date('2026-09-21T13:15:00Z'),
      [{ qtdeSlots: 1 }],
      TEMPO_SLOT,
    );

    expect(resultado).toBe(false);
  });

  it('nao detecta conflito com agendamentos em horarios distantes', () => {
    const existentes = [
      { data: new Date('2026-09-21T13:00:00Z'), servicos: [{ qtdeSlots: 1 }] },
    ];

    const resultado = existeSobreposicao(
      existentes,
      new Date('2026-09-21T18:00:00Z'),
      [{ qtdeSlots: 1 }],
      TEMPO_SLOT,
    );

    expect(resultado).toBe(false);
  });

  it('soma qtdeSlots de varios servicos no mesmo agendamento para a duracao', () => {
    // existente com 2 servicos de 1 slot cada = 2 slots = 30min: 10:00-10:30
    const existentes = [
      {
        data: new Date('2026-09-21T13:00:00Z'),
        servicos: [{ qtdeSlots: 1 }, { qtdeSlots: 1 }],
      },
    ];

    // novo as 10:20 -- cai dentro dos 10:00-10:30
    const resultado = existeSobreposicao(
      existentes,
      new Date('2026-09-21T13:20:00Z'),
      [{ qtdeSlots: 1 }],
      TEMPO_SLOT,
    );

    expect(resultado).toBe(true);
  });

  it('ignora agendamentos em dias diferentes', () => {
    const existentes = [
      { data: new Date('2026-09-21T13:00:00Z'), servicos: [{ qtdeSlots: 1 }] },
    ];

    const resultado = existeSobreposicao(
      existentes,
      new Date('2026-09-22T13:00:00Z'),
      [{ qtdeSlots: 1 }],
      TEMPO_SLOT,
    );

    expect(resultado).toBe(false);
  });
});
