import { BadRequestException, Injectable } from '@nestjs/common';
import { DemoStoreService } from '../demo/demo-store.service';
import {
  CATEGORIAS, CURSOS, ENTIDADES, EXAMES, MOTIVOS_REQUERIMENTO, MUNICIPIOS, OBSERVACOES_EXAME, OBS_NAO_IMPRESSAS,
  PROFISSIONAIS, RESTRICOES_MEDICAS, RESULTADOS_POR_EXAME, TIPOS_CHAVE, UFS, UF_ORIGEM_DEMO,
  cnpjValido, digitosCpfValidos, nivelCategoria, ret, retPoc, resultadoApto, temDuasRodas, validadeMaximaAnos,
} from '../domain/catalogos';
import { br, dataValida, hojeIso, idadeEm, somarAnos } from '../domain/datas';
import { LEIAUTE_159, LEIAUTE_575 } from '../domain/leiautes';
import { CAMPOS_TR181 } from '../domain/tr181.campos';
import { EventoExame, Fonte, Prontuario, Retorno, SITUACOES_CNH, Validacao } from '../domain/tipos';

const AVISO_TRANSMISSAO = 'NENHUMA TRANSMISSÃO REALIZADA — processamento local, em memória, com dados fictícios.';
const ORIGEM_DESTINO = 'DETRAN → BCA (Manual RENACH v8.2, quadro de transações). Na POC: navegador → API local.';
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/** Monta uma validação a partir de uma condição. */
function regra(
  id: string, titulo: string, ok: boolean, detalheOk: string, detalheFalha: string,
  opts: { codigo?: Retorno; campos?: string[]; fonte?: Fonte; referencia?: string; impeditivo?: boolean } = {},
): Validacao {
  return {
    id,
    titulo,
    status: ok ? 'ATENDIDO' : 'NAO_ATENDIDO',
    impeditivo: opts.impeditivo ?? true,
    detalhe: ok ? detalheOk : detalheFalha,
    fonte: opts.fonte ?? 'MANUAL',
    referencia: opts.referencia,
    campos: opts.campos,
    codigoRetorno: ok ? undefined : opts.codigo,
  };
}

const primeiraFalha = (v: Validacao[]) => v.find((x) => x.impeditivo && x.status === 'NAO_ATENDIDO');

@Injectable()
export class RenachService {
  constructor(private readonly store: DemoStoreService) {}

  // ================================================================ TR 575
  consultar575(sessao: string, tipoChaveBruto: string, numeroBruto: string) {
    const tipoChave = String(tipoChaveBruto ?? '').trim();
    const bruto = String(numeroBruto ?? '').trim().toUpperCase();
    const numero = tipoChave === '1' ? bruto : bruto.replace(/[.\-\s]/g, '');
    const lista = this.store.obter(sessao).prontuarios;
    const val: Validacao[] = [];
    let p: Prontuario | undefined;

    const fim = (retorno: Retorno) => ({
      consulta: {
        transacao: '575',
        tipoChave,
        descricaoTipoChave: TIPOS_CHAVE[tipoChave] ?? '—',
        numero,
        resultado: retorno.codigo === '000' ? 'LOCALIZADO' : 'REJEITADA',
        retorno,
      },
      prontuario: retorno.codigo === '000' && p ? this.visao(p) : null,
      diagnostico: {
        transacao: { codigo: '575', nome: 'Consulta Prontuário' },
        origemDestino: ORIGEM_DESTINO,
        chave: { tipo: `Tipo-Chave ${tipoChave} – ${TIPOS_CHAVE[tipoChave] ?? 'inválido'}`, valor: numero },
        condicionalidade: 'Tipo-Chave 1: Número-Formulário-RENACH (somente para Candidato) · 2: Número-Registro · 7: CPF.',
        leiauteEnvio: LEIAUTE_575,
        payload: { tipoChave, numero, parteConsulta: '01' },
        validacoes: val,
        retorno,
        transmissao: AVISO_TRANSMISSAO,
        observacao: /^HAB-/.test(bruto)
          ? 'HAB-2026-118342 é o número do processo estadual. Não é Número-Registro nem Número-Formulário-RENACH; por isso a BCA o recusaria como chave.'
          : undefined,
      },
    });

    if (!TIPOS_CHAVE[tipoChave]) {
      val.push(regra('K0', 'Tipo-Chave permitido na 575', false, '', 'Tipo-Chave deve ser 1, 2 ou 7.', { codigo: ret('890') }));
      return fim(ret('890'));
    }
    if (tipoChave === '2') {
      const ok = digitosCpfValidos(numero);
      val.push(regra('K1', 'Número-Registro válido', ok, 'Número-Registro com 11 dígitos e dígitos verificadores corretos (mesmas críticas do CPF).',
        /^HAB-/.test(bruto) ? 'HAB-... é processo estadual, não Número-Registro.' : 'Número-Registro com formato ou dígitos verificadores inválidos.',
        { codigo: ret('752'), referencia: 'Dicionário de dados · Número-Registro' }));
      if (!ok) return fim(ret('752'));
      p = lista.find((x) => x.numeroRegistro === numero);
      val.push(regra('K2', 'Número-Registro existe na base', !!p, 'Prontuário localizado.', 'Número-Registro não encontrado na massa.', { codigo: ret('016') }));
      return fim(p ? ret('000') : ret('016'));
    }
    if (tipoChave === '7') {
      const ok = digitosCpfValidos(numero);
      val.push(regra('K1', 'CPF válido', ok, 'CPF com dígitos verificadores corretos.', 'CPF inválido.', { codigo: ret('830') }));
      if (!ok) return fim(ret('830'));
      p = lista.find((x) => x.dadosCadastrais.cpf === numero);
      val.push(regra('K2', 'CPF existe na base', !!p, 'Prontuário localizado.', 'CPF não encontrado na massa.', { codigo: ret('525') }));
      return fim(p ? ret('000') : ret('525'));
    }
    // Tipo-Chave 1 — Número-Formulário-RENACH
    const uf = numero.slice(0, 2);
    if (!/^[A-Z]{2}\d{9}$/.test(numero) || /^[A-Z]{2}0{9}$/.test(numero)) {
      val.push(regra('K1', 'Número-Formulário-RENACH válido', false, '', 'Formato: UF (2) + identificação numérica diferente de zeros.', { codigo: ret('802') }));
      return fim(ret('802'));
    }
    if (!UFS.includes(uf)) {
      val.push(regra('K1', 'UF do formulário na tabela', false, '', `UF "${uf}" fora da Tabela 01.`, { codigo: ret('801') }));
      return fim(ret('801'));
    }
    const dono = lista.find((x) => x.formularioRenachEmAndamento === numero || x.dadosControle.numeroFormularioRenach === numero ||
      x.emissoes.some((e) => e.numeroFormularioRenach === numero));
    if (dono) {
      val.push(regra('K2', 'Chave por formulário só para candidato', false, '',
        'O formulário pertence a um condutor (já habilitado). Para condutor, a 575 só aceita Número-Registro ou CPF.', { codigo: ret('375') }));
      return fim(ret('375'));
    }
    val.push(regra('K2', 'Formulário existe na base', false, '', 'Formulário não encontrado na massa.', { codigo: ret('006') }));
    return fim(ret('006'));
  }

