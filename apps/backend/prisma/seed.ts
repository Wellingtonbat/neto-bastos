import { PrismaClient } from '@prisma/client';
import {
  Profissional as PrismaProfissional,
  Servico as PrismaServico,
} from 'prisma/prisma-client';
import { servicos, profissionais } from '@neto-bastos/core';

const prisma = new PrismaClient();

async function seed() {
  await prisma.profissional.createMany({
    data: profissionais as PrismaProfissional[],
    skipDuplicates: true,
  });
  await prisma.servico.createMany({
    data: servicos as PrismaServico[],
    skipDuplicates: true,
  });
}

seed();
