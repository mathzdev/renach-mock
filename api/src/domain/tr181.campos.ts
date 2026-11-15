import { Fonte } from './tipos';

/**
 * Leiaute de envio da TR 181 – Eventos, Tipo-Evento E (Exame), transcrito do
 * Manual RENACH v8.2. As posições, tamanhos, formatos e a obrigatoriedade são
 * os do Manual. As 16 posições do Evento E (051 a 273) são precedidas pela
 * identificação do condutor (Tipo-Chave e Número) e pelo Tipo-Evento.
 */
export interface CampoTr181 {
  seq: number | null; // 1..16 para os atributos do Evento E; null para identificação
  chave: string;
  nomeManual: string;
  rotulo: string;
  grupo:
    | 'Condutor/Prontuário'
    | 'Dados do Exame'
    | 'Resultado'
    | 'Profissional'
    | 'Entidade Credenciada'
    | 'Categoria'
    | 'Observações e Restrições';
  posicao: string;
  tamanho: number;
  formatoManual: 'N' | 'AN' | 'A';
  obrigatoriedade: 'OBRIGATORIO' | 'CONDICIONAL' | 'OPCIONAL' | 'FIXO';
  tabelado: boolean;
  condicao?: string;
  formato?: string; // regex aplicada no front e na API
  ajuda: string;
  fonte: Fonte;
}

