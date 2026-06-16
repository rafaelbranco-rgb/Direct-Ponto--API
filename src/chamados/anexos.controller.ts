import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createReadStream, existsSync } from 'fs';

import { UsuarioToken } from '../common/enums';
import { ChamadosService } from './chamados.service';

/**
 * Download/visualização de anexos. NÃO usa o JwtAuthGuard padrão porque o token
 * precisa chegar também pela query (`?token=`) — tags <img>/<a> não enviam o
 * header Authorization. Valida o token manualmente (query ou header) e o acesso
 * ao chamado é checado em ChamadosService.lerAnexo.
 */
@Controller('anexos')
export class AnexosController {
  constructor(
    private readonly jwt: JwtService,
    private readonly chamados: ChamadosService,
  ) {}

  @Get(':id')
  async baixar(
    @Param('id') id: string,
    @Query('token') tokenQuery: string | undefined,
    @Req() req: any,
    @Res() res: any,
  ) {
    const header: string = req.headers?.authorization ?? '';
    const tokenHeader = header.startsWith('Bearer ') ? header.slice(7) : '';
    const token = tokenQuery || tokenHeader;
    let user: UsuarioToken;
    try {
      user = this.jwt.verify<UsuarioToken>(token);
    } catch {
      throw new UnauthorizedException('Token inválido ou ausente.');
    }

    const { caminho, mime, nome } = await this.chamados.lerAnexo(id, user);
    if (!existsSync(caminho)) throw new NotFoundException('Arquivo não encontrado.');

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(nome)}"`);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    createReadStream(caminho).pipe(res);
  }
}
