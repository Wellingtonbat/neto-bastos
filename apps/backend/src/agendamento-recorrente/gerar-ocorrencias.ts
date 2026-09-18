import { formatarDataISONoFuso } from 'src/profissional/horario-resolvido';

// Gera as datas (em Timestamptz real, fuso America/Sao_Paulo) das
// ocorrencias semanais de uma serie recorrente, a partir de hoje (ou do
// dia seguinte a partir de `apartirDe`, quando informado -- usado pra
// "renovar" uma serie continuando de onde a ultima ocorrencia parou),
// ate `horizonteMeses` a frente. Nao gera uma ocorrencia pra um
// horario/dia que ja passou.
export function gerarDatasOcorrencias(
  diaSemana: number,
  horario: string,
  horizonteMeses = 3,
  agora: Date = new Date(),
  apartirDe?: Date,
): Date[] {
  const referencia = apartirDe ?? agora;
  const dataISOReferencia = formatarDataISONoFuso(referencia);
  // Ancora ao meio-dia UTC pra evitar qualquer virada de dia ao somar 7 em
  // 7 dias (o fuso de Brasilia so muda o instante, nunca o dia-calendario,
  // com essa margem de 12h).
  let cursor = new Date(`${dataISOReferencia}T12:00:00.000Z`);

  const diaSemanaCursor = cursor.getUTCDay();
  const deltaDias = (diaSemana - diaSemanaCursor + 7) % 7;
  cursor.setUTCDate(cursor.getUTCDate() + deltaDias);

  const limite = new Date(agora);
  limite.setMonth(limite.getMonth() + horizonteMeses);

  const ocorrencias: Date[] = [];
  while (true) {
    const dataISO = cursor.toISOString().slice(0, 10);
    const instante = new Date(`${dataISO}T${horario}:00-03:00`);

    // Compara o instante real da ocorrencia (nao a data-calendario do
    // cursor) contra o limite -- caso contrario um horario tarde no dia
    // (ex: 14h) poderia escapar do horizonte por causa do cursor estar
    // ancorado ao meio-dia UTC.
    if (instante.getTime() > limite.getTime()) break;

    if (instante.getTime() > agora.getTime()) {
      ocorrencias.push(instante);
    }

    cursor = new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  return ocorrencias;
}
