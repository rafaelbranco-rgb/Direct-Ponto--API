import { randomUUID } from 'crypto';
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

  /** Puxa os funcionários do RM e cria/atualiza os colaboradores no Postgres (em lote). */
  async sincronizar(): Promise<ResultadoSync> {
    const funcionarios = await this.rm.listarFuncionarios();

    // 1 query para o que já existe (cpf → entidade), evita N selects.
    const existentes = await this.repo.find({
      where: { tipo: TipoUsuario.COLABORADOR },
      select: ['id', 'cpf', 'nome', 'matricula', 'setor'],
    });
    const porCpf = new Map(existentes.filter((e) => e.cpf).map((e) => [e.cpf as string, e]));

    const novos: Usuario[] = [];
    const alterados: Usuario[] = [];
    const vistos = new Set<string>();
    let ignorados = 0;

    for (const f of funcionarios) {
      const cpf = normalizarCpf(f.cpf);
      if (cpf.length !== 11 || !f.nome || vistos.has(cpf)) {
        ignorados++;
        continue;
      }
      vistos.add(cpf);
      const matricula = f.matricula || null;
      const setor = f.setor || null;
      const existente = porCpf.get(cpf);
      if (existente) {
        if (existente.nome !== f.nome || existente.matricula !== matricula || existente.setor !== setor) {
          existente.nome = f.nome;
          existente.matricula = matricula;
          existente.setor = setor;
          alterados.push(existente);
        }
      } else {
        novos.push(
          this.repo.create({
            id: randomUUID(),
            tipo: TipoUsuario.COLABORADOR,
            nome: f.nome,
            cpf,
            matricula,
            setor,
            papel: null,
            senhaDefinida: false,
          }),
        );
      }
    }

    if (novos.length) await this.repo.save(novos, { chunk: 300 });
    if (alterados.length) await this.repo.save(alterados, { chunk: 300 });

    const resultado = { total: funcionarios.length, criados: novos.length, atualizados: alterados.length, ignorados };
    this.log.log(`Sincronização RM: ${JSON.stringify(resultado)}`);
    return resultado;
  }
}
