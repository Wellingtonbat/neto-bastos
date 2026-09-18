import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Agendamento,
  DataUtils,
  RepositorioAgendamento,
} from '@neto-bastos/core';
import { PrismaService } from 'src/db/prisma.service';
import { StatusAgendamento } from '@prisma/client';
import { resolverHorarioDoDia } from 'src/profissional/horario-resolvido';

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
    const { inicioDoDia, fimDoDia } = DataUtils.limitesDoDiaNoFuso(data);

    const resultado: any = await this.prismaService.agendamento.findMany({
      where: {
        profissionalId: profissional,
        status: { not: StatusAgendamento.CANCELADO },
        data: {
          gte: inicioDoDia,
          lte: fimDoDia,
        },
      },
      include: { servicos: true },
    });

    return resultado;
  }

  async buscarTodos(
    profissionalId?: number,
    status?: StatusAgendamento,
    data?: Date,
  ) {
    const limitesDoDia = data ? DataUtils.limitesDoDiaNoFuso(data) : undefined;

    return this.prismaService.agendamento.findMany({
      where: {
        profissionalId: profissionalId || undefined,
        status: status || undefined,
        data: limitesDoDia
          ? { gte: limitesDoDia.inicioDoDia, lte: limitesDoDia.fimDoDia }
          : undefined,
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
    const data = new Date(agendamento.data);
    if (data.getTime() < Date.now()) {
      throw new BadRequestException(
        'Nao e possivel agendar em uma data ou horario que ja passou.',
      );
    }

    const horario = await resolverHorarioDoDia(
      this.prismaService,
      agendamento.profissional.id,
      data,
    );

    if (!horario) {
      throw new BadRequestException('Profissional informado nao existe.');
    }

    if (horario.fechado) {
      throw new BadRequestException(
        'Profissional nao atende no dia selecionado.',
      );
    }

    const { hora, minuto } = DataUtils.horaNoFuso(data);
    const [horaInicio, minutoInicio] = horario.horaInicio
      .split(':')
      .map(Number);
    const [horaFim, minutoFim] = horario.horaFim.split(':').map(Number);
    const inicioJanela = horaInicio * 60 + minutoInicio;
    const fimJanela = horaFim * 60 + minutoFim;

    const minutosSelecionados = hora * 60 + minuto;
    if (
      minutosSelecionados < inicioJanela ||
      minutosSelecionados >= fimJanela
    ) {
      throw new BadRequestException(
        'Horario fora da janela de atendimento do profissional.',
      );
    }

    if ((minutosSelecionados - inicioJanela) % horario.tempoSlotMinutos !== 0) {
      throw new BadRequestException(
        'Horario invalido para a agenda do profissional.',
      );
    }

    if (horario.horaAlmocoInicio && horario.horaAlmocoFim) {
      const [horaAlmocoInicio, minutoAlmocoInicio] = horario.horaAlmocoInicio
        .split(':')
        .map(Number);
      const [horaAlmocoFim, minutoAlmocoFim] = horario.horaAlmocoFim
        .split(':')
        .map(Number);
      const inicioAlmoco = horaAlmocoInicio * 60 + minutoAlmocoInicio;
      const fimAlmoco = horaAlmocoFim * 60 + minutoAlmocoFim;

      if (
        minutosSelecionados >= inicioAlmoco &&
        minutosSelecionados < fimAlmoco
      ) {
        throw new BadRequestException(
          'Profissional esta no horario de almoco neste horario.',
        );
      }
    }
  }
}
