import { BadRequestException, Injectable } from '@nestjs/common';
import { criarFixtures } from '../domain/fixtures';
import { Prontuario } from '../domain/tipos';

interface SessaoDemo {
  prontuarios: Prontuario[];
  criadaEm: number;
  ultimoAcesso: number;
  sequencia: number;
}

const TTL_MS = 2 * 60 * 60 * 1000; // sessões ociosas por mais de 2h são descartadas
const MAX_SESSOES = 500;

/**
 * "Banco" mock em memória.
 *
 * Cada aba do front gera um identificador de sessão ao carregar a página e o
 * envia no cabeçalho X-Demo-Session. Assim:
 *  - o estado é compartilhado entre as telas 575, 181 e 159 da mesma aba;
 *  - recarregar a página cria uma sessão nova e volta ao estado inicial;
 *  - sessões diferentes nunca enxergam alterações umas das outras.
 * Nada é gravado em disco, localStorage ou base operacional.
 */
@Injectable()
export class DemoStoreService {
  private readonly sessoes = new Map<string, SessaoDemo>();

  obter(sessionId: string | undefined): SessaoDemo {
    if (!sessionId || !/^[A-Za-z0-9-]{8,64}$/.test(sessionId)) {
      throw new BadRequestException({
        codigo: 'POC-SESSAO',
        mensagem: 'Cabeçalho X-Demo-Session ausente ou inválido.',
      });
    }
    this.limparExpiradas();
    let sessao = this.sessoes.get(sessionId);
    if (!sessao) {
      if (this.sessoes.size >= MAX_SESSOES) {
        const maisAntiga = [...this.sessoes.entries()].sort((a, b) => a[1].ultimoAcesso - b[1].ultimoAcesso)[0];
        this.sessoes.delete(maisAntiga[0]);
      }
      sessao = { prontuarios: criarFixtures(), criadaEm: Date.now(), ultimoAcesso: Date.now(), sequencia: 0 };
      this.sessoes.set(sessionId, sessao);
    }
    sessao.ultimoAcesso = Date.now();
    return sessao;
  }

  proximoId(sessionId: string, prefixo: string): string {
    const s = this.obter(sessionId);
    s.sequencia += 1;
    return `${prefixo}-${String(s.sequencia).padStart(4, '0')}`;
  }

  reiniciar(sessionId: string | undefined): void {
    this.obter(sessionId);
    this.sessoes.delete(sessionId!);
    this.obter(sessionId);
  }

  private limparExpiradas() {
    const agora = Date.now();
    for (const [id, s] of this.sessoes) {
      if (agora - s.ultimoAcesso > TTL_MS) this.sessoes.delete(id);
    }
  }
}
