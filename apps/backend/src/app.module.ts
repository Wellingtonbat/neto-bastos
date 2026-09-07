import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { ServicoModule } from './servico/servico.module';
import { AgendamentoModule } from './agendamento/agendamento.module';
import { AuthModule } from './auth/auth.module';
import { ProfissionalModule } from './profissional/profissional.module';
import { NotificacaoModule } from './notificacao/notificacao.module';
import { ImagemModule } from './imagem/imagem.module';

@Module({
  imports: [
    DbModule,
    ServicoModule,
    AgendamentoModule,
    AuthModule,
    ProfissionalModule,
    NotificacaoModule,
    ImagemModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
