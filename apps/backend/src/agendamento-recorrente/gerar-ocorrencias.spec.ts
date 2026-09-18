import { gerarDatasOcorrencias } from './gerar-ocorrencias';

// 2026-09-18 e uma sexta-feira (diaSemana=5) as 10:00 no fuso de Brasilia.
const SEXTA_10H = new Date('2026-09-18T13:00:00Z');

describe('gerarDatasOcorrencias', () => {
  it('inclui hoje quando o horario ainda nao passou', () => {
    const ocorrencias = gerarDatasOcorrencias(5, '14:00', 3, SEXTA_10H);

    expect(ocorrencias[0].toISOString()).toBe(
      new Date('2026-09-18T14:00:00-03:00').toISOString(),
    );
  });

  it('pula para a proxima semana quando o horario de hoje ja passou', () => {
    const ocorrencias = gerarDatasOcorrencias(5, '08:00', 3, SEXTA_10H);

    expect(ocorrencias[0].toISOString()).toBe(
      new Date('2026-09-25T08:00:00-03:00').toISOString(),
    );
  });

  it('gera ocorrencias semanais consecutivas (7 dias de diferenca)', () => {
    const ocorrencias = gerarDatasOcorrencias(5, '14:00', 3, SEXTA_10H);

    for (let i = 1; i < ocorrencias.length; i++) {
      const diffDias =
        (ocorrencias[i].getTime() - ocorrencias[i - 1].getTime()) /
        (24 * 60 * 60 * 1000);
      expect(diffDias).toBe(7);
    }
  });

  it('respeita o horizonte de meses (nao gera alem do limite)', () => {
    const ocorrencias = gerarDatasOcorrencias(5, '14:00', 3, SEXTA_10H);
    const limite = new Date(SEXTA_10H);
    limite.setMonth(limite.getMonth() + 3);

    for (const ocorrencia of ocorrencias) {
      expect(ocorrencia.getTime()).toBeLessThanOrEqual(limite.getTime());
    }
    // ~3 meses / 7 dias por semana: entre 12 e 14 ocorrencias.
    expect(ocorrencias.length).toBeGreaterThanOrEqual(12);
    expect(ocorrencias.length).toBeLessThanOrEqual(14);
  });

  it('continua a partir de apartirDe (renovacao) sem duplicar a ultima ocorrencia', () => {
    // Renovacao chamada em 2026-12-12 (dia seguinte a ultima ocorrencia
    // existente, 2026-12-11), com horizonte fresco a partir desse momento.
    const agoraDaRenovacao = new Date('2026-12-12T13:00:00Z');
    const ultimaOcorrencia = new Date('2026-12-11T14:00:00-03:00');
    const diaSeguinte = new Date(ultimaOcorrencia);
    diaSeguinte.setDate(diaSeguinte.getDate() + 1);

    const renovadas = gerarDatasOcorrencias(
      5,
      '14:00',
      3,
      agoraDaRenovacao,
      diaSeguinte,
    );

    expect(renovadas[0].toISOString()).toBe(
      new Date('2026-12-18T14:00:00-03:00').toISOString(),
    );
  });
});
