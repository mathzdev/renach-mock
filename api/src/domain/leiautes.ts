/** Leiautes de envio (TR 575 e TR 159) transcritos do Manual RENACH v8.2. */
export interface CampoLeiaute {
  posicao: string;
  tamanho: number;
  obrigatorio: boolean;
  tabelado: boolean;
  formato: 'N' | 'AN' | 'A';
  elemento: string;
  chave?: string; // propriedade correspondente no payload da POC
}

export const LEIAUTE_575: CampoLeiaute[] = [
  { posicao: '001–037', tamanho: 37, obrigatorio: true, tabelado: false, formato: 'AN', elemento: 'Parte Fixa da Transação' },
  { posicao: '038–038', tamanho: 1, obrigatorio: true, tabelado: true, formato: 'N', elemento: 'Tipo-Chave', chave: 'tipoChave' },
  { posicao: '039–049', tamanho: 11, obrigatorio: true, tabelado: false, formato: 'AN', elemento: 'Número', chave: 'numero' },
  { posicao: '050–051', tamanho: 2, obrigatorio: false, tabelado: false, formato: 'N', elemento: 'Parte-Consulta' },
];

export const LEIAUTE_159: CampoLeiaute[] = [
  { posicao: '001–037', tamanho: 37, obrigatorio: true, tabelado: false, formato: 'AN', elemento: 'Parte Fixa da Transação' },
  { posicao: '038–048', tamanho: 11, obrigatorio: true, tabelado: true, formato: 'N', elemento: 'Número-REGISTRO', chave: 'numeroRegistro' },
  { posicao: '049–059', tamanho: 11, obrigatorio: true, tabelado: false, formato: 'AN', elemento: 'Número-Formulário-RENACH', chave: 'numeroFormularioRenach' },
  { posicao: '060–063', tamanho: 4, obrigatorio: true, tabelado: false, formato: 'AN', elemento: 'Motivo-Requerimento', chave: 'motivoRequerimento' },
  { posicao: '064–107', tamanho: 44, obrigatorio: true, tabelado: false, formato: 'AN', elemento: 'Nome-condutor', chave: 'nomeCondutor' },
  { posicao: '108–118', tamanho: 11, obrigatorio: true, tabelado: false, formato: 'N', elemento: 'CPF', chave: 'cpf' },
  { posicao: '119–146', tamanho: 28, obrigatorio: true, tabelado: false, formato: 'AN', elemento: 'Identidade', chave: 'identidade' },
  { posicao: '147–147', tamanho: 1, obrigatorio: true, tabelado: false, formato: 'N', elemento: 'Nacionalidade', chave: 'nacionalidade' },
  { posicao: '148–151', tamanho: 4, obrigatorio: true, tabelado: false, formato: 'AN', elemento: 'Categoria', chave: 'categoria' },
  { posicao: '152–159', tamanho: 8, obrigatorio: true, tabelado: false, formato: 'N', elemento: 'Data-Validade', chave: 'dataValidade' },
  { posicao: '160–167', tamanho: 8, obrigatorio: true, tabelado: false, formato: 'N', elemento: 'Data-Primeira-Habilitação', chave: 'dataPrimeiraHabilitacao' },
  { posicao: '168–175', tamanho: 8, obrigatorio: true, tabelado: false, formato: 'N', elemento: 'Data-Nascimento', chave: 'dataNascimento' },
  { posicao: '176–219', tamanho: 44, obrigatorio: true, tabelado: false, formato: 'AN', elemento: 'Nome-Mãe', chave: 'nomeMae' },
  { posicao: '220–263', tamanho: 44, obrigatorio: true, tabelado: false, formato: 'AN', elemento: 'Nome-Pai', chave: 'nomePai' },
  { posicao: '264–283', tamanho: 20, obrigatorio: true, tabelado: false, formato: 'AN', elemento: 'Observações', chave: 'observacoes' },
  { posicao: '284–284', tamanho: 1, obrigatorio: true, tabelado: false, formato: 'N', elemento: 'Tipo de Autorização', chave: 'tipoAutorizacao' },
  { posicao: '285–286', tamanho: 2, obrigatorio: false, tabelado: false, formato: 'N', elemento: 'DDD (obrigatório se Tipo de Autorização = 2)', chave: 'ddd' },
  { posicao: '287–295', tamanho: 9, obrigatorio: false, tabelado: false, formato: 'N', elemento: 'Telefone Celular (obrigatório se Tipo de Autorização = 2)', chave: 'telefoneCelular' },
  { posicao: '296–355', tamanho: 60, obrigatorio: false, tabelado: false, formato: 'AN', elemento: 'E-mail (obrigatório se Tipo de Autorização = 2)', chave: 'email' },
  { posicao: '356–399', tamanho: 44, obrigatorio: false, tabelado: false, formato: 'AN', elemento: 'Filiação-Afetiva-1' },
  { posicao: '400–443', tamanho: 44, obrigatorio: false, tabelado: false, formato: 'AN', elemento: 'Filiação-Afetiva-2' },
];