export const CAMPOS_TR181: CampoTr181[] = [
  {
    seq: null, chave: 'tipoChave', nomeManual: 'Tipo-Chave', rotulo: 'Tipo de chave', grupo: 'Condutor/Prontuário',
    posicao: '038–038', tamanho: 1, formatoManual: 'N', obrigatoriedade: 'OBRIGATORIO', tabelado: true, formato: '^[12]$',
    ajuda: '2 – Número de registro (condutor). 1 – Formulário RENACH só é aceito para candidato (retorno 375).', fonte: 'MANUAL',
  },
  {
    seq: null, chave: 'numero', nomeManual: 'Número', rotulo: 'Número (Registro ou Formulário RENACH)', grupo: 'Condutor/Prontuário',
    posicao: '039–049', tamanho: 11, formatoManual: 'AN', obrigatoriedade: 'OBRIGATORIO', tabelado: false, formato: '^[A-Z0-9]{11}$',
    ajuda: '11 posições. Tipo de chave 2: Número de registro (críticas do CPF). Tipo de chave 1: Formulário RENACH do candidato (UF + 9 dígitos).', fonte: 'MANUAL',
  },
  {
    seq: null, chave: 'tipoEvento', nomeManual: 'Tipo-Evento', rotulo: 'Tipo de evento', grupo: 'Dados do Exame',
    posicao: '050–050', tamanho: 1, formatoManual: 'A', obrigatoriedade: 'FIXO', tabelado: true, formato: '^E$',
    ajuda: 'E – Exame. O Evento C (Curso) tem tela própria na jornada de primeira habilitação; I, B e O estão fora do escopo.', fonte: 'MANUAL',
  },
  {
    seq: 1, chave: 'tipoAtualizacao', nomeManual: 'Tipo-Atualização', rotulo: 'Tipo de atualização', grupo: 'Condutor/Prontuário',
    posicao: '051–051', tamanho: 1, formatoManual: 'A', obrigatoriedade: 'OBRIGATORIO', tabelado: true, formato: '^[IS]$',
    ajuda: 'I – Inclusão (o exame não pode existir) · S – Substituição (o exame deve existir; renovação de Exame 03 é substituição). E – Exclusão não é oferecida na POC.',
    fonte: 'MANUAL',
  },
  {
    seq: 2, chave: 'codigoExame', nomeManual: 'Código-Exame', rotulo: 'Exame', grupo: 'Dados do Exame',
    posicao: '052–053', tamanho: 2, formatoManual: 'AN', obrigatoriedade: 'OBRIGATORIO', tabelado: true, formato: '^0[1-7]$',
    ajuda: 'Tabela CÓDIGO-EXAME. Um condutor só pode ter uma "chave" Exame no prontuário.', fonte: 'MANUAL',
  },
  {
    seq: 3, chave: 'dataExame', nomeManual: 'Data-Exame', rotulo: 'Data do exame', grupo: 'Dados do Exame',
    posicao: '054–061', tamanho: 8, formatoManual: 'N', obrigatoriedade: 'OBRIGATORIO', tabelado: false, formato: '^\\d{4}-\\d{2}-\\d{2}$',
    ajuda: 'Menor ou igual à data da transação. Na renovação deve ser posterior à última emissão (criticado na TR 159).', fonte: 'MANUAL',
  },
  {
    seq: 4, chave: 'resultado', nomeManual: 'Resultado', rotulo: 'Resultado', grupo: 'Resultado',
    posicao: '062–062', tamanho: 1, formatoManual: 'N', obrigatoriedade: 'OBRIGATORIO', tabelado: true, formato: '^[1-5]$',
    ajuda: 'Exame 03: Tabela 08 (1 Apto · 2 Apto com Restrições · 4 Inapto Temporário · 5 Inapto). Exame 04: Tabela 05. Demais: Tabelas 06/07.',
    fonte: 'MANUAL',
  },
  {
    seq: 5, chave: 'dataValidade', nomeManual: 'Data-Validade', rotulo: 'Data de validade', grupo: 'Resultado',
    posicao: '063–070', tamanho: 8, formatoManual: 'N', obrigatoriedade: 'CONDICIONAL', tabelado: false, formato: '^\\d{4}-\\d{2}-\\d{2}$',
    condicao: 'Obrigatória no Exame 03 e no Exame 04 com observação 15; não se aplica aos demais. Inapto Temporário: data de término da inaptidão. Máximo de 10/5/3 anos conforme a idade (exames a partir de 12/04/2021).',
    ajuda: 'Validade do exame; define a validade da nova CNH.', fonte: 'MANUAL',
  },
  {
    seq: 6, chave: 'cpfExaminador1', nomeManual: 'CPF-Examinador 1', rotulo: 'CPF do examinador 1', grupo: 'Profissional',
    posicao: '071–081', tamanho: 11, formatoManual: 'N', obrigatoriedade: 'CONDICIONAL', tabelado: false, formato: '^\\d{11}$',
    condicao: 'Obrigatório, exceto nos exames 05, 06 e 07 (prova eletrônica).',
    ajuda: 'Profissional com vínculo ativo à entidade credenciada.', fonte: 'MANUAL',
  },
  {
    seq: 7, chave: 'cpfExaminador2', nomeManual: 'CPF-Examinador 2', rotulo: 'CPF do examinador 2', grupo: 'Profissional',
    posicao: '082–092', tamanho: 11, formatoManual: 'N', obrigatoriedade: 'OPCIONAL', tabelado: false, formato: '^\\d{11}$',
    ajuda: 'Opcional (exames práticos 01/02 e reciclagem 07).', fonte: 'MANUAL',
  },
  {
    seq: 8, chave: 'cnpjEntidadeCredenciada', nomeManual: 'CNPJ-Entidade-Creden', rotulo: 'CNPJ da entidade credenciada', grupo: 'Entidade Credenciada',
    posicao: '093–106', tamanho: 14, formatoManual: 'N', obrigatoriedade: 'OBRIGATORIO', tabelado: false, formato: '^\\d{14}$',
    ajuda: 'Nos exames 05/06/07, CNPJ da instituição que aplica a prova eletrônica.', fonte: 'MANUAL',
  },
  {
    seq: 9, chave: 'municipioExame', nomeManual: 'Município-Exame', rotulo: 'Município do exame', grupo: 'Dados do Exame',
    posicao: '107–111', tamanho: 5, formatoManual: 'N', obrigatoriedade: 'OBRIGATORIO', tabelado: true, formato: '^\\d{5}$',
    ajuda: 'Tabela de municípios da Receita Federal; deve pertencer à UF do exame.', fonte: 'MANUAL',
  },
  {
    seq: 10, chave: 'ufExame', nomeManual: 'UF-Exame', rotulo: 'UF do exame', grupo: 'Dados do Exame',
    posicao: '112–113', tamanho: 2, formatoManual: 'AN', obrigatoriedade: 'OBRIGATORIO', tabelado: true, formato: '^[A-Z]{2}$',
    ajuda: 'Tabela 01 – UF. Só a UF de domínio registra exames do condutor.', fonte: 'MANUAL',
  },
  {
    seq: 11, chave: 'categoriaPretendida', nomeManual: 'Categoria-Pretendida', rotulo: 'Categoria pretendida', grupo: 'Categoria',
    posicao: '114–117', tamanho: 4, formatoManual: 'AN', obrigatoriedade: 'OBRIGATORIO', tabelado: true, formato: '^[A-Z]{1,4}$',
    ajuda: 'Nos exames 03 e 04, informar a categoria total do condutor.', fonte: 'MANUAL',
  },
  {
    seq: 12, chave: 'categoriaPermitida', nomeManual: 'Categoria-Permitida', rotulo: 'Categoria permitida', grupo: 'Categoria',
    posicao: '118–121', tamanho: 4, formatoManual: 'AN', obrigatoriedade: 'CONDICIONAL', tabelado: true, formato: '^[A-Z]{1,4}$',
    condicao: 'Obrigatória, exceto quando o resultado for Inapto ou Inapto Temporário. Não pode ser superior à pretendida.',
    ajuda: 'Categoria liberada pelo exame.', fonte: 'MANUAL',
  },
  {
    seq: 13, chave: 'observacoes', nomeManual: 'Observações', rotulo: 'Observações', grupo: 'Observações e Restrições',
    posicao: '122–141', tamanho: 20, formatoManual: 'AN', obrigatoriedade: 'OBRIGATORIO', tabelado: true,
    ajuda: 'Até 10 códigos de 2 posições. 99 = sem observação (não combina com outro). Letras A–Z = restrições médicas (Tabela 09). 15 só no Exame 04 e não combina com 40. Exames diferentes de 03/04: sempre 99.',
    fonte: 'MANUAL',
  },
  {
    seq: 14, chave: 'restricoesXTexto', nomeManual: 'Restrições-X-Texto', rotulo: 'Restrições (texto da observação X)', grupo: 'Observações e Restrições',
    posicao: '142–229', tamanho: 88, formatoManual: 'A', obrigatoriedade: 'CONDICIONAL', tabelado: false,
    condicao: 'Obrigatório se houver X nas Observações (retorno 214); só nos exames 03 e 04.',
    ajuda: 'Descrição livre da restrição "X – Outras restrições".', fonte: 'MANUAL',
  },
  {
    seq: 15, chave: 'cnpjLaboratorio', nomeManual: 'CNPJ-Laboratório', rotulo: 'CNPJ do laboratório toxicológico', grupo: 'Entidade Credenciada',
    posicao: '230–243', tamanho: 14, formatoManual: 'N', obrigatoriedade: 'OPCIONAL', tabelado: false, formato: '^\\d{14}$',
    condicao: 'Exigido só para categorias C, D e E em exames com coleta anterior a 25/06/2018; hoje o laudo chega pelo evento T (laboratório).',
    ajuda: 'Informado pelo médico.', fonte: 'MANUAL',
  },
  {
    seq: 16, chave: 'numeroLaudo', nomeManual: 'Número-Laudo', rotulo: 'Número do laudo toxicológico', grupo: 'Entidade Credenciada',
    posicao: '244–273', tamanho: 30, formatoManual: 'AN', obrigatoriedade: 'OPCIONAL', tabelado: false, formato: '^[A-Z0-9]{6}[A-Z]{2}\\d{9}$',
    condicao: 'Mesma regra do CNPJ-Laboratório. Formato XXXXXXAA999999999 (17 posições usadas).',
    ajuda: 'Informado pelo médico.', fonte: 'MANUAL',
  },
];
