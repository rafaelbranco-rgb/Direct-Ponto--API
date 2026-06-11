import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Config } from '../config/configuracao';

export interface DadosRm {
  valido: boolean;
  nome?: string;
  matricula?: string;
  setor?: string;
}

/**
 * Toda conversa com RM Labore / Nexti passa por aqui, e daqui vai para o n8n.
 * O backend NUNCA fala direto com o TOTVS — apenas chama os webhooks do n8n.
 */
@Injectable()
export class RmService {
  private readonly log = new Logger(RmService.name);

  constructor(private readonly config: ConfigService<Config, true>) {}

  private get rm() {
    return this.config.get('rm', { infer: true });
  }

  private async chamar<T>(url: string, corpo: unknown): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.rm.token ? { Authorization: `Bearer ${this.rm.token}` } : {}),
      },
      body: JSON.stringify(corpo),
    });
    if (!res.ok) throw new ServiceUnavailableException(`n8n respondeu ${res.status}`);
    return (await res.json()) as T;
  }

  /** Valida o CPF no RM e traz nome/matrícula/setor para o cadastro. */
  async validarPorCpf(cpf: string): Promise<DadosRm> {
    if (!this.rm.validarUrl) {
      if (this.rm.fake) {
        this.log.warn(`RM_FAKE: validando CPF ${cpf} localmente (sem n8n).`);
        return { valido: true, nome: `Colaborador ${cpf.slice(-4)}`, matricula: cpf.slice(-5), setor: 'Operações' };
      }
      throw new ServiceUnavailableException('Integração com o RM não configurada.');
    }
    try {
      return await this.chamar<DadosRm>(this.rm.validarUrl, { cpf });
    } catch (e) {
      this.log.error(`Falha ao validar CPF no RM: ${String(e)}`);
      throw new ServiceUnavailableException('Não foi possível validar o CPF no RM agora.');
    }
  }

  /** Consulta a marcação de ponto do colaborador (exibida ao atendente). */
  async consultarPonto(cpf: string, data: string): Promise<unknown> {
    if (!this.rm.consultarPontoUrl) {
      if (this.rm.fake) return { observacao: 'RM_FAKE — sem dados reais de ponto.' };
      throw new ServiceUnavailableException('Consulta de ponto não configurada.');
    }
    return this.chamar(this.rm.consultarPontoUrl, { cpf, data });
  }

  /** Grava o ajuste aprovado na folha (RM Labore) via n8n. */
  async gravarAjuste(payload: Record<string, unknown>): Promise<{ ok: boolean }> {
    if (!this.rm.gravarAjusteUrl) {
      if (this.rm.fake) {
        this.log.warn('RM_FAKE: ajuste NÃO enviado ao RM (sem n8n).');
        return { ok: true };
      }
      throw new ServiceUnavailableException('Gravação no RM não configurada.');
    }
    return this.chamar(this.rm.gravarAjusteUrl, payload);
  }
}