const c = (posicao: string, tamanho: number, obrigatorio: boolean, tabelado: boolean, formato: CampoLeiaute['formato'], elemento: string, chave?: string): CampoLeiaute =>
  ({ posicao, tamanho, obrigatorio, tabelado, formato, elemento, chave });

/** TR 151 – Cadastrar Candidato (Leiaute Envio). Campos de estrangeiro e PGU listados, mas fora do escopo da POC. */
export const LEIAUTE_151: CampoLeiaute[] = [
  c('001–037', 37, true, false, 'AN', 'Parte Fixa da Transação'),
  c('038–048', 11, true, false, 'AN', 'Número-Formulário-RENACH', 'numeroFormularioRenach'),
  c('049–092', 44, true, false, 'A', 'Nome-Candidato-Civil', 'nomeCandidatoCivil'),
  c('093–100', 8, true, false, 'N', 'Data-Nascimento', 'dataNascimento'),
  c('101–101', 1, true, true, 'N', 'Sexo', 'sexo'),
  c('102–145', 44, true, false, 'A', 'Nome-Mãe', 'nomeMae'),
  c('146–189', 44, false, false, 'A', 'Nome-Pai', 'nomePai'),
  c('190–217', 28, true, false, 'AN', 'Documento-Identidade (Tipo 1 + Número 15 + Órgão-Emissor 10 + UF 2)', 'documentoIdentidade'),
  c('218–228', 11, true, false, 'N', 'CPF', 'cpf'),
  c('229–233', 5, true, true, 'AN', 'Localidade-Nascimento', 'localidadeNascimento'),
  c('234–283', 50, true, false, 'AN', 'Endereço-Logradouro', 'enderecoLogradouro'),
  c('284–293', 10, false, false, 'AN', 'Endereço-Número', 'enderecoNumero'),
  c('294–323', 30, false, false, 'AN', 'Endereço-Complemento', 'enderecoComplemento'),
  c('324–353', 30, true, false, 'AN', 'Endereço-Bairro', 'enderecoBairro'),
  c('354–361', 8, true, false, 'N', 'Endereço-CEP', 'enderecoCep'),
  c('362–366', 5, true, true, 'AN', 'Endereço-Município', 'enderecoMunicipio'),
  c('367–368', 2, true, true, 'A', 'Endereço-UF', 'enderecoUf'),
  c('369–377', 9, false, false, 'N', 'PGU (fora do escopo da POC)'),
  c('378–378', 1, true, true, 'N', 'Nacionalidade', 'nacionalidade'),
  c('379–386', 8, true, false, 'N', 'Data-Cadastramento', 'dataCadastramento'),
  c('387–413', 27, false, false, 'AN', 'Registro-Nacional-Estrangeiro (fora do escopo da POC)'),
  c('414–418', 5, false, true, 'AN', 'País-Origem-Habilitação-Estrangeira (fora do escopo da POC)'),
  c('419–448', 30, false, false, 'AN', 'Identificação-Habilitação-Estrangeira (fora do escopo da POC)'),
  c('449–456', 8, false, false, 'N', 'Validade-Habilitação-Estrangeira (fora do escopo da POC)'),
  c('457–458', 2, false, false, 'N', 'DDD', 'ddd'),
  c('459–467', 9, false, false, 'N', 'Telefone-Celular', 'telefoneCelular'),
  c('468–527', 60, false, false, 'AN', 'E-mail', 'email'),
  c('528–571', 44, false, false, 'A', 'Nome-Social', 'nomeSocial'),
  c('572–615', 44, false, false, 'A', 'Filiação-Afetiva-1', 'filiacaoAfetiva1'),
  c('616–659', 44, false, false, 'A', 'Filiação-Afetiva-2', 'filiacaoAfetiva2'),
];

