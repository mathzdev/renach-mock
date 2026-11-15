import { hojeIso, somarDias, somarMeses } from './datas';
import { EventoExame, Prontuario } from './tipos';

/**
 * MASSA DEMONSTRATIVA — TODOS OS VALORES SÃO FICTÍCIOS.
 *
 * CPFs, Números-Registro, CNPJs e formulários foram montados com prefixos
 * artificiais (000/900/99) e dígitos verificadores válidos, para passar nas
 * críticas de formato do Manual sem identificar pessoas ou empresas reais.
 * HAB-2026-118342 é só referência ao processo estadual: nunca é chave RENACH.
 */

const CLINICA_HORIZONTE = '99000000000159';
const MEDICA = '90000000175';
const PSICOLOGO = '90000000256';

function exame(p: Partial<EventoExame> & Pick<EventoExame, 'codigoExame' | 'dataExame' | 'resultado'>): EventoExame {
  return {
    tipoEvento: 'E',
    dataValidade: null,
    cpfExaminador1: MEDICA,
    cpfExaminador2: null,
    cnpjEntidadeCredenciada: CLINICA_HORIZONTE,
    municipioExame: '07107',
    ufExame: 'SP',
    categoriaPretendida: 'B',
    categoriaPermitida: 'B',
    observacoes: ['99'],
    restricoesXTexto: null,
    cnpjLaboratorio: null,
    numeroLaudo: null,
    procedencia: 'FIXTURE',
    ...p,
  };
}

