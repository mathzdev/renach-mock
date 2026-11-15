import { Body, Controller, Get, Headers, HttpCode, Post, Query } from '@nestjs/common';
import {
  CATEGORIAS, CURSOS, ENTIDADES, EXAMES, MOTIVOS_REQUERIMENTO, MUNICIPIOS, OBSERVACOES_EXAME, PROFISSIONAIS,
  RESTRICOES_MEDICAS, RESULTADOS_POR_EXAME, TIPOS_CHAVE, UFS, UF_ORIGEM_DEMO,
} from '../domain/catalogos';
import { CAMPOS_TR181 } from '../domain/tr181.campos';
import { SITUACOES_CNH } from '../domain/tipos';
import { DemoStoreService } from '../demo/demo-store.service';
import { RenachService } from './renach.service';

const H = 'x-demo-session';

@Controller('api')
export class RenachController {
  constructor(private readonly renach: RenachService, private readonly store: DemoStoreService) {}

  @Get('saude')
  saude() {
    return { ok: true, ambiente: 'Demonstrativo — dados fictícios', transmissao: 'nenhuma' };
  }

  @Get('catalogos')
  catalogos() {
    return {
      fonte: 'Manual RENACH v8.2 (julho de 2022) — tabelas e campos pré-codificados; entidades, profissionais e municípios são massa demonstrativa.',
      ufOrigem: UF_ORIGEM_DEMO,
      camposTr181: CAMPOS_TR181,
      exames: EXAMES,
      cursos: CURSOS,
      resultadosPorExame: RESULTADOS_POR_EXAME,
      restricoes: RESTRICOES_MEDICAS,
      observacoes: OBSERVACOES_EXAME,
      categorias: CATEGORIAS,
      situacoesCnh: SITUACOES_CNH,
      tiposChave: TIPOS_CHAVE,
      motivosRequerimento: MOTIVOS_REQUERIMENTO,
      municipios: MUNICIPIOS,
      entidades: ENTIDADES,
      profissionais: PROFISSIONAIS,
      ufs: UFS,
    };
  }

  @Get('demo/prontuarios')
  demonstrativos(@Headers(H) s: string) {
    return this.renach.listarDemonstrativos(s);
  }

  @Post('demo/reiniciar')
  @HttpCode(200)
  reiniciar(@Headers(H) s: string) {
    this.store.reiniciar(s);
    return { ok: true, mensagem: 'Estado demonstrativo restaurado.' };
  }

  @Get('renach/575')
  consultar(@Headers(H) s: string, @Query('tipoChave') tipo = '2', @Query('numero') numero = '') {
    return this.renach.consultar575(s, tipo, numero);
  }

  @Post('renach/181')
  @HttpCode(200)
  registrar(@Headers(H) s: string, @Body() body: Record<string, unknown>) {
    return this.renach.registrar181(s, body);
  }

  @Post('renach/159/prevalidar')
  @HttpCode(200)
  prevalidar(@Headers(H) s: string, @Body() body: Record<string, unknown>) {
    return this.renach.prevalidar159(s, body);
  }

  @Post('renach/159')
  @HttpCode(200)
  autorizar(@Headers(H) s: string, @Body() body: Record<string, unknown>) {
    return this.renach.autorizar159(s, body);
  }
}
