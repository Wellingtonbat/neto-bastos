import { Injectable, Logger } from '@nestjs/common';

interface PushData {
  [key: string]: string | number | boolean | null;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  async enviarParaTokens(
    tokens: Array<string | null | undefined>,
    titulo: string,
    mensagem: string,
    data?: PushData,
  ) {
    const tokensValidos = [
      ...new Set(tokens.map((t) => (t ?? '').trim())),
    ].filter(
      (token) =>
        token.startsWith('ExponentPushToken[') ||
        token.startsWith('ExpoPushToken['),
    );

    if (tokensValidos.length === 0) return;

    const mensagens = tokensValidos.map((to) => ({
      to,
      sound: 'default',
      title: titulo,
      body: mensagem,
      data: data ?? {},
    }));

    try {
      const resposta = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mensagens),
      });

      if (!resposta.ok) {
        const texto = await resposta.text();
        this.logger.warn(
          `Falha ao enviar push para Expo. Status ${resposta.status}. Resposta: ${texto}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Erro ao enviar push para Expo: ${(error as Error).message}`,
      );
    }
  }
}