/** TR 181 – Eventos, Tipo-Evento C (Curso), posições 051 a 152. */
export const LEIAUTE_181_CURSO: CampoLeiaute[] = [
  c('038–038', 1, true, true, 'N', 'Tipo-Chave', 'tipoChave'),
  c('039–049', 11, true, false, 'AN', 'Número', 'numero'),
  c('050–050', 1, true, true, 'A', 'Tipo-Evento (C)', 'tipoEvento'),
  c('051–051', 1, true, true, 'A', 'Tipo-Atualização', 'tipoAtualizacao'),
  c('052–053', 2, true, true, 'N', 'Código-Curso', 'codigoCurso'),
  c('054–054', 1, false, false, 'N', 'Modalidade (obs. 1: não se aplica aos cursos 31–34)', 'modalidade'),
  c('055–069', 15, false, false, 'AN', 'Número-Certificado', 'numeroCertificado'),
  c('070–077', 8, false, false, 'N', 'Data-Início-Curso', 'dataInicioCurso'),
  c('078–085', 8, false, false, 'N', 'Data-Fim-Curso', 'dataFimCurso'),
  c('086–088', 3, false, false, 'N', 'Carga-Horária (Curso 34: minutos, mínimo 150)', 'cargaHoraria'),
  c('089–102', 14, true, false, 'N', 'CNPJ-Entidade-Credenciada', 'cnpjEntidadeCredenciada'),
  c('103–113', 11, true, false, 'N', 'CPF-Instrutor', 'cpfInstrutor'),
  c('114–118', 5, true, true, 'N', 'Município-Curso', 'municipioCurso'),
  c('119–120', 2, true, true, 'AN', 'UF-Curso', 'ufCurso'),
  c('121–128', 8, false, false, 'N', 'Data-Validade (não se aplica aos cursos 30–34)', 'dataValidade'),
  c('129–132', 4, false, false, 'AN', 'Categoria (obrigatória nos cursos 32 e 33)', 'categoria'),
  c('133–152', 20, true, true, 'N', 'Observações-Curso', 'observacoesCurso'),
];

/** TR 155 – Habilitar Candidato (Leiaute Envio). */
export const LEIAUTE_155: CampoLeiaute[] = [
  c('001–037', 37, true, false, 'AN', 'Parte Fixa da Transação'),
  c('038–048', 11, true, false, 'AN', 'Número-Formulário-RENACH', 'numeroFormularioRenach'),
  c('049–052', 4, true, false, 'AN', 'Motivo-Requerimento', 'motivoRequerimento'),
  c('053–096', 44, true, false, 'AN', 'Nome-condutor (nome social, se houver)', 'nomeCondutor'),
  c('097–107', 11, true, false, 'N', 'CPF', 'cpf'),
  c('108–135', 28, true, false, 'AN', 'Identidade', 'identidade'),
  c('136–136', 1, true, false, 'N', 'Nacionalidade', 'nacionalidade'),
  c('137–140', 4, true, false, 'AN', 'Categoria', 'categoria'),
  c('141–148', 8, true, false, 'N', 'Data-Validade', 'dataValidade'),
  c('149–156', 8, true, false, 'N', 'Data-Primeira-Habilitação', 'dataPrimeiraHabilitacao'),
  c('157–164', 8, true, false, 'N', 'Data-Nascimento', 'dataNascimento'),
  c('165–208', 44, true, false, 'AN', 'Nome-mãe', 'nomeMae'),
  c('209–252', 44, true, false, 'AN', 'Nome-pai', 'nomePai'),
  c('253–272', 20, true, false, 'AN', 'Observações', 'observacoes'),
  c('273–273', 1, true, false, 'N', 'Tipo de Autorização', 'tipoAutorizacao'),
  c('274–275', 2, false, false, 'N', 'DDD (obrigatório se Tipo de Autorização = 2)', 'ddd'),
  c('276–284', 9, false, false, 'N', 'Telefone Celular (obrigatório se Tipo de Autorização = 2)', 'telefoneCelular'),
  c('285–344', 60, false, false, 'AN', 'E-mail (obrigatório se Tipo de Autorização = 2)', 'email'),
  c('345–388', 44, false, false, 'AN', 'Filiação-Afetiva-1', 'filiacaoAfetiva1'),
  c('389–432', 44, false, false, 'AN', 'Filiação-Afetiva-2', 'filiacaoAfetiva2'),
];
