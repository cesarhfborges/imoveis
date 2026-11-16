/** Tipos espelhando os DTOs do backend (br.com.chfb.imoveis). */

export type Perfil = 'CLIENTE' | 'CORRETOR' | 'ADMIN';
export type Finalidade = 'VENDA' | 'ALUGUEL' | 'TEMPORADA';
export type StatusAnuncio = 'PENDENTE' | 'ATIVO' | 'PAUSADO' | 'CONCLUIDO' | 'BLOQUEADO' | 'SUSPENSO' | 'BANIDO';
export type TipoImovel = 'APARTAMENTO' | 'CASA' | 'CASA_CONDOMINIO' | 'COBERTURA' | 'KITNET' | 'FLAT' | 'LOTE' | 'SALA' | 'LOJA' | 'GALPAO' | 'PREDIO' | 'CHACARA';
export type TemaModo = 'light' | 'dark' | 'auto';

export const TIPOS: { value: TipoImovel; label: string }[] = [
    { value: 'APARTAMENTO', label: 'Apartamento' },
    { value: 'CASA', label: 'Casa' },
    { value: 'CASA_CONDOMINIO', label: 'Casa em condomínio' },
    { value: 'COBERTURA', label: 'Cobertura' },
    { value: 'KITNET', label: 'Kitnet / Studio' },
    { value: 'FLAT', label: 'Flat' },
    { value: 'LOTE', label: 'Lote / Terreno' },
    { value: 'SALA', label: 'Sala comercial' },
    { value: 'LOJA', label: 'Loja' },
    { value: 'GALPAO', label: 'Galpão' },
    { value: 'PREDIO', label: 'Prédio' },
    { value: 'CHACARA', label: 'Chácara / Rural' }
];

export const FINALIDADES: { value: Finalidade; label: string; rota: string }[] = [
    { value: 'VENDA', label: 'Venda', rota: '/venda' },
    { value: 'ALUGUEL', label: 'Aluguel', rota: '/aluguel' },
    { value: 'TEMPORADA', label: 'Temporada', rota: '/temporada' }
];

export const STATUS: { value: StatusAnuncio; label: string; severity: 'success' | 'warn' | 'info' | 'danger' | 'secondary' }[] = [
    { value: 'ATIVO', label: 'Ativo', severity: 'success' },
    { value: 'PENDENTE', label: 'Pendente', severity: 'warn' },
    { value: 'PAUSADO', label: 'Pausado', severity: 'secondary' },
    { value: 'CONCLUIDO', label: 'Vendido/Alugado', severity: 'info' },
    { value: 'BLOQUEADO', label: 'Bloqueado', severity: 'danger' },
    { value: 'SUSPENSO', label: 'Suspenso (moderação)', severity: 'warn' },
    { value: 'BANIDO', label: 'Banido', severity: 'danger' }
];

/** Status aplicados pela moderação: só administradores tiram o anúncio deles. */
export const STATUS_MODERACAO: StatusAnuncio[] = ['SUSPENSO', 'BANIDO'];

export interface PageResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

export interface ApiError {
    status: number;
    error: string;
    message: string;
    path: string;
    fields?: Record<string, string>;
}

export interface ImovelResumo {
    id: number;
    codigo: string;
    titulo: string;
    finalidade: Finalidade;
    tipo: TipoImovel;
    tipoDescricao: string;
    status: StatusAnuncio;
    preco: number;
    condominio: number | null;
    areaUtil: number | null;
    quartos: number | null;
    suites: number | null;
    banheiros: number | null;
    vagas: number | null;
    uf: string;
    cidade: string;
    bairro: string;
    endereco: string | null;
    numero: string | null;
    latitude: number | null;
    longitude: number | null;
    descricaoCurta: string | null;
    anuncianteCreci: string | null;
    anuncianteFoto: string | null;
    fotoCapa: string | null;
    /** A foto de capa foi criada/alterada com IA. */
    fotoCapaIa: boolean;
    totalFotos: number;
    lancamento: boolean;
    destaque: boolean;
    aceitaFinanciamento: boolean;
    aceitaFgts: boolean;
    visualizacoes: number;
    anuncianteId: number;
    anuncianteNome: string | null;
    criadoEm: string;
}

