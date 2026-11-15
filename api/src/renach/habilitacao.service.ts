import { BadRequestException, Injectable } from '@nestjs/common';
import { DemoStoreService } from '../demo/demo-store.service';
import {
  CATEGORIAS, CATEGORIAS_CANDIDATO, CURSOS, CURSOS_COM_MODALIDADE, ENTIDADES, MODALIDADES_CURSO, MOTIVOS_REQUERIMENTO, MUNICIPIOS,
  NACIONALIDADES, OBS_NAO_IMPRESSAS, PROFISSIONAIS, RESULTADOS_POR_EXAME, TIPOS_DOCUMENTO_IDENTIDADE, UFS, UF_ORIGEM_DEMO,
  cnpjValido, digitosCpfValidos, eventoCompativel, nivelCategoria, resultadoApto, ret, retPoc, temDuasRodas,
} from '../domain/catalogos';
import { br, dataValida, hojeIso, idadeEm, somarAnos, somarDias } from '../domain/datas';
import { LEIAUTE_151, LEIAUTE_155, LEIAUTE_181_CURSO } from '../domain/leiautes';
import { EventoCurso, Prontuario, Retorno, SITUACOES_CNH, Validacao } from '../domain/tipos';
import { AVISO_TRANSMISSAO, ORIGEM_DESTINO, clone, primeiraFalha, regra } from './comum';
import { RenachService } from './renach.service';

/**
 * Jornada de PRIMEIRA HABILITAÇÃO (Motivo-Requerimento 1), conforme o Manual RENACH v8.2:
 *   TR 151 – Cadastrar Candidato → TR 181 – Eventos C (Curso) e E (Exame) com Tipo-Chave 1
 *   (Número-Formulário-RENACH) → TR 155 – Habilitar Candidato.
 * O Evento E do candidato é tratado em RenachService.registrar181; aqui ficam a 151, o Evento C e a 155.
 * O Número-Registro só é atribuído na emissão (TR 171, gráfica), fora do escopo: o candidato habilitado
 * continua identificado pelo formulário, com Situação-CNH 1 – Emissão Autorizada.
 */

const NOME = /^[A-Z]+( [A-Z]+)+$/; // letras e espaços simples, ao menos dois nomes
const semAcento = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '');
const nome = (v: unknown) => semAcento(String(v ?? '')).toUpperCase().replace(/\s+/g, ' ').trim();
const txt = (v: unknown) => String(v ?? '').trim();
const dig = (v: unknown) => String(v ?? '').replace(/\D/g, '');

/** A categoria `cat` cabe na categoria `limite` (parte 2 rodas e nível 4 rodas). */
function cabe(cat: string, limite: string): boolean {
  const quatro = (c: string) => (/[BCDE]/.test(c) ? nivelCategoria(c) : -1);
  return (!temDuasRodas(cat) || temDuasRodas(limite)) && quatro(cat) <= quatro(limite);
}

@Injectable()
export class HabilitacaoService {
  constructor(private readonly store: DemoStoreService, private readonly renach: RenachService) {}

  // ================================================================ TR 151
  cadastrar151(sessao: string, b: Record<string, any>) {
    const e = this.normalizar151(b ?? {});
    const lista = this.store.obter(sessao).prontuarios;
    const val = this.validar151(e, lista);
    const falha = primeiraFalha(val);
    const diag = {
      transacao: { codigo: '151', nome: 'Cadastrar Candidato' },
      origemDestino: ORIGEM_DESTINO,
      chave: { tipo: 'Número-Formulário-RENACH', valor: e.numeroFormularioRenach },
      condicionalidade: 'Condicionalidade 0. Os retornos "Confirme" (300, 920–968) exigiriam reenvio com Condicionalidade 1, que a POC não oferece.',
      leiauteEnvio: LEIAUTE_151,
      payload: { ...e, documentoIdentidade: this.documento(e) },
      validacoes: val,
      estadoAnterior: null,
      transmissao: AVISO_TRANSMISSAO,
      interpretacoes: [
        'Nome: letras sem acento e espaços simples, com ao menos nome e sobrenome (formato A do Manual; a regra exata de caracteres não está transcrita).',
        'Endereço-UF diferente da UF de origem (Consistência IV) não tem código próprio na tabela da 151: a POC usa o código local POC-151-02.',
        'Nacionalidade 3 – Estrangeiro (RNE, habilitação estrangeira) e PGU estão fora do escopo: POC-151-01.',
      ],
      lacunas: [
        'Indícios de duplo cadastramento e de impedimento por semelhança (920–968) e Lista de Impedimento (077): não simulados.',
        'Bases de Óbitos e da Receita Federal (309, 310, 313): marcadas no próprio Manual como "não implementado".',
        'Municípios: códigos da massa demonstrativa (o Manual remete à tabela da Receita Federal).',
      ],
    };
    if (falha) {
      return {
        aceito: false, retorno: falha.codigoRetorno!, validacoes: val, prontuario: null,
        camposComErro: [...new Set(val.filter((v) => v.status === 'NAO_ATENDIDO').flatMap((v) => v.campos ?? []))],
        diagnostico: { ...diag, retorno: falha.codigoRetorno, estadoPosterior: null, mutacao: 'Nenhuma — transação rejeitada.' },
      };
    }
    const mun = MUNICIPIOS[e.enderecoMunicipio];
    const nasc = MUNICIPIOS[e.localidadeNascimento];
    const p: Prontuario = {
      natureza: '1',
      numeroRegistro: null,
      formularioRenachEmAndamento: e.numeroFormularioRenach,
      dadosCadastrais: {
        nomeCondutorCivil: e.nomeCandidatoCivil,
        nomeSocial: e.nomeSocial || null,
        filiacaoAfetiva1: e.filiacaoAfetiva1 || null,
        filiacaoAfetiva2: e.filiacaoAfetiva2 || null,
        dataNascimento: e.dataNascimento,
        sexo: e.sexo as '1' | '2',
        nomeMae: e.nomeMae,
        nomePai: e.nomePai || null,
        tipoDocumentoIdentidade: e.docTipo,
        documentoIdentidade: `${e.docNumero} ${e.docOrgao} ${e.docUf}`,
        cpf: e.cpf,
        localidadeNascimento: e.localidadeNascimento,
        localidadeNascimentoDescricao: `${nasc.nome}/${nasc.uf}`,
        enderecoLogradouro: e.enderecoLogradouro,
        enderecoNumero: e.enderecoNumero,
        enderecoComplemento: e.enderecoComplemento || null,
        enderecoBairro: e.enderecoBairro,
        enderecoCep: e.enderecoCep,
        enderecoMunicipio: e.enderecoMunicipio,
        enderecoMunicipioDescricao: mun.nome,
        enderecoUf: e.enderecoUf,
        nacionalidade: e.nacionalidade as '1',
        dataCadastramento: e.dataCadastramento,
        primeiraHabilitacao: null,
        ufDominio: UF_ORIGEM_DEMO,
        ddd: e.ddd || null,
        telefoneCelular: e.telefoneCelular || null,
        email: e.email || null,
      },
      dadosControle: {
        situacaoCnh: '0', situacaoCnhAnterior: '0', motivoRequerimento: null, permissionario: '0',
        codigoTransacaoUltimaAtualizacao: '151', numeroFormularioRenach: e.numeroFormularioRenach, numeroFormularioCnh: '',
        cancelamento: '0', categoriaAtual: '', categoriaRebaixada: null, categoriaAutorizada: null, dataValidadeCnh: null,
        observacaoCnh: [], dataUltimaEmissaoHistorico: null, datasInicioCategoria: {},
      },
      toxicologico: { dataColeta: null, dataValidade: null, situacao: null, cnpjLaboratorio: null, numeroLaudo: null, prazoRealizacao: null },
      exames: [], cursos: [], bloqueios: [], ocorrencias: [], emissoes: [], autorizacoes: [],
      hicom: [{ id: this.store.proximoId(sessao, 'SIM151'), transacao: '151', data: hojeIso(), descricao: 'Cadastrar Candidato (simulação local).' }],
    };
    lista.push(p);
    return {
      aceito: true, retorno: ret('000'), validacoes: val, camposComErro: [], prontuario: this.renach.visao(p),
      diagnostico: {
        ...diag, retorno: ret('000'), estadoPosterior: { natureza: '1 – Candidato', situacaoCnh: '0 – Inexistente', numeroFormularioRenach: e.numeroFormularioRenach },
        mutacao: `Candidato incluído na base em memória desta sessão. Situação-CNH 0 – Inexistente (Retorno 151, obs. 1). Sem Número-Registro até a emissão.`,
      },
    };
  }

