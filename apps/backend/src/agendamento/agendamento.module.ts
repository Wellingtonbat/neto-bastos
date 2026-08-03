import { Module } from '@nestjs/common';
import { AgendamentoController } from './agendamento.controller';
import { AgendamentoRepository } from './agendamento.repository';
import { DbModule } from 'src/db/db.module';
import { AuthModule } from 'src/auth/auth.module';
import { NotificacaoModule } from 'src/notificacao/notificacao.module';

@Module({
  imports: [DbModule, AuthModule, NotificacaoModule],
  controllers: [AgendamentoController],
  providers: [AgendamentoRepository],
})
export class AgendamentoModule {}
