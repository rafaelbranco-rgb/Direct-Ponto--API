import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { TipoUsuario, UsuarioToken } from '../common/enums';

/** Chat em tempo real. Cada chamado é uma sala (`chamado:<id>`). */
@WebSocketGateway({ namespace: '/chat', cors: { origin: true } })
export class ChatGateway implements OnGatewayConnection {
  private readonly log = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwt: JwtService) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token ?? client.handshake.headers?.authorization?.replace('Bearer ', '');
    try {
      const user = this.jwt.verify<UsuarioToken>(token);
      client.data.user = user;
      // Salas para notificações: a do próprio usuário e, se atendente, a "atendentes".
      client.join(`user:${user.sub}`);
      if (user.tipo === TipoUsuario.ATENDENTE) client.join('atendentes');
    } catch {
      this.log.warn(`Conexão recusada (token inválido): ${client.id}`);
      client.disconnect(true);
    }
  }

  /** Notifica todos os atendentes conectados (novo chamado / mensagem de colaborador). */
  notificarAtendentes(payload: unknown) {
    this.server.to('atendentes').emit('notificacao', payload);
  }

  /** Notifica um colaborador específico (resposta do atendente / decisão). */
  notificarColaborador(colaboradorId: string, payload: unknown) {
    this.server.to(`user:${colaboradorId}`).emit('notificacao', payload);
  }

  @SubscribeMessage('entrar')
  entrar(client: Socket, chamadoId: string) {
    client.join(`chamado:${chamadoId}`);
    return { ok: true };
  }

  @SubscribeMessage('sair')
  sair(client: Socket, chamadoId: string) {
    client.leave(`chamado:${chamadoId}`);
    return { ok: true };
  }

  /** Nova mensagem dentro de um chamado. */
  emitirMensagem(chamadoId: string, mensagem: unknown) {
    this.server.to(`chamado:${chamadoId}`).emit('mensagem:nova', mensagem);
    this.server.emit('chamado:atualizado', { id: chamadoId });
  }

  /** Chamado novo entrou na fila "Em espera" — acende o console na hora. */
  emitirNovoChamado(chamado: unknown) {
    this.server.emit('chamado:novo', chamado);
  }

  emitirAtualizacao(chamadoId: string) {
    this.server.emit('chamado:atualizado', { id: chamadoId });
  }
}
