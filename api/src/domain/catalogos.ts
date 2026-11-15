import { Retorno } from './tipos';

/**
 * Tabelas e campos pré-codificados transcritos do Manual RENACH v8.2
 * (seções "Campos Pré-Codificados" e "Tabelas"). Entidades, profissionais e
 * municípios são FICTÍCIOS ou de massa demonstrativa.
 */

export const UF_ORIGEM_DEMO = 'SP'; // UF do DETRAN que "comanda" as transações na POC

export const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
  'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

/** Tabela 03 – Categoria. */
export const CATEGORIAS = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE', 'X', 'XB', 'XC', 'XD', 'XE'];

/** Nível da parte "4 rodas" da categoria, para comparar pretendida x permitida. */
export function nivelCategoria(cat: string): number {
  const base = cat.replace(/^[AX](?=[BCDE])/, '');
  return { X: 0, A: 0, B: 1, C: 2, D: 3, E: 4 }[base] ?? -1;
}
export function temDuasRodas(cat: string): boolean {
  return /^(A|X)/.test(cat);
}

/** Campos pré-codificados — CÓDIGO-EXAME (exames que o DETRAN registra pela TR 181). */
export const EXAMES: Record<string, string> = {
  '01': 'Prática de Direção Veicular 2 Rodas',
  '02': 'Prática de Direção Veicular 4 Rodas',
  '03': 'Aptidão Física e Mental',
  '04': 'Avaliação Psicológica',
  '05': 'Teórico Técnico Formação',
  '06': 'Teórico Técnico para Atualização',
  '07': 'Teórico Técnico para Reciclagem',
};

/** Campos pré-codificados — CÓDIGO-CURSO (apenas os usados na massa e nas regras da 159). */
export const CURSOS: Record<string, string> = {
  '30': 'Atualização para Renovação da CNH',
  '31': 'Aulas Teóricas – Legislação',
  '32': 'Aulas Práticas 04 Rodas',
  '33': 'Aulas Práticas 02 Rodas',
  '34': 'Simulador de Direção Veicular',
};

/** Categorias aceitas para CANDIDATO não PGU e não estrangeiro (TR 181, Consistência III.1; quadro do Motivo 1 da 155). */
export const CATEGORIAS_CANDIDATO = ['A', 'B', 'AB', 'X', 'XB'];

/** Campos pré-codificados — MODALIDADE-CURSO. */
export const MODALIDADES_CURSO: Record<string, string> = {
  '1': 'Presencial (integral)',
  '2': 'Ensino a distância / autodidata',
  '3': 'Aproveitamento de estudos (comprovado)',
  '4': 'Presencial (parcial) com EAD/autodidata e/ou aproveitamento',
  '5': 'EAD/autodidata com aproveitamento de estudos',
};
/** TR 181 Evento C, Observação 1: Modalidade obrigatória nesses cursos (nos 31–34 não se aplica). */
export const CURSOS_COM_MODALIDADE = ['01', '02', '03', '04', '07', '11', '12', '13', '14', '17', '20', '30'];

/** Campos pré-codificados — NACIONALIDADE. */
export const NACIONALIDADES: Record<string, string> = {
  '1': 'Brasileiro',
  '2': 'Brasileiro naturalizado',
  '3': 'Estrangeiro',
  '4': 'Brasileiro nascido no exterior',
};

/** Campos pré-codificados — TIPO-DOCUMENTO-IDENTIDADE. */
export const TIPOS_DOCUMENTO_IDENTIDADE: Record<string, string> = {
  '1': 'Carteira de Identidade',
  '2': 'Carteira Profissional',
  '3': 'Passaporte',
  '4': 'Carteira de Reservista',
};

/** Tabelas 05 a 08 — o domínio do Resultado depende do exame. */
export const RESULTADOS_POR_EXAME: Record<string, Record<string, string>> = {
  '01': { '1': 'Apto', '2': 'Inapto' }, // Tabela 06
  '02': { '1': 'Apto', '2': 'Inapto' }, // Tabela 06
  '03': { '1': 'Apto', '2': 'Apto com Restrições', '4': 'Inapto Temporário', '5': 'Inapto' }, // Tabela 08
  '04': { '1': 'Apto', '2': 'Inapto Temporário', '3': 'Inapto' }, // Tabela 05
  '05': { '1': 'Apto', '2': 'Inapto' }, // Tabela 07
  '06': { '1': 'Apto', '2': 'Inapto' }, // Tabela 07
  '07': { '1': 'Apto', '2': 'Inapto' }, // Tabela 07
};