  private documento(e: ReturnType<HabilitacaoService['normalizar151']>) {
    return `${e.docTipo}${e.docNumero.padEnd(15)}${e.docOrgao.padEnd(10)}${e.docUf.padEnd(2)}`;
  }

  private normalizar151(b: Record<string, any>) {
    return {
      numeroFormularioRenach: txt(b.numeroFormularioRenach).toUpperCase(),
      nomeCandidatoCivil: nome(b.nomeCandidatoCivil),
      dataNascimento: txt(b.dataNascimento),
      sexo: txt(b.sexo),
      nomeMae: nome(b.nomeMae),
      nomePai: nome(b.nomePai),
      docTipo: txt(b.docTipo),
      docNumero: txt(b.docNumero).toUpperCase(),
      docOrgao: nome(b.docOrgao),
      docUf: txt(b.docUf).toUpperCase(),
      cpf: dig(b.cpf),
      localidadeNascimento: txt(b.localidadeNascimento),
      enderecoLogradouro: nome(b.enderecoLogradouro),
      enderecoNumero: txt(b.enderecoNumero).toUpperCase(),
      enderecoComplemento: nome(b.enderecoComplemento),
      enderecoBairro: nome(b.enderecoBairro),
      enderecoCep: dig(b.enderecoCep),
      enderecoMunicipio: txt(b.enderecoMunicipio),
      enderecoUf: txt(b.enderecoUf).toUpperCase(),
      nacionalidade: txt(b.nacionalidade),
      dataCadastramento: txt(b.dataCadastramento),
      ddd: dig(b.ddd),
      telefoneCelular: dig(b.telefoneCelular),
      email: txt(b.email),
      nomeSocial: nome(b.nomeSocial),
      filiacaoAfetiva1: nome(b.filiacaoAfetiva1),
      filiacaoAfetiva2: nome(b.filiacaoAfetiva2),
    };
  }

  private validar151(e: ReturnType<HabilitacaoService['normalizar151']>, lista: Prontuario[]): Validacao[] {
    const v: Validacao[] = [];
    const hoje = hojeIso();
    const R = (id: string, titulo: string, ok: boolean, okMsg: string, falhaMsg: string, codigo: Retorno, campos: string[], extra: Partial<Validacao> = {}) =>
      v.push({ ...regra(id, titulo, ok, okMsg, falhaMsg, { codigo, campos, referencia: `TR 151 · cód. ${codigo.codigo}` }), ...extra });

    // Número-Formulário-RENACH (dicionário de dados e Consistência VIII)
    const f = e.numeroFormularioRenach;
    if (!/^[A-Z]{2}\d{9}$/.test(f) || /^[A-Z]{2}0{9}$/.test(f)) {
      R('F01', 'Número-Formulário-RENACH', false, '', f.startsWith('HAB') ? 'HAB-... é o processo estadual, não formulário RENACH.' : 'Formato: UF (2) + 9 dígitos, diferente de zeros.', ret('802'), ['numeroFormularioRenach']);
    } else if (!UFS.includes(f.slice(0, 2))) {
      R('F01', 'Número-Formulário-RENACH', false, '', 'UF do formulário fora da Tabela 01.', ret('801'), ['numeroFormularioRenach']);
    } else if (f.slice(0, 2) !== UF_ORIGEM_DEMO) {
      R('F01', 'Número-Formulário-RENACH', false, '', `UF do formulário diferente da UF de origem (${UF_ORIGEM_DEMO}).`, ret('804'), ['numeroFormularioRenach']);
    } else {
      const usado = lista.some((x) => x.formularioRenachEmAndamento === f || x.dadosControle.numeroFormularioRenach === f || x.emissoes.some((m) => m.numeroFormularioRenach === f));
      R('F01', 'Número-Formulário-RENACH inédito na BINCO', !usado, `Formulário ${f} válido e inexistente na base.`, `Formulário ${f} já existe na base.`, ret('003'), ['numeroFormularioRenach'],
        { referencia: 'TR 151 · Consistência VIII · cód. 003' });
    }

    // Identificação
    R('D01', 'Nome-Candidato-Civil', NOME.test(e.nomeCandidatoCivil) && e.nomeCandidatoCivil.length <= 44, e.nomeCandidatoCivil,
      'Nome civil inválido ou ausente (nome e sobrenome, só letras, até 44 posições).', ret('805'), ['nomeCandidatoCivil']);
    const nascOk = dataValida(e.dataNascimento) && e.dataNascimento <= hoje;
    R('D02', 'Data-Nascimento', nascOk, br(e.dataNascimento), 'Data de nascimento inválida, ausente ou futura.', ret('809'), ['dataNascimento']);
    if (nascOk) {
      const idade = idadeEm(e.dataNascimento, hoje);
      R('D03', 'Idade mínima de 18 anos', idade >= 18, `${idade} anos.`, `Candidato com ${idade} anos.`, ret('311'), ['dataNascimento'], { referencia: 'TR 151 · Consistência XIII · cód. 311' });
    }
    R('D04', 'Sexo', ['1', '2'].includes(e.sexo), e.sexo === '1' ? '1 – Masculino.' : '2 – Feminino.', 'Sexo inválido ou ausente (1 ou 2).', ret('812'), ['sexo']);
    if (!e.nomeMae) {
      R('D05', 'Nome-Mãe', false, '', 'Nome da mãe em branco. No Manual o envio exige confirmação com Condicionalidade 1, que a POC não oferece.', ret('300'), ['nomeMae']);
    } else {
      R('D05', 'Nome-Mãe', NOME.test(e.nomeMae) && e.nomeMae.length <= 44, e.nomeMae, 'Nome da mãe inválido.', ret('814'), ['nomeMae']);
    }
    R('D06', 'Nome-Pai', !e.nomePai || (NOME.test(e.nomePai) && e.nomePai.length <= 44), e.nomePai || 'Não informado (opcional).',
      'Nome do pai inválido (mesmas críticas do nome da mãe).', ret('301'), ['nomePai'], { referencia: 'TR 151 · Consistência I · cód. 301' });
    R('D07', 'Tipo do Documento-Identidade', !!TIPOS_DOCUMENTO_IDENTIDADE[e.docTipo], `${e.docTipo} – ${TIPOS_DOCUMENTO_IDENTIDADE[e.docTipo]}.`,
      'Tipo do documento fora da tabela (1 a 4).', ret('818'), ['docTipo']);
    R('D08', 'Número, órgão e UF do documento', /^[A-Z0-9]{4,15}$/.test(e.docNumero) && /^[A-Z ]{2,10}$/.test(e.docOrgao) && UFS.includes(e.docUf),
      `${e.docNumero} ${e.docOrgao}/${e.docUf}.`, 'Número (4 a 15 letras/dígitos), órgão emissor (até 10) e UF do documento são obrigatórios.', ret('819'), ['docNumero', 'docOrgao', 'docUf']);
    const cpfOk = digitosCpfValidos(e.cpf);
    R('D09', 'CPF', cpfOk, 'CPF com dígitos verificadores corretos.', 'CPF inválido ou ausente.', ret('830'), ['cpf']);
    if (cpfOk) {
      const dono = lista.find((x) => x.dadosCadastrais.cpf === e.cpf);
      R('D10', 'CPF inexistente na BCA', !dono, 'CPF não pertence a outro candidato ou condutor.', 'O CPF já pertence a candidato ou condutor da base.',
        ret('761'), ['cpf'], { referencia: 'TR 151 · Consistência XI e obs. 4 · cód. 761' });
    }
    R('D11', 'Localidade-Nascimento', !!MUNICIPIOS[e.localidadeNascimento], `${e.localidadeNascimento} – ${MUNICIPIOS[e.localidadeNascimento]?.nome}.`,
      'Município de nascimento fora da tabela (massa demonstrativa) ou ausente.', ret('832'), ['localidadeNascimento']);
    if (!NACIONALIDADES[e.nacionalidade]) {
      R('D12', 'Nacionalidade', false, '', 'Nacionalidade fora da tabela ou ausente.', ret('835'), ['nacionalidade']);
    } else if (e.nacionalidade === '3') {
      v.push(regra('D12', 'Nacionalidade', false, '', 'Estrangeiro exige RNE e dados de habilitação estrangeira (retornos 080–087), fora do escopo desta POC.',
        { codigo: retPoc('151-01', 'Nacionalidade 3 – Estrangeiro fora do escopo da POC.'), campos: ['nacionalidade'], fonte: 'INTERPRETACAO_POC' }));
    } else {
      R('D12', 'Nacionalidade', true, `${e.nacionalidade} – ${NACIONALIDADES[e.nacionalidade]}.`, '', ret('835'), ['nacionalidade']);
    }

    // Endereço (Consistências II, III e IV)
    const dois = (x: string) => x.length >= 2 && !/^\s/.test(x);
    R('E01', 'Endereço-Logradouro', dois(e.enderecoLogradouro) && e.enderecoLogradouro.length <= 50, e.enderecoLogradouro, 'Logradouro inválido ou ausente (mínimo 2 posições).', ret('302'), ['enderecoLogradouro']);
    R('E02', 'Endereço-Bairro', dois(e.enderecoBairro) && e.enderecoBairro.length <= 30, e.enderecoBairro, 'Bairro inválido ou ausente (mínimo 2 posições).', ret('304'), ['enderecoBairro']);
    R('E03', 'Endereço-CEP', /^\d{8}$/.test(e.enderecoCep) && !/^0{8}$/.test(e.enderecoCep), 'CEP com 8 dígitos.', 'CEP inválido ou ausente.', ret('305'), ['enderecoCep']);
    const mun = MUNICIPIOS[e.enderecoMunicipio];
    R('E04', 'Endereço-Município', !!mun, `${mun?.nome}.`, 'Município fora da tabela (massa demonstrativa) ou ausente.', ret('306'), ['enderecoMunicipio']);
    const ufOk = UFS.includes(e.enderecoUf);
    R('E05', 'Endereço-UF', ufOk, `${e.enderecoUf}.`, 'UF fora da tabela ou ausente.', ret('307'), ['enderecoUf']);
    if (mun && ufOk) R('E06', 'Município pertence à UF', mun.uf === e.enderecoUf, 'Município pertence à UF informada.', `${mun.nome} não pertence a ${e.enderecoUf}.`, ret('308'), ['enderecoMunicipio', 'enderecoUf']);
    if (ufOk) {
      v.push(regra('E07', 'Endereço-UF igual à UF de origem', e.enderecoUf === UF_ORIGEM_DEMO, `UF ${e.enderecoUf} = UF de origem.`,
        `O endereço deve estar na UF de origem da transação (${UF_ORIGEM_DEMO}).`,
        { codigo: retPoc('151-02', 'Endereço-UF diferente da UF de origem da transação (Consistência IV, sem código próprio no Manual).'), campos: ['enderecoUf'], referencia: 'TR 151 · Consistência IV' }));
    }
    R('C01', 'Data-Cadastramento', dataValida(e.dataCadastramento) && e.dataCadastramento <= hoje, br(e.dataCadastramento),
      'Data de cadastramento inválida, ausente ou maior que a data atual.', ret('810'), ['dataCadastramento'], { referencia: 'TR 151 · Consistência VII · cód. 810' });

    // Contato e nome social (opcionais)
    if (e.ddd || e.telefoneCelular) {
      R('T01', 'DDD', /^[1-9][1-9]$/.test(e.ddd), `DDD ${e.ddd}.`, 'DDD inválido.', ret('701'), ['ddd']);
      R('T02', 'Telefone-Celular', /^9\d{8}$/.test(e.telefoneCelular), 'Celular válido.', 'Celular inválido (9 dígitos, iniciando por 9).', ret('702'), ['telefoneCelular']);
    }
    if (e.email) R('T03', 'E-mail', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.email) && e.email.length <= 60, 'E-mail válido.', 'E-mail inválido.', ret('644'), ['email']);
    if (e.nomeSocial) R('S01', 'Nome-Social', NOME.test(e.nomeSocial) && e.nomeSocial.length <= 44, e.nomeSocial, 'Nome social inválido (mesmas críticas do nome).', ret('971'), ['nomeSocial']);
    for (const k of ['filiacaoAfetiva1', 'filiacaoAfetiva2'] as const) {
      if (e[k]) R(`S0${k.slice(-1) === '1' ? 2 : 3}`, k === 'filiacaoAfetiva1' ? 'Filiação-Afetiva-1' : 'Filiação-Afetiva-2', NOME.test(e[k]) && e[k].length <= 44, e[k],
        'Filiação afetiva inválida (mesmas críticas do nome).', ret('972'), [k]);
    }

