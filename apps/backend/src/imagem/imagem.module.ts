import { Module } from '@nestjs/common';
import { DbModule } from 'src/db/db.module';
import { ImagemController } from './imagem.controller';

@Module({
  imports: [DbModule],
  controllers: [ImagemController],
})
export class ImagemModule {}
