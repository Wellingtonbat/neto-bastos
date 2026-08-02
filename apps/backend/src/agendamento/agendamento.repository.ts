import { BadRequestException, Injectable } from '@nestjs/common';
import { Agendamento, RepositorioAgendamento } from '@neto-bastos/core';
import { PrismaService } from 'src/db/prisma.service';
import { StatusAgendamento } from '@prisma/client';

@Injectable()
export class AgendamentoRepository implements RepositorioAgendamento {
  constructor(private readonly prismaService: PrismaService) {}

  async criar(agendamento: Agendamento): Promise<void> {
    await this.validarSemPendencia(agendamento.emailCliente);
    await this.validarAgendaProfissional(agendamento);

    await this.prismaService.agendamento.create({
      data: {
        data: agendamento.data,
        emailCliente: agendamento.emailCliente,
        status: StatusAgendamento.PENDENTE,
        profissional: { connect: { id: agendamento.profissional.id } },
        servicos: {
          connect: agendamento.servicos.map((servico) => ({ id: servico.id })),
        },
      },
    });
  }

  async buscarPorEmail(email: string): Promise<Agendamento[]> {
    return this.prismaService.agendamento.findMany({
      where: {
        emailCliente: email,
      },
      include: {
        servicos: true,
        profissional: true,
      },
      orderBy: {
        data: 'desc',
      },
    });
  }

  async buscarPorProfissionalEData(
    profissional: number,
    data: Date,
  ): Promise<Agendamento[]> {
    const ano = data.getFullYear();
    const mes = data.getUTCMonth();
    const dia = data.getUTCDate();

    const inicioDoDia = new Date(ano, mes, dia, 0, 0, 0);
    const fimDoDia = new Date(ano, mes, dia, 23, 59, 59);

    const resultado: any = await this.prismaService.agendamento.findMany({
      where: {
        profissionalId: profissional,
        data: {
          gte: inicioDoDia,
          lte: fimDoDia,
        },
      },
      include: { servicos: true },
    });

    return resultado;
  }

  async buscarTodos(profissionalId?: number, status?: StatusAgendamento) {
    return this.prismaService.agendamento.findMany({
      where: {
        profissionalId: profissionalId || undefined,
        status: status || undefined,
      },
      include: {
        servicos: true,
        profissional: true,
      },
      orderBy: {
        data: 'asc',
      },
    });
  }

  async buscarPorId(id: number) {
    return this.prismaService.agendamento.findUnique({
      where: { id },
      include: {
        servicos: true,
        profissional: true,
      },
    });
  }

  async atualizarStatus(id: number, status: StatusAgendamento) {
    return this.prismaService.agendamento.update({
      where: { id },
      data: { status },
      include: {
        servicos: true,
        profissional: true,
      },
    });
  }

  async excluir(id: number) {
    return this.prismaService.agendamento.delete({
      where: { id },
    });
  }

  private async validarSemPendencia(emailCliente: string): Promise<void> {
    const pendente = await this.prismaService.agendamento.findFirst({
      where: {
        emailCliente,
        status: StatusAgendamento.PENDENTE,
      },
      select: { id: true },
    });

    if (pendente) {
      throw new BadRequestException(
        'Existe um agendamento pendente para este usuario. Aguarde confirmacao ou cancelamento.',
      );
    }
  }

  private async validarAgendaProfissional(
    agendamento: Agendamento,
  ): Promise<void> {
    const profissional = await this.prismaService.profissional.findUnique({
      where: { id: agendamento.profissional.id },
      select: {
        id: true,
        diasTrabalho: true,
        horaInicio: true,
        horaFim: true,
        tempoSlotMinutos: true,
      },
    });

    if (!profissional) {
      throw new BadRequestException('Profissional informado nao existe.');
    }

    const data = new Date(agendamento.data);
    const diaSemana = data.getDay();
    if (!profissional.diasTrabalho.includes(diaSemana)) {
      throw new BadRequestException(
        'Profissional nao atende no dia selecionado.',
      );
    }

    const [horaInicio, minutoInicio] = profissional.horaInicio
      .split(':')
      .map(Number);
    const [horaFim, minutoFim] = profissional.horaFim.split(':').map(Number);
    const inicioJanela = horaInicio * 60 + minutoInicio;
    const fimJanela = horaFim * 60 + minutoFim;

    const minutosSelecionados = data.getHours() * 60 + data.getMinutes();
    if (
      minutosSelecionados < inicioJanela ||
      minutosSelecionados >= fimJanela
    ) {
      throw new BadRequestException(
        'Horario fora da janela de atendimento do profissional.',
      );
    }

    if (
      (minutosSelecionados - inicioJanela) % profissional.tempoSlotMinutos !==
      0
    ) {
      throw new BadRequestException(
        'Horario invalido para a agenda do profissional.',
      );
    }
  }
}
