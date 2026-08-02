import { Module } from '@nestjs/common';
import { DbModule } from 'src/db/db.module';
import { AuthModule } from 'src/auth/auth.module';
import { ProfissionalController } from './profissional.controller';

@Module({
  imports: [DbModule, AuthModule],
  controllers: [ProfissionalController],
})
export class ProfissionalModule {}