export interface Anunciante {
    id: number;
    nome: string;
    /** Só dígitos. Com telefoneCompleto = false é só o início (ex.: "6199999"); o resto vem de /imoveis/{id}/telefone. */
    telefone: string | null;
    telefoneCompleto: boolean;
    creci: string | null;
    fotoUrl: string | null;
    /** Tem página pública em /anunciante/{id}. */
    perfilPublico: boolean;
}

/** O que o anunciante declarou sobre a foto: real, criada/alterada com IA ou não informado. */
export type OrigemFoto = 'REAL' | 'IA' | 'NAO_INFORMADO';

export const ORIGENS_FOTO: { value: OrigemFoto; label: string; curto: string; icone: string }[] = [
    { value: 'NAO_INFORMADO', label: 'Não informado', curto: 'Não informado', icone: 'pi-question-circle' },
    { value: 'REAL', label: 'Foto real, sem alterações', curto: 'Foto real', icone: 'pi-camera' },
    { value: 'IA', label: 'Criada ou alterada com IA', curto: 'Editada/gerada com IA', icone: 'pi-sparkles' }
];

export interface FotoImovel {
    url: string;
    origem: OrigemFoto;
}

export interface ImovelDetalhe {
    id: number;
    codigo: string;
    titulo: string;
    descricao: string | null;
    finalidade: Finalidade;
    tipo: TipoImovel;
    tipoDescricao: string;
    status: StatusAnuncio;
    preco: number;
    condominio: number | null;
    iptu: number | null;
    areaUtil: number | null;
    areaTotal: number | null;
    quartos: number | null;
    suites: number | null;
    banheiros: number | null;
    vagas: number | null;
    uf: string;
    cidade: string;
    bairro: string;
    endereco: string | null;
    numero: string | null;
    cep: string | null;
    latitude: number | null;
    longitude: number | null;
    lancamento: boolean;
    destaque: boolean;
    aceitaFinanciamento: boolean;
    aceitaFgts: boolean;
    aceitaPermuta: boolean;
    escrituraRegistrada: boolean;
    quitado: boolean;
    fotos: FotoImovel[];
    caracteristicas: string[];
    visualizacoes: number;
    anunciante: Anunciante | null;
    criadoEm: string;
    atualizadoEm: string;
}

export interface ImovelForm {
    titulo: string;
    descricao: string | null;
    finalidade: Finalidade;
    tipo: TipoImovel;
    preco: number;
    condominio: number | null;
    iptu: number | null;
    areaUtil: number | null;
    areaTotal: number | null;
    quartos: number | null;
    suites: number | null;
    banheiros: number | null;
    vagas: number | null;
    uf: string;
    cidade: string;
    bairro: string;
    endereco: string | null;
    numero: string | null;
    cep: string | null;
    latitude: number | null;
    longitude: number | null;
    lancamento: boolean;
    aceitaFinanciamento: boolean;
    aceitaFgts: boolean;
    aceitaPermuta: boolean;
    escrituraRegistrada: boolean;
    quitado: boolean;
    fotos: FotoImovel[];
    caracteristicas: string[];
}

/** Filtros da busca (todos opcionais). */
export interface ImovelFiltro {
    q?: string | null;
    finalidade?: Finalidade | null;
    tipo?: TipoImovel[] | null;
    uf?: string | null;
    cidade?: string | null;
    bairro?: string | null;
    quartos?: number | null;
    vagas?: number | null;
    suites?: number | null;
    precoMin?: number | null;
    precoMax?: number | null;
    areaMin?: number | null;
    areaMax?: number | null;
    lancamento?: boolean | null;
    destaque?: boolean | null;
    status?: StatusAnuncio | null;
    anunciante?: number | null;
    ordem?: string | null;
    page?: number | null;
    size?: number | null;
}

export interface OpcoesBusca {
    tipos: { value: TipoImovel; label: string }[];
    localidades: { uf: string; cidade: string; bairros: string[] }[];
}

export interface ContagemTipo {
    tipo: TipoImovel;
    label: string;
    total: number;
}

export interface ContatoForm {
    nome: string;
    email: string;
    telefone: string | null;
    mensagem: string;
}

export interface Contato {
    id: number;
    imovelId: number;
    imovelCodigo: string;
    imovelTitulo: string;
    nome: string;
    email: string;
    telefone: string | null;
    mensagem: string;
    lido: boolean;
    criadoEm: string;
}

export interface EstatisticasAnuncios {
    total: number;
    ativos: number;
    pendentes: number;
    pausados: number;
    visualizacoes: number;
    contatosNaoLidos: number;
}

