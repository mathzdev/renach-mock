/**
 * Modelo do prontuário demonstrativo da POC RENACH, alinhado ao Retorno 2 da
 * TR 575 do Manual RENACH (versão de julho de 2022, v8.2).
 *
 * Todos os VALORES são fictícios. Os NOMES dos elementos de dados e os códigos
 * pré-codificados seguem o Manual; onde a POC precisou decidir algo que o
 * Manual não define, a decisão está marcada como INTERPRETACAO_POC.
 */

/** Classificação exigida pelo item 6 da especificação (diagnóstico). */
export type Fonte =
  | 'MANUAL' // (a) regra/dado extraído do Manual RENACH v8.2
  | 'FIXTURE' // (b) dado fictício da massa demonstrativa
  | 'INTERPRETACAO_POC' // (c) interpretação adotada pela POC, não oficial
  | 'LACUNA'; // (d) dado ausente / não verificável na massa

/** Campos pré-codificados — SITUAÇÃO-CNH. */
export const SITUACOES_CNH: Record<string, string> = {
  '0': 'Inexistente',
  '1': 'Emissão Autorizada',
  '2': 'Em Emissão',
  '3': 'Emitida',
  '4': 'Confirmada',
  '5': 'Modelo Antigo',
  '6': 'Alterada',
  A: 'Cancelada Erro DETRAN',
  B: 'Cancelada Erro Gráfica',
  C: 'Cancelada por Fraude',
  Z: 'Cancelada Outros Motivos',
};

export interface EventoExame {
  tipoEvento: 'E';
  codigoExame: string;
  dataExame: string; // ISO
  resultado: string;
  dataValidade: string | null;
  cpfExaminador1: string | null;
  cpfExaminador2: string | null;
  cnpjEntidadeCredenciada: string | null;
  municipioExame: string;
  ufExame: string;
  categoriaPretendida: string;
  categoriaPermitida: string | null;
  observacoes: string[]; // códigos de 2 posições (ex.: "99", "15", "A ")
  restricoesXTexto: string | null;
  cnpjLaboratorio: string | null;
  numeroLaudo: string | null;
  /** Controle da POC (não faz parte do leiaute). */
  procedencia: 'FIXTURE' | 'SIMULACAO_TR181';
  registradoEm?: string;
}

export interface EventoCurso {
  tipoEvento: 'C';
  codigoCurso: string;
  dataInicioCurso: string;
  dataFimCurso: string;
  cnpjEntidadeCredenciada: string;
  municipioCurso: string;
  ufCurso: string;
  dataValidade: string | null;
  categoria: string;
  procedencia: 'FIXTURE';
}

export interface EventoBloqueio {
  tipoEvento: 'B' | 'L';
  ufDetranBloqueio: string;
  motivoBloqueio: string;
  dataBloqueio: string;
  documentoGeradorBloqueio: string;
  descricaoBloqueio: string;
  dataInicioPenalidade: string | null;
  dataFimPenalidade: string | null;
  dataLiberacaoBloqueio?: string | null;
}

export interface EventoOcorrencia {
  tipoEvento: 'O';
  ufDetranOcorrencia: string;
  motivoOcorrencia: string;
  dataOcorrencia: string;
  descricaoOcorrencia: string;
}

/** Histórico de Comandos de Atualização (HICOM), simplificado para a POC. */
export interface ComandoHicom {
  id: string;
  transacao: string;
  data: string;
  descricao: string;
  anterior?: unknown;
}

export interface Emissao {
  dataEmissao: string;
  numeroFormularioCnh: string;
  numeroFormularioRenach: string;
  motivoRequerimento: string;
  categoria: string;
  dataValidade: string;
  cancelada: boolean;
}

export interface Prontuario {
  numeroRegistro: string;
  /** Processo estadual. Referência contextual, NUNCA chave RENACH. */
  processoEstadualReferencia?: string;
  /** Formulário RENACH do processo de renovação aberto pelo DETRAN (usado na TR 159). */
  formularioRenachEmAndamento: string;
  dadosCadastrais: {
    nomeCondutorCivil: string;
    dataNascimento: string;
    sexo: '1' | '2'; // 1 Masculino, 2 Feminino
    nomeMae: string;
    nomePai: string | null;
    documentoIdentidade: string;
    cpf: string;
    localidadeNascimento: string; // código do município (tabela da Receita Federal)
    localidadeNascimentoDescricao: string;
    enderecoLogradouro: string;
    enderecoNumero: string;
    enderecoComplemento: string | null;
    enderecoBairro: string;
    enderecoCep: string;
    enderecoMunicipio: string;
    enderecoMunicipioDescricao: string;
    enderecoUf: string;
    nacionalidade: '1' | '2' | '3';
    dataCadastramento: string;
    primeiraHabilitacao: string;
    ufDominio: string;
    ddd: string | null;
    telefoneCelular: string | null;
    email: string | null;
  };
  dadosControle: {
    situacaoCnh: string;
    situacaoCnhAnterior: string;
    motivoRequerimento: string | null;
    permissionario: '1' | '2' | '3';
    codigoTransacaoUltimaAtualizacao: string;
    numeroFormularioRenach: string;
    numeroFormularioCnh: string;
    cancelamento: string;
    categoriaAtual: string;
    categoriaRebaixada: string | null;
    categoriaAutorizada: string | null;
    dataValidadeCnh: string;
    observacaoCnh: string[];
    dataUltimaEmissaoHistorico: string;
    datasInicioCategoria: Partial<Record<'X' | 'A' | 'B' | 'C' | 'D' | 'E', string>>;
  };
  toxicologico: {
    dataColeta: string | null;
    dataValidade: string | null; // validade para consumo: 90 dias da coleta
    situacao: '1' | '2' | null; // 1 OK, 2 com pendência
    cnpjLaboratorio: string | null;
    numeroLaudo: string | null;
    prazoRealizacao: string | null; // 2 anos e meio
  };
  exames: EventoExame[];
  cursos: EventoCurso[];
  bloqueios: EventoBloqueio[];
  ocorrencias: EventoOcorrencia[];
  emissoes: Emissao[]; // HEMI
  hicom: ComandoHicom[];
  autorizacoes: Autorizacao[];
}

export interface Autorizacao {
  id: string;
  transacao: '159';
  motivoRequerimento: '5';
  numeroFormularioRenach: string;
  categoria: string;
  dataValidade: string;
  tipoAutorizacao: '1' | '2';
  autorizadaEm: string;
  situacaoAnterior: string;
  situacaoPosterior: string;
}

export interface Retorno {
  codigo: string;
  mensagem: string;
  /** MANUAL = código e mensagem da tabela da transação; POC_LOCAL = sem código no Manual. */
  origemCodigo: 'MANUAL' | 'POC_LOCAL';
}

export interface Validacao {
  id: string;
  titulo: string;
  status: 'ATENDIDO' | 'NAO_ATENDIDO' | 'NAO_VERIFICAVEL' | 'NAO_APLICAVEL';
  impeditivo: boolean;
  detalhe: string;
  fonte: Fonte;
  /** Onde a regra está no Manual (ex.: "TR 159 · Consistência V.3 · cód. 330"). */
  referencia?: string;
  campos?: string[];
  codigoRetorno?: Retorno;
}
