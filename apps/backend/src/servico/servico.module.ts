import { Module } from '@nestjs/common';
import { ServicoController } from './servico.controller';
import { DbModule } from 'src/db/db.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [DbModule, AuthModule],
  controllers: [ServicoController],
})
export class ServicoModule {}