/** Resultado que libera a emissão em cada tabela. */
export function resultadoApto(codigoExame: string, resultado: string): boolean {
  if (codigoExame === '03') return resultado === '1' || resultado === '2';
  return resultado === '1';
}

/** Tabela 09 – Restrições médicas (também usadas no campo Observações do exame). */
export const RESTRICOES_MEDICAS: Record<string, string> = {
  A: 'Obrigatório o uso de lentes corretivas',
  B: 'Obrigatório o uso de prótese auditiva',
  C: 'Obrigatório o uso de acelerador à esquerda',
  D: 'Obrigatório o uso de veículo com transmissão automática',
  E: 'Obrigatório o uso de empunhadura/manopla/pomo no volante',
  F: 'Obrigatório o uso de veículo com direção hidráulica',
  G: 'Obrigatório o uso de veículo com embreagem manual ou com automação de embreagem ou com transmissão automática',
  H: 'Obrigatório o uso de acelerador e freio manual',
  I: 'Obrigatório o uso de adaptação dos comandos de painel ao volante',
  J: 'Obrigatório o uso de adaptação dos comandos de painel para os membros inferiores e/ou outras partes do corpo',
  K: 'Obrigatório o uso de veículo com prolongamento da alavanca de câmbio e/ou almofadas (fixas) de compensação de altura e/ou profundidade',
  L: 'Obrigatório o uso de veículo com prolongadores dos pedais e elevação do assoalho e/ou almofadas fixas de compensação de altura e/ou profundidade',
  M: 'Obrigatório o uso de motocicleta com pedal de câmbio adaptado',
  N: 'Obrigatório o uso de motocicleta com pedal do freio traseiro adaptado',
  O: 'Obrigatório o uso de motocicleta com manopla do freio dianteiro adaptado',
  P: 'Obrigatório o uso de motocicleta com manopla de embreagem adaptada',
  Q: 'Obrigatório o uso de motocicleta com carro lateral ou triciclo',
  R: 'Obrigatório o uso de motoneta com carro lateral ou triciclo',
  S: 'Obrigatório o uso de motocicleta com automação de troca de marchas',
  T: 'Vedado dirigir em rodovias e vias de trânsito rápido',
  U: 'Vedado dirigir após o pôr-do-sol',
  V: 'Obrigatório o uso de capacete de segurança com viseira protetora sem limitação de campo visual',
  W: 'Aposentado por invalidez',
  X: 'Outras restrições',
  Y: 'Surdo',
  Z: 'Visão monocular',
};

/** Campos pré-codificados — OBSERVAÇÃO (códigos numéricos aceitos em exames 03/04). */
export const OBSERVACOES_EXAME: Record<string, string> = {
  '15': 'Apto para Transporte Remunerado ao veículo',
  '40': 'Vedada a Atividade Remunerada (não impresso na CNH)',
  '44': 'Indicativo de Banca Especial no Exame 03 para Exame Prático de 2 Rodas (não impresso)',
  '45': 'Indicativo de Banca Especial no Exame 03 para Exame Prático de 4 Rodas (não impresso)',
  '46': 'Alteração de Data-Validade por Recurso a Decisão da Junta Médica (não impresso)',
  '51': 'Ignorar Exame 04 e Cursos Especiais no cálculo da categoria, validade e observação',
  '99': 'Sem observação',
};

/** Observações que não são impressas na CNH (não entram em Observação-CNH). */
export const OBS_NAO_IMPRESSAS = ['40', '43', '44', '45', '46', '47', '51', '99'];

