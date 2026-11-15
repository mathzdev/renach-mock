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
