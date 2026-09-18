import { normalizarJanelaHorario } from './horario-validacao';

describe('normalizarJanelaHorario', () => {
  it('normaliza uma janela valida sem almoco', () => {
    const resultado = normalizarJanelaHorario(
      { horaInicio: '08:00', horaFim: '18:00', tempoSlotMinutos: 30 },
      { tempoSlotMinutosObrigatorio: true },
    );

    expect(resultado).toEqual({
      horaInicio: '08:00',
      horaFim: '18:00',
      horaAlmocoInicio: null,
      horaAlmocoFim: null,
      tempoSlotMinutos: 30,
    });
  });

  it('rejeita hora em formato invalido', () => {
    expect(() =>
      normalizarJanelaHorario(
        { horaInicio: '8:00', horaFim: '18:00', tempoSlotMinutos: 30 },
        { tempoSlotMinutosObrigatorio: true },
      ),
    ).toThrow('Hora de inicio/fim invalida. Use HH:mm.');
  });

  it('rejeita hora fim menor ou igual a hora inicio', () => {
    expect(() =>
      normalizarJanelaHorario(
        { horaInicio: '18:00', horaFim: '18:00', tempoSlotMinutos: 30 },
        { tempoSlotMinutosObrigatorio: true },
      ),
    ).toThrow('Hora fim deve ser maior que a hora inicio.');
  });

  it('exige tempoSlotMinutos quando obrigatorio', () => {
    expect(() =>
      normalizarJanelaHorario(
        { horaInicio: '08:00', horaFim: '18:00' },
        { tempoSlotMinutosObrigatorio: true },
      ),
    ).toThrow('Tempo de corte deve estar entre 5 e 120 minutos.');
  });

  it('aceita tempoSlotMinutos ausente quando nao obrigatorio (retorna null)', () => {
    const resultado = normalizarJanelaHorario(
      { horaInicio: '08:00', horaFim: '18:00' },
      { tempoSlotMinutosObrigatorio: false },
    );

    expect(resultado.tempoSlotMinutos).toBeNull();
  });

  it('rejeita tempoSlotMinutos fora do intervalo 5-120', () => {
    expect(() =>
      normalizarJanelaHorario(
        { horaInicio: '08:00', horaFim: '18:00', tempoSlotMinutos: 200 },
        { tempoSlotMinutosObrigatorio: true },
      ),
    ).toThrow('Tempo de corte deve estar entre 5 e 120 minutos.');
  });

  it('rejeita almoco informado so parcialmente', () => {
    expect(() =>
      normalizarJanelaHorario(
        {
          horaInicio: '08:00',
          horaFim: '18:00',
          tempoSlotMinutos: 30,
          horaAlmocoInicio: '12:00',
        },
        { tempoSlotMinutosObrigatorio: true },
      ),
    ).toThrow(
      'Informe inicio e fim do horario de almoco, ou deixe ambos em branco.',
    );
  });

  it('rejeita almoco fora da janela de atendimento', () => {
    expect(() =>
      normalizarJanelaHorario(
        {
          horaInicio: '08:00',
          horaFim: '18:00',
          tempoSlotMinutos: 30,
          horaAlmocoInicio: '07:00',
          horaAlmocoFim: '07:30',
        },
        { tempoSlotMinutosObrigatorio: true },
      ),
    ).toThrow(
      'O horario de almoco deve estar dentro da janela de atendimento.',
    );
  });

  it('aceita almoco valido dentro da janela', () => {
    const resultado = normalizarJanelaHorario(
      {
        horaInicio: '08:00',
        horaFim: '18:00',
        tempoSlotMinutos: 30,
        horaAlmocoInicio: '12:00',
        horaAlmocoFim: '13:00',
      },
      { tempoSlotMinutosObrigatorio: true },
    );

    expect(resultado.horaAlmocoInicio).toBe('12:00');
    expect(resultado.horaAlmocoFim).toBe('13:00');
  });
});
