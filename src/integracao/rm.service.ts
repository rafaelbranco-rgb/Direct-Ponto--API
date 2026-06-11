import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { normalizarCpf } from '../common/cpf.util';
import type { Config } from '../config/configuracao';

export interface DadosRm {
  valido: boolean;
  nome?: string;
  matricula?: string;
  setor?: string;
}

export interface FuncionarioRm {
  coligada: string;
  matricula: string;
  nome: string;
  cpf: string;
  setor: string;
  situacao: string;
}

/**
 * Integração com o RM (TOTVS). Funcionários/CPF vêm do **web service de Consulta SQL**
 * (a consulta é registrada no próprio RM). Gravação na folha segue via n8n (a definir).
 */
@Injectable()
export class RmService {
  private readonly log = new Logger(RmService.name);

  constructor(private readonly config: ConfigService<Config, true>) {}

  private get rm() {
    return this.config.get('rm', { infer: true });
  }

  /** Lê um campo do registro independente de caixa (COLIGADA/Coligada/coligada). */
  private campo(linha: Record<string, unknown>, ...nomes: string[]): string {
    for (const n of nomes) {
      const chave = Object.keys(linha).find((k) => k.toLowerCase() === n.toLowerCase());
      if (chave != null && linha[chave] != null) return String(linha[chave]).trim();
    }
    return '';
  }

  /** Executa a Consulta SQL no RM e devolve os funcionários (coligada 3 e 6). */
  async listarFuncionarios(): Promise<FuncionarioRm[]> {
    if (this.rm.fake) {
      this.log.warn('RM_FAKE: retornando funcionários fictícios (sem RM).');
      return [
        { coligada: '3', matricula: '5829230', nome: 'RAFAEL MARTINIANO BARBOSA BRANCO', cpf: '035.830.262-50', setor: 'Operações', situacao: 'A' },
        { coligada: '6', matricula: '1003', nome: 'JOÃO PEDRO ALVES', cpf: '529.982.247-25', setor: 'Manutenção', situacao: 'A' },
      ];
    }
    const { apiUrl, apiUser, apiPass, consultaCod, coligada, sistema } = this.rm;
    if (!apiUrl || !consultaCod) {
      throw new ServiceUnavailableException('Web service do RM não configurado (RM_API_URL / RM_CONSULTA_COD).');
    }
    const url = `${apiUrl}/api/framework/v1/consultaSQLServer/RealizarConsulta/${consultaCod}/${coligada}/${sistema}`;
    const auth = Buffer.from(`${apiUser}:${apiPass}`).toString('base64');
    let res: Response;
    try {
      res = await fetch(url, { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } });
    } catch (e) {
      this.log.error(`Falha ao chamar o RM: ${String(e)}`);
      throw new ServiceUnavailableException('Não foi possível conectar ao RM.');
    }
    if (!res.ok) throw new ServiceUnavailableException(`RM respondeu ${res.status}.`);
    const dados: unknown = await res.json().catch(() => []);
    const linhas: Record<string, unknown>[] = Array.isArray(dados)
      ? dados
      : (((dados as Record<string, unknown>)?.value as Record<string, unknown>[]) ?? []);
    return linhas.map((l) => ({
      coligada: this.campo(l, 'COLIGADA', 'CODCOLIGADA'),
      matricula: this.campo(l, 'MATRICULA', 'CHAPA'),
      nome: this.campo(l, 'NOME'),
      cpf: this.campo(l, 'CPF'),
      setor: this.campo(l, 'SETOR', 'DESCRICAO', 'SECAO'),
      situacao: this.campo(l, 'SITUACAO', 'CODSITUACAO'),
    }));
  }

  /** Valida um CPF buscando entre os funcionários do RM. */
  async validarPorCpf(cpf: string): Promise<DadosRm> {
    const alvo = (await this.listarFuncionarios()).find((f) => normalizarCpf(f.cpf) === normalizarCpf(cpf));
    if (!alvo) return { valido: false };
    return { valido: true, nome: alvo.nome, matricula: alvo.matricula, setor: alvo.setor };
  }

  /** Consulta a marcação de ponto (ainda via n8n). */
  async consultarPonto(cpf: string, data: string): Promise<unknown> {
    if (!this.rm.consultarPontoUrl) {
      if (this.rm.fake) return { observacao: 'RM_FAKE — sem dados reais de ponto.' };
      throw new ServiceUnavailableException('Consulta de ponto não configurada.');
    }
    const res = await fetch(this.rm.consultarPontoUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(this.rm.token ? { Authorization: `Bearer ${this.rm.token}` } : {}) },
      body: JSON.stringify({ cpf, data }),
    });
    if (!res.ok) throw new ServiceUnavailableException(`n8n respondeu ${res.status}`);
    return res.json();
  }

  /** Grava o ajuste aprovado na folha (RM Labore) — via n8n. */
  async gravarAjuste(payload: Record<string, unknown>): Promise<{ ok: boolean }> {
    if (!this.rm.gravarAjusteUrl) {
      if (this.rm.fake) {
        this.log.warn('RM_FAKE: ajuste NÃO enviado ao RM (sem n8n).');
        return { ok: true };
      }
      throw new ServiceUnavailableException('Gravação no RM não configurada.');
    }
    const res = await fetch(this.rm.gravarAjusteUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(this.rm.token ? { Authorization: `Bearer ${this.rm.token}` } : {}) },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new ServiceUnavailableException(`n8n respondeu ${res.status}`);
    return (await res.json().catch(() => ({ ok: true }))) as { ok: boolean };
  }
}