export interface UsuarioSessao {
    id: number;
    nome: string;
    email: string;
    telefone: string | null;
    creci: string | null;
    fotoUrl: string | null;
}

export interface Sessao {
    autenticado: boolean;
    usuario: UsuarioSessao | null;
    perfil: Perfil | null;
    perfisDisponiveis: Perfil[];
}

export interface LoginRequest {
    email: string;
    senha: string;
    perfil: Perfil;
    area: 'conta' | 'admin';
}

export interface RegistroRequest {
    nome: string;
    email: string;
    senha: string;
    telefone: string | null;
    tipo: Perfil;
    creci: string | null;
    documento: string | null;
    tipoAnunciante: 'CORRETOR' | 'IMOBILIARIA' | null;
}

export interface Usuario {
    id: number;
    nome: string;
    email: string;
    telefone: string | null;
    creci: string | null;
    documento: string | null;
    tipoAnunciante: string | null;
    fotoUrl: string | null;
    ativo: boolean;
    papeis: Perfil[];
    perfisPermitidos: Perfil[];
    ultimoAcesso: string | null;
    criadoEm: string;
    razaoSocial?: string | null;
    whatsapp?: string | null;
    emailContato?: string | null;
    site?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    sobre?: string | null;
    creciUf?: string | null;
    regioesAtuacao?: string | null;
    atuandoDesde?: number | null;
    cep?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    uf?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    perfilPublico?: boolean;
}

/** O que o próprio usuário edita em "Meus dados". */
export interface PerfilForm {
    nome: string;
    telefone: string | null;
    creci: string | null;
    fotoUrl: string | null;
    razaoSocial: string | null;
    whatsapp: string | null;
    emailContato: string | null;
    site: string | null;
    instagram: string | null;
    facebook: string | null;
    sobre: string | null;
    creciUf: string | null;
    regioesAtuacao: string | null;
    atuandoDesde: number | null;
    cep: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    latitude: number | null;
    longitude: number | null;
    /** Anunciantes: liga o perfil público (exige o cadastro completo, ver pendenciasPerfilPublico). */
    perfilPublico: boolean;
}

export const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];

export interface UsuarioAdminForm {
    nome: string;
    email: string;
    telefone: string | null;
    creci: string | null;
    papeis: Perfil[];
    ativo: boolean;
    senha: string | null;
}

export interface ApiToken {
    id: number;
    nome: string;
    prefixo: string;
    perfil: Perfil;
    criadoEm: string;
    expiraEm: string | null;
    ultimoUso: string | null;
}

export interface ApiTokenCriado {
    info: ApiToken;
    token: string;
}

export interface Configuracao {
    nomeApp: string;
    slogan: string | null;
    logoUrl: string | null;
    logoEscuroUrl: string | null;
    faviconUrl: string | null;
    seoTitulo: string | null;
    seoDescricao: string | null;
    seoPalavrasChave: string | null;
    seoImagemUrl: string | null;
    emailContato: string | null;
    telefoneContato: string | null;
    whatsapp: string | null;
    endereco: string | null;
    instagram: string | null;
    facebook: string | null;
    textoRodape: string | null;
    temaPreset: 'Aura' | 'Lara' | 'Nora';
    temaPrimaria: string;
    temaSurface: string | null;
    temaModo: TemaModo;
    moderarAnuncios: boolean;
    /** Ao clicar num anúncio no site: abre em nova janela (true) ou na mesma (false). */
    abrirAnuncioNovaJanela: boolean;
    telefoneAnunciante: ExibicaoTelefone;
    permitirCadastroCorretor: boolean;
}

export interface Dashboard {
    usuarios: number;
    clientes: number;
    corretores: number;
    administradores: number;
    anuncios: EstatisticasAnuncios;
}

/** Opções de documentação e condições do anúncio (mesma ordem no formulário e na página). */
export const DOCUMENTACAO: { campo: 'aceitaFinanciamento' | 'aceitaFgts' | 'aceitaPermuta' | 'escrituraRegistrada' | 'quitado'; label: string; dica: string }[] = [
    { campo: 'aceitaFinanciamento', label: 'Aceita financiamento', dica: 'Pode ser comprado com financiamento bancário' },
    { campo: 'aceitaFgts', label: 'Aceita FGTS', dica: 'O comprador pode usar o saldo do FGTS' },
    { campo: 'aceitaPermuta', label: 'Aceita permuta', dica: 'O proprietário aceita outro imóvel ou bem como parte do pagamento' },
    { campo: 'escrituraRegistrada', label: 'Escritura registrada', dica: 'Documentação em cartório regularizada' },
    { campo: 'quitado', label: 'Imóvel quitado', dica: 'Sem saldo devedor de financiamento' }
];

