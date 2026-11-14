/** Tipos espelhando os DTOs do backend (br.com.chfb.imoveis). */

export type Perfil = 'CLIENTE' | 'CORRETOR' | 'ADMIN';
export type Finalidade = 'VENDA' | 'ALUGUEL' | 'TEMPORADA';
export type StatusAnuncio = 'PENDENTE' | 'ATIVO' | 'PAUSADO' | 'CONCLUIDO' | 'BLOQUEADO';
export type TipoImovel =
    | 'APARTAMENTO'
    | 'CASA'
    | 'CASA_CONDOMINIO'
    | 'COBERTURA'
    | 'KITNET'
    | 'FLAT'
    | 'LOTE'
    | 'SALA'
    | 'LOJA'
    | 'GALPAO'
    | 'PREDIO'
    | 'CHACARA';
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
    { value: 'BLOQUEADO', label: 'Bloqueado', severity: 'danger' }
];

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
    latitude: number | null;
    longitude: number | null;
    descricaoCurta: string | null;
    anuncianteCreci: string | null;
    anuncianteFoto: string | null;
    fotoCapa: string | null;
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
    telefone: string | null;
    creci: string | null;
    fotoUrl: string | null;
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
    fotos: string[];
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
    cep: string | null;
    latitude: number | null;
    longitude: number | null;
    lancamento: boolean;
    aceitaFinanciamento: boolean;
    aceitaFgts: boolean;
    aceitaPermuta: boolean;
    escrituraRegistrada: boolean;
    quitado: boolean;
    fotos: string[];
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
}

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