/** Campos pré-codificados — MOTIVO-REQUERIMENTO (exibido; a POC executa o 5 na TR 159 e o 1 na TR 155). */
export const MOTIVOS_REQUERIMENTO: Record<string, string> = {
  '1': 'Primeira Habilitação',
  '2': '2ª Via',
  '3': 'Registro Habilitação Estrangeira',
  '4': 'Registro PGU',
  '5': 'Renovação de Exames',
  '6': 'Mudança de Categoria',
  '7': 'Adição de Categoria',
  '8': 'Alteração de Dados',
  '9': 'Reabilitação',
  C: 'CNH Definitiva',
  E: 'Reinício de Processo',
};

export const TIPOS_CHAVE: Record<string, string> = {
  '1': 'Número-Formulário-RENACH',
  '2': 'Número-Registro',
  '7': 'Número-CPF',
};

export const MOTIVOS_BLOQUEIO: Record<string, string> = {
  '1': 'Impedido de Ser Habilitado',
  '2': 'Suspensão',
  '3': 'Cassação CNH',
  '7': 'Inapto',
  D: 'Medida Administrativa',
};

/**
 * Municípios (TOM/Receita Federal). O Manual remete à tabela da Receita e não a
 * reproduz; os códigos abaixo são da massa demonstrativa.
 */
export const MUNICIPIOS: Record<string, { nome: string; uf: string }> = {
  '07107': { nome: 'São Paulo', uf: 'SP' },
  '06291': { nome: 'Campinas', uf: 'SP' },
};

export interface EntidadeCredenciada {
  cnpj: string;
  nome: string;
  tipo: 'CLINICA' | 'LABORATORIO' | 'CFC' | 'DETRAN_EXAMES';
  municipio: string;
  uf: string;
}

export interface Profissional {
  cpf: string;
  nome: string;
  funcao: 'Médico' | 'Psicólogo' | 'Instrutor de Trânsito' | 'Examinador de Trânsito';
  entidade: string; // CNPJ da entidade com vínculo ativo
}

export const ENTIDADES: EntidadeCredenciada[] = [
  { cnpj: '99000000000159', nome: 'Clínica Demonstrativa Horizonte (POC)', tipo: 'CLINICA', municipio: '07107', uf: 'SP' },
  { cnpj: '99000001000101', nome: 'Clínica Demonstrativa Aurora (POC)', tipo: 'CLINICA', municipio: '06291', uf: 'SP' },
  { cnpj: '99000002000148', nome: 'Laboratório Demonstrativo Vértice (POC)', tipo: 'LABORATORIO', municipio: '07107', uf: 'SP' },
  { cnpj: '99000003000192', nome: 'CFC Demonstrativo Rota Certa (POC)', tipo: 'CFC', municipio: '07107', uf: 'SP' },
  { cnpj: '99000004000137', nome: 'Banca Examinadora Demonstrativa (POC)', tipo: 'DETRAN_EXAMES', municipio: '07107', uf: 'SP' },
];

export const PROFISSIONAIS: Profissional[] = [
  { cpf: '90000000175', nome: 'Dra. Helena Prado Siqueira (fictícia)', funcao: 'Médico', entidade: '99000000000159' },
  { cpf: '90000000256', nome: 'Dr. Otávio Nunes Barreto (fictício)', funcao: 'Psicólogo', entidade: '99000000000159' },
  { cpf: '90000000337', nome: 'Dra. Lívia Andrade Rocha (fictícia)', funcao: 'Médico', entidade: '99000001000101' },
  { cpf: '90000000418', nome: 'Instr. Caio Ferraz Lemos (fictício)', funcao: 'Instrutor de Trânsito', entidade: '99000003000192' },
  { cpf: '90000000507', nome: 'Exam. Renata Sales Moura (fictícia)', funcao: 'Examinador de Trânsito', entidade: '99000004000137' },
];

/**
 * Compatibilidade evento x profissional x entidade (TR 185, quadro TIPO-PROFISSIONAL x TIPO-ENTIDADE;
 * TR 181, retorno 662). Exame 03: médico em clínica; 04: psicólogo em clínica; 01/02: examinador de
 * trânsito em entidade de exames do DETRAN; 05/06/07: entidade de exames do DETRAN; cursos: CFC e instrutor.
 */
