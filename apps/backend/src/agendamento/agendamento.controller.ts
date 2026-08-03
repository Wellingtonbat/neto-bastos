import { Agendamento, ObterHorariosOcupados } from '@neto-bastos/core';
import { AgendamentoRepository } from './agendamento.repository';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RoleUsuario, StatusAgendamento } from '@prisma/client';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { PrismaService } from 'src/db/prisma.service';
import { PushNotificationService } from 'src/notificacao/push-notification.service';

@Controller('agendamentos')
export class AgendamentoController {
  constructor(
    private readonly repo: AgendamentoRepository,
    private readonly prisma: PrismaService,
    private readonly push: PushNotificationService,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  async criar(@Req() req: any, @Body() agendamento: Agendamento) {
    const user = req.user as {
      email: string;
      role: RoleUsuario;
      profissionalId: number | null;
    };

    if (user.role === RoleUsuario.CLIENTE) {
      agendamento.emailCliente = user.email;
    }

    const estaAgendandoParaSiMesmo = agendamento.emailCliente === user.email;
    const usuarioAtuaComoBarbeiro = !!user.profissionalId;
    const barbeiroSelecionado = agendamento.profissional?.id;

    if (
      estaAgendandoParaSiMesmo &&
      usuarioAtuaComoBarbeiro &&
      barbeiroSelecionado === user.profissionalId
    ) {
      throw new ForbiddenException(
        'Barbeiro deve agendar com outro barbeiro quando for cliente.',
      );
    }

    await this.repo.criar(agendamento);

    void this.notificarNovaReserva(agendamento);
    return { ok: true };
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO, RoleUsuario.BARBEIRO)
  buscarTodos(
    @Req() req: any,
    @Query('profissionalId') profissionalId?: string,
    @Query('status') status?: StatusAgendamento,
  ) {
    const user = req.user as {
      role: RoleUsuario;
      profissionalId: number | null;
    };

    if (user.role === RoleUsuario.BARBEIRO) {
      if (!user.profissionalId) {
        throw new ForbiddenException(
          'Barbeiro sem vínculo de profissional não pode acessar a agenda.',
        );
      }
      return this.repo.buscarTodos(user.profissionalId, status);
    }

    return this.repo.buscarTodos(
      profissionalId ? +profissionalId : undefined,
      status,
    );
  }

  @Get('ocupacao/:profissional/:data')
  async buscarOcupacaoPorProfissionalEData(
    @Param('profissional') profissional: string,
    @Param('data') dataParam: string,
  ) {
    const profissionalDb = await this.prisma.profissional.findUnique({
      where: { id: +profissional },
      select: { tempoSlotMinutos: true },
    });

    const casoDeUso = new ObterHorariosOcupados(this.repo);
    return casoDeUso.executar(
      +profissional,
      new Date(dataParam),
      profissionalDb?.tempoSlotMinutos ?? 15,
    );
  }

  @Get('me')
  @UseGuards(AuthGuard)
  buscarMeusAgendamentos(@Req() req: any) {
    const user = req.user as { email: string };
    return this.repo.buscarPorEmail(user.email);
  }

  @Get(':email')
  @UseGuards(AuthGuard)
  buscarPorEmail(@Req() req: any, @Param('email') email: string) {
    const user = req.user as {
      email: string;
      role: RoleUsuario;
    };

    if (user.role === RoleUsuario.CLIENTE && user.email !== email) {
      throw new ForbiddenException(
        'Você só pode consultar seus próprios agendamentos.',
      );
    }

    return this.repo.buscarPorEmail(email);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO, RoleUsuario.BARBEIRO)
  async atualizarStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: StatusAgendamento,
  ) {
    const user = req.user as {
      role: RoleUsuario;
      profissionalId: number | null;
    };

    if (user.role === RoleUsuario.BARBEIRO && !user.profissionalId) {
      throw new ForbiddenException(
        'Barbeiro sem vínculo de profissional não pode alterar status.',
      );
    }

    if (user.role === RoleUsuario.BARBEIRO) {
      return this.atualizarStatusBarbeiro(+id, status, user.profissionalId!);
    }

    const atualizado = await this.repo.atualizarStatus(+id, status);
    void this.notificarClienteStatus(
      atualizado.emailCliente,
      status,
      atualizado.id,
    );
    return atualizado;
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO, RoleUsuario.BARBEIRO)
  excluir(@Req() req: any, @Param('id') id: string) {
    const user = req.user as {
      role: RoleUsuario;
      profissionalId: number | null;
    };

    if (user.role === RoleUsuario.BARBEIRO && !user.profissionalId) {
      throw new ForbiddenException(
        'Barbeiro sem vínculo de profissional não pode excluir agendamento.',
      );
    }

    if (user.role === RoleUsuario.BARBEIRO) {
      return this.excluirComoBarbeiro(+id, user.profissionalId!);
    }

    return this.repo.excluir(+id);
  }

