import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoleUsuario, StatusAgendamento } from '@prisma/client';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { PrismaService } from 'src/db/prisma.service';
import { PushNotificationService } from 'src/notificacao/push-notification.service';
import { REGEX_HORA } from 'src/profissional/horario-validacao';
import {
  formatarDataISONoFuso,
  resolverHorarioDoDia,
  validarHorarioResolvido,
} from 'src/profissional/horario-resolvido';
import { gerarDatasOcorrencias } from './gerar-ocorrencias';
import { existeSobreposicao } from 'src/agendamento/verificar-conflito';

const HORIZONTE_MESES = 3;

interface CriarSerieInput {
  emailCliente: string;
  nomeCliente: string;
  telefoneCliente?: string;
  profissionalId: number;
  diaSemana: number;
  horario: string;
  servicoIds: number[];
}

interface EditarSerieInput {
  diaSemana?: number;
  horario?: string;
  servicoIds?: number[];
}

interface EditarOcorrenciaInput {
  horario?: string;
  servicoIds?: number[];
}

@Controller('agendamentos-recorrentes')
@UseGuards(AuthGuard, RolesGuard)
@Roles(RoleUsuario.DONO, RoleUsuario.BARBEIRO, RoleUsuario.FUNCIONARIO)
export class AgendamentoRecorrenteController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushNotificationService,
  ) {}

  @Get()
  listar(@Query('profissionalId') profissionalId?: string) {
    return this.prisma.agendamentoRecorrente.findMany({
      where: {
        ativo: true,
        profissionalId: profissionalId ? Number(profissionalId) : undefined,
      },
      include: { servicos: true, profissional: true },
      orderBy: [{ diaSemana: 'asc' }, { horario: 'asc' }],
    });
  }

  @Post()
  async criar(@Body() body: CriarSerieInput) {
    const {
      emailCliente,
      nomeCliente,
      telefoneCliente,
      profissionalId,
      diaSemana,
      horario,
      servicoIds,
    } = this.normalizarCriacao(body);

    const cliente = await this.prisma.usuario.findFirst({
      where: { email: emailCliente },
    });
    if (!cliente || !cliente.clienteRecorrente) {
      throw new BadRequestException(
        'Marque o cliente como recorrente no cadastro antes de criar a serie.',
      );
    }

    const ocorrencias = gerarDatasOcorrencias(
      diaSemana,
      horario,
      HORIZONTE_MESES,
    );
    if (ocorrencias.length === 0) {
      throw new BadRequestException(
        'Nao foi possivel gerar ocorrencias para esse dia/horario dentro do horizonte de 3 meses.',
      );
    }

    const horarioResolvido = await resolverHorarioDoDia(
      this.prisma,
      profissionalId,
      ocorrencias[0],
    );
    if (!horarioResolvido) {
      throw new BadRequestException('Profissional informado nao existe.');
    }
    validarHorarioResolvido(horarioResolvido, horario);

    const servicosExistentes = await this.prisma.servico.findMany({
      where: { id: { in: servicoIds } },
      select: { id: true, qtdeSlots: true },
    });
    if (servicosExistentes.length !== servicoIds.length) {
      throw new BadRequestException(
        'Um ou mais servicos informados nao existem.',
      );
    }

    // Nao cria uma ocorrencia em cima de um agendamento ja existente (de
    // outro cliente, ou avulso) -- pula so as datas com conflito, em vez
    // de falhar a serie inteira.
    const primeiraData = ocorrencias[0];
    const ultimaData = ocorrencias[ocorrencias.length - 1];
    const existentesNoIntervalo = await this.prisma.agendamento.findMany({
      where: {
        profissionalId,
        status: { not: StatusAgendamento.CANCELADO },
        data: {
          gte: primeiraData,
          lte: new Date(ultimaData.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      select: { data: true, servicos: { select: { qtdeSlots: true } } },
    });

    const ocorrenciasComConflito = ocorrencias.filter((data) =>
      existeSobreposicao(
        existentesNoIntervalo,
        data,
        servicosExistentes,
        horarioResolvido.tempoSlotMinutos,
      ),
    );
    const ocorrenciasSemConflito = ocorrencias.filter(
      (data) => !ocorrenciasComConflito.includes(data),
    );

    if (ocorrenciasSemConflito.length === 0) {
      throw new BadRequestException(
        'Todas as datas geradas para essa serie ja tem um agendamento existente para o profissional. Escolha outro dia/horario.',
      );
    }

    const serie = await this.prisma.agendamentoRecorrente.create({
      data: {
        emailCliente,
        nomeCliente,
        telefoneCliente: telefoneCliente || null,
        profissionalId,
        diaSemana,
        horario,
        servicos: { connect: servicoIds.map((id) => ({ id })) },
        ocorrencias: {
          create: ocorrenciasSemConflito.map((data) => ({
            data,
            emailCliente,
            status: StatusAgendamento.CONFIRMADO,
            profissionalId,
            servicos: { connect: servicoIds.map((id) => ({ id })) },
          })),
        },
      },
      include: { servicos: true, ocorrencias: true },
    });

    void this.notificarNovoClienteRecorrente(
      serie.profissionalId,
      serie.nomeCliente,
      serie.ocorrencias.length,
    );

    return {
      ...serie,
      datasComConflito: ocorrenciasComConflito.map((data) =>
        formatarDataISONoFuso(data),
      ),
    };
  }

  @Patch(':id')
  async editarSerie(@Param('id') id: string, @Body() body: EditarSerieInput) {
    const serieId = this.exigirId(id);
    const serie = await this.prisma.agendamentoRecorrente.findUnique({
      where: { id: serieId },
      include: { servicos: true },
    });
    if (!serie || !serie.ativo) {
      throw new NotFoundException('Serie recorrente nao encontrada.');
    }

    const diaSemana =
      body?.diaSemana !== undefined ? Number(body.diaSemana) : serie.diaSemana;
    const horario =
      body?.horario !== undefined ? body.horario.trim() : serie.horario;
    const servicoIds =
      body?.servicoIds !== undefined
        ? body.servicoIds.map(Number)
        : serie.servicos.map((s) => s.id);

    if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) {
      throw new BadRequestException('Dia da semana invalido.');
    }
    if (!REGEX_HORA.test(horario)) {
      throw new BadRequestException('Horario invalido. Use HH:mm.');
    }
    if (servicoIds.length === 0) {
      throw new BadRequestException('Selecione ao menos um servico.');
    }

    const proximasOcorrencias = gerarDatasOcorrencias(
      diaSemana,
      horario,
      HORIZONTE_MESES,
    );
    if (proximasOcorrencias.length === 0) {
      throw new BadRequestException(
        'Nao foi possivel gerar ocorrencias para esse dia/horario dentro do horizonte de 3 meses.',
      );
    }

    const horarioResolvido = await resolverHorarioDoDia(
      this.prisma,
      serie.profissionalId,
      proximasOcorrencias[0],
    );
    if (!horarioResolvido) {
      throw new BadRequestException('Profissional informado nao existe.');
    }
    validarHorarioResolvido(horarioResolvido, horario);

    // Cancela as ocorrencias futuras ainda nao personalizadas (edicoes
    // isoladas ficam intocadas) e recria a partir do novo padrao.
    await this.prisma.agendamento.updateMany({
      where: {
        agendamentoRecorrenteId: serieId,
        personalizado: false,
        status: { not: StatusAgendamento.CANCELADO },
        data: { gte: new Date() },
      },
      data: { status: StatusAgendamento.CANCELADO },
    });

    const serieAtualizada = await this.prisma.agendamentoRecorrente.update({
      where: { id: serieId },
      data: {
        diaSemana,
        horario,
        servicos: { set: servicoIds.map((sid) => ({ id: sid })) },
        ocorrencias: {
          create: proximasOcorrencias.map((data) => ({
            data,
            emailCliente: serie.emailCliente,
            status: StatusAgendamento.CONFIRMADO,
            profissionalId: serie.profissionalId,
            servicos: { connect: servicoIds.map((sid) => ({ id: sid })) },
          })),
        },
      },
      include: { servicos: true },
    });

    return serieAtualizada;
  }

  @Delete(':id')
  async cancelarSerie(@Param('id') id: string) {
    const serieId = this.exigirId(id);
    const serie = await this.prisma.agendamentoRecorrente.findUnique({
      where: { id: serieId },
    });
    if (!serie || !serie.ativo) {
      throw new NotFoundException('Serie recorrente nao encontrada.');
    }

    await this.prisma.$transaction([
      this.prisma.agendamentoRecorrente.update({
        where: { id: serieId },
        data: { ativo: false },
      }),
      this.prisma.agendamento.updateMany({
        where: {
          agendamentoRecorrenteId: serieId,
          personalizado: false,
          status: { not: StatusAgendamento.CANCELADO },
          data: { gte: new Date() },
        },
        data: { status: StatusAgendamento.CANCELADO },
      }),
    ]);

    return { ok: true };
  }

  @Post(':id/renovar')
  async renovar(@Param('id') id: string) {
    const serieId = this.exigirId(id);
    const serie = await this.prisma.agendamentoRecorrente.findUnique({
      where: { id: serieId },
      include: {
        servicos: true,
        ocorrencias: { orderBy: { data: 'desc' }, take: 1 },
      },
    });
    if (!serie || !serie.ativo) {
      throw new NotFoundException('Serie recorrente nao encontrada.');
    }

    const ultimaData = serie.ocorrencias[0]?.data ?? new Date();
    const apartirDe = new Date(ultimaData);
    apartirDe.setDate(apartirDe.getDate() + 1);

    const novasOcorrencias = gerarDatasOcorrencias(
      serie.diaSemana,
      serie.horario,
      HORIZONTE_MESES,
      new Date(),
      apartirDe,
    );

    if (novasOcorrencias.length === 0) {
      return { ok: true, criadas: 0 };
    }

    const primeiraNovaData = novasOcorrencias[0];
    const ultimaNovaData = novasOcorrencias[novasOcorrencias.length - 1];
    const existentesNoIntervalo = await this.prisma.agendamento.findMany({
      where: {
        profissionalId: serie.profissionalId,
        status: { not: StatusAgendamento.CANCELADO },
        data: {
          gte: primeiraNovaData,
          lte: new Date(ultimaNovaData.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      select: { data: true, servicos: { select: { qtdeSlots: true } } },
    });

    const resolvido = await resolverHorarioDoDia(
      this.prisma,
      serie.profissionalId,
      primeiraNovaData,
    );
    const tempoSlotMinutos = resolvido?.tempoSlotMinutos ?? 15;

    const novasOcorrenciasSemConflito = novasOcorrencias.filter(
      (data) =>
        !existeSobreposicao(
          existentesNoIntervalo,
          data,
          serie.servicos,
          tempoSlotMinutos,
        ),
    );
    const datasComConflito = novasOcorrencias
      .filter((data) => !novasOcorrenciasSemConflito.includes(data))
      .map((data) => formatarDataISONoFuso(data));

    if (novasOcorrenciasSemConflito.length === 0) {
      return { ok: true, criadas: 0, datasComConflito };
    }

    const servicoIds = serie.servicos.map((s) => s.id);
    await this.prisma.agendamentoRecorrente.update({
      where: { id: serieId },
      data: {
        ocorrencias: {
          create: novasOcorrenciasSemConflito.map((data) => ({
            data,
            emailCliente: serie.emailCliente,
            status: StatusAgendamento.CONFIRMADO,
            profissionalId: serie.profissionalId,
            servicos: { connect: servicoIds.map((sid) => ({ id: sid })) },
          })),
        },
      },
    });

    return {
      ok: true,
      criadas: novasOcorrenciasSemConflito.length,
      datasComConflito,
    };
  }

  @Patch('ocorrencias/:agendamentoId')
  async editarOcorrencia(
    @Param('agendamentoId') agendamentoId: string,
    @Body() body: EditarOcorrenciaInput,
  ) {
    const id = this.exigirId(agendamentoId);
    const ocorrencia = await this.prisma.agendamento.findUnique({
      where: { id },
      include: { servicos: true },
    });
    if (!ocorrencia || !ocorrencia.agendamentoRecorrenteId) {
      throw new NotFoundException(
        'Ocorrencia de serie recorrente nao encontrada.',
      );
    }

    const horario = body?.horario?.trim();
    const servicoIds = body?.servicoIds?.map(Number);

    let novaData = ocorrencia.data;
    if (horario) {
      if (!REGEX_HORA.test(horario)) {
        throw new BadRequestException('Horario invalido. Use HH:mm.');
      }
      const dataISO = ocorrencia.data.toISOString().slice(0, 10);
      novaData = new Date(`${dataISO}T${horario}:00-03:00`);

      const horarioResolvido = await resolverHorarioDoDia(
        this.prisma,
        ocorrencia.profissionalId,
        novaData,
      );
      if (!horarioResolvido) {
        throw new BadRequestException('Profissional informado nao existe.');
      }
      validarHorarioResolvido(horarioResolvido, horario);
    }

    return this.prisma.agendamento.update({
      where: { id },
      data: {
        data: novaData,
        personalizado: true,
        servicos: servicoIds
          ? { set: servicoIds.map((sid) => ({ id: sid })) }
          : undefined,
      },
      include: { servicos: true },
    });
  }

  @Delete('ocorrencias/:agendamentoId')
  async cancelarOcorrencia(@Param('agendamentoId') agendamentoId: string) {
    const id = this.exigirId(agendamentoId);
    const ocorrencia = await this.prisma.agendamento.findUnique({
      where: { id },
    });
    if (!ocorrencia || !ocorrencia.agendamentoRecorrenteId) {
      throw new NotFoundException(
        'Ocorrencia de serie recorrente nao encontrada.',
      );
    }

    return this.prisma.agendamento.update({
      where: { id },
      data: { status: StatusAgendamento.CANCELADO, personalizado: true },
    });
  }

  private normalizarCriacao(body: CriarSerieInput) {
    const emailCliente = (body?.emailCliente ?? '').trim();
    const nomeCliente = (body?.nomeCliente ?? '').trim();
    const telefoneCliente = (body?.telefoneCliente ?? '').trim();
    const profissionalId = Number(body?.profissionalId);
    const diaSemana = Number(body?.diaSemana);
    const horario = (body?.horario ?? '').trim();
    const servicoIds = Array.isArray(body?.servicoIds)
      ? body.servicoIds.map(Number)
      : [];

    if (!emailCliente || !nomeCliente) {
      throw new BadRequestException(
        'Nome e email do cliente sao obrigatorios.',
      );
    }
    if (!Number.isInteger(profissionalId) || profissionalId <= 0) {
      throw new BadRequestException('Profissional invalido.');
    }
    if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) {
      throw new BadRequestException('Dia da semana invalido.');
    }
    if (!REGEX_HORA.test(horario)) {
      throw new BadRequestException('Horario invalido. Use HH:mm.');
    }
    if (servicoIds.length === 0) {
      throw new BadRequestException('Selecione ao menos um servico.');
    }

    return {
      emailCliente,
      nomeCliente,
      telefoneCliente,
      profissionalId,
      diaSemana,
      horario,
      servicoIds,
    };
  }

  private exigirId(id: string): number {
    const numero = Number(id);
    if (!Number.isInteger(numero) || numero <= 0) {
      throw new BadRequestException('Identificador invalido.');
    }
    return numero;
  }

  private async notificarNovoClienteRecorrente(
    profissionalId: number,
    nomeCliente: string,
    qtdeOcorrencias: number,
  ) {
    const barbeiro = await this.prisma.usuario.findFirst({
      where: {
        profissionalId,
        role: {
          in: [RoleUsuario.BARBEIRO, RoleUsuario.DONO, RoleUsuario.FUNCIONARIO],
        },
      },
      select: { pushToken: true },
    });

    await this.push.enviarParaTokens(
      [barbeiro?.pushToken],
      'Cliente fixo cadastrado',
      `${nomeCliente} agora tem horario fixo (${qtdeOcorrencias} agendamento(s) criado(s)).`,
      { tipo: 'CLIENTE_RECORRENTE_CRIADO', profissionalId },
    );
  }
}