export function eventoCompativel(evento: string, ent?: EntidadeCredenciada, prof?: Profissional): string | null {
  const exige = (tipos: EntidadeCredenciada['tipo'][], funcao?: Profissional['funcao']) => {
    if (ent && !tipos.includes(ent.tipo)) return `${ent.nome} não realiza este evento.`;
    if (funcao && prof && prof.funcao !== funcao) return `${prof.nome} (${prof.funcao}) não pode registrar este evento; exige ${funcao}.`;
    return null;
  };
  if (evento === 'E03') return exige(['CLINICA'], 'Médico');
  if (evento === 'E04') return exige(['CLINICA'], 'Psicólogo');
  if (evento === 'E01' || evento === 'E02') return exige(['DETRAN_EXAMES'], 'Examinador de Trânsito');
  if (/^E0[567]$/.test(evento)) return exige(['DETRAN_EXAMES'], 'Examinador de Trânsito');
  if (evento.startsWith('C')) return exige(['CFC'], 'Instrutor de Trânsito');
  return null;
}

/**
 * TR 181, Consistência VII: validade máxima dos exames 03 e 04 realizados a
 * partir de 12/04/2021 — 10 anos (< 50), 5 anos (50 a 69), 3 anos (>= 70).
 * Antes disso: 5 anos, ou 3 anos acima de 65.
 */
export function validadeMaximaAnos(idade: number, dataExame: string): number {
  if (dataExame >= '2021-04-12') {
    if (idade >= 70) return 3;
    if (idade >= 50) return 5;
    return 10;
  }
  return idade > 65 ? 3 : 5;
}

/** Valida dígitos verificadores no padrão CPF (também usados no Número-Registro). */
export function digitosCpfValidos(v: string): boolean {
  if (!/^\d{11}$/.test(v) || /^(\d)\1{10}$/.test(v)) return false;
  const d = v.split('').map(Number);
  for (const n of [9, 10]) {
    let s = 0;
    for (let i = 0; i < n; i++) s += d[i] * (n + 1 - i);
    const r = ((s * 10) % 11) % 10;
    if (r !== d[n]) return false;
  }
  return true;
}

export function cnpjValido(v: string): boolean {
  if (!/^\d{14}$/.test(v) || /^(\d)\1{13}$/.test(v)) return false;
  const d = v.split('').map(Number);
  const calc = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const s = pesos.reduce((acc, p, i) => acc + p * d[i], 0);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === d[12] && calc(13) === d[13];
}

