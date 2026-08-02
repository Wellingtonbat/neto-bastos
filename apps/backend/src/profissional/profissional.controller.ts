import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
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
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';

interface AtualizarAgendaInput {
  diasTrabalho: number[];
  horaInicio: string;
  horaFim: string;
  tempoSlotMinutos: number;
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
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const pasta = path.resolve(
            process.cwd(),
            '../frontend/public/profissionais',
          );
          fs.mkdirSync(pasta, { recursive: true });
          cb(null, pasta);
        },
        filename: (_req, file, cb) => {
          const extensao =
            path.extname(file.originalname || '').toLowerCase() || '.jpg';
          const nome = `profissional-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extensao}`;
          cb(null, nome);
        },
      }),
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
  uploadImagem(@UploadedFile() arquivo?: any) {
    if (!arquivo) {
      throw new BadRequestException('Arquivo de imagem nao enviado.');
    }

    return {
      imagemUrl: `/profissionais/${arquivo.filename}`,
    };
  }

  @Get()
  buscarTodos() {
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

    const agenda = this.normalizarAgenda(body);

    return this.prisma.profissional.update({
      where: { id: profissionalId },
      data: {
        diasTrabalho: agenda.diasTrabalho,
        horaInicio: agenda.horaInicio,
        horaFim: agenda.horaFim,
        tempoSlotMinutos: agenda.tempoSlotMinutos,
      },
    });
  }

  private normalizarAgenda(body: AtualizarAgendaInput) {
    const dias = Array.isArray(body?.diasTrabalho) ? body.diasTrabalho : [];
    const diasNormalizados = [
      ...new Set(dias.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6)),
    ].sort((a, b) => a - b);

    if (diasNormalizados.length === 0) {
      throw new BadRequestException('Informe ao menos um dia de trabalho.');
    }

    const horaInicio = (body?.horaInicio ?? '').trim();
    const horaFim = (body?.horaFim ?? '').trim();
    const regexHora = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!regexHora.test(horaInicio) || !regexHora.test(horaFim)) {
      throw new BadRequestException('Hora de inicio/fim invalida. Use HH:mm.');
    }

    const [hI, mI] = horaInicio.split(':').map(Number);
    const [hF, mF] = horaFim.split(':').map(Number);
    const inicio = hI * 60 + mI;
    const fim = hF * 60 + mF;

    if (fim <= inicio) {
      throw new BadRequestException(
        'Hora fim deve ser maior que a hora inicio.',
      );
    }

    const tempoSlotMinutos = Number(body?.tempoSlotMinutos);
    if (
      !Number.isInteger(tempoSlotMinutos) ||
      tempoSlotMinutos < 5 ||
      tempoSlotMinutos > 120
    ) {
      throw new BadRequestException(
        'Tempo de corte deve estar entre 5 e 120 minutos.',
      );
    }

    return {
      diasTrabalho: diasNormalizados,
      horaInicio,
      horaFim,
      tempoSlotMinutos,
    };
  }
}