/**
 * Título público do anúncio: sempre composto pelo endereço (logradouro, bairro e cidade/UF),
 * nunca pelo texto livre do anunciante — esse vira só o título da descrição.
 */
export function tituloAnuncio(i: { endereco?: string | null; numero?: string | null; bairro?: string | null; cidade?: string | null; uf?: string | null }): string {
    const cidade = [i.cidade?.trim(), i.uf?.trim().toUpperCase()].filter(Boolean).join('/');
    return [i.endereco?.trim(), i.numero?.trim(), i.bairro?.trim(), cidade].filter(Boolean).join(', ');
}

export function tipoLabel(t: TipoImovel | string | null | undefined): string {
    return TIPOS.find((x) => x.value === t)?.label ?? String(t ?? '');
}

export function finalidadeLabel(f: Finalidade | string | null | undefined): string {
    return FINALIDADES.find((x) => x.value === f)?.label ?? String(f ?? '');
}

export function statusInfo(s: StatusAnuncio) {
    return STATUS.find((x) => x.value === s) ?? STATUS[0];
}

export function perfilLabel(p: Perfil | null | undefined): string {
    return p === 'ADMIN' ? 'Administrador' : p === 'CORRETOR' ? 'Corretor' : p === 'CLIENTE' ? 'Cliente' : '';
}

// ---------------------------------------------------------------- notificações

export interface Notificacao {
    id: number;
    tipo: string;
    titulo: string;
    mensagem: string | null;
    icone: string | null;
    link: string | null;
    lida: boolean;
    criadoEm: string;
}

// ---------------------------------------------------------------- calendário

export interface DiaExpediente {
    /** ISO: 1 = segunda ... 7 = domingo */
    diaSemana: number;
    ativo: boolean;
    /** "HH:mm" (00:00 a 24:00) */
    inicio: string;
    fim: string;
}

export interface Feriado {
    id: number;
    titulo: string;
    /** data/hora local "aaaa-mm-ddThh:mm" */
    inicio: string;
    fim: string;
    recorrente: boolean;
}

export interface Calendario {
    fuso: string;
    expediente: DiaExpediente[];
    feriados: Feriado[];
}

// ---------------------------------------------------------------- moderação (denúncias)

export type CorTag = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';
export type AcaoAutomatica = 'NENHUMA' | 'SUSPENDER' | 'BANIR';
export type StatusDenuncia = 'AGUARDANDO_ANUNCIANTE' | 'EM_ANALISE' | 'EM_APURACAO' | 'RESOLVIDA' | 'IMPROCEDENTE' | 'PROCEDENTE' | 'ANUNCIO_BANIDO';
export type PapelMensagem = 'ANUNCIANTE' | 'ADMIN' | 'SISTEMA';
export type Natureza = 'ERRO' | 'MA_FE';
export type MedidaAnuncio = 'MANTER' | 'CORRIGIR' | 'SUSPENDER' | 'BANIR';
export type PenalidadeConta = 'NENHUMA' | 'STRIKE' | 'BANIR_CONTA';

/** Gravidade nas telas de denúncia. */
export interface GravidadeResumo {
    id: number;
    nome: string;
    cor: CorTag;
}

/** Gravidade cadastrada, com a regra de banimento automático da conta. */
export interface Gravidade extends GravidadeResumo {
    ordem: number;
    ativo: boolean;
    banirContaAuto: boolean;
    /** denúncias procedentes até o banimento */
    banirApos: number | null;
    /** considerar só os últimos N meses (nulo = todo o histórico) */
    janelaMeses: number | null;
}

export const CORES_TAG: { value: CorTag; label: string }[] = [
    { value: 'info', label: 'Azul' },
    { value: 'success', label: 'Verde' },
    { value: 'warn', label: 'Laranja' },
    { value: 'danger', label: 'Vermelho' },
    { value: 'secondary', label: 'Cinza' },
    { value: 'contrast', label: 'Escuro' }
];

