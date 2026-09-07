import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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

@Controller('servico')
export class ServicoController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  buscarTodos() {
    return this.prisma.servico.findMany();
  }

  @Post('upload-imagem')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO, RoleUsuario.BARBEIRO)
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
      imagemURL: `/imagens/${imagem.id}`,
    };
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO, RoleUsuario.BARBEIRO)
  async criar(@Body() body: any) {
    const existente = await this.prisma.servico.findUnique({
      where: { nome: body.nome },
      select: { id: true },
    });

    if (existente) {
      throw new BadRequestException('Ja existe um servico com este nome.');
    }

    return this.prisma.servico.create({
      data: {
        nome: body.nome,
        descricao: body.descricao,
        preco: Number(body.preco),
        qtdeSlots: Number(body.qtdeSlots),
        imagemURL: body.imagemURL,
      },
    });
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO, RoleUsuario.BARBEIRO)
  excluir(@Param('id') id: string) {
    return this.prisma.servico.delete({
      where: { id: +id },
    });
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO, RoleUsuario.BARBEIRO)
  async atualizar(@Param('id') id: string, @Body() body: any) {
    const servicoId = Number(id);
    if (!Number.isInteger(servicoId) || servicoId <= 0) {
      throw new BadRequestException('Servico invalido.');
    }

    const nome = (body?.nome ?? '').trim();
    const descricao = (body?.descricao ?? '').trim();
    const preco = Number(body?.preco);
    const qtdeSlots = Number(body?.qtdeSlots);
    const imagemURL = (body?.imagemURL ?? '').trim();

    if (!nome || !descricao || !imagemURL) {
      throw new BadRequestException(
        'Nome, descricao e imagem sao obrigatorios.',
      );
    }

    if (!Number.isFinite(preco) || preco <= 0) {
      throw new BadRequestException('Preco invalido.');
    }

    if (!Number.isInteger(qtdeSlots) || qtdeSlots <= 0) {
      throw new BadRequestException('Quantidade de slots invalida.');
    }

    const existente = await this.prisma.servico.findUnique({
      where: { nome },
      select: { id: true },
    });

    if (existente && existente.id !== servicoId) {
      throw new BadRequestException('Ja existe um servico com este nome.');
    }

    return this.prisma.servico.update({
      where: { id: servicoId },
      data: {
        nome,
        descricao,
        preco,
        qtdeSlots,
        imagemURL,
      },
    });
  }
}
