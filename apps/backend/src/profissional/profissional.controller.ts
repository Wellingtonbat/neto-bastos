import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { RoleUsuario } from '@prisma/client';
import { PrismaService } from 'src/db/prisma.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  JanelaHorarioInput,
  normalizarJanelaHorario,
} from './horario-validacao';
import { resolverHorarioDoDia } from './horario-resolvido';

interface AtualizarAgendaInput extends JanelaHorarioInput {
  diasTrabalho: number[];
}

interface HorarioSemanalInput extends JanelaHorarioInput {
  diaSemana: number;
}

interface ExcecaoAgendaInput extends JanelaHorarioInput {
  data: string;
  fechado?: boolean;
}

interface CriarProfissionalInput {
  nome: string;
  descricao: string;
  imagemUrl: string;
}

interface AtualizarProfissionalInput {
  nome: string;
  descricao: string;
  imagemUrl: string;
}

@Controller('profissional')
export class ProfissionalController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('upload-imagem')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO)
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Apenas imagens sao permitidas.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadImagem(@UploadedFile() arquivo?: any) {
    if (!arquivo) {
      throw new BadRequestException('Arquivo de imagem nao enviado.');
    }

    const imagem = await this.prisma.imagem.create({
      data: {
        mimeType: arquivo.mimetype,
        dados: arquivo.buffer,
      },
      select: { id: true },
    });

    return {
      imagemUrl: `/imagens/${imagem.id}`,
    };
  }

  @Get()
  buscarTodos(@Query('vinculados') vinculados?: string) {
    if (vinculados === 'true') {
      return this.prisma.profissional.findMany({
        where: {
          usuario: {
            role: { in: [RoleUsuario.BARBEIRO, RoleUsuario.DONO] },
          },
        },
        orderBy: { id: 'asc' },
      });
    }

    return this.prisma.profissional.findMany({
      orderBy: { id: 'asc' },
    });
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO)
  async criar(@Body() body: CriarProfissionalInput) {
    const nome = (body?.nome ?? '').trim();
    const descricao = (body?.descricao ?? '').trim();
    const imagemUrl = (body?.imagemUrl ?? '').trim();

    if (!nome || !descricao || !imagemUrl) {
      throw new BadRequestException(
        'Nome, descricao e imagem do profissional sao obrigatorios.',
      );
    }

    return this.prisma.profissional.create({
      data: {
        nome,
        descricao,
        imagemUrl,
        avaliacao: 5,
        quantidadeAvaliacoes: 0,
      },
    });
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO)
  async atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarProfissionalInput,
  ) {
    const profissionalId = Number(id);
    if (!Number.isInteger(profissionalId) || profissionalId <= 0) {
      throw new BadRequestException('Profissional invalido.');
    }

    const nome = (body?.nome ?? '').trim();
    const descricao = (body?.descricao ?? '').trim();
    const imagemUrl = (body?.imagemUrl ?? '').trim();

    if (!nome || !descricao || !imagemUrl) {
      throw new BadRequestException(
        'Nome, descricao e imagem do profissional sao obrigatorios.',
      );
    }

    return this.prisma.profissional.update({
      where: { id: profissionalId },
      data: {
        nome,
        descricao,
        imagemUrl,
      },
    });
  }

  @Patch(':id/agenda')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO, RoleUsuario.BARBEIRO)
  async atualizarAgenda(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: AtualizarAgendaInput,
  ) {
    const profissionalId = this.exigirAcessoAgenda(req, id);
    const agenda = this.normalizarAgenda(body);

    return this.prisma.profissional.update({
      where: { id: profissionalId },
      data: {
        diasTrabalho: agenda.diasTrabalho,
        horaInicio: agenda.horaInicio,
        horaFim: agenda.horaFim,
        horaAlmocoInicio: agenda.horaAlmocoInicio,
        horaAlmocoFim: agenda.horaAlmocoFim,
        tempoSlotMinutos: agenda.tempoSlotMinutos,
      },
    });
  }

  @Get(':id/horario-do-dia')
  async buscarHorarioDoDia(
    @Param('id') id: string,
    @Query('data') dataParam: string,
  ) {
    const profissionalId = Number(id);
    if (!Number.isInteger(profissionalId) || profissionalId <= 0) {
      throw new BadRequestException('Profissional inválido.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataParam ?? '')) {
      throw new BadRequestException('Data inválida. Use YYYY-MM-DD.');
    }

    const resolvido = await resolverHorarioDoDia(
      this.prisma,
      profissionalId,
      new Date(`${dataParam}T00:00:00-03:00`),
    );

    if (!resolvido) {
      throw new BadRequestException('Profissional informado não existe.');
    }

    return resolvido;
  }

  @Get(':id/horarios-semanais')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO, RoleUsuario.BARBEIRO)
  async listarHorariosSemanais(@Req() req: any, @Param('id') id: string) {
    const profissionalId = this.exigirAcessoAgenda(req, id);
    return this.prisma.horarioSemanal.findMany({
      where: { profissionalId },
      orderBy: { diaSemana: 'asc' },
    });
  }

  @Get(':id/excecoes')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO, RoleUsuario.BARBEIRO)
  async listarExcecoesAgenda(@Req() req: any, @Param('id') id: string) {
    const profissionalId = this.exigirAcessoAgenda(req, id);
    return this.prisma.excecaoAgenda.findMany({
      where: { profissionalId },
      orderBy: { data: 'asc' },
    });
  }

  @Post(':id/horarios-semanais')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO, RoleUsuario.BARBEIRO)
  async substituirHorariosSemanais(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: HorarioSemanalInput[],
  ) {
    const profissionalId = this.exigirAcessoAgenda(req, id);
    const itens = Array.isArray(body) ? body : [];

    const diasVistos = new Set<number>();
    const normalizados = itens.map((item) => {
      const diaSemana = Number(item?.diaSemana);
      if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) {
        throw new BadRequestException('Dia da semana inválido.');
      }
      if (diasVistos.has(diaSemana)) {
        throw new BadRequestException(
          'Não é possível repetir o mesmo dia da semana.',
        );
      }
      diasVistos.add(diaSemana);

      const janela = normalizarJanelaHorario(item, {
        tempoSlotMinutosObrigatorio: false,
      });

      return { profissionalId, diaSemana, ...janela };
    });

    await this.prisma.$transaction([
      this.prisma.horarioSemanal.deleteMany({ where: { profissionalId } }),
      ...(normalizados.length
        ? [this.prisma.horarioSemanal.createMany({ data: normalizados })]
        : []),
    ]);

    return this.prisma.horarioSemanal.findMany({
      where: { profissionalId },
      orderBy: { diaSemana: 'asc' },
    });
  }

  @Post(':id/excecoes')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO, RoleUsuario.BARBEIRO)
  async upsertExcecaoAgenda(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: ExcecaoAgendaInput,
  ) {
    const profissionalId = this.exigirAcessoAgenda(req, id);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(body?.data ?? '')) {
      throw new BadRequestException('Data inválida. Use YYYY-MM-DD.');
    }
    const data = new Date(`${body.data}T00:00:00.000Z`);
    const fechado = body?.fechado === true;

    const janela = fechado
      ? {
          horaInicio: null,
          horaFim: null,
          horaAlmocoInicio: null,
          horaAlmocoFim: null,
          tempoSlotMinutos: null,
        }
      : normalizarJanelaHorario(body, { tempoSlotMinutosObrigatorio: false });

    return this.prisma.excecaoAgenda.upsert({
      where: { profissionalId_data: { profissionalId, data } },
      create: { profissionalId, data, fechado, ...janela },
      update: { fechado, ...janela },
    });
  }

  @Delete(':id/excecoes/:data')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO, RoleUsuario.BARBEIRO)
  async removerExcecaoAgenda(
    @Req() req: any,
    @Param('id') id: string,
    @Param('data') dataParam: string,
  ) {
    const profissionalId = this.exigirAcessoAgenda(req, id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataParam ?? '')) {
      throw new BadRequestException('Data inválida. Use YYYY-MM-DD.');
    }

    await this.prisma.excecaoAgenda.deleteMany({
      where: { profissionalId, data: new Date(`${dataParam}T00:00:00.000Z`) },
    });

    return { ok: true };
  }

  private exigirAcessoAgenda(req: any, id: string): number {
    const user = req.user as {
      role: RoleUsuario;
      profissionalId: number | null;
    };

    const profissionalId = Number(id);
    if (!Number.isInteger(profissionalId) || profissionalId <= 0) {
      throw new BadRequestException('Profissional inválido.');
    }

    if (
      user.role === RoleUsuario.BARBEIRO &&
      user.profissionalId !== profissionalId
    ) {
      throw new ForbiddenException('Barbeiro só pode editar a propria agenda.');
    }

    return profissionalId;
  }

  private normalizarAgenda(body: AtualizarAgendaInput) {
    const dias = Array.isArray(body?.diasTrabalho) ? body.diasTrabalho : [];
    const diasNormalizados = [
      ...new Set(dias.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6)),
    ].sort((a, b) => a - b);

    if (diasNormalizados.length === 0) {
      throw new BadRequestException('Informe ao menos um dia de trabalho.');
    }

    const janela = normalizarJanelaHorario(body, {
      tempoSlotMinutosObrigatorio: true,
    });

    return {
      diasTrabalho: diasNormalizados,
      ...janela,
    };
  }
}
