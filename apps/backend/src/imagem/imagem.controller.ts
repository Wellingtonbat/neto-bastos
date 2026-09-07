import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from 'src/db/prisma.service';

@Controller('imagens')
export class ImagemController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id')
  async buscar(@Param('id') id: string, @Res() res: Response) {
    const imagemId = Number(id);
    const imagem = Number.isInteger(imagemId)
      ? await this.prisma.imagem.findUnique({ where: { id: imagemId } })
      : null;

    if (!imagem) {
      throw new NotFoundException('Imagem não encontrada.');
    }

    res.setHeader('Content-Type', imagem.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(imagem.dados);
  }
}