    // Colisão de dados identificatórios (Consistências IX e X)
    const docNovo = `${e.docNumero} ${e.docOrgao} ${e.docUf}`;
    const colisao = lista.find((x) => x.dadosCadastrais.nomeCondutorCivil === e.nomeCandidatoCivil && x.dadosCadastrais.documentoIdentidade === docNovo);
    R('X01', 'Nome e Documento-Identidade sem colisão', !colisao, 'Nenhum outro indivíduo com o mesmo nome e documento.', 'Já existe indivíduo com o mesmo nome e documento de identidade.',
      ret('004'), ['nomeCandidatoCivil', 'docNumero'], { referencia: 'TR 151 · Consistência IX · cód. 004' });
    const duplo = lista.find((x) => x.dadosCadastrais.nomeCondutorCivil === e.nomeCandidatoCivil && x.dadosCadastrais.dataNascimento === e.dataNascimento &&
      x.dadosCadastrais.nomeMae === e.nomeMae);
    R('X02', 'Nome, nascimento e mãe sem duplicidade', !duplo, 'Sem duplicidade por nome, data de nascimento e nome da mãe.',
      'Já existe cadastro com o mesmo nome, data de nascimento e nome da mãe.', ret('073'), ['nomeCandidatoCivil', 'dataNascimento', 'nomeMae'], { referencia: 'TR 151 · Consistência X · cód. 073' });
    v.push({ id: 'X03', titulo: 'Indícios de duplo cadastramento e de impedimento (semelhança)', status: 'NAO_VERIFICAVEL', impeditivo: false, fonte: 'LACUNA',
      detalhe: 'A BCA compara nomes, documentos e datas "iguais ou parecidos" (920–968) e a Lista de Impedimento (077). A massa não tem essa base.', referencia: 'TR 151 · Consistência X' });
    v.push({ id: 'X04', titulo: 'CPF nas bases de Óbitos e da Receita Federal', status: 'NAO_APLICAVEL', impeditivo: false, fonte: 'MANUAL',
      detalhe: 'O próprio Manual marca essas validações como "ainda não implementado" (309, 310, 313).', referencia: 'TR 151 · Consistências XI e XII' });
    return v;
  }

  // ================================================================ TR 181 · Evento C (Curso)
  registrarCurso181(sessao: string, b: Record<string, any>) {
    const e = this.normalizarCurso(b ?? {});
    const lista = this.store.obter(sessao).prontuarios;
    const p = e.tipoChave === '1' ? lista.find((x) => x.natureza === '1' && x.formularioRenachEmAndamento === e.numero)
      : e.tipoChave === '2' ? lista.find((x) => x.natureza === '2' && x.numeroRegistro === e.numero) : undefined;
    const val = this.validarCurso(e, p, lista);
    const falha = primeiraFalha(val);
    const antes = p ? clone(p.cursos.find((x) => x.codigoCurso === e.codigoCurso) ?? null) : null;
    const diag = {
      transacao: { codigo: '181', nome: 'Eventos — Tipo-Evento C (Curso)' },
      origemDestino: ORIGEM_DESTINO,
      chave: { tipo: e.tipoChave === '1' ? 'Tipo-Chave 1 – Número-Formulário-RENACH' : `Tipo-Chave ${e.tipoChave}`, valor: e.numero },
      numero: { tipo: 'Tipo-Atualização', valor: e.tipoAtualizacao === 'I' ? 'I – Inclusão' : e.tipoAtualizacao === 'S' ? 'S – Substituição' : e.tipoAtualizacao },
      condicionalidade: 'Modalidade só nos cursos da obs. 1; Carga-Horária obrigatória fora do Curso 30; Categoria obrigatória nos cursos 32 e 33.',
      leiauteEnvio: LEIAUTE_181_CURSO,
      payload: e,
      validacoes: val,
      estadoAnterior: { curso: antes },
      transmissao: AVISO_TRANSMISSAO,
      interpretacoes: [
        'Data-Início e Data-Fim são exigidas nos cursos 31 a 34 (obs. 8: "obrigatória quando for exigido novo curso", caso da primeira habilitação).',
        'Observações-Curso: a POC aceita só 99 – Sem Observação (o Manual não transcreve a tabela para cursos de formação).',
        'Curso 32 para candidato: categoria B (Consistência III.1 limita o candidato a A, B, AB, X e XB).',
      ],
    };
    if (falha || !p) {
      const retorno = falha?.codigoRetorno ?? ret(e.tipoChave === '1' ? '006' : '016');
      return {
        aceito: false, retorno, validacoes: val, evento: null,
        camposComErro: [...new Set(val.filter((v) => v.status === 'NAO_ATENDIDO').flatMap((v) => v.campos ?? []))],
        diagnostico: { ...diag, retorno, estadoPosterior: { curso: antes }, mutacao: 'Nenhuma — transação rejeitada.' },
      };
    }
    const curso: EventoCurso = {
      tipoEvento: 'C', codigoCurso: e.codigoCurso, modalidade: e.modalidade || null, numeroCertificado: e.numeroCertificado || null,
      dataInicioCurso: e.dataInicioCurso, dataFimCurso: e.dataFimCurso, cargaHoraria: e.cargaHoraria || null,
      cnpjEntidadeCredenciada: e.cnpjEntidadeCredenciada, cpfInstrutor: e.cpfInstrutor || null, municipioCurso: e.municipioCurso, ufCurso: e.ufCurso,
      dataValidade: e.dataValidade || null, categoria: e.categoria, observacoesCurso: e.observacoesCurso,
      procedencia: 'SIMULACAO_TR181', registradoEm: new Date().toISOString(),
    };
    const idx = p.cursos.findIndex((x) => x.codigoCurso === e.codigoCurso);
    if (idx >= 0) p.cursos[idx] = curso;
    else p.cursos.push(curso);
    p.dadosControle.codigoTransacaoUltimaAtualizacao = '181';
    p.hicom.push({
      id: this.store.proximoId(sessao, 'SIM181'), transacao: '181', data: hojeIso(),
      descricao: `${idx >= 0 ? 'Substituição' : 'Inclusão'} do Curso ${e.codigoCurso} – ${CURSOS[e.codigoCurso]} (simulação local).`,
      anterior: antes ?? undefined,
    });
    return {
      aceito: true, retorno: ret('000'), validacoes: val, camposComErro: [], evento: curso,
      diagnostico: {
        ...diag, retorno: ret('000'), estadoPosterior: { curso },
        mutacao: `Curso ${e.codigoCurso} ${idx >= 0 ? 'substituído' : 'incluído'} no prontuário em memória desta sessão. Situação-CNH inalterada.`,
      },
    };
  }

  private normalizarCurso(b: Record<string, any>) {
    return {
      tipoChave: txt(b.tipoChave || '1'),
      numero: txt(b.numero).toUpperCase().replace(/[.\-\s]/g, ''),
      tipoEvento: 'C' as const,
      tipoAtualizacao: txt(b.tipoAtualizacao).toUpperCase(),
      codigoCurso: txt(b.codigoCurso).padStart(2, '0'),
      modalidade: txt(b.modalidade),
      numeroCertificado: txt(b.numeroCertificado).toUpperCase(),
      dataInicioCurso: txt(b.dataInicioCurso),
      dataFimCurso: txt(b.dataFimCurso),
      cargaHoraria: dig(b.cargaHoraria),
      cnpjEntidadeCredenciada: dig(b.cnpjEntidadeCredenciada),
      cpfInstrutor: dig(b.cpfInstrutor),
      municipioCurso: txt(b.municipioCurso),
      ufCurso: txt(b.ufCurso).toUpperCase(),
      dataValidade: txt(b.dataValidade),
      categoria: txt(b.categoria).toUpperCase(),
      observacoesCurso: txt(b.observacoesCurso || '99'),
    };
  }

  private validarCurso(e: ReturnType<HabilitacaoService['normalizarCurso']>, p: Prontuario | undefined, lista: Prontuario[]): Validacao[] {
    const v: Validacao[] = [];
    const hoje = hojeIso();
    const R = (id: string, titulo: string, ok: boolean, okMsg: string, falhaMsg: string, codigo: Retorno, campos: string[], extra: Partial<Validacao> = {}) =>
      v.push({ ...regra(id, titulo, ok, okMsg, falhaMsg, { codigo, campos, referencia: `TR 181 · Evento C · cód. ${codigo.codigo}` }), ...extra });

    // Identificação (Tipo-Chave 1 para candidato; a POC registra cursos de formação só para candidato)
    if (e.tipoChave !== '1') {
      v.push(regra('I01', 'Curso de formação para candidato', false, '',
        'Nesta POC o Evento C cobre os cursos da primeira habilitação (31 a 34), registrados para candidato com Tipo-Chave 1.',
        { codigo: retPoc('181-04', 'Evento C para condutor fora do escopo da POC.'), campos: ['tipoChave'], fonte: 'INTERPRETACAO_POC' }));
      return v;
    }
    if (!/^[A-Z]{2}\d{9}$/.test(e.numero) || /^[A-Z]{2}0{9}$/.test(e.numero)) {
      R('I01', 'Número-Formulário-RENACH válido', false, '', 'Formato: UF (2) + 9 dígitos.', ret('802'), ['numero']);
      return v;
    }
    if (!p) {
      const deCondutor = lista.some((x) => x.natureza === '2' && (x.formularioRenachEmAndamento === e.numero || x.emissoes.some((m) => m.numeroFormularioRenach === e.numero)));
      R('I01', 'Candidato localizado', false, '', deCondutor ? 'O formulário é de um condutor; Tipo-Chave 1 só vale para candidato.' : 'Formulário não encontrado.',
        deCondutor ? ret('375') : ret('006'), ['numero']);
      return v;
    }
    R('I02', 'UF de origem igual à UF de domínio', p.dadosCadastrais.ufDominio === UF_ORIGEM_DEMO, `UF de domínio ${p.dadosCadastrais.ufDominio}.`,
      'Só o DETRAN de domínio registra cursos de formação (Consistência II).', ret('011'), ['numero']);
    v.push(regra('I03', 'Candidato sem emissão autorizada', p.dadosControle.situacaoCnh === '0', 'Situação-CNH 0 – Inexistente.',
      'A habilitação já foi autorizada (TR 155). Alterar eventos exigiria cancelar a autorização (TR 176) antes.',
      { codigo: ret('017'), fonte: 'INTERPRETACAO_POC', campos: ['numero'], referencia: 'TR 181 · Consistência V.1' }));
    R('I04', 'Tipo-Atualização', ['I', 'S'].includes(e.tipoAtualizacao), e.tipoAtualizacao === 'I' ? 'I – Inclusão.' : 'S – Substituição.',
      'Tipo-Atualização inválido ou ausente (POC aceita I ou S).', ret('377'), ['tipoAtualizacao']);

    // Atributos
    const formacao = ['31', '32', '33', '34'].includes(e.codigoCurso);
    R('A01', 'Código-Curso', formacao, `${e.codigoCurso} – ${CURSOS[e.codigoCurso]}.`,
      CURSOS[e.codigoCurso] ? `Curso ${e.codigoCurso} não é de formação de candidato.` : 'Código do curso fora da tabela ou ausente.', ret('396'), ['codigoCurso']);
    if (!formacao) return v;
    const exigeModalidade = CURSOS_COM_MODALIDADE.includes(e.codigoCurso);
    R('A02', 'Modalidade', exigeModalidade ? !!MODALIDADES_CURSO[e.modalidade] : !e.modalidade,
      exigeModalidade ? `${e.modalidade} – ${MODALIDADES_CURSO[e.modalidade]}.` : 'Não se aplica a este curso.',
      exigeModalidade ? 'Modalidade obrigatória para este curso.' : 'Modalidade não se aplica aos cursos 31 a 34.', ret(exigeModalidade ? '390' : '222'), ['modalidade']);
    R('A03', 'Número-Certificado', !e.numeroCertificado || /^[A-Z0-9]{1,15}$/.test(e.numeroCertificado), e.numeroCertificado || 'Não informado (opcional).',
      'Número do certificado inválido (até 15 letras e dígitos).', ret('479'), ['numeroCertificado']);
    const iniOk = dataValida(e.dataInicioCurso) && e.dataInicioCurso <= hoje;
    R('A04', 'Data-Início-Curso', iniOk, br(e.dataInicioCurso), 'Data de início inválida, ausente ou futura.', ret('397'), ['dataInicioCurso']);
    const fimOk = dataValida(e.dataFimCurso) && e.dataFimCurso <= hoje && (!iniOk || e.dataFimCurso >= e.dataInicioCurso);
    R('A05', 'Data-Fim-Curso', fimOk, br(e.dataFimCurso), 'Data de fim inválida, ausente, futura ou anterior ao início.', ret('398'), ['dataFimCurso']);
    if (iniOk && e.dataInicioCurso < p.dadosCadastrais.dataCadastramento) {
      v.push(regra('A06', 'Curso posterior ao cadastramento', false, '', `Curso iniciado antes da Data-Cadastramento (${br(p.dadosCadastrais.dataCadastramento)}).`,
        { codigo: ret('397'), campos: ['dataInicioCurso'], fonte: 'INTERPRETACAO_POC', referencia: 'TR 181 · Evento C · cód. 397' }));
    }
    if (!e.cargaHoraria) R('A07', 'Carga-Horária', false, '', 'Carga horária obrigatória (todos os cursos exceto o 30).', ret('391'), ['cargaHoraria']);
    else if (!/^\d{1,3}$/.test(e.cargaHoraria) || Number(e.cargaHoraria) === 0) R('A07', 'Carga-Horária', false, '', 'Carga horária inválida (até 3 dígitos, maior que zero).', ret('472'), ['cargaHoraria']);
    else if (e.codigoCurso === '34') {
      R('A07', 'Carga-Horária do Curso 34 (minutos)', Number(e.cargaHoraria) >= 150, `${Number(e.cargaHoraria)} minutos.`,
        'No Curso 34 a carga é informada em minutos e não pode ser inferior a 150.', ret('593'), ['cargaHoraria'], { referencia: 'TR 181 · Evento C · obs. 11 · cód. 593' });
    } else R('A07', 'Carga-Horária', true, `${Number(e.cargaHoraria)} horas.`, '', ret('472'), ['cargaHoraria']);

    // Entidade, instrutor e local
    const cnpjOk = cnpjValido(e.cnpjEntidadeCredenciada);
    R('P01', 'CNPJ-Entidade-Credenciada', cnpjOk, 'CNPJ válido.', 'CNPJ da entidade inválido ou ausente.', ret('399'), ['cnpjEntidadeCredenciada']);
    const cpfOk = digitosCpfValidos(e.cpfInstrutor);
    R('P02', 'CPF-Instrutor', cpfOk, 'CPF válido.', 'CPF do instrutor inválido ou ausente.', ret('400'), ['cpfInstrutor']);
    const ent = ENTIDADES.find((x) => x.cnpj === e.cnpjEntidadeCredenciada);
    const prof = PROFISSIONAIS.find((x) => x.cpf === e.cpfInstrutor);
    if (cnpjOk && cpfOk) {
      R('P03', 'Entidade/instrutor cadastrados', !!ent && !!prof, `${ent?.nome} · ${prof?.nome}.`, 'Entidade ou instrutor não cadastrado na base demonstrativa.', ret('611'), ['cnpjEntidadeCredenciada', 'cpfInstrutor']);
      if (ent && prof) {
        R('P04', 'Vínculo do instrutor com a entidade', prof.entidade === ent.cnpj, 'Vínculo ativo.', `${prof.nome} não tem vínculo com ${ent.nome}.`, ret('639'), ['cpfInstrutor']);
        const inc = eventoCompativel(`C${e.codigoCurso}`, ent, prof);
        R('P05', 'Curso compatível com a entidade e o profissional', !inc, 'CFC e instrutor de trânsito.', inc ?? '', ret('662'), ['cnpjEntidadeCredenciada', 'cpfInstrutor'],
          { referencia: 'TR 185 · quadro Tipo-Profissional x Tipo-Entidade · cód. 662' });
      }
    }
    const ufOk = UFS.includes(e.ufCurso);
    R('L01', 'UF-Curso', ufOk, `${e.ufCurso}.`, 'UF do evento fora da tabela ou ausente.', ret('402'), ['ufCurso']);
    const mun = MUNICIPIOS[e.municipioCurso];
    R('L02', 'Município-Curso', !!mun, `${mun?.nome}.`, 'Município fora da tabela (massa demonstrativa) ou ausente.', ret('401'), ['municipioCurso']);
    if (mun && ufOk) R('L03', 'Município pertence à UF do curso', mun.uf === e.ufCurso, 'Município pertence à UF.', `${mun.nome} não pertence a ${e.ufCurso}.`, ret('392'), ['municipioCurso', 'ufCurso']);
    R('L04', 'Data-Validade', !e.dataValidade, 'Não se aplica aos cursos 30 a 34.', 'Data-Validade não se aplica a este curso.', ret('473'), ['dataValidade']);

    // Categoria (obs. 5 e retornos 382/383/394)
    if (['32', '33'].includes(e.codigoCurso)) {
      if (!e.categoria) R('K01', 'Categoria', false, '', 'Categoria é obrigatória nos cursos 32 e 33.', ret('394'), ['categoria']);
      else if (!CATEGORIAS.includes(e.categoria)) R('K01', 'Categoria', false, '', 'Categoria fora da tabela.', ret('837'), ['categoria']);
      else if (e.codigoCurso === '33') R('K01', 'Categoria do Curso 33', /^(X|A)$/.test(e.categoria), `${e.categoria}.`, 'Curso 33 aceita só X e A.', ret('382'), ['categoria']);
      else {
        R('K01', 'Categoria do Curso 32', /^[BCDE]$/.test(e.categoria), `${e.categoria}.`, 'Curso 32 aceita só B, C, D e E.', ret('383'), ['categoria']);
        if (/^[BCDE]$/.test(e.categoria)) {
          v.push(regra('K02', 'Categoria permitida para candidato', CATEGORIAS_CANDIDATO.includes(e.categoria), `${e.categoria}.`, 'Candidato só pode cursar aulas práticas de 4 rodas na categoria B.',
            { codigo: ret('345'), campos: ['categoria'], fonte: 'INTERPRETACAO_POC', referencia: 'TR 181 · Consistência III.1 · cód. 345' }));
        }
      }
    } else if (e.categoria && !CATEGORIAS.includes(e.categoria)) {
      R('K01', 'Categoria', false, '', 'Categoria fora da tabela.', ret('837'), ['categoria']);
    }
    v.push(regra('K03', 'Observações-Curso', e.observacoesCurso === '99', '99 – Sem observação.', 'Para cursos de formação a POC aceita só 99.',
      { codigo: ret('414'), campos: ['observacoesCurso'], fonte: 'INTERPRETACAO_POC' }));

    // Curso 34 – pré-requisitos (Consistências do Evento C)
    if (e.codigoCurso === '34') {
      const tem = (c: string) => p.exames.some((x) => x.codigoExame === c);
      const faltam = [!tem('03') && 'Exame 03', !tem('04') && 'Exame 04', !p.cursos.some((c) => c.codigoCurso === '31') && 'Curso 31', !tem('05') && 'Exame 05'].filter(Boolean);
      R('Q01', 'Pré-requisitos do Curso 34', faltam.length === 0, 'Exames 03, 04 e 05 e Curso 31 registrados.', `Faltam: ${faltam.join(', ')}.`, ret('592'), ['codigoCurso']);
      const ex03 = p.exames.find((x) => x.codigoExame === '03');
      if (ex03) {
        R('Q02', 'Exame 03 com categoria B', /B/.test(ex03.categoriaPretendida), `Exame 03 com categoria ${ex03.categoriaPretendida}.`,
          `O Curso 34 exige categoria B no Exame 03 (registrado: ${ex03.categoriaPretendida}).`, ret('594'), ['codigoCurso']);
      }
    }

    // Chave do evento
    const existente = p.cursos.find((x) => x.codigoCurso === e.codigoCurso);
    if (e.tipoAtualizacao === 'I') {
      R('Z01', 'Inclusão: curso ainda não registrado', !existente, `Não há Curso ${e.codigoCurso} no prontuário.`,
        `Já existe Curso ${e.codigoCurso} no prontuário. Use S – Substituição.`, ret('395'), ['tipoAtualizacao', 'codigoCurso']);
    } else if (e.tipoAtualizacao === 'S') {
      R('Z01', 'Substituição: curso registrado', !!existente, `Curso ${e.codigoCurso} será substituído.`, `Não há Curso ${e.codigoCurso} no prontuário. Use I – Inclusão.`,
        ret('403'), ['tipoAtualizacao', 'codigoCurso']);
      if (existente) {
        const n = (x: string | null | undefined) => x ?? '';
        const igual = existente.dataInicioCurso === e.dataInicioCurso && existente.dataFimCurso === e.dataFimCurso && n(existente.cargaHoraria) === e.cargaHoraria &&
          existente.cnpjEntidadeCredenciada === e.cnpjEntidadeCredenciada && n(existente.cpfInstrutor) === e.cpfInstrutor && existente.municipioCurso === e.municipioCurso &&
          existente.ufCurso === e.ufCurso && existente.categoria === e.categoria && n(existente.numeroCertificado) === e.numeroCertificado;
        R('Z02', 'Substituição altera algum atributo', !igual, 'Ao menos um atributo difere.', 'Os dados enviados são iguais aos registrados.', ret('404'), ['dataFimCurso']);
      }
    }
    return v;
  }

  // ================================================================ TR 155
  prevalidar155(sessao: string, body: Record<string, any>) {
    const { p, entrada } = this.entrada155(sessao, body);
    const requisitos = this.requisitos155(p, entrada);
    const bloqueantes = requisitos.filter((r) => r.impeditivo && r.status === 'NAO_ATENDIDO');
    return {
      resumo: this.resumo155(p, entrada),
      requisitos,
      podeHabilitar: bloqueantes.length === 0,
      pendencias: bloqueantes.map((b) => `${b.titulo}${b.codigoRetorno ? ` (${b.codigoRetorno.codigo})` : ''}`),
    };
  }

  habilitar155(sessao: string, body: Record<string, any>) {
    const { p, entrada } = this.entrada155(sessao, body);
    const dc = p.dadosControle;
    const antes = { situacaoCnh: dc.situacaoCnh, motivoRequerimento: dc.motivoRequerimento, categoriaAutorizada: dc.categoriaAutorizada, primeiraHabilitacao: p.dadosCadastrais.primeiraHabilitacao };
    const requisitos = this.requisitos155(p, entrada);
    const bloqueante = primeiraFalha(requisitos);
    const payload = this.payload155(p, entrada);
    const diagBase = {
      transacao: { codigo: '155', nome: 'Habilitar Candidato — Motivo-Requerimento 1' },
      origemDestino: ORIGEM_DESTINO,
      chave: { tipo: 'Número-Formulário-RENACH', valor: p.formularioRenachEmAndamento },
      numero: { tipo: 'Motivo-Requerimento', valor: '1 – Primeira Habilitação' },
      condicionalidade: 'Motivo 1 isolado (348). DDD, celular e e-mail obrigatórios se Tipo de Autorização = 2.',
      leiauteEnvio: LEIAUTE_155,
      payload,
      validacoes: requisitos,
      estadoAnterior: antes,
      transmissao: AVISO_TRANSMISSAO,
      lacunas: [
        'Impedimentos e duplicidade na BCA (075, 077, 935–968) e imagens biométricas (161–166): não simulados — "não verificável".',
        'Bases de Óbitos e da Receita Federal (309, 310, 313): "não implementado" no próprio Manual.',
        'Número-Registro e Número-Formulário-CNH: atribuídos na emissão pela gráfica (TR 171/172), fora do escopo.',
        'Exame 05 inapto: o Manual exige o exame "registrado" (323); a POC exige resultado Apto e marca como interpretação.',
      ],
    };
    if (bloqueante) {
      const retorno = bloqueante.codigoRetorno ?? retPoc('155-99', bloqueante.titulo);
      return {
        habilitado: false, retorno, requisitos, prontuario: this.renach.visao(p),
        diagnostico: { ...diagBase, retorno, estadoPosterior: antes, mutacao: 'Nenhuma — transação rejeitada.' },
      };
    }
    const hoje = hojeIso();
    dc.situacaoCnhAnterior = dc.situacaoCnh;
    dc.situacaoCnh = '1';
    dc.motivoRequerimento = '1';
    dc.permissionario = '1';
    dc.categoriaAutorizada = entrada.categoria;
    dc.dataValidadeCnh = payload.dataValidade;
    dc.observacaoCnh = payload.observacoes === '99' ? [] : payload.observacoes.match(/.{1,2}/g)!.map((o) => o.trim());
    dc.codigoTransacaoUltimaAtualizacao = '155';
    p.dadosCadastrais.primeiraHabilitacao = hoje;
    const id = this.store.proximoId(sessao, 'SIM155');
    p.autorizacoes.push({
      id, transacao: '155', motivoRequerimento: '1', numeroFormularioRenach: p.formularioRenachEmAndamento, categoria: entrada.categoria,
      dataValidade: payload.dataValidade, tipoAutorizacao: entrada.tipoAutorizacao as '1' | '2', autorizadaEm: new Date().toISOString(),
      situacaoAnterior: antes.situacaoCnh, situacaoPosterior: '1',
    });
    p.hicom.push({ id, transacao: '155', data: hoje, descricao: 'Habilitar Candidato — Motivo 1 – Primeira Habilitação (simulação local).' });
    return {
      habilitado: true, retorno: ret('000'), requisitos, prontuario: this.renach.visao(p),
      diagnostico: {
        ...diagBase, retorno: ret('000'),
        estadoPosterior: { situacaoCnh: '1', motivoRequerimento: '1', categoriaAutorizada: entrada.categoria, primeiraHabilitacao: hoje, dataValidadeCnh: payload.dataValidade },
        mutacao: `Situação-CNH do candidato desta sessão: 0 → 1 – Emissão Autorizada (Retorno 155, obs. 1). Permissão para Dirigir com validade ${br(payload.dataValidade)}. Categoria-Atual segue em branco até a emissão (Consistência XIII).`,
      },
    };
  }

  private entrada155(sessao: string, b: Record<string, any>) {
    const motivo = txt(b?.motivoRequerimento ?? '1').toUpperCase();
    if (!MOTIVOS_REQUERIMENTO[motivo]) throw new BadRequestException({ codigo: '834', mensagem: ret('834').mensagem });
    if (motivo !== '1') {
      throw new BadRequestException({
        codigo: 'POC-155-00',
        mensagem: `Motivo ${motivo} – ${MOTIVOS_REQUERIMENTO[motivo]} existe no Manual, mas esta POC executa na TR 155 só o Motivo-Requerimento 1 — Primeira Habilitação.`,
      });
    }
    const f = txt(b?.numeroFormularioRenach).toUpperCase();
    if (!/^[A-Z]{2}\d{9}$/.test(f) || /^[A-Z]{2}0{9}$/.test(f)) throw new BadRequestException({ codigo: '802', mensagem: ret('802').mensagem });
    const lista = this.store.obter(sessao).prontuarios;
    const p = lista.find((x) => x.formularioRenachEmAndamento === f);
    if (!p) throw new BadRequestException({ codigo: '006', mensagem: ret('006').mensagem });
    if (p.natureza !== '1') throw new BadRequestException({ codigo: '009', mensagem: `${ret('009').mensagem} O formulário é de um condutor: use a TR 159.` });
    return {
      p,
      entrada: {
        motivoRequerimento: '1' as const,
        categoria: txt(b?.categoria).toUpperCase(),
        tipoAutorizacao: txt(b?.tipoAutorizacao || '1'),
        ddd: dig(b?.ddd),
        telefoneCelular: dig(b?.telefoneCelular),
        email: txt(b?.email),
      },
    };
  }

  /** Obs. 1 da 155: validade = data da 155 + 1 ano, salvo se o Exame 03 ou 04 vencer antes. */
  private validade155(p: Prontuario) {
    const umAno = somarAnos(hojeIso(), 1);
    const ex = p.exames.filter((x) => ['03', '04'].includes(x.codigoExame) && x.dataValidade && !x.observacoes.includes('51')).map((x) => x.dataValidade!);
    return [umAno, ...ex].sort()[0];
  }

  private observacoes155(p: Prontuario) {
    const obs = [...new Set(p.exames.filter((x) => ['03', '04'].includes(x.codigoExame) && !x.observacoes.includes('51')).flatMap((x) => x.observacoes.map((o) => o.trim())))]
      .filter((o) => !OBS_NAO_IMPRESSAS.includes(o)).sort();
    return (obs.length ? obs : ['99']).map((o) => o.padEnd(2, ' ')).join('');
  }

  private payload155(p: Prontuario, e: ReturnType<HabilitacaoService['entrada155']>['entrada']) {
    const d = p.dadosCadastrais;
    return {
      numeroFormularioRenach: p.formularioRenachEmAndamento,
      motivoRequerimento: '1',
      nomeCondutor: d.nomeSocial || d.nomeCondutorCivil,
      cpf: d.cpf,
      identidade: d.documentoIdentidade,
      nacionalidade: d.nacionalidade,
      categoria: e.categoria,
      dataValidade: this.validade155(p),
      dataPrimeiraHabilitacao: hojeIso(),
      dataNascimento: d.dataNascimento,
      nomeMae: d.nomeMae,
      nomePai: d.nomePai ?? '',
      observacoes: this.observacoes155(p),
      tipoAutorizacao: e.tipoAutorizacao,
      ddd: e.ddd,
      telefoneCelular: e.telefoneCelular,
      email: e.email,
      filiacaoAfetiva1: d.filiacaoAfetiva1 ?? '',
      filiacaoAfetiva2: d.filiacaoAfetiva2 ?? '',
    };
  }

  private resumo155(p: Prontuario, e: ReturnType<HabilitacaoService['entrada155']>['entrada']) {
    const d = p.dadosCadastrais;
    const ev = (c: string) => {
      const x = p.exames.find((y) => y.codigoExame === c);
      return x ? { dataExame: x.dataExame, resultado: x.resultado, descricaoResultado: RESULTADOS_POR_EXAME[c][x.resultado], dataValidade: x.dataValidade, categoria: x.categoriaPermitida ?? x.categoriaPretendida } : null;
    };
    const cu = (c: string) => {
      const x = p.cursos.find((y) => y.codigoCurso === c);
      return x ? { dataFimCurso: x.dataFimCurso, categoria: x.categoria, cargaHoraria: x.cargaHoraria } : null;
    };
    const ex03 = p.exames.find((x) => x.codigoExame === '03');
    return {
      candidato: d.nomeCondutorCivil,
      nomeSocial: d.nomeSocial ?? null,
      numeroFormularioRenach: p.formularioRenachEmAndamento,
      motivo: { codigo: '1', descricao: MOTIVOS_REQUERIMENTO['1'] },
      categoria: e.categoria,
      categoriaSugerida: ex03?.categoriaPermitida && CATEGORIAS_CANDIDATO.includes(ex03.categoriaPermitida) ? ex03.categoriaPermitida : 'B',
      situacaoCnh: { codigo: p.dadosControle.situacaoCnh, descricao: SITUACOES_CNH[p.dadosControle.situacaoCnh] },
      dataCadastramento: d.dataCadastramento,
      prazoProcesso: somarDias(somarAnos(d.dataCadastramento, 1), 60),
      dataPrimeiraHabilitacao: p.dadosControle.situacaoCnh === '1' ? d.primeiraHabilitacao : hojeIso(),
      dataValidadePermissao: p.dadosControle.situacaoCnh === '1' ? p.dadosControle.dataValidadeCnh : this.validade155(p),
      observacoes: this.observacoes155(p),
      eventos: {
        exames: { '01': ev('01'), '02': ev('02'), '03': ev('03'), '04': ev('04'), '05': ev('05') },
        cursos: { '31': cu('31'), '32': cu('32'), '33': cu('33'), '34': cu('34') },
      },
    };
  }

  private requisitos155(p: Prontuario, e: ReturnType<HabilitacaoService['entrada155']>['entrada']): Validacao[] {
    const hoje = hojeIso();
    const dc = p.dadosControle;
    const d = p.dadosCadastrais;
    const req: Validacao[] = [];
    const R = (id: string, titulo: string, ok: boolean, okMsg: string, falhaMsg: string, codigo: string, ref: string, extra: Partial<Validacao> = {}) =>
      req.push({ ...regra(id, titulo, ok, okMsg, falhaMsg, { codigo: ret(codigo), referencia: `TR 155 · ${ref} · cód. ${codigo}` }), ...extra });
    const exame = (c: string) => p.exames.find((x) => x.codigoExame === c);
    const curso = (c: string) => p.cursos.find((x) => x.codigoCurso === c);
    const vigente = (dv: string | null) => !dv || dv > hoje;

    req.push({ id: 'M1', titulo: 'Motivo do requerimento 1 — Primeira Habilitação', status: 'ATENDIDO', impeditivo: true, fonte: 'MANUAL',
      detalhe: 'Motivo 1 sozinho, como exige o retorno 348.', referencia: 'TR 155 · quadro Motivo-Requerimento 1' });
    R('H01', 'UF de origem igual à UF de domínio', d.ufDominio === UF_ORIGEM_DEMO, `UF de domínio ${d.ufDominio}.`, `UF de domínio é ${d.ufDominio}.`, '011', 'Consistência VI');
    R('H02', 'Candidato ainda não habilitado', dc.situacaoCnh === '0', 'Situação-CNH 0 – Inexistente.',
      `Situação-CNH ${dc.situacaoCnh} – ${SITUACOES_CNH[dc.situacaoCnh]}. A repetição não gera nova habilitação.`, '015', 'Retornos');

    // Categoria
    if (!CATEGORIAS.includes(e.categoria)) R('H03', 'Categoria', false, '', 'Categoria fora da Tabela 03.', '837', 'Retornos', { campos: ['categoria'] });
    else R('H03', 'Categoria permitida no Motivo 1', CATEGORIAS_CANDIDATO.includes(e.categoria), `Categoria ${e.categoria}.`,
      'No Motivo 1 as categorias permitidas são A, B, AB, X ou XB.', '486', 'quadro Motivo-Requerimento 1', { campos: ['categoria'] });

    // Bloqueio e prazo do processo
    const bloqueios = p.bloqueios.filter((b) => b.tipoEvento === 'B');
    R('H04', 'Sem bloqueio no prontuário', bloqueios.length === 0, 'Nenhum bloqueio.', `Bloqueio ${bloqueios.map((b) => b.motivoBloqueio).join(', ')} registrado.`, '010', 'Consistência II');
    const prazo = somarDias(somarAnos(d.dataCadastramento, 1), 60);
    R('H05', 'Processo dentro de 1 ano e 60 dias do cadastramento', hoje <= prazo, `Cadastrado em ${br(d.dataCadastramento)}; prazo até ${br(prazo)}.`,
      `Cadastrado em ${br(d.dataCadastramento)}; o prazo terminou em ${br(prazo)}.`, '763', 'Consistências VII e XVII');
    req.push({ id: 'H06', titulo: 'Data da primeira habilitação igual à data da transação', status: 'ATENDIDO', impeditivo: true, fonte: 'MANUAL',
      detalhe: `O payload usa a data da 155 (${br(hoje)}).`, referencia: 'TR 155 · Consistência VIII · cód. 529' });

    // Cursos e exames exigidos (quadros Curso x Motivo e Exame x Motivo, Consistência XXI)
    R('H07', 'Curso 31 – Aulas Teóricas (Legislação)', !!curso('31'), `Curso 31 concluído em ${br(curso('31')?.dataFimCurso)}.`, 'Curso 31 não registrado.', '316', 'quadro Curso x Motivo');
    const ex05 = exame('05');
    if (ex05 && !resultadoApto('05', ex05.resultado)) {
      req.push({ ...regra('H08', 'Exame 05 – Teórico Técnico de Formação', false, '', `Exame 05 de ${br(ex05.dataExame)} com resultado ${ex05.resultado} – Inapto.`,
        { codigo: ret('323'), fonte: 'INTERPRETACAO_POC', referencia: 'TR 155 · quadro Exame x Motivo · cód. 323' }) });
    } else {
      R('H08', 'Exame 05 – Teórico Técnico de Formação', !!ex05, `Exame 05 de ${br(ex05?.dataExame)}, Apto.`, 'Exame 05 não registrado.', '323', 'quadro Exame x Motivo');
    }
    const ex03 = exame('03');
    R('H09', 'Exame 03 – Aptidão Física e Mental vigente', !!ex03 && vigente(ex03.dataValidade),
      `Exame 03 de ${br(ex03?.dataExame)}, válido até ${br(ex03?.dataValidade)}.`, ex03 ? `Exame 03 vencido em ${br(ex03.dataValidade)}.` : 'Exame 03 não registrado.', '321', 'Consistência XI');
    const ex04 = exame('04');
    R('H10', 'Exame 04 – Avaliação Psicológica vigente', !!ex04 && vigente(ex04.dataValidade),
      `Exame 04 de ${br(ex04?.dataExame)}${ex04?.dataValidade ? `, válido até ${br(ex04.dataValidade)}` : ', sem Data-Validade (ativo)'}.`,
      ex04 ? `Exame 04 vencido em ${br(ex04.dataValidade)}.` : 'Exame 04 não registrado.', '322', 'Consistência XI');
    const inaptos = [ex03, ex04].filter((x) => x && !resultadoApto(x.codigoExame, x.resultado));
    req.push(inaptos.length
      ? { id: 'H11', titulo: 'Exames 03 e 04 sem resultado inapto', status: 'NAO_ATENDIDO', impeditivo: true, fonte: 'MANUAL',
        detalhe: `Exame(s) ${inaptos.map((x) => x!.codigoExame).join(', ')} com resultado Inapto ou Inapto Temporário. O Manual não indica código específico.`,
        referencia: 'TR 155 · Consistência XIX', codigoRetorno: retPoc('155-01', 'Exame 03 ou 04 inapto no prontuário (código oficial não identificado).') }
      : { id: 'H11', titulo: 'Exames 03 e 04 sem resultado inapto', status: 'ATENDIDO', impeditivo: true, fonte: 'MANUAL',
        detalhe: 'Exames 03 e 04 aptos.', referencia: 'TR 155 · Consistência XIX' });

    // Simulador (Curso 34) para categoria B, cadastro a partir de 06/01/2014 (obs. 9)
    const comB = /B/.test(e.categoria);
    if (comB && d.dataCadastramento >= '2014-01-06') {
      R('H12', 'Curso 34 – Simulador de Direção Veicular', !!curso('34'), `Curso 34 registrado (${Number(curso('34')?.cargaHoraria ?? 0)} minutos).`,
        'Categoria B com cadastro a partir de 06/01/2014 exige o Curso 34.', '590', 'Observação 9');
    } else {
      req.push({ id: 'H12', titulo: 'Curso 34 – Simulador de Direção Veicular', status: 'NAO_APLICAVEL', impeditivo: false, fonte: 'MANUAL',
        detalhe: comB ? 'Cadastro anterior a 06/01/2014.' : 'Exigido só para a categoria B.', referencia: 'TR 155 · Observação 9 · cód. 590' });
    }

    // Prática por categoria: 2 rodas (Curso 33 + Exame 01) e 4 rodas (Curso 32 + Exame 02)
    const praticas: [string, string, string][] = [];
    if (temDuasRodas(e.categoria)) praticas.push(['33', '01', '2 rodas']);
    if (/B/.test(e.categoria)) praticas.push(['32', '02', '4 rodas']);
    for (const [c, x, rodas] of praticas) {
      const cc = curso(c);
      const xx = exame(x);
      const faltas = [!cc && `Curso ${c}`, !xx && `Exame ${x}`, xx && !resultadoApto(x, xx.resultado) && `Exame ${x} inapto`].filter(Boolean);
      R(`H13-${rodas[0]}`, `Prática ${rodas}: Curso ${c} e Exame ${x}`, faltas.length === 0,
        `Curso ${c} (${br(cc?.dataFimCurso)}) e Exame ${x} (${br(xx?.dataExame)}, Apto).`, `Falta: ${faltas.join(', ')}.`, '524', 'quadro Motivo-Requerimento 1');
    }
    if (!praticas.length) {
      req.push({ id: 'H13', titulo: 'Prática de direção', status: 'NAO_APLICAVEL', impeditivo: false, fonte: 'MANUAL', detalhe: 'Informe a categoria.', referencia: 'TR 155 · cód. 524' });
    }

    // Categoria compatível com os eventos (Consistência XIV e cód. 345)
    if (CATEGORIAS_CANDIDATO.includes(e.categoria)) {
      const limites = [ex03, ex04].filter((x) => x && x.categoriaPermitida).map((x) => ({ c: x!.codigoExame, cat: x!.categoriaPermitida! }));
      const fora = limites.filter((l) => !cabe(e.categoria, l.cat));
      const cursoFora = praticas.map(([c]) => curso(c)).filter((cc) => cc && cc.codigoCurso === '32' && !cabe('B', cc.categoria));
      R('H14', 'Categoria compatível com exames e cursos', fora.length === 0 && cursoFora.length === 0,
        `Categoria ${e.categoria} coberta por ${limites.map((l) => `Exame ${l.c} (${l.cat})`).join(' e ') || 'eventos registrados'}.`,
        `Categoria ${e.categoria} acima do permitido em ${fora.map((l) => `Exame ${l.c} (${l.cat})`).join(', ')}.`, '345', 'Consistência XIV', { campos: ['categoria'] });
    }

    // Tipo de Autorização e contato
    const tipoOk = ['1', '2'].includes(e.tipoAutorizacao);
    R('H15', 'Tipo de Autorização', tipoOk, e.tipoAutorizacao === '2' ? '2 – Impressa e Digital.' : '1 – Impressa.', 'Tipo de Autorização deve ser 1 ou 2.', '660', 'Observação 10', { campos: ['tipoAutorizacao'] });
    if (tipoOk && e.tipoAutorizacao === '2') {
      R('H16', 'DDD', /^[1-9][1-9]$/.test(e.ddd), `DDD ${e.ddd}.`, 'DDD inválido ou ausente.', '701', 'Observação 11', { campos: ['ddd'] });
      R('H17', 'Telefone celular', /^9\d{8}$/.test(e.telefoneCelular), 'Celular válido.', 'Celular inválido ou ausente.', '702', 'Observação 11', { campos: ['telefoneCelular'] });
      R('H18', 'E-mail', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.email), 'E-mail válido.', 'E-mail inválido ou ausente.', '644', 'Observação 11', { campos: ['email'] });
    }
    const validade = this.validade155(p);
    R('H19', 'Data-Validade da Permissão para Dirigir', dataValida(validade), `Validade ${br(validade)} (data da 155 + 1 ano, ou a menor validade dos Exames 03/04).`,
      'Não foi possível calcular a Data-Validade.', '838', 'Observação 1');

    // Não verificáveis
    req.push({ id: 'H20', titulo: 'Indícios de impedimento e duplicidade', status: 'NAO_VERIFICAVEL', impeditivo: false, fonte: 'LACUNA',
      detalhe: 'Verificação feita pela BCA (075, 077, 935–968). Não há base de impedimentos na massa.', referencia: 'TR 155 · Consistência III' });
    req.push({ id: 'H21', titulo: 'Imagens do candidato (foto, assinatura, digitais)', status: 'NAO_VERIFICAVEL', impeditivo: false, fonte: 'LACUNA',
      detalhe: 'Coleta biométrica fora do escopo (161–166).', referencia: 'TR 155 · Retornos 161–166' });
    req.push({ id: 'H22', titulo: 'Infrações gravíssimas (RENAINF)', status: 'NAO_APLICAVEL', impeditivo: false, fonte: 'MANUAL',
      detalhe: 'A verificação de mais de uma infração gravíssima não se aplica ao Motivo 1 (Observação 1 dos retornos da 155).', referencia: 'TR 155 · Retornos, Observação 1' });
    return req;
  }
}
