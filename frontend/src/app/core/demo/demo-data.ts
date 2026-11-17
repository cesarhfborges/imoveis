import { DemoDocumentosDb } from './demo-documentos';
import { Configuracao, Finalidade, FotoImovel, ImovelDetalhe, OrigemFoto, Perfil, StatusAnuncio, TipoImovel, tipoLabel, Financeira } from '@/app/core/models/models';
import { CONFIG_PADRAO } from '@/app/core/services/config.service';

/** Usuário do modo demonstração (a senha fica em texto só porque é um banco de mentira no navegador). */
export interface DemoUsuario {
    id: number;
    nome: string;
    email: string;
    senha: string;
    telefone: string | null;
    creci: string | null;
    documento: string | null;
    tipoAnunciante: string | null;
    fotoUrl: string | null;
    ativo: boolean;
    papeis: Perfil[];
    ultimoAcesso: string | null;
    criadoEm: string;
    // "Meus dados" (opcionais: bancos de demonstração antigos não tinham)
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
    capaUrl?: string | null;
}

/** Logo/foto de exemplo (SVG com as iniciais), para os perfis públicos da demonstração. */
function logoDemo(iniciais: string, cor: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="${cor}"/><text x="60" y="74" font-family="Arial,sans-serif" font-size="44" font-weight="700" fill="#fff" text-anchor="middle">${iniciais}</text></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/** Perfis públicos completos dos anunciantes de exemplo (aparecem em /imobiliarias). */
export function perfilDemo(id: number): Partial<DemoUsuario> {
    if (id === 2) {
        return {
            fotoUrl: logoDemo('CE', '#1e3a5f'),
            creciUf: 'DF',
            whatsapp: '61900000002',
            emailContato: 'corretor@imoveis.local',
            sobre: 'Corretora há 12 anos no Plano Piloto. Atendimento próximo, do primeiro contato à entrega das chaves, com foco em apartamentos e coberturas.',
            regioesAtuacao: 'Asa Norte, Noroeste, Sudoeste',
            atuandoDesde: 2014,
            instagram: 'corretoraexemplo',
            cep: '70750000',
            logradouro: 'SQN 303',
            numero: 'Bloco A',
            complemento: 'Sala 12',
            bairro: 'Asa Norte',
            cidade: 'Brasília',
            uf: 'DF',
            latitude: -15.7795,
            longitude: -47.8828,
            perfilPublico: true
        };
    }
    if (id === 3) {
        return {
            fotoUrl: logoDemo('IM', '#0f766e'),
            razaoSocial: 'Imobiliária Modelo Ltda.',
            creciUf: 'DF',
            whatsapp: '61900000003',
            emailContato: 'contato@imobiliariamodelo.com.br',
            site: 'https://www.exemplo.com.br',
            sobre: 'Imobiliária com equipe de 15 corretores, especializada em venda e locação no Distrito Federal. Avaliação gratuita do seu imóvel.',
            regioesAtuacao: 'Asa Sul, Lago Norte, Águas Claras',
            atuandoDesde: 2008,
            cep: '70300000',
            logradouro: 'SCS Quadra 2',
            numero: '10',
            complemento: 'Loja 3',
            bairro: 'Asa Sul',
            cidade: 'Brasília',
            uf: 'DF',
            latitude: -15.7975,
            longitude: -47.8885,
            perfilPublico: true
        };
    }
    return {};
}

export interface DemoImovel extends Omit<ImovelDetalhe, 'anunciante' | 'tipoDescricao' | 'codigo' | 'financeiras' | 'financeirasIds' | 'financeirasTodas' | 'condicoes' | 'contratoMinimoMeses' | 'noitesMinimas' | 'hospedesMaximo' | 'taxaLimpeza' | 'horarioCheckin' | 'horarioCheckout'> {
    anuncianteId: number;
    /** Opcionais: bancos de demonstração antigos não tinham as condições por finalidade. */
    condicoes?: ImovelDetalhe['condicoes'];
    contratoMinimoMeses?: number | null;
    noitesMinimas?: number | null;
    hospedesMaximo?: number | null;
    taxaLimpeza?: number | null;
    horarioCheckin?: string | null;
    horarioCheckout?: string | null;
    /** Opcionais: bancos de demonstração antigos não tinham financeiras. */
    financeirasTodas?: boolean;
    financeirasIds?: number[];
}

export interface DemoContato {
    id: number;
    imovelId: number;
    nome: string;
    email: string;
    telefone: string | null;
    mensagem: string;
    lido: boolean;
    criadoEm: string;
    /** Quem enviou, quando estava logado (contatos antigos não têm). */
    usuarioId?: number | null;
}

export interface DemoToken {
    id: number;
    usuarioId: number;
    nome: string;
    prefixo: string;
    perfil: Perfil;
    criadoEm: string;
    expiraEm: string | null;
    ultimoUso: string | null;
    revogado: boolean;
}

export interface DemoDb {
    versao: number;
    seq: number;
    usuarios: DemoUsuario[];
    imoveis: DemoImovel[];
    contatos: DemoContato[];
    favoritos: { usuarioId: number; imovelId: number; criadoEm: string }[];
    tokens: DemoToken[];
    config: Configuracao;
    /** Visitas reais feitas no modo demonstração, por `${imovelId}|yyyy-MM-dd` (somadas à base simulada do painel). */
    visitasDiarias?: Record<string, number>;
    /** Opcionais: bancos de demonstração antigos não tinham estes dados. */
    financeiras?: Financeira[];
    precos?: { imovelId: number; anterior: number; novo: number; em: string }[];
    vistos?: { usuarioId: number; imovelId: number; em: string }[];
    /** Documentos do site (termos, privacidade…) e aceites; opcionais em bancos antigos. */
    documentos?: DemoDocumentosDb['documentos'];
    documentoAceites?: DemoDocumentosDb['documentoAceites'];
    /** Pedidos de remoção de conta ("Remover conta" em Meus dados); opcional em bancos antigos. */
    exclusoes?: { usuarioId: number; solicitadaEm: string; removerEm: string; canceladaEm: string | null }[];
}

/** Financeiras fictícias do modo demonstração. */
export function financeirasDemo(): Financeira[] {
    const base = { descricao: null, logoUrl: null, ativo: true, idadeMaximaQuitacao: 80, valorMinimoImovel: null, aceitaFgts: true, observacoes: 'Condições ilustrativas do modo demonstração.' };
    return [
        { ...base, id: 9001, nome: 'Banco Horizonte', descricao: 'Linha habitacional com parcelas SAC ou Price', sistemaAmortizacao: 'AMBOS', taxaJurosAnual: 10.99, prazoMaximoMeses: 420, entradaMinimaPercentual: 20, comprometimentoRendaPercentual: 30, valorMaximoImovel: null, seguroMensalPercentual: 0.025, taxaAdministracaoMensal: 25 },
        { ...base, id: 9002, nome: 'Crédito Cerrado', descricao: 'Entrada menor para imóveis até R$ 1,5 milhão', sistemaAmortizacao: 'PRICE', taxaJurosAnual: 11.79, prazoMaximoMeses: 360, entradaMinimaPercentual: 10, comprometimentoRendaPercentual: 35, valorMaximoImovel: 1500000, seguroMensalPercentual: 0.03, taxaAdministracaoMensal: 0, aceitaFgts: false }
    ];
}

type Modelo = [string, TipoImovel, Finalidade, number, number, number, number, number, string, string, string, number, number, boolean];

const MODELOS: Modelo[] = [
    ['Cobertura duplex com vista livre', 'COBERTURA', 'VENDA', 2450000, 212, 3, 3, 3, 'Brasília', 'Noroeste', 'SQNW 311 Bloco H', -15.7605, -47.915, true],
    ['Casa térrea com piscina e área gourmet', 'CASA_CONDOMINIO', 'VENDA', 850000, 306, 5, 2, 2, 'Sobradinho', 'Grande Colorado', 'Condomínio Jardim Europa II', -15.656, -47.832, false],
    ['Apartamento reformado, 2 quartos com suíte', 'APARTAMENTO', 'VENDA', 695000, 90, 2, 1, 1, 'Águas Claras', 'Norte', 'Rua 13 Norte', -15.835, -48.023, false],
    ['Apartamento 3 quartos, nascente, andar alto', 'APARTAMENTO', 'VENDA', 1190000, 95, 3, 1, 1, 'Brasília', 'Asa Norte', 'SQN 303', -15.779, -47.883, false],
    ['Kitnet mobiliada perto do metrô', 'KITNET', 'ALUGUEL', 1800, 32, 1, 0, 1, 'Águas Claras', 'Sul', 'Rua 7 Sul', -15.842, -48.029, false],
    ['Sala comercial com 2 vagas', 'SALA', 'ALUGUEL', 3500, 45, 0, 0, 2, 'Brasília', 'Asa Sul', 'SCS Quadra 2', -15.798, -47.888, false],
    ['Casa 4 quartos em lote de 800 m²', 'CASA', 'VENDA', 1650000, 280, 4, 2, 4, 'Brasília', 'Lago Norte', 'SHIN QI 5', -15.727, -47.846, false],
    ['Lote plano em condomínio fechado', 'LOTE', 'VENDA', 420000, 800, 0, 0, 0, 'Jardim Botânico', 'Jardim Botânico', 'Condomínio Solar', -15.865, -47.8, false],
    ['Apartamento 2 quartos com lazer completo', 'APARTAMENTO', 'ALUGUEL', 3200, 68, 2, 1, 1, 'Guará', 'Guará II', 'QE 40', -15.832, -47.985, false],
    ['Lançamento: studios a partir de 38 m²', 'APARTAMENTO', 'VENDA', 389000, 38, 1, 1, 1, 'Brasília', 'Noroeste', 'SQNW 102', -15.757, -47.91, true],
    ['Loja de esquina com mezanino', 'LOJA', 'ALUGUEL', 9000, 120, 0, 0, 0, 'Taguatinga', 'Taguatinga Centro', 'CNB 12', -15.834, -48.057, false],
    ['Chácara com casa sede e pomar', 'CHACARA', 'VENDA', 980000, 20000, 3, 1, 6, 'Brazlândia', 'Zona Rural', 'Núcleo Rural', -15.67, -48.19, false],
    ['Flat mobiliado para temporada', 'FLAT', 'TEMPORADA', 350, 40, 1, 1, 1, 'Brasília', 'Setor Hoteleiro Norte', 'SHN Quadra 1', -15.79, -47.89, false],
    ['Apartamento 4 suítes, 2 por andar', 'APARTAMENTO', 'VENDA', 3100000, 180, 4, 4, 3, 'Brasília', 'Sudoeste', 'SQSW 300', -15.798, -47.925, false],
    ['Galpão logístico com doca', 'GALPAO', 'ALUGUEL', 25000, 1200, 0, 0, 10, 'Brasília', 'SIA', 'SIA Trecho 3', -15.803, -47.955, false],
    ['Casa sobrado 3 quartos, quintal amplo', 'CASA', 'ALUGUEL', 4800, 160, 3, 1, 2, 'Vicente Pires', 'Vicente Pires', 'Rua 4C', -15.803, -48.023, false],
    ['Apartamento 3 quartos com varanda gourmet', 'APARTAMENTO', 'VENDA', 870000, 82, 3, 1, 2, 'Águas Claras', 'Sul', 'Avenida Araucárias', -15.845, -48.031, false],
    ['Casa em condomínio, 3 suítes', 'CASA_CONDOMINIO', 'VENDA', 1290000, 240, 3, 3, 4, 'Jardim Botânico', 'Jardim Botânico', 'Condomínio Mirante', -15.873, -47.79, false],
    ['Lançamento: 2 e 3 quartos com lazer de clube', 'APARTAMENTO', 'VENDA', 640000, 70, 2, 1, 1, 'Samambaia', 'Samambaia Sul', 'QS 302', -15.877, -48.091, true],
    ['Cobertura linear com piscina privativa', 'COBERTURA', 'VENDA', 1980000, 260, 4, 2, 3, 'Guará', 'Guará I', 'QI 12', -15.817, -47.977, false],
    ['Apartamento 1 quarto mobiliado', 'APARTAMENTO', 'ALUGUEL', 2600, 45, 1, 1, 1, 'Brasília', 'Asa Norte', 'SQN 211', -15.765, -47.879, false],
    ['Prédio comercial com 6 salas', 'PREDIO', 'VENDA', 4200000, 900, 0, 0, 8, 'Taguatinga', 'Taguatinga Norte', 'QNA 30', -15.82, -48.065, false],
    ['Casa de praia… no cerrado: chalé para temporada', 'CASA', 'TEMPORADA', 600, 90, 2, 1, 2, 'Pirenópolis', 'Centro', 'Rua do Bonfim', -15.851, -48.959, false],
    ['Kitnet reformada com garagem', 'KITNET', 'VENDA', 215000, 30, 1, 0, 1, 'Guará', 'Guará II', 'QE 38', -15.836, -47.982, false]
];

/** Fotos de teste (frontend/public/mock/fotos): cada anúncio recebe 4, em sequência diferente. */
export const TOTAL_FOTOS_MOCK = 9;
export function fotosMock(n: number): FotoImovel[] {
    // a 1ª fica como "foto real", a 2ª como "IA" e as demais "não informado", para demonstrar os três estados
    const origens: OrigemFoto[] = ['REAL', 'IA', 'NAO_INFORMADO', 'NAO_INFORMADO'];
    return [0, 1, 3, 5].map((d, k) => ({ url: `/mock/fotos/foto-${((n + d) % TOTAL_FOTOS_MOCK) + 1}.jpg`, origem: origens[k] }));
}

const CARACTERISTICAS = ['Área de serviço', 'Armários embutidos', 'Piscina', 'Varanda', 'Churrasqueira', 'Portaria 24h', 'Academia', 'Salão de festas', 'Elevador', 'Playground', 'Ar condicionado', 'Interfone'];

export function criarDemoDb(): DemoDb {
    const agora = Date.now();
    const dia = 86400000;
    const usuarios: DemoUsuario[] = [
        {
            id: 1,
            nome: 'Administrador Demo',
            email: 'admin@imoveis.local',
            senha: 'admin12345',
            telefone: '61900000001',
            creci: null,
            documento: null,
            tipoAnunciante: null,
            fotoUrl: null,
            ativo: true,
            papeis: ['ADMIN', 'CORRETOR', 'CLIENTE'],
            ultimoAcesso: null,
            criadoEm: new Date(agora - 90 * dia).toISOString()
        },
        {
            id: 2,
            nome: 'Corretora Exemplo',
            email: 'corretor@imoveis.local',
            senha: 'corretor123',
            telefone: '61900000002',
            creci: '12345-F',
            documento: null,
            tipoAnunciante: 'CORRETOR',
            fotoUrl: null,
            ativo: true,
            papeis: ['CORRETOR', 'CLIENTE'],
            ultimoAcesso: null,
            criadoEm: new Date(agora - 60 * dia).toISOString()
        },
        {
            id: 3,
            nome: 'Imobiliária Modelo',
            email: 'imobiliaria@imoveis.local',
            senha: 'corretor123',
            telefone: '61900000003',
            creci: 'J-0420',
            documento: null,
            tipoAnunciante: 'IMOBILIARIA',
            fotoUrl: null,
            ativo: true,
            papeis: ['CORRETOR', 'CLIENTE'],
            ultimoAcesso: null,
            criadoEm: new Date(agora - 45 * dia).toISOString()
        },
        {
            id: 4,
            nome: 'Cliente Exemplo',
            email: 'cliente@imoveis.local',
            senha: 'cliente123',
            telefone: '61900000004',
            creci: null,
            documento: null,
            tipoAnunciante: null,
            fotoUrl: null,
            ativo: true,
            papeis: ['CLIENTE'],
            ultimoAcesso: null,
            criadoEm: new Date(agora - 30 * dia).toISOString()
        }
    ];
    usuarios.forEach((u) => Object.assign(u, perfilDemo(u.id)));
    const imoveis: DemoImovel[] = MODELOS.map((m, n) => {
        const [titulo, tipo, finalidade, preco, area, q, s, v, cidade, bairro, endereco, lat, lng, lanc] = m;
        const ehApto = tipo === 'APARTAMENTO' || tipo === 'COBERTURA';
        return {
            id: n + 1,
            titulo,
            descricao: `${titulo}. ${tipoLabel(tipo)} com ${area} m² em ${bairro}, ${cidade}. Imóvel de exemplo para demonstração: ambientes bem iluminados, boa localização e fácil acesso a comércio e transporte.\n\nAgende uma visita e conheça todos os detalhes.`,
            finalidade,
            tipo,
            status: 'ATIVO' as StatusAnuncio,
            preco,
            condominio: ehApto ? 450 + (n % 5) * 120 : null,
            iptu: finalidade === 'VENDA' ? 900 + n * 80 : null,
            areaUtil: area,
            areaTotal: area,
            quartos: q,
            suites: s,
            banheiros: Math.max(1, s + 1),
            vagas: v,
            uf: 'DF',
            cidade,
            bairro,
            endereco,
            numero: null,
            cep: null,
            latitude: lat,
            longitude: lng,
            lancamento: lanc,
            destaque: n % 3 === 0,
            aceitaFinanciamento: finalidade === 'VENDA',
            aceitaFgts: finalidade === 'VENDA' && n % 2 === 0,
            aceitaPermuta: n % 4 === 1,
            escrituraRegistrada: finalidade === 'VENDA' && !lanc,
            quitado: n % 3 !== 2,
            fotos: fotosMock(n),
            caracteristicas: CARACTERISTICAS.filter((_, i) => (i + n) % 3 === 0).slice(0, 6),
            visualizacoes: 15 + ((n * 37) % 300),
            anuncianteId: n % 2 === 0 ? 2 : 3,
            criadoEm: new Date(agora - (n * 2 + 1) * dia).toISOString(),
            atualizadoEm: new Date(agora - n * dia).toISOString()
        };
    });
    return {
        versao: 1,
        seq: 1000,
        usuarios,
        imoveis,
        contatos: [
            { id: 1, imovelId: 1, nome: 'Maria Visitante', email: 'maria@exemplo.com', telefone: '61988880000', mensagem: 'Olá! Gostaria de agendar uma visita no fim de semana.', lido: false, criadoEm: new Date(agora - 2 * dia).toISOString() },
            { id: 2, imovelId: 3, nome: 'João Interessado', email: 'joao@exemplo.com', telefone: null, mensagem: 'O imóvel aceita financiamento?', lido: true, criadoEm: new Date(agora - 5 * dia).toISOString() }
        ],
        favoritos: [{ usuarioId: 4, imovelId: 2, criadoEm: new Date(agora - dia).toISOString() }],
        tokens: [],
        config: { ...CONFIG_PADRAO }
    };
}