  private async atualizarStatusBarbeiro(
    agendamentoId: number,
    status: StatusAgendamento,
    profissionalId: number,
  ) {
    const agendamento = await this.repo.buscarPorId(agendamentoId);
    if (!agendamento || agendamento.profissionalId !== profissionalId) {
      throw new ForbiddenException(
        'Você só pode atualizar agendamentos do seu próprio calendário.',
      );
    }
    const atualizado = await this.repo.atualizarStatus(agendamentoId, status);
    void this.notificarClienteStatus(
      atualizado.emailCliente,
      status,
      atualizado.id,
    );
    return atualizado;
  }

  private async notificarNovaReserva(agendamento: Agendamento) {
    const profissionalId = agendamento.profissional?.id;
    if (!profissionalId) return;

    const [barbeiro, cliente] = await Promise.all([
      this.prisma.usuario.findFirst({
        where: { role: RoleUsuario.BARBEIRO, profissionalId },
        select: { pushToken: true, nome: true },
      }),
      this.prisma.usuario.findFirst({
        where: { email: agendamento.emailCliente },
        select: { pushToken: true, nome: true },
      }),
    ]);

    const dataHora = new Date(agendamento.data).toLocaleString('pt-BR');
    const qtdServicos = agendamento.servicos?.length ?? 0;

    await this.push.enviarParaTokens(
      [barbeiro?.pushToken],
      'Nova reserva recebida',
      `${cliente?.nome ?? agendamento.emailCliente} reservou para ${dataHora}${qtdServicos ? ` (${qtdServicos} servico(s))` : ''}.`,
      {
        tipo: 'NOVA_RESERVA_BARBEIRO',
        emailCliente: agendamento.emailCliente,
        profissionalId,
      },
    );

    await this.push.enviarParaTokens(
      [cliente?.pushToken],
      'Reserva recebida',
      `Seu agendamento foi criado com sucesso para ${dataHora}.`,
      {
        tipo: 'RESERVA_CRIADA_CLIENTE',
        profissionalId,
      },
    );
  }

  private async notificarClienteStatus(
    emailCliente: string,
    status: StatusAgendamento,
    agendamentoId: number,
  ) {
    const cliente = await this.prisma.usuario.findFirst({
      where: { email: emailCliente },
      select: { pushToken: true },
    });

    const statusLabel: Record<StatusAgendamento, string> = {
      PENDENTE: 'Pendente',
      CONFIRMADO: 'Confirmado',
      CANCELADO: 'Cancelado',
    };

    await this.push.enviarParaTokens(
      [cliente?.pushToken],
      'Atualizacao do agendamento',
      `O status da sua reserva #${agendamentoId} agora e: ${statusLabel[status]}.`,
      {
        tipo: 'STATUS_RESERVA_CLIENTE',
        status,
        agendamentoId,
      },
    );
  }

  private async excluirComoBarbeiro(
    agendamentoId: number,
    profissionalId: number,
  ) {
    const agendamento = await this.repo.buscarPorId(agendamentoId);
    if (!agendamento || agendamento.profissionalId !== profissionalId) {
      throw new ForbiddenException(
        'Você só pode excluir agendamentos do seu próprio calendário.',
      );
    }
    return this.repo.excluir(agendamentoId);
  }
}
