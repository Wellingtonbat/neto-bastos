import { BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';

// Mostra so o primeiro caractere do usuario do e-mail (ex: "r***@gmail.com")
// -- o suficiente pra a pessoa reconhecer a propria conta sem expor o
// e-mail inteiro pra quem esta preenchendo o formulario.
function mascararEmail(email: string): string {
  const [usuario, dominio] = email.split('@');
  if (!dominio) return email;
  const visivel = usuario.slice(0, 1);
  return `${visivel}${'*'.repeat(Math.max(usuario.length - 1, 3))}@${dominio}`;
}

export interface ResultadoVerificacaoDuplicado {
  avisoNome?: string;
}

// So chamado ao criar um cadastro novo (nunca numa atualizacao de um
// usuario ja existente) -- telefone repetido bloqueia (identificador
// forte: normalmente e a mesma pessoa criando uma segunda conta por
// engano, ex.: digitou o e-mail com uma pequena diferenca da vez
// anterior); nome repetido so gera aviso, nunca bloqueia (nomes comuns
// colidem entre pessoas diferentes).
export async function verificarCadastroDuplicado(
  prisma: PrismaService,
  input: { nome?: string; telefone?: string },
): Promise<ResultadoVerificacaoDuplicado> {
  const telefone = (input.telefone ?? '').replace(/\D/g, '');
  if (telefone) {
    const porTelefone = await prisma.usuario.findFirst({
      where: { telefone },
      select: { email: true },
    });
    if (porTelefone) {
      throw new BadRequestException(
        `Já existe um cadastro com esse telefone (e-mail ${mascararEmail(porTelefone.email)}). Entre com esse e-mail ou fale com o barbeiro.`,
      );
    }
  }

  const nome = (input.nome ?? '').trim();
  if (nome) {
    const porNome = await prisma.usuario.findFirst({
      where: { nome: { equals: nome, mode: 'insensitive' } },
      select: { email: true },
    });
    if (porNome) {
      return {
        avisoNome: `Já existe um cadastro com nome parecido (e-mail ${mascararEmail(porNome.email)}). Verifique se não é um cadastro duplicado.`,
      };
    }
  }

  return {};
}