  listarDemonstrativos(sessao: string) {
    return this.store.obter(sessao).prontuarios.map((p) => ({
      numeroRegistro: p.numeroRegistro,
      nome: p.dadosCadastrais.nomeCondutorCivil,
      cpf: p.dadosCadastrais.cpf,
      categoria: p.dadosControle.categoriaAtual,
      formularioRenachEmAndamento: p.formularioRenachEmAndamento,
      processoEstadualReferencia: p.processoEstadualReferencia ?? null,
      cenario:
        p.numeroRegistro === '90011834250' ? 'Renovação comum (cenário principal)'
          : p.numeroRegistro === '90020250096' ? 'CNH vencida há mais de 5 anos, 1ª habilitação antes de 1998'
            : 'Condutor com bloqueio ativo',
    }));
  }

  // ================================================================ TR 181
  registrar181(sessao: string, payload: Record<string, any>) {
    const e = this.normalizar181(payload ?? {});
    const lista = this.store.obter(sessao).prontuarios;
    const p = e.tipoChave === '2' ? lista.find((x) => x.numeroRegistro === e.numero) : undefined;
    const val = this.validar181(e, p, lista);
    const falha = primeiraFalha(val);
    const antes = p ? { situacaoCnh: p.dadosControle.situacaoCnh, exame: clone(p.exames.find((x) => x.codigoExame === e.codigoExame) ?? null) } : null;

    const diag = {
      transacao: { codigo: '181', nome: 'Eventos — Tipo-Evento E (Exame)' },
      origemDestino: ORIGEM_DESTINO,
      chave: { tipo: `Tipo-Chave ${e.tipoChave} – ${TIPOS_CHAVE[e.tipoChave] ?? 'inválido'}`, valor: e.numero },
      numero: { tipo: 'Tipo-Atualização', valor: e.tipoAtualizacao === 'I' ? 'I – Inclusão' : e.tipoAtualizacao === 'S' ? 'S – Substituição' : e.tipoAtualizacao },
      condicionalidade: 'Data-Validade, Categoria-Permitida, CPF-Examinador 1 e Restrições-X-Texto são condicionais (ver leiaute).',
      leiaute: CAMPOS_TR181,
      payload: { ...e, observacoes: e.observacoes.map((o) => o.padEnd(2, ' ')).join('') },
      validacoes: val,
      estadoAnterior: antes,
      transmissao: AVISO_TRANSMISSAO,
      interpretacoes: [
        'Resultado 2 (Apto com Restrições) sem nenhuma restrição médica nas Observações é recusado (o Manual exige o inverso, mas não traz código para este caso).',
        'Restrições médicas (A–Z) com resultado Inapto/Inapto Temporário são recusadas (o Manual diz que o resultado "deverá ser apto com restrições").',
        'Nos exames 03 e 04, "categoria total" é tratada como Categoria-Pretendida igual à Categoria-Atual do prontuário (retorno 346 quando diferente).',
        'Exame 03 com resultado 5 (Inapto) dispensa Data-Validade.',
        'Mudança da Situação-CNH para 6 – Alterada quando o exame muda a validade ou as observações impressas da CNH (Observação do Retorno da 181).',
      ],
    };

    if (falha || !p) {
      const retorno = falha?.codigoRetorno ?? ret('016');
      return {
        aceito: false, retorno, validacoes: val,
        camposComErro: [...new Set(val.filter((v) => v.status === 'NAO_ATENDIDO').flatMap((v) => v.campos ?? []))],
        evento: null,
        diagnostico: { ...diag, retorno, estadoPosterior: antes, mutacao: 'Nenhuma — transação rejeitada.' },
      };
    }

    const evento: EventoExame = {
      tipoEvento: 'E',
      codigoExame: e.codigoExame,
      dataExame: e.dataExame,
      resultado: e.resultado,
      dataValidade: e.dataValidade || null,
      cpfExaminador1: e.cpfExaminador1 || null,
      cpfExaminador2: e.cpfExaminador2 || null,
      cnpjEntidadeCredenciada: e.cnpjEntidadeCredenciada,
      municipioExame: e.municipioExame,
      ufExame: e.ufExame,
      categoriaPretendida: e.categoriaPretendida,
      categoriaPermitida: e.categoriaPermitida || null,
      observacoes: e.observacoes,
      restricoesXTexto: e.restricoesXTexto || null,
      cnpjLaboratorio: e.cnpjLaboratorio || null,
      numeroLaudo: e.numeroLaudo || null,
      procedencia: 'SIMULACAO_TR181',
      registradoEm: new Date().toISOString(),
    };
    const idx = p.exames.findIndex((x) => x.codigoExame === e.codigoExame);
    const anterior = idx >= 0 ? p.exames[idx] : null;
    if (idx >= 0) p.exames[idx] = evento;
    else p.exames.push(evento);

    // Situação-CNH (Observação do Leiaute Retorno da 181)
    const dc = p.dadosControle;
    const sitAntes = dc.situacaoCnh;
    if (['03', '04'].includes(e.codigoExame)) {
      const alteraCnh = this.dadosImpressosDivergem(p);
      if (alteraCnh && (sitAntes === '4' || sitAntes === '5')) {
        dc.situacaoCnhAnterior = sitAntes;
        dc.situacaoCnh = '6';
      } else if (!alteraCnh && sitAntes === '6') {
        dc.situacaoCnh = dc.situacaoCnhAnterior === '5' ? '5' : '4';
      }
    }
    dc.codigoTransacaoUltimaAtualizacao = '181';
    p.hicom.push({
      id: this.store.proximoId(sessao, 'SIM181'),
      transacao: '181',
      data: hojeIso(),
      descricao: `${e.tipoAtualizacao === 'I' ? 'Inclusão' : 'Substituição'} do Exame ${e.codigoExame} – ${EXAMES[e.codigoExame]} (simulação local).`,
      anterior: anterior ? clone(anterior) : undefined,
    });

    return {
      aceito: true,
      retorno: ret('000'),
      validacoes: val,
      camposComErro: [],
      evento,
      situacaoCnh: { antes: sitAntes, depois: dc.situacaoCnh },
      diagnostico: {
        ...diag,
        retorno: ret('000'),
        estadoPosterior: { situacaoCnh: dc.situacaoCnh, exame: evento },
        mutacao: `Exame ${e.codigoExame} ${anterior ? 'substituído' : 'incluído'} no prontuário em memória desta sessão. ` +
          (sitAntes !== dc.situacaoCnh ? `Situação-CNH: ${sitAntes} → ${dc.situacaoCnh} (${SITUACOES_CNH[dc.situacaoCnh]}).` : 'Situação-CNH inalterada.'),
      },
    };
  }

