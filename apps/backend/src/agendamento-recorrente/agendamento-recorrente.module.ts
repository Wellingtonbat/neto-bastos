import { Module } from '@nestjs/common';
import { AgendamentoRecorrenteController } from './agendamento-recorrente.controller';
import { DbModule } from 'src/db/db.module';
import { AuthModule } from 'src/auth/auth.module';
import { NotificacaoModule } from 'src/notificacao/notificacao.module';

@Module({
  imports: [DbModule, AuthModule, NotificacaoModule],
  controllers: [AgendamentoRecorrenteController],
})
export class AgendamentoRecorrenteModule {}