export function criarFixtures(): Prontuario[] {
  const hoje = hojeIso();
  const coletaRogerio = somarDias(hoje, -20);

  const marina: Prontuario = {
    numeroRegistro: '90011834250',
    processoEstadualReferencia: 'HAB-2026-118342',
    formularioRenachEmAndamento: 'SP926004517',
    dadosCadastrais: {
      nomeCondutorCivil: 'MARINA DUARTE CAMPOS',
      dataNascimento: '1981-07-18',
      sexo: '2',
      nomeMae: 'LUCIA DUARTE CAMPOS',
      nomePai: 'ANTONIO CAMPOS FILHO',
      documentoIdentidade: '900118342 SSP SP',
      cpf: '00000000191',
      localidadeNascimento: '07107',
      localidadeNascimentoDescricao: 'São Paulo/SP',
      enderecoLogradouro: 'RUA DEMONSTRATIVA DAS ACACIAS',
      enderecoNumero: '100',
      enderecoComplemento: 'APTO 12',
      enderecoBairro: 'JARDIM EXEMPLO',
      enderecoCep: '01000000',
      enderecoMunicipio: '07107',
      enderecoMunicipioDescricao: 'São Paulo',
      enderecoUf: 'SP',
      nacionalidade: '1',
      dataCadastramento: '2006-06-14',
      primeiraHabilitacao: '2006-09-02',
      ufDominio: 'SP',
      ddd: null,
      telefoneCelular: null,
      email: null,
    },
    dadosControle: {
      situacaoCnh: '4',
      situacaoCnhAnterior: '3',
      motivoRequerimento: '5',
      permissionario: '2',
      codigoTransacaoUltimaAtualizacao: '180',
      numeroFormularioRenach: 'SP921003318',
      numeroFormularioCnh: '9000000005',
      cancelamento: '0',
      categoriaAtual: 'B',
      categoriaRebaixada: null,
      categoriaAutorizada: 'B',
      dataValidadeCnh: '2026-03-10',
      observacaoCnh: ['A'],
      dataUltimaEmissaoHistorico: '2021-03-18',
      datasInicioCategoria: { B: '2006-09-02' },
    },
    toxicologico: { dataColeta: null, dataValidade: null, situacao: null, cnpjLaboratorio: null, numeroLaudo: null, prazoRealizacao: null },
    exames: [
      exame({ codigoExame: '02', dataExame: '2006-08-21', resultado: '1', cpfExaminador1: '90000000337', cnpjEntidadeCredenciada: null }),
      exame({ codigoExame: '03', dataExame: '2021-03-10', resultado: '2', dataValidade: '2026-03-10', observacoes: ['A '] }),
      exame({ codigoExame: '04', dataExame: '2006-06-20', resultado: '1', cpfExaminador1: PSICOLOGO }),
      exame({ codigoExame: '05', dataExame: '2006-07-15', resultado: '1', cpfExaminador1: null }),
    ],
    cursos: [
      { tipoEvento: 'C', codigoCurso: '31', dataInicioCurso: '2006-06-26', dataFimCurso: '2006-07-10', cnpjEntidadeCredenciada: '99000001000101', municipioCurso: '07107', ufCurso: 'SP', dataValidade: null, categoria: 'B', procedencia: 'FIXTURE' },
      { tipoEvento: 'C', codigoCurso: '32', dataInicioCurso: '2006-07-17', dataFimCurso: '2006-08-14', cnpjEntidadeCredenciada: '99000001000101', municipioCurso: '07107', ufCurso: 'SP', dataValidade: null, categoria: 'B', procedencia: 'FIXTURE' },
    ],
    bloqueios: [],
    ocorrencias: [],
    emissoes: [
      { dataEmissao: '2006-09-02', numeroFormularioCnh: '9000000001', numeroFormularioRenach: 'SP906001122', motivoRequerimento: '1', categoria: 'B', dataValidade: '2007-09-02', cancelada: false },
      { dataEmissao: '2007-09-05', numeroFormularioCnh: '9000000002', numeroFormularioRenach: 'SP907001133', motivoRequerimento: 'C', categoria: 'B', dataValidade: '2011-08-05', cancelada: false },
      { dataEmissao: '2011-08-10', numeroFormularioCnh: '9000000003', numeroFormularioRenach: 'SP911002244', motivoRequerimento: '5', categoria: 'B', dataValidade: '2016-08-01', cancelada: false },
      { dataEmissao: '2016-08-12', numeroFormularioCnh: '9000000004', numeroFormularioRenach: 'SP916002255', motivoRequerimento: '5', categoria: 'B', dataValidade: '2021-08-05', cancelada: false },
      { dataEmissao: '2021-03-18', numeroFormularioCnh: '9000000005', numeroFormularioRenach: 'SP921003318', motivoRequerimento: '5', categoria: 'B', dataValidade: '2026-03-10', cancelada: false },
    ],
    hicom: [
      { id: 'FX-H-001', transacao: '181', data: '2021-03-10', descricao: 'Substituição do Exame 03 (massa demonstrativa).' },
      { id: 'FX-H-002', transacao: '159', data: '2021-03-12', descricao: 'Autorização de emissão — Motivo 5 (massa demonstrativa).' },
      { id: 'FX-H-003', transacao: '180', data: '2021-03-25', descricao: 'Informar Número-Registro/Número-Formulário-CNH (massa demonstrativa).' },
    ],
    autorizacoes: [],
  };

  const rogerio: Prontuario = {
    numeroRegistro: '90020250096',
    formularioRenachEmAndamento: 'SP926020250',
    dadosCadastrais: {
      nomeCondutorCivil: 'ROGERIO TAVARES LIMA',
      dataNascimento: '1962-02-03',
      sexo: '1',
      nomeMae: 'IRENE TAVARES LIMA',
      nomePai: null,
      documentoIdentidade: '900202500 SSP SP',
      cpf: '00000000272',
      localidadeNascimento: '06291',
      localidadeNascimentoDescricao: 'Campinas/SP',
      enderecoLogradouro: 'AVENIDA FICTICIA DO COMERCIO',
      enderecoNumero: '2500',
      enderecoComplemento: null,
      enderecoBairro: 'CENTRO DEMONSTRATIVO',
      enderecoCep: '13000000',
      enderecoMunicipio: '06291',
      enderecoMunicipioDescricao: 'Campinas',
      enderecoUf: 'SP',
      nacionalidade: '1',
      dataCadastramento: '1984-01-20',
      primeiraHabilitacao: '1984-04-10',
      ufDominio: 'SP',
      ddd: null,
      telefoneCelular: null,
      email: null,
    },
    dadosControle: {
      situacaoCnh: '4',
      situacaoCnhAnterior: '3',
      motivoRequerimento: '5',
      permissionario: '2',
      codigoTransacaoUltimaAtualizacao: '180',
      numeroFormularioRenach: 'SP914020250',
      numeroFormularioCnh: '9000000103',
      cancelamento: '0',
      categoriaAtual: 'D',
      categoriaRebaixada: null,
      categoriaAutorizada: 'D',
      dataValidadeCnh: '2019-05-12',
      observacaoCnh: [],
      dataUltimaEmissaoHistorico: '2014-05-20',
      datasInicioCategoria: { B: '1984-04-10', D: '1996-08-22' },
    },
    toxicologico: {
      dataColeta: coletaRogerio,
      dataValidade: somarDias(coletaRogerio, 90),
      situacao: '1',
      cnpjLaboratorio: '99000002000148',
      numeroLaudo: '1A2B3CAB000004417',
      prazoRealizacao: somarMeses(coletaRogerio, 30),
    },
    exames: [
      exame({ codigoExame: '03', dataExame: '2014-05-12', resultado: '1', dataValidade: '2019-05-12', categoriaPretendida: 'D', categoriaPermitida: 'D', cnpjEntidadeCredenciada: '99000001000101', cpfExaminador1: '90000000337', municipioExame: '06291' }),
      exame({ codigoExame: '04', dataExame: '1996-07-30', resultado: '1', cpfExaminador1: null, cnpjEntidadeCredenciada: null, categoriaPretendida: 'D', categoriaPermitida: 'D', municipioExame: '06291' }),
    ],
    cursos: [],
    bloqueios: [],
    ocorrencias: [],
    emissoes: [
      { dataEmissao: '2009-05-18', numeroFormularioCnh: '9000000101', numeroFormularioRenach: 'SP909020250', motivoRequerimento: '5', categoria: 'D', dataValidade: '2014-05-14', cancelada: false },
      { dataEmissao: '2012-02-01', numeroFormularioCnh: '9000000102', numeroFormularioRenach: 'SP912020250', motivoRequerimento: '2', categoria: 'D', dataValidade: '2014-05-14', cancelada: true },
      { dataEmissao: '2014-05-20', numeroFormularioCnh: '9000000103', numeroFormularioRenach: 'SP914020250', motivoRequerimento: '5', categoria: 'D', dataValidade: '2019-05-12', cancelada: false },
    ],
    hicom: [{ id: 'FX-H-101', transacao: '180', data: '2014-05-28', descricao: 'Informar Número-Registro/Número-Formulário-CNH (massa demonstrativa).' }],
    autorizacoes: [],
  };

  const carla: Prontuario = {
    numeroRegistro: '90030360048',
    formularioRenachEmAndamento: 'SP926030360',
    dadosCadastrais: {
      nomeCondutorCivil: 'CARLA MENDES ROCHA',
      dataNascimento: '1990-11-02',
      sexo: '2',
      nomeMae: 'SONIA MENDES ROCHA',
      nomePai: 'JOSE ROCHA NETO',
      documentoIdentidade: '900303600 SSP SP',
      cpf: '00000000353',
      localidadeNascimento: '07107',
      localidadeNascimentoDescricao: 'São Paulo/SP',
      enderecoLogradouro: 'RUA EXEMPLAR DOS IPES',
      enderecoNumero: '36',
      enderecoComplemento: null,
      enderecoBairro: 'VILA MODELO',
      enderecoCep: '04000000',
      enderecoMunicipio: '07107',
      enderecoMunicipioDescricao: 'São Paulo',
      enderecoUf: 'SP',
      nacionalidade: '1',
      dataCadastramento: '2010-01-08',
      primeiraHabilitacao: '2010-03-15',
      ufDominio: 'SP',
      ddd: '11',
      telefoneCelular: '900000036',
      email: null,
    },
    dadosControle: {
      situacaoCnh: '4',
      situacaoCnhAnterior: '3',
      motivoRequerimento: '5',
      permissionario: '2',
      codigoTransacaoUltimaAtualizacao: '181',
      numeroFormularioRenach: 'SP921030360',
      numeroFormularioCnh: '9000000203',
      cancelamento: '0',
      categoriaAtual: 'AB',
      categoriaRebaixada: null,
      categoriaAutorizada: 'AB',
      dataValidadeCnh: '2026-07-01',
      observacaoCnh: [],
      dataUltimaEmissaoHistorico: '2021-07-08',
      datasInicioCategoria: { A: '2010-03-15', B: '2010-03-15' },
    },
    toxicologico: { dataColeta: null, dataValidade: null, situacao: null, cnpjLaboratorio: null, numeroLaudo: null, prazoRealizacao: null },
    exames: [
      exame({ codigoExame: '03', dataExame: '2021-07-01', resultado: '1', dataValidade: '2026-07-01', categoriaPretendida: 'AB', categoriaPermitida: 'AB' }),
    ],
    cursos: [],
    bloqueios: [
      {
        tipoEvento: 'B',
        ufDetranBloqueio: 'SP',
        motivoBloqueio: '2',
        dataBloqueio: '2026-02-10',
        documentoGeradorBloqueio: 'POC-PROC-SUSP-0001',
        descricaoBloqueio: 'Suspensão do direito de dirigir (massa demonstrativa).',
        dataInicioPenalidade: '2026-02-20',
        dataFimPenalidade: '2027-02-20',
      },
    ],
    ocorrencias: [],
    emissoes: [
      { dataEmissao: '2010-03-15', numeroFormularioCnh: '9000000201', numeroFormularioRenach: 'SP910030360', motivoRequerimento: '1', categoria: 'AB', dataValidade: '2011-03-15', cancelada: false },
      { dataEmissao: '2016-07-04', numeroFormularioCnh: '9000000202', numeroFormularioRenach: 'SP916030360', motivoRequerimento: '5', categoria: 'AB', dataValidade: '2021-06-30', cancelada: false },
      { dataEmissao: '2021-07-08', numeroFormularioCnh: '9000000203', numeroFormularioRenach: 'SP921030360', motivoRequerimento: '5', categoria: 'AB', dataValidade: '2026-07-01', cancelada: false },
    ],
    hicom: [{ id: 'FX-H-201', transacao: '181', data: '2026-02-10', descricao: 'Inclusão de Bloqueio 2 – Suspensão (massa demonstrativa).' }],
    autorizacoes: [],
  };

  return [marina, rogerio, carla];
}