  private normalizar181(b: Record<string, any>) {
    const s = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim());
    const obs: string[] = Array.isArray(b.observacoes)
      ? b.observacoes.map((x: unknown) => s(x).toUpperCase()).filter(Boolean)
      : (s(b.observacoes).toUpperCase().match(/.{1,2}/g) ?? []).map((x) => x.trim()).filter(Boolean);
    return {
      tipoChave: s(b.tipoChave || '2'),
      numero: s(b.numero).toUpperCase().replace(/[.\-\s]/g, ''),
      tipoEvento: s(b.tipoEvento || 'E').toUpperCase(),
      tipoAtualizacao: s(b.tipoAtualizacao).toUpperCase(),
      codigoExame: s(b.codigoExame).padStart(2, '0'),
      dataExame: s(b.dataExame),
      resultado: s(b.resultado),
      dataValidade: s(b.dataValidade),
      cpfExaminador1: s(b.cpfExaminador1).replace(/\D/g, ''),
      cpfExaminador2: s(b.cpfExaminador2).replace(/\D/g, ''),
      cnpjEntidadeCredenciada: s(b.cnpjEntidadeCredenciada).replace(/\D/g, ''),
      municipioExame: s(b.municipioExame),
      ufExame: s(b.ufExame).toUpperCase(),
      categoriaPretendida: s(b.categoriaPretendida).toUpperCase(),
      categoriaPermitida: s(b.categoriaPermitida).toUpperCase(),
      observacoes: [...new Set(obs)],
      restricoesXTexto: s(b.restricoesXTexto),
      cnpjLaboratorio: s(b.cnpjLaboratorio).replace(/\D/g, ''),
      numeroLaudo: s(b.numeroLaudo).toUpperCase(),
    };
  }

  private validar181(e: ReturnType<RenachService['normalizar181']>, p: Prontuario | undefined, lista: Prontuario[]): Validacao[] {
    const v: Validacao[] = [];
    const R = (id: string, titulo: string, ok: boolean, okMsg: string, falhaMsg: string, codigo: Retorno, campos: string[], extra: Partial<Validacao> = {}) =>
      v.push({ ...regra(id, titulo, ok, okMsg, falhaMsg, { codigo, campos, referencia: `TR 181 · cód. ${codigo.codigo}` }), ...extra });
    const hoje = hojeIso();

    // Identificação do condutor
    if (e.tipoChave === '1') {
      const existe = lista.some((x) => x.formularioRenachEmAndamento === e.numero || x.emissoes.some((m) => m.numeroFormularioRenach === e.numero));
      R('I01', 'Tipo-Chave compatível com condutor', false, '', existe
        ? 'Tipo-Chave 1 (Formulário RENACH) só é aceito para candidato; para condutor use Tipo-Chave 2 – Número-Registro.'
        : 'Formulário RENACH não encontrado na base.', existe ? ret('375') : ret('006'), ['tipoChave', 'numero']);
      return v;
    }
    R('I01', 'Tipo-Chave 2 – Número-Registro', e.tipoChave === '2', 'Condutor identificado por Número-Registro.', 'Tipo-Chave inválido.', ret('890'), ['tipoChave']);
    if (e.tipoChave !== '2') return v;
    R('I02', 'Número-Registro válido', digitosCpfValidos(e.numero), 'Número-Registro com dígitos verificadores corretos.',
      /^HAB/.test(e.numero) ? 'HAB-... é o processo estadual, não Número-Registro.' : 'Número-Registro inválido (mesmas críticas do CPF).', ret('752'), ['numero']);
    if (!digitosCpfValidos(e.numero)) return v;
    R('I03', 'Número-Registro existe na base', !!p, 'Prontuário localizado.', 'Número-Registro não encontrado.', ret('016'), ['numero']);
    if (!p) return v;
    R('I04', 'UF de origem igual à UF de domínio', p.dadosCadastrais.ufDominio === UF_ORIGEM_DEMO,
      `UF de origem (${UF_ORIGEM_DEMO}) = UF de domínio.`, `UF de domínio do condutor é ${p.dadosCadastrais.ufDominio}.`, ret('011'), ['numero']);
    R('I05', 'Tipo-Evento', e.tipoEvento === 'E', 'E – Exame.', 'Tipo-Evento inválido ou ausente.', ret('376'), ['tipoEvento']);
    R('I06', 'Tipo-Atualização', ['I', 'S'].includes(e.tipoAtualizacao), e.tipoAtualizacao === 'I' ? 'I – Inclusão.' : 'S – Substituição.',
      'Tipo-Atualização inválido ou ausente (POC aceita I ou S).', ret('377'), ['tipoAtualizacao']);

    // Atributos do exame
    const exameValido = !!EXAMES[e.codigoExame];
    R('E01', 'Código-Exame', exameValido, `${e.codigoExame} – ${EXAMES[e.codigoExame]}.`, 'Código do exame fora da tabela ou ausente.', ret('407'), ['codigoExame']);
    if (!exameValido) return v;
    const dataOk = dataValida(e.dataExame) && e.dataExame <= hoje && e.dataExame >= p.dadosCadastrais.dataNascimento;
    R('E02', 'Data-Exame', dataOk, `${br(e.dataExame)}, não posterior à data da transação.`,
      'Data-Exame inválida, ausente, futura ou anterior ao nascimento.', ret('408'), ['dataExame']);
    const tabela = RESULTADOS_POR_EXAME[e.codigoExame];
    R('E03', 'Resultado', !!tabela[e.resultado], `${e.resultado} – ${tabela[e.resultado]}.`,
      `Resultado inválido ou ausente para o Exame ${e.codigoExame} (aceitos: ${Object.entries(tabela).map(([k, t]) => `${k} ${t}`).join(', ')}).`, ret('409'), ['resultado']);
    if (!dataOk || !tabela[e.resultado]) return v;

    const inapto = !resultadoApto(e.codigoExame, e.resultado);
    const inaptoTemporario = (e.codigoExame === '03' && e.resultado === '4') || (e.codigoExame === '04' && e.resultado === '2');

    // Data-Validade
    const idade = idadeEm(p.dadosCadastrais.dataNascimento, e.dataExame);
    const maxAnos = validadeMaximaAnos(idade, e.dataExame);
    const limite = somarAnos(e.dataExame, maxAnos);
    let dvOk = true;
    let dvMsg = '';
    const exigeValidade = e.codigoExame === '03' ? e.resultado !== '5' : e.codigoExame === '04' ? e.observacoes.includes('15') : false;
    const aceitaValidade = e.codigoExame === '03' || e.codigoExame === '04';
    if (!aceitaValidade && e.dataValidade) { dvOk = false; dvMsg = `Data-Validade não se aplica ao Exame ${e.codigoExame}.`; }
    else if (exigeValidade && !e.dataValidade) { dvOk = false; dvMsg = e.codigoExame === '03' ? 'Data-Validade é obrigatória no Exame 03.' : 'Exame 04 com observação 15 exige Data-Validade.'; }
    else if (e.dataValidade) {
      if (!dataValida(e.dataValidade) || e.dataValidade <= e.dataExame) { dvOk = false; dvMsg = 'Data-Validade inválida ou não posterior à Data-Exame.'; }
      else if (!inaptoTemporario && e.dataValidade > limite) {
        dvOk = false;
        dvMsg = `Data-Validade acima do máximo: ${maxAnos} anos para ${idade} anos de idade na data do exame (até ${br(limite)}).`;
      }
    }
    R('E04', 'Data-Validade', dvOk, e.dataValidade
      ? `Validade ${br(e.dataValidade)}${inaptoTemporario ? ' (término da inaptidão)' : ` — dentro do máximo de ${maxAnos} anos (${br(limite)})`}.`
      : 'Não se aplica a este exame/resultado.', dvMsg, ret('473'), ['dataValidade'], { referencia: 'TR 181 · Consistência VII · cód. 473' });

    // Profissional e entidade
    const semExaminador = ['05', '06', '07'].includes(e.codigoExame);
    const cpf1Ok = e.cpfExaminador1 ? digitosCpfValidos(e.cpfExaminador1) : semExaminador;
    R('P01', 'CPF-Examinador 1', cpf1Ok, e.cpfExaminador1 ? 'CPF válido.' : 'Não obrigatório para exames 05, 06 e 07.',
      'CPF do examinador 1 inválido ou ausente.', ret('410'), ['cpfExaminador1']);
    R('P02', 'CPF-Examinador 2', !e.cpfExaminador2 || digitosCpfValidos(e.cpfExaminador2), e.cpfExaminador2 ? 'CPF válido.' : 'Não informado (opcional).',
      'CPF do examinador 2 inválido.', ret('411'), ['cpfExaminador2']);
    const cnpjOk = cnpjValido(e.cnpjEntidadeCredenciada);
    R('P03', 'CNPJ-Entidade-Credenciada', cnpjOk, 'CNPJ válido.', 'CNPJ da entidade credenciada inválido ou ausente.', ret('399'), ['cnpjEntidadeCredenciada']);
    const ent = ENTIDADES.find((x) => x.cnpj === e.cnpjEntidadeCredenciada);
    const prof = e.cpfExaminador1 ? PROFISSIONAIS.find((x) => x.cpf === e.cpfExaminador1) : undefined;
    if (cnpjOk && cpf1Ok) {
      const existe = !!ent && (!e.cpfExaminador1 || !!prof);
      R('P04', 'Entidade/profissional cadastrados', existe, `${ent?.nome}${prof ? ` · ${prof.nome}` : ''} (cadastro fictício da POC).`,
        'Entidade ou profissional não cadastrado na base demonstrativa.', ret('611'), ['cnpjEntidadeCredenciada', 'cpfExaminador1']);
      if (existe && prof) {
        R('P05', 'Vínculo do profissional com a entidade', prof.entidade === ent!.cnpj, 'Vínculo ativo.',
          `${prof.nome} não tem vínculo com ${ent!.nome}.`, ret('639'), ['cpfExaminador1', 'cnpjEntidadeCredenciada']);
      }
    }

    // Local
    const ufOk = UFS.includes(e.ufExame);
    R('L01', 'UF-Exame', ufOk, `${e.ufExame}.`, 'UF do evento fora da tabela ou ausente.', ret('402'), ['ufExame']);
    const mun = MUNICIPIOS[e.municipioExame];
    R('L02', 'Município-Exame', !!mun, `${mun?.nome}.`, 'Município fora da tabela (massa demonstrativa) ou ausente.', ret('401'), ['municipioExame']);
    if (mun && ufOk) R('L03', 'Município pertence à UF do exame', mun.uf === e.ufExame, 'Município pertence à UF.', `${mun.nome} não pertence a ${e.ufExame}.`, ret('392'), ['municipioExame', 'ufExame']);

    // Categorias
    const pretOk = CATEGORIAS.includes(e.categoriaPretendida);
    R('C01', 'Categoria-Pretendida', pretOk, `${e.categoriaPretendida}.`, 'Categoria pretendida fora da tabela ou ausente.', ret('412'), ['categoriaPretendida']);
    const permObrig = !inapto;
    const permOk = e.categoriaPermitida ? CATEGORIAS.includes(e.categoriaPermitida) : !permObrig;
    R('C02', 'Categoria-Permitida', permOk, e.categoriaPermitida ? `${e.categoriaPermitida}.` : 'Não obrigatória para resultado inapto.',
      'Categoria permitida fora da tabela ou ausente.', ret('413'), ['categoriaPermitida']);
    if (pretOk && permOk && e.categoriaPermitida) {
      const ok = nivelCategoria(e.categoriaPermitida) <= nivelCategoria(e.categoriaPretendida) &&
        (!temDuasRodas(e.categoriaPermitida) || temDuasRodas(e.categoriaPretendida));
      R('C03', 'Permitida ≤ pretendida', ok, 'Categoria permitida não supera a pretendida.', 'Categoria permitida superior à pretendida.', ret('388'), ['categoriaPermitida']);
    }
    if (pretOk && ['03', '04'].includes(e.codigoExame)) {
      v.push(regra('C04', 'Categoria total do condutor (exames 03/04)', e.categoriaPretendida === p.dadosControle.categoriaAtual,
        `Categoria-Pretendida igual à Categoria-Atual (${p.dadosControle.categoriaAtual}).`,
        `Nos exames 03 e 04 informe a categoria total do condutor (${p.dadosControle.categoriaAtual}).`,
        { codigo: ret('346'), campos: ['categoriaPretendida'], fonte: 'INTERPRETACAO_POC', referencia: 'TR 181 · Observações do Evento E · cód. 346' }));
    }
    if (pretOk && e.codigoExame === '01') R('C05', 'Categorias do Exame 01', /^(X|A)$/.test(e.categoriaPretendida), 'X ou A.', 'Exame 01 aceita só X e A.', ret('384'), ['categoriaPretendida']);
    if (pretOk && e.codigoExame === '02') R('C05', 'Categorias do Exame 02', /^[BCDE]$/.test(e.categoriaPretendida), 'B, C, D ou E.', 'Exame 02 aceita só B, C, D e E.', ret('385'), ['categoriaPretendida']);

    // Observações
    const obs = e.observacoes;
    const desconhecidas = obs.filter((o) => !OBSERVACOES_EXAME[o] && !RESTRICOES_MEDICAS[o]);
    const restricoes = obs.filter((o) => RESTRICOES_MEDICAS[o]);
    let obsOk = obs.length > 0 && obs.length <= 10 && desconhecidas.length === 0;
    let obsMsg = obs.length === 0 ? 'Observações ausentes (use 99 se não houver).' : `Código(s) inválido(s): ${desconhecidas.join(', ')}.`;
    if (obsOk && !['03', '04'].includes(e.codigoExame) && !(obs.length === 1 && obs[0] === '99')) { obsOk = false; obsMsg = `Para o Exame ${e.codigoExame} a Observação deve ser sempre 99.`; }
    if (obsOk && obs.includes('15') && e.codigoExame !== '04') { obsOk = false; obsMsg = 'O código 15 só é aceito no Exame 04 – Avaliação Psicológica.'; }
    R('O01', 'Códigos de Observação', obsOk, obs.join(', ') + '.', obsMsg, ret('414'), ['observacoes']);
    if (obsOk) {
      R('O02', '99 não combina com outro código', !(obs.includes('99') && obs.length > 1), 'OK.', '99 – Sem Observação combinado com outro código.', ret('415'), ['observacoes']);
      R('O03', '15 não combina com 40', !(obs.includes('15') && obs.includes('40')), 'OK.', 'Códigos 15 e 40 juntos.', ret('416'), ['observacoes']);
      R('O04', 'Restrição médica x resultado Apto', !(restricoes.length && e.codigoExame === '03' && e.resultado === '1'),
        restricoes.length ? 'Restrições com resultado diferente de Apto.' : 'Sem restrições médicas.',
        'Há restrição médica nas Observações e o resultado é 1 – Apto. Use 2 – Apto com Restrições.', ret('417'), ['observacoes', 'resultado']);
      if (e.codigoExame === '03' && e.resultado === '2') {
        v.push(regra('O05', 'Apto com Restrições informa restrição', restricoes.length > 0, `Restrições: ${restricoes.join(', ')}.`,
          'Resultado 2 – Apto com Restrições sem nenhuma restrição médica (A–Z) nas Observações.',
          { codigo: retPoc('181-01', 'Apto com Restrições sem restrição médica informada.'), campos: ['observacoes'], fonte: 'INTERPRETACAO_POC' }));
      }
      if (restricoes.length && inapto) {
        v.push(regra('O06', 'Restrição médica só com Apto com Restrições', false, '', 'Restrições médicas informadas com resultado inapto.',
          { codigo: retPoc('181-02', 'Restrição médica com resultado inapto.'), campos: ['observacoes', 'resultado'], fonte: 'INTERPRETACAO_POC' }));
      }
      R('O07', 'Restrições-X-Texto', obs.includes('X') ? !!e.restricoesXTexto : true,
        obs.includes('X') ? 'Texto da restrição X informado.' : 'Não se aplica (sem observação X).',
        'Observação X exige o campo Restrições-X-Texto.', ret('214'), ['restricoesXTexto']);
      if (!obs.includes('X') && e.restricoesXTexto) {
        v.push(regra('O08', 'Restrições-X-Texto sem observação X', false, '', 'Restrições-X-Texto só deve ser informado com a observação X.',
          { codigo: retPoc('181-03', 'Restrições-X-Texto sem observação X.'), campos: ['restricoesXTexto'], fonte: 'INTERPRETACAO_POC' }));
      }
    }

    // Toxicológico informado pelo médico (opcional hoje)
    if (e.cnpjLaboratorio) R('T01', 'CNPJ-Laboratório', cnpjValido(e.cnpjLaboratorio), 'CNPJ válido.', 'CNPJ do laboratório inválido.', ret('664'), ['cnpjLaboratorio']);
    if (e.numeroLaudo) R('T02', 'Número-Laudo', /^[A-Z0-9]{6}[A-Z]{2}\d{9}$/.test(e.numeroLaudo), 'Formato XXXXXXAA999999999.', 'Número do laudo inválido.', ret('665'), ['numeroLaudo']);

    // Chave do evento no prontuário (Consistências XIII e XIV)
    const existente = p.exames.find((x) => x.codigoExame === e.codigoExame);
    if (e.tipoAtualizacao === 'I') {
      R('K01', 'Inclusão: exame ainda não registrado', !existente, `Não há Exame ${e.codigoExame} no prontuário.`,
        `Já existe Exame ${e.codigoExame} (${br(existente?.dataExame)}) no prontuário. Para um novo exame use S – Substituição.`, ret('395'), ['tipoAtualizacao', 'codigoExame']);
    } else if (e.tipoAtualizacao === 'S') {
      R('K01', 'Substituição: exame registrado', !!existente, `Exame ${e.codigoExame} de ${br(existente?.dataExame)} será substituído.`,
        `Não há Exame ${e.codigoExame} no prontuário. Use I – Inclusão.`, ret('403'), ['tipoAtualizacao', 'codigoExame']);
      if (existente) {
        const igual = this.mesmoExame(existente, e);
        R('K02', 'Substituição altera algum atributo', !igual, 'Ao menos um atributo difere do registrado.',
          'Os dados enviados são iguais aos já registrados. Nada foi alterado.', ret('404'), ['dataExame', 'resultado']);
      }
    }
    return v;
  }

  private mesmoExame(x: EventoExame, e: ReturnType<RenachService['normalizar181']>): boolean {
    const n = (s: string | null | undefined) => s ?? '';
    return x.dataExame === e.dataExame && x.resultado === e.resultado && n(x.dataValidade) === e.dataValidade &&
      n(x.cpfExaminador1) === e.cpfExaminador1 && n(x.cpfExaminador2) === e.cpfExaminador2 &&
      n(x.cnpjEntidadeCredenciada) === e.cnpjEntidadeCredenciada && x.municipioExame === e.municipioExame && x.ufExame === e.ufExame &&
      x.categoriaPretendida === e.categoriaPretendida && n(x.categoriaPermitida) === e.categoriaPermitida &&
      x.observacoes.map((o) => o.trim()).sort().join() === [...e.observacoes].sort().join() &&
      n(x.restricoesXTexto) === e.restricoesXTexto && n(x.cnpjLaboratorio) === e.cnpjLaboratorio && n(x.numeroLaudo) === e.numeroLaudo;
  }

  /** Observações impressas e validade que a próxima CNH teria, a partir dos exames 03/04. */
  private dadosCnhCalculados(p: Prontuario) {
    const ex03 = p.exames.find((x) => x.codigoExame === '03');
    const ex04 = p.exames.find((x) => x.codigoExame === '04' && !x.observacoes.includes('51'));
    const validades = [ex03?.dataValidade, ex04?.dataValidade].filter((d): d is string => !!d);
    const obs = [...new Set([...(ex03?.observacoes ?? []), ...(ex04?.observacoes ?? [])].map((o) => o.trim()))]
      .filter((o) => !OBS_NAO_IMPRESSAS.includes(o)).sort();
    return { dataValidade: validades.sort()[0] ?? null, observacoes: obs };
  }

  private dadosImpressosDivergem(p: Prontuario): boolean {
    const calc = this.dadosCnhCalculados(p);
    return calc.dataValidade !== p.dadosControle.dataValidadeCnh ||
      calc.observacoes.join() !== [...p.dadosControle.observacaoCnh].map((o) => o.trim()).sort().join();
  }

  // ================================================================ TR 159
  prevalidar159(sessao: string, body: Record<string, any>) {
    const { p, entrada } = this.entrada159(sessao, body);
    const requisitos = this.requisitos159(sessao, p, entrada);
    const bloqueantes = requisitos.filter((r) => r.impeditivo && r.status === 'NAO_ATENDIDO');
    return {
      resumo: this.resumo159(p, entrada),
      requisitos,
      podeAutorizar: bloqueantes.length === 0,
      pendencias: bloqueantes.map((b) => `${b.titulo}${b.codigoRetorno ? ` (${b.codigoRetorno.codigo})` : ''}`),
    };
  }

  autorizar159(sessao: string, body: Record<string, any>) {
    const { p, entrada } = this.entrada159(sessao, body);
    const dc = p.dadosControle;
    const antes = { situacaoCnh: dc.situacaoCnh, situacaoCnhAnterior: dc.situacaoCnhAnterior, motivoRequerimento: dc.motivoRequerimento, numeroFormularioRenach: dc.numeroFormularioRenach };
    const requisitos = this.requisitos159(sessao, p, entrada);
    const bloqueante = primeiraFalha(requisitos);
    const payload = this.payload159(p, entrada);
    const diagBase = {
      transacao: { codigo: '159', nome: 'Autorizar Emissão CNH — Motivo-Requerimento 5' },
      origemDestino: ORIGEM_DESTINO,
      chave: { tipo: 'Número-REGISTRO', valor: p.numeroRegistro },
      numero: { tipo: 'Número-Formulário-RENACH', valor: entrada.numeroFormularioRenach },
      condicionalidade: 'Somente Motivo-Requerimento 5 — Renovação de Exames nesta etapa. DDD, celular e e-mail obrigatórios se Tipo de Autorização = 2.',
      leiauteEnvio: LEIAUTE_159,
      payload,
      validacoes: requisitos,
      estadoAnterior: antes,
      transmissao: AVISO_TRANSMISSAO,
      lacunas: this.lacunas159(),
    };
    if (bloqueante) {
      const retorno = bloqueante.codigoRetorno ?? retPoc('159-99', bloqueante.titulo);
      return {
        autorizado: false, retorno, requisitos, prontuario: this.visao(p),
        diagnostico: { ...diagBase, retorno, estadoPosterior: antes, mutacao: 'Nenhuma — transação rejeitada.' },
      };
    }
    dc.situacaoCnhAnterior = dc.situacaoCnh;
    dc.situacaoCnh = '1';
    dc.motivoRequerimento = '5';
    dc.numeroFormularioRenach = entrada.numeroFormularioRenach;
    dc.categoriaAutorizada = entrada.categoria;
    dc.codigoTransacaoUltimaAtualizacao = '159';
    const id = this.store.proximoId(sessao, 'SIM159');
    p.autorizacoes.push({
      id, transacao: '159', motivoRequerimento: '5', numeroFormularioRenach: entrada.numeroFormularioRenach,
      categoria: entrada.categoria, dataValidade: payload.dataValidade, tipoAutorizacao: entrada.tipoAutorizacao as '1' | '2',
      autorizadaEm: new Date().toISOString(), situacaoAnterior: antes.situacaoCnh, situacaoPosterior: '1',
    });
    p.hicom.push({ id, transacao: '159', data: hojeIso(), descricao: 'Autorização de emissão — Motivo 5 – Renovação de Exames (simulação local).' });
    return {
      autorizado: true, retorno: ret('000'), requisitos, prontuario: this.visao(p),
      diagnostico: {
        ...diagBase,
        retorno: ret('000'),
        estadoPosterior: { situacaoCnh: '1', situacaoCnhAnterior: antes.situacaoCnh, motivoRequerimento: '5', numeroFormularioRenach: entrada.numeroFormularioRenach },
        mutacao: `Situação-CNH da fixture desta sessão: ${antes.situacaoCnh} → 1 – Emissão Autorizada (Retorno 159, obs. 1). CNH operacional e processo estadual não foram alterados.`,
      },
    };
  }

  private lacunas159(): string[] {
    return [
      'Código 017 (CNH sendo emitida): a tabela de regras detalha o código para outras transações; a POC o aplica na 159 quando a Situação-CNH é 2 ou 3.',
      'Cód. 372 x quadro Curso x Motivo: o código cita apenas o Curso 30, mas a observação do quadro admite Curso 30 ou Exame 06 no Motivo 5. A POC aceita os dois.',
      'Exame toxicológico: o Manual define os retornos 666/668/686 na 159, mas não restringe categorias no trecho; a POC aplica a C, D e E (CTB art. 148-A).',
      'Infrações gravíssimas (obs. 1 da 159, categorias D/E): dados do RENAINF não integrados — "não verificável".',
      'Impedimentos/duplicidade na BINCO (076, 077, 935…) e imagens biométricas (161–166): não simulados — "não verificável".',
      'Quadro-Observações-CNH (215) e divergências de dados cadastrais (975, 977, 983…): o payload é montado a partir do prontuário, então não há divergência a testar.',
    ];
  }

  private entrada159(sessao: string, b: Record<string, any>) {
    const motivo = String(b?.motivoRequerimento ?? b?.motivo ?? '').trim().toUpperCase();
    if (!MOTIVOS_REQUERIMENTO[motivo]) throw new BadRequestException({ codigo: '834', mensagem: ret('834').mensagem });
    if (motivo !== '5') {
      throw new BadRequestException({
        codigo: 'POC-159-00',
        mensagem: `Motivo ${motivo} – ${MOTIVOS_REQUERIMENTO[motivo]} existe no Manual, mas esta POC executa exclusivamente o Motivo-Requerimento 5 — Renovação de Exames.`,
      });
    }
    const numeroRegistro = String(b?.numeroRegistro ?? '').replace(/\D/g, '');
    if (!digitosCpfValidos(numeroRegistro)) throw new BadRequestException({ codigo: '752', mensagem: ret('752').mensagem });
    const p = this.store.obter(sessao).prontuarios.find((x) => x.numeroRegistro === numeroRegistro);
    if (!p) throw new BadRequestException({ codigo: '016', mensagem: ret('016').mensagem });
    const s = (v: unknown) => String(v ?? '').trim();
    return {
      p,
      entrada: {
        motivoRequerimento: '5' as const,
        numeroFormularioRenach: s(b?.numeroFormularioRenach).toUpperCase(),
        categoria: s(b?.categoria).toUpperCase(),
        tipoAutorizacao: s(b?.tipoAutorizacao || '1'),
        ddd: s(b?.ddd).replace(/\D/g, ''),
        telefoneCelular: s(b?.telefoneCelular).replace(/\D/g, ''),
        email: s(b?.email),
      },
    };
  }

  private ultimaEmissaoValida(p: Prontuario) {
    return [...p.emissoes].filter((e) => !e.cancelada).sort((a, b) => b.dataEmissao.localeCompare(a.dataEmissao))[0];
  }

  private payload159(p: Prontuario, e: ReturnType<RenachService['entrada159']>['entrada']) {
    const d = p.dadosCadastrais;
    const calc = this.dadosCnhCalculados(p);
    return {
      numeroRegistro: p.numeroRegistro,
      numeroFormularioRenach: e.numeroFormularioRenach,
      motivoRequerimento: '5',
      nomeCondutor: d.nomeCondutorCivil,
      cpf: d.cpf,
      identidade: d.documentoIdentidade,
      nacionalidade: d.nacionalidade,
      categoria: e.categoria,
      dataValidade: calc.dataValidade ?? '',
      dataPrimeiraHabilitacao: d.primeiraHabilitacao,
      dataNascimento: d.dataNascimento,
      nomeMae: d.nomeMae,
      nomePai: d.nomePai ?? '',
      observacoes: (calc.observacoes.length ? calc.observacoes : ['99']).map((o) => o.padEnd(2, ' ')).join(''),
      tipoAutorizacao: e.tipoAutorizacao,
      ddd: e.ddd,
      telefoneCelular: e.telefoneCelular,
      email: e.email,
    };
  }

  private resumo159(p: Prontuario, e: ReturnType<RenachService['entrada159']>['entrada']) {
    const ultima = this.ultimaEmissaoValida(p);
    const ex03 = p.exames.find((x) => x.codigoExame === '03');
    const payload = this.payload159(p, e);
    return {
      condutor: p.dadosCadastrais.nomeCondutorCivil,
      numeroRegistro: p.numeroRegistro,
      numeroFormularioRenach: e.numeroFormularioRenach,
      processoEstadualReferencia: p.processoEstadualReferencia ?? null,
      motivo: { codigo: '5', descricao: MOTIVOS_REQUERIMENTO['5'] },
      categoria: e.categoria || p.dadosControle.categoriaAtual,
      categoriaAtual: p.dadosControle.categoriaAtual,
      situacaoCnh: { codigo: p.dadosControle.situacaoCnh, descricao: SITUACOES_CNH[p.dadosControle.situacaoCnh] },
      dataValidadeCnhAtual: p.dadosControle.dataValidadeCnh,
      dataUltimaEmissao: ultima?.dataEmissao ?? null,
      exame03: ex03 ? {
        dataExame: ex03.dataExame, resultado: ex03.resultado,
        descricaoResultado: RESULTADOS_POR_EXAME['03'][ex03.resultado], dataValidade: ex03.dataValidade,
        procedencia: ex03.procedencia,
      } : null,
      dataValidadeNovaCnh: payload.dataValidade || null,
      observacoesNovaCnh: payload.observacoes,
    };
  }

  private requisitos159(sessao: string, p: Prontuario, e: ReturnType<RenachService['entrada159']>['entrada']): Validacao[] {
    const hoje = hojeIso();
    const dc = p.dadosControle;
    const req: Validacao[] = [];
    const R = (id: string, titulo: string, ok: boolean, okMsg: string, falhaMsg: string, codigo: string, ref: string, extra: Partial<Validacao> = {}) =>
      req.push({ ...regra(id, titulo, ok, okMsg, falhaMsg, { codigo: ret(codigo), referencia: `TR 159 · ${ref} · cód. ${codigo}` }), ...extra });

    req.push({ id: 'M5', titulo: 'Motivo-Requerimento 5 — Renovação de Exames', status: 'ATENDIDO', impeditivo: true,
      detalhe: 'Único motivo executado nesta etapa da POC.', fonte: 'MANUAL', referencia: 'Campos pré-codificados · MOTIVO-REQUERIMENTO' });
    R('R01', 'UF de origem igual à UF de domínio', p.dadosCadastrais.ufDominio === UF_ORIGEM_DEMO,
      `UF de domínio ${p.dadosCadastrais.ufDominio}.`, `UF de domínio é ${p.dadosCadastrais.ufDominio}, diferente da origem ${UF_ORIGEM_DEMO}.`, '011', 'Consistência 3');

    // Situação-CNH
    R('R04', 'Autorização ainda não efetuada', dc.situacaoCnh !== '1', `Situação-CNH ${dc.situacaoCnh} – ${SITUACOES_CNH[dc.situacaoCnh]}.`,
      'Situação-CNH já é 1 – Emissão Autorizada. A repetição não gera nova autorização.', '020', 'Regras do código');
    req.push({ ...regra('R05', 'CNH não está em emissão', !['2', '3'].includes(dc.situacaoCnh), 'Situação-CNH não é 2 nem 3.',
      `Situação-CNH ${dc.situacaoCnh} – ${SITUACOES_CNH[dc.situacaoCnh]}.`, { codigo: ret('017'), fonte: 'INTERPRETACAO_POC', referencia: 'TR 159 · Retornos · cód. 017' }) });

    // Formulário RENACH
    const f = e.numeroFormularioRenach;
    const fmt = /^[A-Z]{2}\d{9}$/.test(f) && !/^[A-Z]{2}0{9}$/.test(f);
    if (!fmt) R('R02', 'Número-Formulário-RENACH', false, '', f.startsWith('HAB') ? 'HAB-... é o processo estadual, não formulário RENACH.' : 'Formulário inválido ou ausente (UF + 9 dígitos).', '802', 'Dicionário de dados', { campos: ['numeroFormularioRenach'] });
    else if (!UFS.includes(f.slice(0, 2))) R('R02', 'Número-Formulário-RENACH', false, '', 'UF do formulário fora da Tabela 01.', '801', 'Dicionário de dados', { campos: ['numeroFormularioRenach'] });
    else if (f.slice(0, 2) !== UF_ORIGEM_DEMO) R('R02', 'Número-Formulário-RENACH', false, '', `UF do formulário diferente da UF de origem (${UF_ORIGEM_DEMO}).`, '804', 'Dicionário de dados', { campos: ['numeroFormularioRenach'] });
    else {
      const usado = p.emissoes.some((m) => m.numeroFormularioRenach === f) || p.autorizacoes.some((a) => a.numeroFormularioRenach === f);
      R('R02', 'Número-Formulário-RENACH inédito', !usado, `Formulário ${f} válido e ainda não usado em emissão.`,
        `Formulário ${f} já foi usado em emissão/autorização anterior.`, '003', 'Retornos', { campos: ['numeroFormularioRenach'] });
    }

    // Categoria
    if (!CATEGORIAS.includes(e.categoria)) R('R03', 'Categoria', false, '', 'Categoria fora da Tabela 03.', '837', 'Retornos', { campos: ['categoria'] });
    else R('R03', 'Categoria igual à da BCA', e.categoria === dc.categoriaAtual, `Categoria ${e.categoria} = Categoria-Atual.`,
      `No Motivo 5 isolado a emissão é na Categoria-Atual (${dc.categoriaAtual}).`, '982', 'Observação 5', { campos: ['categoria'] });

    // Bloqueio e cadastro
    const bloqueios = p.bloqueios.filter((b) => b.tipoEvento === 'B');
    R('R06', 'Sem bloqueio no prontuário', bloqueios.length === 0, 'Nenhum bloqueio não liberado.',
      `Bloqueio ${bloqueios.map((b) => `${b.motivoBloqueio} (${b.ufDetranBloqueio}, ${br(b.dataBloqueio)})`).join(', ')} não liberado.`, '018', 'Consistência IV');
    const d = p.dadosCadastrais;
    R('R07', 'Endereço no prontuário', !!(d.enderecoLogradouro && d.enderecoMunicipio && d.enderecoUf && d.enderecoCep), 'Endereço registrado.',
      'Endereço ausente no prontuário (incluir pela 157).', '373', 'Observação 7');

    // Exame 03
    const ultima = this.ultimaEmissaoValida(p);
    const ex03 = p.exames.find((x) => x.codigoExame === '03');
    const problemas: string[] = [];
    if (!ex03) problemas.push('não há Exame 03 no prontuário');
    else {
      if (!resultadoApto('03', ex03.resultado)) problemas.push(`resultado ${ex03.resultado} – ${RESULTADOS_POR_EXAME['03'][ex03.resultado]}`);
      if (!ex03.dataValidade || ex03.dataValidade <= hoje) problemas.push(`validade ${br(ex03.dataValidade)} não é superior à data corrente`);
      if (ultima && ex03.dataExame <= ultima.dataEmissao) problemas.push(`Data-Exame ${br(ex03.dataExame)} não é posterior à última emissão (${br(ultima.dataEmissao)})`);
    }
    R('R08', 'Exame 03 vigente, apto e posterior à última emissão', problemas.length === 0,
      `Exame 03 de ${br(ex03?.dataExame)}, ${RESULTADOS_POR_EXAME['03'][ex03?.resultado ?? '']}, válido até ${br(ex03?.dataValidade)}; última emissão ${br(ultima?.dataEmissao)}.`,
      `Exame 03: ${problemas.join('; ')}. Registre o novo exame pela TR 181 (Substituição).`, '330', 'Consistência V.3');

    // Demais exames inaptos (Consistência 11)
    const outrosInaptos = p.exames.filter((x) => x.codigoExame !== '03' && !resultadoApto(x.codigoExame, x.resultado));
    req.push(outrosInaptos.length
      ? { id: 'R09', titulo: 'Nenhum outro exame inapto', status: 'NAO_ATENDIDO', impeditivo: true, fonte: 'MANUAL',
        detalhe: `Exame(s) ${outrosInaptos.map((x) => x.codigoExame).join(', ')} com resultado inapto. O Manual não indica código específico.`,
        referencia: 'TR 159 · Observação 11', codigoRetorno: retPoc('159-01', 'Exame com resultado inapto no prontuário (código oficial não identificado).') }
      : { id: 'R09', titulo: 'Nenhum outro exame inapto', status: 'ATENDIDO', impeditivo: true, fonte: 'MANUAL',
        detalhe: 'Não há exame com resultado Inapto ou Inapto Temporário.', referencia: 'TR 159 · Observação 11' });

    // Atualização: 1ª habilitação antes de 21/01/1998 (212) e CNH vencida há mais de 5 anos (372)
    const atualizacaoApos = (aposData?: string) =>
      p.cursos.find((c) => c.codigoCurso === '30' && (!aposData || c.dataFimCurso > aposData)) ??
      p.exames.find((x) => x.codigoExame === '06' && x.resultado === '1' && (!aposData || x.dataExame > aposData));
    if (d.primeiraHabilitacao < '1998-01-21') {
      const at = atualizacaoApos();
      R('R10', 'Atualização para 1ª habilitação anterior a 21/01/1998', !!at,
        `Primeira habilitação ${br(d.primeiraHabilitacao)}; atualização registrada (${at && 'codigoCurso' in at ? 'Curso 30' : 'Exame 06'}).`,
        `Primeira habilitação ${br(d.primeiraHabilitacao)} exige Curso 30 ou Exame 06 com resultado Apto.`, '212', 'Regras do código');
    } else {
      req.push({ id: 'R10', titulo: 'Atualização para 1ª habilitação anterior a 21/01/1998', status: 'NAO_APLICAVEL', impeditivo: false,
        detalhe: `Primeira habilitação ${br(d.primeiraHabilitacao)}.`, fonte: 'MANUAL', referencia: 'TR 159 · Regras do código · cód. 212' });
    }
    const limite5 = somarAnos(dc.dataValidadeCnh, 5);
    if (limite5 < hoje) {
      const at = atualizacaoApos(ultima?.dataEmissao);
      req.push({ ...regra('R11', 'CNH vencida há mais de 5 anos: Curso 30 ou Exame 06', !!at,
        `CNH vencida desde ${br(dc.dataValidadeCnh)}; atualização após a última emissão encontrada.`,
        `CNH vencida desde ${br(dc.dataValidadeCnh)} (mais de 5 anos). Não há Curso 30 nem Exame 06 apto após a última emissão (${br(ultima?.dataEmissao)}).`,
        { codigo: ret('372'), referencia: 'TR 159 · Observação 5 e quadro Curso x Motivo · cód. 372', fonte: 'MANUAL' }) });
    } else {
      req.push({ id: 'R11', titulo: 'CNH vencida há mais de 5 anos', status: 'NAO_APLICAVEL', impeditivo: false, fonte: 'MANUAL',
        detalhe: `Validade da CNH: ${br(dc.dataValidadeCnh)}. Vencimento superior a 5 anos não ocorre.`, referencia: 'TR 159 · cód. 372' });
    }

    // Exame 04 – opcional no Motivo 5 (quadro Exame x Motivo)
    const ex04 = p.exames.find((x) => x.codigoExame === '04');
    req.push({ id: 'R12', titulo: 'Exame 04 – Avaliação Psicológica', status: 'NAO_APLICAVEL', impeditivo: false, fonte: 'MANUAL',
      referencia: 'TR 159 · quadro Exame x Motivo',
      detalhe: `No Motivo 5 o Exame 04 é opcional (P). ${ex04?.dataValidade ? `Há validade no Exame 04 (${br(ex04.dataValidade)}): a validade da CNH será a menor entre 03 e 04.` : 'Sem validade no Exame 04; não interfere na validade da CNH.'}` });

    // Toxicológico
    const cde = /[CDE]$/.test(e.categoria || dc.categoriaAtual);
    if (cde) {
      const t = p.toxicologico;
      let codigo: string | null = null;
      let msg = '';
      if (!t.dataColeta) { codigo = '668'; msg = 'Não há exame toxicológico registrado.'; }
      else if (t.situacao === '2') { codigo = '686'; msg = 'Exame toxicológico com pendência.'; }
      else if (!t.dataValidade || t.dataValidade < hoje) { codigo = '666'; msg = `Laudo vencido (coleta ${br(t.dataColeta)}, válido 90 dias até ${br(t.dataValidade)}).`; }
      else if (hoje < t.dataColeta) { codigo = '669'; msg = 'Data da 159 menor que a data do exame toxicológico.'; }
      req.push({ ...regra('R13', 'Exame toxicológico (categorias C, D, E)', !codigo,
        `Coleta ${br(t.dataColeta)}, laudo válido para consumo até ${br(t.dataValidade)}.`, msg,
        { codigo: codigo ? ret(codigo) : undefined, fonte: 'MANUAL', referencia: `TR 159 · Regras dos códigos 666/668/686` }) });
    } else {
      req.push({ id: 'R13', titulo: 'Exame toxicológico (categorias C, D, E)', status: 'NAO_APLICAVEL', impeditivo: false, fonte: 'INTERPRETACAO_POC',
        detalhe: `Categoria ${e.categoria || dc.categoriaAtual}: toxicológico não exigido.`, referencia: 'CTB art. 148-A' });
    }

    // Tipo de Autorização e contato
    const tipoOk = ['1', '2'].includes(e.tipoAutorizacao);
    R('R14', 'Tipo de Autorização', tipoOk, e.tipoAutorizacao === '2' ? '2 – Impressa e Digital.' : '1 – Impressa.', 'Tipo de Autorização deve ser 1 ou 2.', '660', 'Observação 10', { campos: ['tipoAutorizacao'] });
    if (tipoOk && e.tipoAutorizacao === '2') {
      R('R15', 'DDD', /^[1-9][1-9]$/.test(e.ddd), `DDD ${e.ddd}.`, 'DDD inválido ou ausente (obrigatório para autorização digital).', '701', 'Observação 11', { campos: ['ddd'] });
      R('R16', 'Telefone celular', /^9\d{8}$/.test(e.telefoneCelular), 'Celular válido.', 'Celular inválido ou ausente (9 dígitos, iniciando por 9).', '702', 'Observação 11', { campos: ['telefoneCelular'] });
      R('R17', 'E-mail', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.email), 'E-mail válido.', 'E-mail inválido ou ausente.', '644', 'Observação 11', { campos: ['email'] });
    }

    // Data-Validade da nova CNH
    const calc = this.dadosCnhCalculados(p);
    R('R18', 'Data-Validade da nova CNH', !!calc.dataValidade && dataValida(calc.dataValidade), `Validade da nova CNH: ${br(calc.dataValidade)} (menor validade entre Exames 03 e 04).`,
      'Não foi possível definir a Data-Validade a partir dos exames.', '838', 'quadro Exame x Motivo, obs. 5');

    // Não verificáveis
    if (/[DE]$/.test(e.categoria || dc.categoriaAtual)) {
      req.push({ id: 'R19', titulo: 'Mais de uma infração gravíssima nos últimos 12 meses (D/E)', status: 'NAO_VERIFICAVEL', impeditivo: false, fonte: 'LACUNA',
        detalhe: 'Exigido pela observação 1 da 159 para categorias D e E. Infrações pertencem ao domínio RENAINF, que esta POC não integra.', referencia: 'TR 159 · Observação 1' });
    }
    req.push({ id: 'R20', titulo: 'Indícios de impedimento/duplicidade na BINCO', status: 'NAO_VERIFICAVEL', impeditivo: false, fonte: 'LACUNA',
      detalhe: 'Verificação feita pela BCA (códigos 076, 077, 935–968). Não há base de impedimentos na massa.', referencia: 'TR 159 · Consistência III' });
    req.push({ id: 'R21', titulo: 'Imagens do condutor (foto, assinatura, digitais)', status: 'NAO_VERIFICAVEL', impeditivo: false, fonte: 'LACUNA',
      detalhe: 'Coleta biométrica fora do escopo (códigos 161–166).', referencia: 'TR 159 · Retornos 161–166' });
    void sessao;
    return req;
  }

  // ================================================================ comuns
  /** Visão do prontuário no formato do Retorno 2 da 575, com descrições para a tela. */
  private visao(p: Prontuario) {
    const v = clone(p);
    const ex = v.exames
      .map((x) => ({
        ...x,
        descricaoExame: EXAMES[x.codigoExame],
        descricaoResultado: RESULTADOS_POR_EXAME[x.codigoExame]?.[x.resultado] ?? x.resultado,
        observacoes: x.observacoes.map((o) => o.trim()),
      }))
      .sort((a, b) => a.dataExame.localeCompare(b.dataExame));
    return {
      ...v,
      exames: ex,
      cursos: v.cursos.map((c) => ({ ...c, descricaoCurso: CURSOS[c.codigoCurso] ?? c.codigoCurso })),
      descricoes: {
        situacaoCnh: SITUACOES_CNH[v.dadosControle.situacaoCnh],
        situacaoCnhAnterior: SITUACOES_CNH[v.dadosControle.situacaoCnhAnterior],
        motivoRequerimento: v.dadosControle.motivoRequerimento ? MOTIVOS_REQUERIMENTO[v.dadosControle.motivoRequerimento] : null,
      },
    };
  }
}
