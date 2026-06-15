import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { UsuarioToken } from '../common/enums';
import { JwtAuthGuard, UsuarioAtual } from '../common/guards';
import { ChamadosService } from './chamados.service';
import { AbrirChamadoDto, DecidirDto, MensagemDto, TransferirDto } from './chamados.dto';

@UseGuards(JwtAuthGuard)
@Controller('chamados')
export class ChamadosController {
  constructor(private readonly chamados: ChamadosService) {}

  @Post()
  abrir(@UsuarioAtual() user: UsuarioToken, @Body() dto: AbrirChamadoDto) {
    return this.chamados.abrir(user, dto);
  }

  @Get()
  listar(@UsuarioAtual() user: UsuarioToken) {
    return this.chamados.listar(user);
  }

  // IMPORTANTE: rota fixa antes de ':id' para não ser capturada como id.
  @Get('historico')
  historico(@UsuarioAtual() user: UsuarioToken) {
    return this.chamados.listarHistorico(user);
  }

  @Get(':id')
  detalhe(@UsuarioAtual() user: UsuarioToken, @Param('id') id: string) {
    return this.chamados.detalhe(id, user);
  }

  @Post(':id/mensagens')
  enviar(@UsuarioAtual() user: UsuarioToken, @Param('id') id: string, @Body() dto: MensagemDto) {
    return this.chamados.enviarMensagem(id, user, dto);
  }

  @Post(':id/atender')
  atender(@UsuarioAtual() user: UsuarioToken, @Param('id') id: string) {
    return this.chamados.atender(id, user);
  }

  @Post(':id/decisao')
  decidir(@UsuarioAtual() user: UsuarioToken, @Param('id') id: string, @Body() dto: DecidirDto) {
    return this.chamados.decidir(id, user, dto.decisao, dto.motivo);
  }

  @Post(':id/transferir')
  transferir(@UsuarioAtual() user: UsuarioToken, @Param('id') id: string, @Body() dto: TransferirDto) {
    return this.chamados.transferir(id, user, dto.atendenteId);
  }
}
