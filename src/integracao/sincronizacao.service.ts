import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TipoUsuario } from '../common/enums';
import { normalizarCpf } from '../common/cpf.util';
import { Usuario } from '../entities/usuario.entity';
import { RmService } from './rm.service';

export interface ResultadoSync {
  total: number;
  criados: number;
  atualizados: number;
  ignorados: number;
}

@Injectable()
export class SincronizacaoService {
  private readonly log = new Logger(SincronizacaoService.name);

  constructor(
    @InjectRepository(Usuario) private readonly repo: Repository<Usuario>,
    private readonly rm: RmService,
  ) {}

  /** Puxa os funcionários do RM e cria/atualiza os colaboradores no Postgres. */
  async sincronizar(): Promise<ResultadoSync> {
    const funcionarios = await this.rm.listarFuncionarios();
    let criados = 0;
    let atualizados = 0;
    let ignorados = 0;

    for (const f of funcionarios) {
      const cpf = normalizarCpf(f.cpf);
      if (cpf.length !== 11 || !f.nome) {
        ignorados++;
        continue;
      }
      const existente = await this.repo.findOne({ where: { cpf } });
      if (existente) {
        existente.nome = f.nome;
        if (f.matricula) existente.matricula = f.matricula;
        if (f.setor) existente.setor = f.setor;
        await this.repo.save(existente);
        atualizados++;
      } else {
        await this.repo.save(
          this.repo.create({
            tipo: TipoUsuario.COLABORADOR,
            nome: f.nome,
            cpf,
            matricula: f.matricula || null,
            setor: f.setor || null,
            papel: null,
            senhaDefinida: false,
          }),
        );
        criados++;
      }
    }

    const resultado = { total: funcionarios.length, criados, atualizados, ignorados };
    this.log.log(`Sincronização RM: ${JSON.stringify(resultado)}`);
    return resultado;
  }
}
