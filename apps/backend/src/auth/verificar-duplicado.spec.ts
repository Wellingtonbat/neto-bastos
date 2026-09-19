import { verificarCadastroDuplicado } from './verificar-duplicado';
import { PrismaService } from 'src/db/prisma.service';

describe('verificarCadastroDuplicado', () => {
  function criarPrisma(usuarios: Array<{ nome: string; telefone?: string; email: string }>) {
    return {
      usuario: {
        findFirst: jest.fn(async ({ where }: any) => {
          if (where.telefone) {
            return usuarios.find((u) => u.telefone === where.telefone) ?? null;
          }
          if (where.nome) {
            const alvo = String(where.nome.equals).toLowerCase();
            return usuarios.find((u) => u.nome.toLowerCase() === alvo) ?? null;
          }
          return null;
        }),
      },
    } as unknown as PrismaService;
  }

  it('bloqueia quando o telefone ja pertence a outra conta', async () => {
    const prisma = criarPrisma([
      { nome: 'Ruan Silva', telefone: '75988887777', email: 'ruan@gmail.com' },
    ]);

    await expect(
      verificarCadastroDuplicado(prisma, {
        nome: 'Outra Pessoa',
        telefone: '75988887777',
      }),
    ).rejects.toThrow('Já existe um cadastro com esse telefone');
  });

  it('mascara o e-mail da conta existente na mensagem de telefone duplicado', async () => {
    const prisma = criarPrisma([
      { nome: 'Ruan Silva', telefone: '75988887777', email: 'ruan@gmail.com' },
    ]);

    await expect(
      verificarCadastroDuplicado(prisma, { telefone: '75988887777' }),
    ).rejects.toThrow('r***@gmail.com');
  });

  it('retorna aviso (sem bloquear) quando so o nome bate, ignorando maiusculas/minusculas', async () => {
    const prisma = criarPrisma([
      { nome: 'Ruan Silva', telefone: '75988887777', email: 'ruan@gmail.com' },
    ]);

    const resultado = await verificarCadastroDuplicado(prisma, {
      nome: 'ruan silva',
      telefone: '75999990000',
    });

    expect(resultado.avisoNome).toContain('nome parecido');
    expect(resultado.avisoNome).toContain('r***@gmail.com');
  });

  it('nao bloqueia nem avisa quando nome e telefone sao inéditos', async () => {
    const prisma = criarPrisma([
      { nome: 'Ruan Silva', telefone: '75988887777', email: 'ruan@gmail.com' },
    ]);

    const resultado = await verificarCadastroDuplicado(prisma, {
      nome: 'Fulano de Tal',
      telefone: '75911112222',
    });

    expect(resultado.avisoNome).toBeUndefined();
  });

  it('normaliza o telefone informado (remove formatacao) antes de comparar', async () => {
    const prisma = criarPrisma([
      { nome: 'Ruan Silva', telefone: '75988887777', email: 'ruan@gmail.com' },
    ]);

    await expect(
      verificarCadastroDuplicado(prisma, { telefone: '(75) 98888-7777' }),
    ).rejects.toThrow('Já existe um cadastro com esse telefone');
  });
});
