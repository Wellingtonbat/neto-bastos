import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { ServicoModule } from './servico/servico.module';
import { AgendamentoModule } from './agendamento/agendamento.module';
import { AuthModule } from './auth/auth.module';
import { ProfissionalModule } from './profissional/profissional.module';

@Module({
  imports: [
    DbModule,
    ServicoModule,
    AgendamentoModule,
    AuthModule,
    ProfissionalModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