/** Mensagens oficiais dos códigos de retorno usados pela POC (TR 575, 181 e 159). */
const MSG: Record<string, string> = {
  // TR 151, 155 e Evento C da 181 (primeira habilitação)
  '004': 'Nome e Documento de Identidade cadastrado.',
  '009': 'Transação indevida para Natureza do Registro.',
  '010': 'Candidato com Bloqueio.',
  '015': 'Candidato já habilitado.',
  '073': 'Nome, Data de Nascimento e Nome da Mãe cadastrado na BINCO (inexistência de Autorização Especial de Duplicidade da SENATRAN).',
  '222': 'Modalidade do curso fora da tabela ou ausente ou não se aplica ao curso.',
  '300': 'Nome da Mãe em Branco – Confirme.',
  '301': 'Nome do Pai Inválido.',
  '302': 'Endereço Logradouro inválido ou ausente.',
  '304': 'Endereço Bairro inválido ou ausente.',
  '305': 'Endereço CEP inválido ou ausente.',
  '306': 'Endereço Município fora da tabela ou ausente.',
  '307': 'Endereço UF fora da tabela ou ausente.',
  '308': 'Endereço Município não pertence a Endereço UF informada.',
  '311': 'Condutor menor de 18 anos.',
  '316': 'Para o Motivo de Requerimento 1 – Primeira Habilitação, o Curso 31 – Aulas Teóricas – Legislação deve estar registrado no Prontuário do candidato.',
  '321': 'Exame 03 – Aptidão Física e Mental deve estar registrado no Prontuário do candidato com validade vigente.',
  '322': 'Para o Motivo de Requerimento 1 – Primeira Habilitação, o Exame 04 – Avaliação Psicológica deve estar registrado no Prontuário do candidato com validade vigente.',
  '323': 'Para o Motivo de Requerimento 1 – Primeira Habilitação, o Exame 05 – Teórico Técnico de Formação deve estar registrado no Prontuário do candidato.',
  '348': 'O Motivo de Requerimento 1 – Primeira Habilitação, não pode estar acompanhado de outro motivo.',
  '350': 'Motivo de Requerimento indevido para a transação.',
  '369': 'Motivo de Requerimento 1 – Primeira Habilitação Não é Aceito Pela Transação 159.',
  '382': 'Para o Curso 33 – Aulas Práticas 2 Rodas as Categorias Possíveis são: X e A.',
  '383': 'Para o Curso 32 – Aulas Práticas 4 Rodas as Categorias Possíveis são: B, C, D e E.',
  '390': 'O campo modalidade é obrigatório para este curso.',
  '391': 'A carga horária é obrigatório para este curso.',
  '394': 'Categoria é obrigatório para este curso.',
  '396': 'Código do curso fora da tabela ou ausente.',
  '397': 'Data início curso inválida.',
  '398': 'Data fim curso inválida.',
  '400': 'CPF instrutor inválido ou ausente.',
  '472': 'Carga-horária Inválida.',
  '479': 'Número-Certificado Inválido.',
  '486': 'Categoria não compatível com o Motivo de Requerimento.',
  '524': 'Inexistência de Curso/Exame Prático no Prontuário do Candidato/Condutor.',
  '529': 'Para o Motivo Requerimento: 1 – Primeira Habilitação a Data de Primeira Habilitação deve ser igual à data da transação.',
  '590': 'Curso 34 - Simulador de Direção Veicular não consta no Prontuário do Candidato.',
  '592': 'Inexistência de evento pré-requisito para inclusão do Curso 34 – Simulador de Direção Veículo.',
  '593': 'Carga horária insuficiente para o Curso/Exame.',
  '594': 'Candidato não solicitou/autorizado para categoria B.',
  '662': 'Evento não compatível com a Entidade/Profissional.',
  '761': 'Número do CPF já pertence a Candidato ou Condutor cadastrado na BCA.',
  '763': 'Processo Vencido – Excedido o período de um ano entre data da primeira habilitação e data de cadastramento.',
  '805': 'Nome do cidadão, candidato ou do condutor inválido ou ausente.',
  '809': 'Data de Nascimento inválida ou ausente.',
  '810': 'Data de Cadastramento inválida ou maior que a Data Atual.',
  '812': 'Sexo inválido ou ausente.',
  '814': 'Nome da Mãe inválido.',
  '818': 'Tipo do Documento de Identidade inválido.',
  '819': 'Número do Documento de Identidade inválido ou ausente.',
  '832': 'Localidade de Nascimento (País ou Município) fora da tabela ou ausente.',
  '835': 'Nacionalidade fora da tabela ou ausente.',
  '971': 'Nome Social Inválido.',
  '972': 'Filiação-afetiva Inválida.',

  '000': 'Transação Efetuada.',
  '002': 'Campos Obrigatórios Ausentes.',
  '003': 'Duplicata de Número Formulário RENACH.',
  '006': 'Inexistência de Número de Formulário RENACH na Base.',
  '011': 'UF de Origem da Transação Diferente da UF de Domínio.',
  '016': 'Inexistência de Número de Registro na Base.',
  '017': 'CNH Sendo Emitida.',
  '018': 'Condutor com Bloqueio.',
  '020': 'Autorização da Habilitação já efetuada.',
  '212': 'Condutor requer Curso Atualização Renovação CNH ou exame teórico técnico para atualização.',
  '214': 'Código de Observação X registrado no campo Código Observação – O Campo Restrições-X-Texto não pode estar em branco.',
  '330': 'Para o Motivo de Requerimento: 5 - Renovação o Exame 03 – Aptidão Física e Mental Deve Estar Registrado no Prontuário do Condutor/Candidato com Data Validade Vigente e Data-Exame posterior a última Emissão.',
  '345': 'Curso/Exame não compatível com a Categoria Registrada no Prontuário do Candidato/Condutor.',
  '346': 'Exame não compatível com a categoria registrada no prontuário do candidato/condutor.',
  '372': 'CNH Vencida Há Mais de Cinco anos. É Obrigatório Um Novo Curso 30 - Atualização Para Renovação da CNH.',
  '373': 'Inexistência de Dados Obrigatórios no Prontuário do Condutor (Endereço).',
  '375': 'O Número Formulário RENACH só é aceito para candidato.',
  '376': 'Tipo de evento inválido ou ausente.',
  '377': 'Tipo atualização evento inválido ou ausente.',
  '384': 'Para o Exame 01 – Práticas Direção Veicular 2 Rodas as Categorias Possíveis são: X e A.',
  '385': 'Para o Exame 02 – Práticas Direção Veicular 4 Rodas as Categorias Possíveis são: B, C, D e E.',
  '388': 'Categoria permitida deve ser igual ou inferior a categoria pretendida.',
  '392': 'O município do evento não pertence a UF evento.',
  '395': 'Evento já registrado no prontuário do condutor/candidato.',
  '399': 'CNPJ entidade credenciada inválido ou ausente.',
  '401': 'Município evento fora da tabela ou ausente.',
  '402': 'UF evento fora da tabela ou ausente.',
  '403': 'Evento Não Cadastrado no Prontuário do Condutor/Candidato.',
  '404': 'Dados não Divergem dos Cadastrados na BINCO/BCA.',
  '407': 'Código do Exame Fora da Tabela ou Ausente.',
  '408': 'Data Exame inválida ou ausente.',
  '409': 'Resultado Inválido ou Ausente.',
  '410': 'CPF examinador 1 inválido ou ausente.',
  '411': 'CPF examinador 2 inválido.',
  '412': 'Categoria pretendida fora da tabela ou ausente.',
  '413': 'Categoria permitida fora da tabela ou ausente.',
  '414': 'Código de observação inválido ou ausente.',
  '415': 'O Código de Observação 99 – Sem Observação, não pode estar combinado com outro código.',
  '416': 'O Código de Observação 15 – Apto Para Transporte Remunerado ao Veículo não Pode Estar Combinado com Código 40 – Vedada a Atividade Remunerada ao Veículo.',
  '417': 'Na existência de Restrições Medicas na Observação do Exame o Resultado do Exame não pode ser Apto.',
  '473': 'Data-Validade Inválida ou Ausente ou Não se Aplica ao Curso/Exame.',
  '525': 'CPF Não existe na BASE.',
  '611': 'Inexistência do Código da Entidade/Profissional na Base',
  '639': 'Vinculo do profissional à entidade inexistente',
  '644': 'E-mail inválido',
  '660': 'Tipo de Autorização inválido.',
  '664': 'CNPJ Laboratório Inválido ou Ausente',
  '665': 'Número do Laudo Inválido ou Ausente.',
  '666': 'Exame toxicológico vencido.',
  '668': 'Inexistência do exame toxicológico.',
  '669': 'Data da tr. 155/159 não pode ser menor que a data do exame toxicológico.',
  '686': 'Pendência no exame toxicológico.',
  '701': 'DDD inválido.',
  '702': 'Telefone celular inválido.',
  '752': 'Número de Registro Inválido.',
  '801': 'UF do Número de Formulário RENACH Fora da Tabela de UF.',
  '802': 'Número de Formulário RENACH Inválido ou Ausente.',
  '804': 'UF do Número de Formulário RENACH Diferente da UF de Origem da Transação.',
  '830': 'CPF inválido.',
  '834': 'Motivo de Requerimento Fora da Tabela ou Ausente.',
  '837': 'Código da Categoria Fora da Tabela.',
  '838': 'Data da Validade da CNH Inválida ou Ausente.',
  '890': 'Tipo da Chave de Pesquisa Inválido.',
  '982': 'Categoria informada diferente da categoria na BCA.',
};

export function ret(codigo: string): Retorno {
  const mensagem = MSG[codigo];
  if (!mensagem) throw new Error(`Código ${codigo} não catalogado`);
  return { codigo, mensagem, origemCodigo: 'MANUAL' };
}

export function retPoc(codigo: string, mensagem: string): Retorno {
  return { codigo: `POC-${codigo}`, mensagem, origemCodigo: 'POC_LOCAL' };
}