/** Mesma regra do backend: sem espaços nas pontas, minúsculas, sem acentos ("Gráve " = "grave"). */
export function chaveGravidade(nome: string): string {
    return nome.trim().replace(/\s+/g, ' ').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export const NATUREZAS: { value: Natureza; label: string; dica: string }[] = [
    { value: 'ERRO', label: 'Informação incorreta', dica: 'Erro do anunciante, sem intenção de enganar' },
    { value: 'MA_FE', label: 'Má-fé', dica: 'Mentira, captação, golpe ou anúncio falso' }
];

export const MEDIDAS: { value: MedidaAnuncio; label: string; dica: string }[] = [
    { value: 'CORRIGIR', label: 'Solicitar correção', dica: 'O anunciante corrige no prazo; a denúncia fica aberta até você aceitar a correção' },
    { value: 'MANTER', label: 'Manter o anúncio', dica: 'Encerra; o anúncio continua (ou volta) no ar' },
    { value: 'SUSPENDER', label: 'Suspender o anúncio', dica: 'Encerra; fora da busca até um administrador reativar' },
    { value: 'BANIR', label: 'Remover o anúncio do ar', dica: 'Encerra; o anúncio é banido de vez e as outras pendências dele são encerradas' }
];

export const PENALIDADES: { value: PenalidadeConta; label: string; dica: string }[] = [
    { value: 'STRIKE', label: 'Strike', dica: 'Conta para o banimento automático da conta, conforme a regra da gravidade' },
    { value: 'NENHUMA', label: 'Sem penalidade', dica: 'Fica só no histórico do anunciante' },
    { value: 'BANIR_CONTA', label: 'Banir a conta agora', dica: 'Banimento direto (ex.: conteúdo ilegal): a conta fica inativa e todos os anúncios saem do ar' }
];

export const ACOES_AUTOMATICAS: { value: AcaoAutomatica; label: string }[] = [
    { value: 'NENHUMA', label: 'Nenhuma ação' },
    { value: 'SUSPENDER', label: 'Suspender o anúncio' },
    { value: 'BANIR', label: 'Banir o anúncio' }
];

export const STATUS_DENUNCIA: Record<StatusDenuncia, { label: string; severity: CorTag }> = {
    AGUARDANDO_ANUNCIANTE: { label: 'Aguardando anunciante', severity: 'warn' },
    EM_ANALISE: { label: 'Em análise', severity: 'info' },
    EM_APURACAO: { label: 'Em apuração', severity: 'contrast' },
    RESOLVIDA: { label: 'Resolvida', severity: 'success' },
    IMPROCEDENTE: { label: 'Improcedente', severity: 'secondary' },
    PROCEDENTE: { label: 'Procedente', severity: 'danger' },
    ANUNCIO_BANIDO: { label: 'Anúncio banido', severity: 'danger' }
};

export interface TipoDenuncia {
    id: number;
    nome: string;
    descricao: string | null;
    gravidade: GravidadeResumo;
    slaMinutos: number;
    suspenderAoAbrir: boolean;
    ativo: boolean;
    ordem: number;
}

export interface TipoDenunciaPublico {
    id: number;
    nome: string;
    descricao: string | null;
}

export interface ModeracaoConfig {
    automacaoAtiva: boolean;
    aprovarReativaAnuncio: boolean;
    ajusteSlaMinutos: number;
    etapa1Acao: AcaoAutomatica;
    etapa1PrazoMinutos: number;
    etapa2Acao: AcaoAutomatica;
    avisoMinutos: number;
    atualizadoEm?: string | null;
}

export interface PrazoSla {
    prazoEm: string | null;
    slaMinutos: number | null;
    minutosRestantes: number | null;
    vencido: boolean;
    correndoAgora: boolean;
    retomaEm: string | null;
    etapa: number;
    /** Prazo parado (aguardando a moderação): minutos úteis que faltavam quando parou. */
    minutosNaPausa: number | null;
}

export interface ImovelInfo {
    id: number;
    codigo: string;
    titulo: string;
    status: StatusAnuncio;
    fotoCapa: string | null;
    cidade: string;
    bairro: string;
}

export interface MinhaDenuncia {
    id: number;
    imovel: ImovelInfo | null;
    tipo: string;
    /** o denunciante só sabe se está em análise ou resolvida */
    situacao: 'EM_ANALISE' | 'RESOLVIDA';
    criadoEm: string;
    resolvidoEm: string | null;
}

export interface MensagemDenuncia {
    id: number;
    papel: PapelMensagem;
    autor: string;
    /** Foto de perfil do autor (nula: mostrar as iniciais). */
    autorFoto: string | null;
    texto: string;
    anexos: string[];
    interna: boolean;
    criadoEm: string;
    /** Registro "anúncio editado": o que mudou, campo a campo (vazio nas demais mensagens). */
    alteracoes: AlteracaoAnuncio[];
}

/** Um campo alterado numa edição do anúncio (valores já formatados; nulo = não informado). */
export interface AlteracaoAnuncio {
    campo: string;
    antes: string | null;
    depois: string | null;
}

export interface Denuncia {
    id: number;
    tipo: TipoDenunciaPublico;
    gravidade: GravidadeResumo;
    descricao: string;
    status: StatusDenuncia;
    prazo: PrazoSla;
    denuncianteNome: string | null;
    denuncianteEmail: string | null;
    criadoEm: string;
    resolvidoEm: string | null;
    conclusao: string | null;
    natureza: Natureza | null;
    medida: MedidaAnuncio | null;
    /** só para administradores: consequência para a conta (procedente) */
    penalidade: PenalidadeConta | null;
    /** quando foi julgada procedente */
    julgadoEm: string | null;
    /** só para administradores: prazo interno da apuração */
    apuracaoPrazoEm: string | null;
    mensagens: MensagemDenuncia[];
}

/** Aberta (ainda não encerrada)? */
export function denunciaAberta(d: { status: StatusDenuncia }): boolean {
    return d.status === 'AGUARDANDO_ANUNCIANTE' || d.status === 'EM_ANALISE' || d.status === 'EM_APURACAO';
}

/** Procedente com correção solicitada, ainda aberta. */
export function correcaoPendente(d: Denuncia): boolean {
    return d.medida === 'CORRIGIR' && denunciaAberta(d);
}

/** Rótulo e cor da situação, considerando a correção solicitada. */
export function situacaoDenuncia(d: Denuncia): { label: string; severity: CorTag } {
    if (correcaoPendente(d)) {
        return d.status === 'AGUARDANDO_ANUNCIANTE' ? { label: 'Correção solicitada', severity: 'danger' } : { label: 'Correção a validar', severity: 'info' };
    }
    return STATUS_DENUNCIA[d.status];
}

export interface DenunciaResumo {
    id: number;
    tipo: string;
    gravidade: GravidadeResumo;
    status: StatusDenuncia;
    prazo: PrazoSla;
    criadoEm: string;
}

export interface GrupoPendencias {
    imovel: ImovelInfo;
    anuncianteId: number;
    anuncianteNome: string | null;
    abertas: number;
    aguardandoAnunciante: number;
    emAnalise: number;
    emApuracao: number;
    menorMinutosRestantes: number | null;
    algumVencido: boolean;
    ultimaDenuncia: string;
    denuncias: DenunciaResumo[];
}

export interface PendenciasImovel {
    imovel: ImovelInfo;
    anunciante: { id: number; nome: string; email: string; telefone: string | null; creci: string | null } | null;
    historico: HistoricoAnunciante | null;
    denuncias: Denuncia[];
}

export interface ProcedentesPorGravidade {
    gravidade: GravidadeResumo;
    total: number;
    /** procedentes que contam para a regra (dentro da janela) */
    naJanela: number;
    banirContaAuto: boolean;
    banirApos: number | null;
    janelaMeses: number | null;
}

export interface HistoricoAnunciante {
    total: number;
    abertas: number;
    resolvidas: number;
    improcedentes: number;
    procedentes: number;
    procedentesMaFe: number;
    banidas: number;
    contaBanida: boolean;
    porGravidade: ProcedentesPorGravidade[];
}

export interface ContadorPendencias {
    aguardandoVoce: number;
    abertas: number;
}

/** "2 h 30 min" a partir de minutos. */
export function duracaoMinutos(min: number | null | undefined): string {
    if (min == null) return '—';
    const d = Math.floor(min / 1440);
    const h = Math.floor((min % 1440) / 60);
    const m = min % 60;
    if (min >= 1440 && h === 0 && m === 0) return `${d * 24} h`;
    const horas = Math.floor(min / 60);
    if (horas === 0) return `${m} min`;
    return m ? `${horas} h ${m} min` : `${horas} h`;
}

// ---------------------------------------------------------------- avisos do site

export type TipoAviso = 'MENSAGEM' | 'DRAWER' | 'DIALOG';
export type AcaoAceite = 'FECHAR' | 'LINK';
export type PublicoAviso = 'TODOS' | 'VISITANTES' | 'LOGADOS';
export type AreaAviso = 'SITE' | 'CONTA' | 'ADMIN';
export type SeveridadeAviso = 'info' | 'success' | 'warn' | 'error' | 'secondary' | 'contrast';

/** O que o site recebe para exibir um aviso. */
export interface AvisoPublico {
    id: number;
    versao: number;
    titulo: string | null;
    mensagem: string;
    tipo: TipoAviso;
    posicao: string;
    severidade: SeveridadeAviso;
    icone: string | null;
    dispensavel: boolean;
    modal: boolean;
    textoAceite: string | null;
    acaoAceite: AcaoAceite;
    linkAceite: string | null;
    novaAba: boolean;
    textoLink: string | null;
    urlLink: string | null;
    ordem: number;
    /** logado: a versão que ele já aceitou */
    versaoAceita: number | null;
}

/** Cadastro completo (painel). */
export interface Aviso extends Omit<AvisoPublico, 'versaoAceita'> {
    nome: string;
    publico: PublicoAviso;
    areas: AreaAviso[];
    ativo: boolean;
    inicioEm: string | null;
    fimEm: string | null;
    versaoEm: string;
    aceitesVersaoAtual: number;
    atualizadoEm: string;
}

export interface AvisoForm {
    nome: string;
    titulo: string | null;
    mensagem: string;
    tipo: TipoAviso;
    posicao: string;
    severidade: SeveridadeAviso;
    icone: string | null;
    dispensavel: boolean;
    modal: boolean;
    textoAceite: string | null;
    acaoAceite: AcaoAceite;
    linkAceite: string | null;
    novaAba: boolean;
    textoLink: string | null;
    urlLink: string | null;
    publico: PublicoAviso;
    areas: AreaAviso[];
    ativo: boolean;
    ordem: number;
    inicioEm: string | null;
    fimEm: string | null;
    novaVersao: boolean;
}

/** Posições que cada componente do PrimeNG aceita (mesma regra do servidor). */
export const POSICOES_AVISO: Record<TipoAviso, { value: string; label: string }[]> = {
    MENSAGEM: [
        { value: 'top', label: 'Topo da página' },
        { value: 'bottom', label: 'Rodapé da página' }
    ],
    DRAWER: [
        { value: 'right', label: 'Direita' },
        { value: 'left', label: 'Esquerda' },
        { value: 'top', label: 'Topo' },
        { value: 'bottom', label: 'Rodapé' },
        { value: 'full', label: 'Tela cheia' }
    ],
    DIALOG: [
        { value: 'center', label: 'Centro' },
        { value: 'top', label: 'Topo' },
        { value: 'bottom', label: 'Rodapé' },
        { value: 'left', label: 'Esquerda' },
        { value: 'right', label: 'Direita' },
        { value: 'topleft', label: 'Canto superior esquerdo' },
        { value: 'topright', label: 'Canto superior direito' },
        { value: 'bottomleft', label: 'Canto inferior esquerdo' },
        { value: 'bottomright', label: 'Canto inferior direito' }
    ]
};

export const TIPOS_AVISO: { value: TipoAviso; label: string; icone: string; dica: string }[] = [
    { value: 'MENSAGEM', label: 'Mensagem', icone: 'pi pi-minus', dica: 'Barra fixa no topo ou no rodapé (p-message). Não bloqueia a página.' },
    { value: 'DIALOG', label: 'Diálogo', icone: 'pi pi-window-maximize', dica: 'Janela (p-dialog) no centro ou numa borda/canto. Pode bloquear a página (modal).' },
    { value: 'DRAWER', label: 'Drawer', icone: 'pi pi-arrow-right-arrow-left', dica: 'Painel lateral (p-drawer) que desliza de uma borda ou ocupa a tela.' }
];

export const SEVERIDADES_AVISO: { value: SeveridadeAviso; label: string }[] = [
    { value: 'secondary', label: 'Cinza (padrão)' },
    { value: 'info', label: 'Informação (azul)' },
    { value: 'success', label: 'Sucesso (verde)' },
    { value: 'warn', label: 'Atenção (amarelo)' },
    { value: 'error', label: 'Erro (vermelho)' },
    { value: 'contrast', label: 'Contraste (escuro)' }
];

/** Como o telefone do anunciante aparece no site (Configurações > Regras). */
export type ExibicaoTelefone = 'MOSTRAR' | 'OCULTAR' | 'MOSTRAR_APENAS_LOGADO';

export const EXIBICOES_TELEFONE: { value: ExibicaoTelefone; label: string; dica: string }[] = [
    { value: 'MOSTRAR', label: 'Mostrar', dica: 'O telefone aparece completo para todos os visitantes.' },
    { value: 'MOSTRAR_APENAS_LOGADO', label: 'Mostrar apenas para quem está logado', dica: 'Aparece só o início, ex.: (61) 99999…; o número completo aparece ao clicar em "Ver telefone", para quem entrou na conta.' },
    { value: 'OCULTAR', label: 'Ocultar', dica: 'O telefone do anunciante não aparece no site; o contato fica só pelo formulário.' }
];

// ---------------------------------------------------------------- perfil público de anunciantes

export type TipoAnunciante = 'CORRETOR' | 'IMOBILIARIA';

/** Item do diretório /imobiliarias (lista + marcador no mapa). */
export interface AnuncianteResumo {
    id: number;
    nome: string;
    tipo: TipoAnunciante;
    fotoUrl: string | null;
    creci: string | null;
    creciUf: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    latitude: number | null;
    longitude: number | null;
    totalAnuncios: number;
}

/** Página /anunciante/{id}. Telefone: mesma regra do anúncio (telefoneCompleto = false → só o início). */
export interface AnunciantePerfil {
    id: number;
    nome: string;
    tipo: TipoAnunciante;
    razaoSocial: string | null;
    fotoUrl: string | null;
    creci: string | null;
    creciUf: string | null;
    sobre: string | null;
    regioesAtuacao: string | null;
    atuandoDesde: number | null;
    site: string | null;
    instagram: string | null;
    facebook: string | null;
    emailContato: string | null;
    telefone: string | null;
    telefoneCompleto: boolean;
    whatsapp: string | null;
    cep: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    latitude: number | null;
    longitude: number | null;
    membroDesde: string;
    totalAnuncios: number;
}

export interface AnuncianteFiltro {
    tipo?: TipoAnunciante | null;
    cidade?: string | null;
    q?: string | null;
}

/** Dados que o perfil público exige (mesma regra do backend: UsuarioService.pendenciasPerfilPublico). */
export interface DadosPerfilPublico {
    fotoUrl: string | null;
    nome: string;
    imobiliaria: boolean;
    razaoSocial: string;
    creci: string;
    creciUf: string | null;
    telefone: string | null;
    whatsapp: string | null;
    sobre: string;
    cep: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string | null;
    latitude: number | null;
    longitude: number | null;
}

/** O que falta para o anunciante poder deixar o perfil público (lista vazia = pode ativar). */
export function pendenciasPerfilPublico(d: DadosPerfilPublico): string[] {
    const vazio = (s: string | null | undefined) => !s || !s.trim();
    const f: string[] = [];
    if (vazio(d.fotoUrl)) f.push('Foto ou logo');
    if (vazio(d.nome)) f.push('Nome');
    if (d.imobiliaria && vazio(d.razaoSocial)) f.push('Razão social');
    if (vazio(d.creci) || vazio(d.creciUf)) f.push('CRECI e UF do CRECI');
    if (vazio(d.telefone) && vazio(d.whatsapp)) f.push('Telefone ou WhatsApp');
    if (vazio(d.sobre)) f.push('Apresentação ("Sobre")');
    if ((d.cep ?? '').replace(/\D/g, '').length !== 8) f.push('CEP');
    if (vazio(d.logradouro) || vazio(d.numero)) f.push('Logradouro e número');
    if (vazio(d.bairro) || vazio(d.cidade) || vazio(d.uf)) f.push('Bairro, cidade e UF');
    if (d.latitude == null || d.longitude == null) f.push('Posição no mapa');
    return f;
}

export const TIPOS_ANUNCIANTE: { value: TipoAnunciante | null; label: string }[] = [
    { value: null, label: 'Todos' },
    { value: 'IMOBILIARIA', label: 'Imobiliárias' },
    { value: 'CORRETOR', label: 'Corretores' }
];
