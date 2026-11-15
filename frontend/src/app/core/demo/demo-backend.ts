import { HttpParams, HttpRequest } from '@angular/common/http';
import { ContagemTipo, FotoImovel, ImovelDetalhe, ImovelFiltro, ImovelResumo, ORIGENS_FOTO, OrigemFoto, PageResponse, Perfil, Sessao, StatusAnuncio, TIPOS, TipoImovel, tipoLabel } from '@/app/core/models/models';
import { DemoDb, DemoImovel, DemoUsuario, criarDemoDb, fotosMock } from './demo-data';

/**
 * "Backend de mentira" que imita as rotas /app/** do Spring Boot dentro do navegador.
 * Só entra em ação quando a API real não responde (site publicado como arquivos estáticos).
 * Os dados ficam no localStorage, então cadastros e anúncios persistem entre visitas.
 */
export class DemoError {
    constructor(
        public status: number,
        public message: string
    ) {}
}

const DB_KEY = 'imoveis.demo.db';
const SESSAO_KEY = 'imoveis.demo.sessao';

function permitidos(papeis: Perfil[]): Perfil[] {
    const s = new Set<Perfil>();
    if (papeis.includes('ADMIN')) ['ADMIN', 'CORRETOR', 'CLIENTE'].forEach((p) => s.add(p as Perfil));
    if (papeis.includes('CORRETOR')) ['CORRETOR', 'CLIENTE'].forEach((p) => s.add(p as Perfil));
    if (papeis.includes('CLIENTE')) s.add('CLIENTE');
    return (['CLIENTE', 'CORRETOR', 'ADMIN'] as Perfil[]).filter((p) => s.has(p));
}

/** Converte uma foto salva por versões antigas do modo demonstração para { url, origem }. */
function origemFotoAntiga(f: unknown): FotoImovel {
    if (typeof f === 'string') return { url: f, origem: 'NAO_INFORMADO' };
    const o = f as { url: string; origem?: OrigemFoto; editadaIa?: boolean };
    return { url: o.url, origem: o.origem ?? (o.editadaIa ? 'IA' : 'NAO_INFORMADO') };
}

export class DemoBackend {
    private db: DemoDb;

    constructor() {
        this.db = this.carregar();
    }

    private carregar(): DemoDb {
        try {
            const raw = localStorage.getItem(DB_KEY);
            if (raw) {
                const db = JSON.parse(raw) as DemoDb;
                if (db.versao === 1) {
                    db.imoveis.forEach((i) => {
                        i.aceitaFgts ??= false;
                        i.aceitaPermuta ??= false;
                        i.escrituraRegistrada ??= false;
                        i.quitado ??= false;
                        // bancos de demonstração antigos não tinham fotos: usa as fotos de teste
                        if (!i.fotos || i.fotos.length === 0) i.fotos = fotosMock(i.id - 1);
                        // versões antigas guardavam só a URL ou { url, editadaIa }; hoje é { url, origem }
                        i.fotos = (i.fotos as unknown[]).map((f) => origemFotoAntiga(f));
                    });
                    return db;
                }
            }
        } catch {
            /* recria */
        }
        const db = criarDemoDb();
        this.salvarDb(db);
        return db;
    }

    private salvarDb(db = this.db) {
        try {
            localStorage.setItem(DB_KEY, JSON.stringify(db));
        } catch {
            /* sem espaço: segue em memória */
        }
    }

    private sessao(): { usuarioId: number; perfil: Perfil } | null {
        try {
            const raw = sessionStorage.getItem(SESSAO_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    private setSessao(s: { usuarioId: number; perfil: Perfil } | null) {
        if (s) sessionStorage.setItem(SESSAO_KEY, JSON.stringify(s));
        else sessionStorage.removeItem(SESSAO_KEY);
    }

    private exigir(...perfis: Perfil[]): { u: DemoUsuario; perfil: Perfil } {
        const s = this.sessao();
        const u = s ? this.db.usuarios.find((x) => x.id === s.usuarioId && x.ativo) : undefined;
        if (!s || !u) throw new DemoError(401, 'Faça login para continuar.');
        if (perfis.length && !perfis.includes(s.perfil)) throw new DemoError(403, 'Seu perfil não tem acesso a este recurso.');
        return { u, perfil: s.perfil };
    }

    private nextId() {
        this.db.seq += 1;
        return this.db.seq;
    }

    /** Responde a uma requisição; lança DemoError para erros HTTP. */
    handle(req: HttpRequest<any>): unknown {
        const url = req.url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
        const m = req.method;
        const p = req.params;
        const body = req.body ?? {};
        let r: RegExpMatchArray | null;

        // ---- auth
        if (url === '/app/auth/csrf') return { headerName: 'X-XSRF-TOKEN', parameterName: '_csrf', token: 'demo' };
        if (url === '/app/auth/me') return this.sessaoDto();
        if (url === '/app/auth/login' && m === 'POST') return this.login(body);
        if (url === '/app/auth/registro' && m === 'POST') return this.registro(body);
        if (url === '/app/auth/perfil' && m === 'POST') {
            const { u } = this.exigir();
            if (body.perfil === 'ADMIN') throw new DemoError(403, 'Administradores entram pela página /admin');
            if (!permitidos(u.papeis).includes(body.perfil)) throw new DemoError(403, 'Sua conta não tem esse perfil');
            this.setSessao({ usuarioId: u.id, perfil: body.perfil });
            return this.sessaoDto();
        }
        if (url === '/app/auth/logout') {
            this.setSessao(null);
            return null;
        }

        // ---- público
        if (url === '/app/public/configuracao') return this.db.config;
        if (url === '/app/public/imoveis') return this.buscar(this.filtro(p), 'ATIVO');
        if (url === '/app/public/imoveis/destaques') return this.destaques(Number(p.get('limite') ?? 8));
        if (url === '/app/public/imoveis/opcoes') return this.opcoes();
        if (url === '/app/public/imoveis/contagem-tipos') return this.contagem(this.filtro(p));
        if (url === '/app/public/imoveis/mapa')
            return this.filtrar(this.filtro(p), 'ATIVO')
                .filter((i) => i.latitude != null)
                .map((i) => this.resumo(i));
        if ((r = url.match(/^\/app\/public\/imoveis\/(\d+)\/similares$/))) return this.similares(+r[1]);
        if ((r = url.match(/^\/app\/public\/imoveis\/(\d+)\/contato$/)) && m === 'POST') return this.contato(+r[1], body);
        if ((r = url.match(/^\/app\/public\/imoveis\/(\d+)$/))) {
            const i = this.db.imoveis.find((x) => x.id === +r![1] && x.status === 'ATIVO');
            if (!i) throw new DemoError(404, 'Imóvel não encontrado');
            i.visualizacoes++;
            this.salvarDb();
            return this.detalhe(i);
        }

        // ---- conta
        if (url.startsWith('/app/conta')) return this.conta(url, m, body);

        // ---- gestão (corretor/admin)
        if ((r = url.match(/^\/app\/(corretor|admin)\/(imoveis|anuncios|contatos)(.*)$/))) {
            const area = r[1] as 'corretor' | 'admin';
            const ctx = this.exigir(area === 'admin' ? 'ADMIN' : 'CORRETOR');
            return this.gestao(ctx, r[2] + r[3], m, body, p);
        }

        // ---- admin
        if (url.startsWith('/app/admin')) {
            this.exigir('ADMIN');
            return this.admin(url, m, body, p);
        }
        if (url === '/app/uploads' || url === '/app/conta/foto') {
            // foto de perfil: qualquer usuário logado; demais imagens: corretor e admin
            if (url === '/app/uploads') this.exigir('CORRETOR', 'ADMIN');
            else this.exigir();
            const arquivo: File | null = body instanceof FormData ? (body.get('arquivo') as File) : null;
            if (!arquivo) throw new DemoError(400, 'Envie um arquivo');
            if (arquivo.size > 1_500_000) throw new DemoError(413, 'No modo demonstração o limite é 1,5 MB por imagem');
            return null; // tratado no interceptor (lê o arquivo como data URL)
        }
        throw new DemoError(404, 'Recurso não encontrado (modo demonstração)');
    }

    // ------------------------------------------------------------------ auth

    private sessaoDto(): Sessao {
        const s = this.sessao();
        const u = s ? this.db.usuarios.find((x) => x.id === s.usuarioId && x.ativo) : undefined;
        if (!s || !u) return { autenticado: false, usuario: null, perfil: null, perfisDisponiveis: [] };
        return {
            autenticado: true,
            usuario: { id: u.id, nome: u.nome, email: u.email, telefone: u.telefone, creci: u.creci, fotoUrl: u.fotoUrl },
            perfil: s.perfil,
            perfisDisponiveis: permitidos(u.papeis)
        };
    }

    private login(b: any): Sessao {
        const admin = b.area === 'admin';
        if (admin && b.perfil !== 'ADMIN') throw new DemoError(400, 'Na área administrativa o perfil deve ser ADMIN');
        if (!admin && b.perfil === 'ADMIN') throw new DemoError(403, 'Administradores entram pela página /admin');
        const u = this.db.usuarios.find(
            (x) =>
                x.email.toLowerCase() ===
                    String(b.email ?? '')
                        .trim()
                        .toLowerCase() && x.senha === b.senha
        );
        if (!u) throw new DemoError(401, 'E-mail ou senha inválidos');
        if (!u.ativo) throw new DemoError(403, 'Conta desativada. Fale com o suporte.');
        if (!permitidos(u.papeis).includes(b.perfil)) throw new DemoError(403, 'Sua conta não tem acesso como ' + String(b.perfil).toLowerCase());
        u.ultimoAcesso = new Date().toISOString();
        this.salvarDb();
        this.setSessao({ usuarioId: u.id, perfil: b.perfil });
        return this.sessaoDto();
    }

    private registro(b: any): Sessao {
        if (!b.nome || !b.email || !b.senha || String(b.senha).length < 8) throw new DemoError(400, 'Preencha nome, e-mail e uma senha com pelo menos 8 caracteres');
        if (b.tipo === 'ADMIN') throw new DemoError(403, 'Cadastro de administrador não é permitido');
        if (b.tipo === 'CORRETOR' && !this.db.config.permitirCadastroCorretor) throw new DemoError(403, 'O cadastro de corretores está fechado no momento');
        if (b.tipo === 'CORRETOR' && !b.creci) throw new DemoError(400, 'Informe o CRECI para anunciar');
        const email = String(b.email).trim().toLowerCase();
        if (this.db.usuarios.some((x) => x.email === email)) throw new DemoError(409, 'Já existe uma conta com este e-mail');
        const u: DemoUsuario = {
            id: this.nextId(),
            nome: b.nome,
            email,
            senha: b.senha,
            telefone: b.telefone ?? null,
            creci: b.creci ?? null,
            documento: b.documento ?? null,
            tipoAnunciante: b.tipo === 'CORRETOR' ? (b.tipoAnunciante ?? 'CORRETOR') : null,
            fotoUrl: null,
            ativo: true,
            papeis: b.tipo === 'CORRETOR' ? ['CORRETOR', 'CLIENTE'] : ['CLIENTE'],
            ultimoAcesso: new Date().toISOString(),
            criadoEm: new Date().toISOString()
        };
        this.db.usuarios.push(u);
        this.salvarDb();
        this.setSessao({ usuarioId: u.id, perfil: b.tipo });
        return this.sessaoDto();
    }

    // ------------------------------------------------------------------ busca

    private filtro(p: HttpParams): ImovelFiltro {
        const num = (k: string) => (p.has(k) ? Number(p.get(k)) : null);
        return {
            q: p.get('q'),
            finalidade: p.get('finalidade') as any,
            tipo: p.getAll('tipo') as TipoImovel[] | null,
            uf: p.get('uf'),
            cidade: p.get('cidade'),
            bairro: p.get('bairro'),
            quartos: num('quartos'),
            vagas: num('vagas'),
            suites: num('suites'),
            precoMin: num('precoMin'),
            precoMax: num('precoMax'),
            areaMin: num('areaMin'),
            areaMax: num('areaMax'),
            lancamento: p.get('lancamento') === 'true' ? true : null,
            destaque: p.get('destaque') === 'true' ? true : null,
            status: p.get('status') as StatusAnuncio | null,
            ordem: p.get('ordem'),
            page: num('page'),
            size: num('size')
        };
    }

    private filtrar(f: ImovelFiltro, status: StatusAnuncio | null, anunciante?: number): DemoImovel[] {
        const low = (s: string | null | undefined) => (s ?? '').toLowerCase();
        let lista = this.db.imoveis.filter((i) => {
            if (status && i.status !== status) return false;
            if (!status && f.status && i.status !== f.status) return false;
            if (anunciante != null && i.anuncianteId !== anunciante) return false;
            if (f.finalidade && i.finalidade !== f.finalidade) return false;
            if (f.tipo && f.tipo.length && !f.tipo.includes(i.tipo)) return false;
            if (f.uf && low(i.uf) !== low(f.uf)) return false;
            if (f.cidade && low(i.cidade) !== low(f.cidade)) return false;
            if (f.bairro && low(i.bairro) !== low(f.bairro)) return false;
            if (f.quartos && (i.quartos ?? 0) < f.quartos) return false;
            if (f.vagas && (i.vagas ?? 0) < f.vagas) return false;
            if (f.suites && (i.suites ?? 0) < f.suites) return false;
            if (f.precoMin != null && i.preco < f.precoMin) return false;
            if (f.precoMax != null && i.preco > f.precoMax) return false;
            if (f.areaMin != null && (i.areaUtil ?? 0) < f.areaMin) return false;
            if (f.areaMax != null && (i.areaUtil ?? 0) > f.areaMax) return false;
            if (f.lancamento && !i.lancamento) return false;
            if (f.destaque && !i.destaque) return false;
            if (f.q) {
                const t = low(f.q);
                const cod = 'im-' + String(i.id).padStart(6, '0');
                if (![i.titulo, i.bairro, i.cidade, i.endereco, cod].some((x) => low(x).includes(t))) return false;
            }
            return true;
        });
        const ordem = f.ordem;
        const data = (i: DemoImovel) => new Date(i.criadoEm).getTime();
        lista = [...lista].sort((a, b) => {
            switch (ordem) {
                case 'menor-preco':
                    return a.preco - b.preco;
                case 'maior-preco':
                    return b.preco - a.preco;
                case 'maior-area':
                    return (b.areaUtil ?? 0) - (a.areaUtil ?? 0);
                case 'mais-vistos':
                    return b.visualizacoes - a.visualizacoes;
                case 'recentes':
                    return data(b) - data(a);
                default:
                    return Number(b.destaque) - Number(a.destaque) || data(b) - data(a);
            }
        });
        return lista;
    }

    private buscar(f: ImovelFiltro, status: StatusAnuncio | null, anunciante?: number): PageResponse<ImovelResumo> {
        const todos = this.filtrar(f, status, anunciante);
        const size = Math.min(Math.max(f.size ?? 12, 1), 60);
        const page = Math.max(f.page ?? 0, 0);
        return {
            content: todos.slice(page * size, page * size + size).map((i) => this.resumo(i)),
            page,
            size,
            totalElements: todos.length,
            totalPages: Math.ceil(todos.length / size)
        };
    }

    private destaques(limite: number): ImovelResumo[] {
        const ativos = this.filtrar({ ordem: 'recentes' }, 'ATIVO');
        const lista = [...ativos.filter((i) => i.destaque), ...ativos.filter((i) => !i.destaque)];
        return lista.slice(0, limite).map((i) => this.resumo(i));
    }

    private similares(id: number): ImovelResumo[] {
        const base = this.db.imoveis.find((i) => i.id === id);
        if (!base) return [];
        return this.filtrar({ finalidade: base.finalidade, tipo: [base.tipo], cidade: base.cidade }, 'ATIVO')
            .filter((i) => i.id !== id)
            .slice(0, 4)
            .map((i) => this.resumo(i));
    }

    private opcoes() {
        const mapa = new Map<string, { uf: string; cidade: string; bairros: string[] }>();
        for (const i of this.db.imoveis.filter((x) => x.status === 'ATIVO')) {
            const k = i.uf + '|' + i.cidade;
            if (!mapa.has(k)) mapa.set(k, { uf: i.uf, cidade: i.cidade, bairros: [] });
            const loc = mapa.get(k)!;
            if (!loc.bairros.includes(i.bairro)) loc.bairros.push(i.bairro);
        }
        const localidades = [...mapa.values()].sort((a, b) => a.cidade.localeCompare(b.cidade));
        localidades.forEach((l) => l.bairros.sort((a, b) => a.localeCompare(b)));
        return { tipos: TIPOS, localidades };
    }

    private contagem(f: ImovelFiltro): ContagemTipo[] {
        const base = this.filtrar({ ...f, tipo: null }, 'ATIVO');
        return TIPOS.map((t) => ({ tipo: t.value, label: t.label, total: base.filter((i) => i.tipo === t.value).length })).sort((a, b) => b.total - a.total);
    }

    private resumo(i: DemoImovel): ImovelResumo {
        const a = this.db.usuarios.find((u) => u.id === i.anuncianteId);
        const desc = (i.descricao ?? '').replace(/\s+/g, ' ').trim();
        return {
            id: i.id,
            codigo: 'IM-' + String(i.id).padStart(6, '0'),
            titulo: i.titulo,
            finalidade: i.finalidade,
            tipo: i.tipo,
            tipoDescricao: tipoLabel(i.tipo),
            status: i.status,
            preco: i.preco,
            condominio: i.condominio,
            areaUtil: i.areaUtil,
            quartos: i.quartos,
            suites: i.suites,
            banheiros: i.banheiros,
            vagas: i.vagas,
            uf: i.uf,
            cidade: i.cidade,
            bairro: i.bairro,
            endereco: i.endereco,
            numero: i.numero,
            latitude: i.latitude,
            longitude: i.longitude,
            descricaoCurta: desc.length > 220 ? desc.slice(0, 217) + '...' : desc,
            anuncianteCreci: a?.creci ?? null,
            anuncianteFoto: a?.fotoUrl ?? null,
            fotoCapa: i.fotos[0]?.url ?? null,
            fotoCapaIa: i.fotos[0]?.origem === 'IA',
            totalFotos: i.fotos.length,
            lancamento: i.lancamento,
            destaque: i.destaque,
            aceitaFinanciamento: !!i.aceitaFinanciamento,
            aceitaFgts: !!i.aceitaFgts,
            visualizacoes: i.visualizacoes,
            anuncianteId: i.anuncianteId,
            anuncianteNome: a?.nome ?? null,
            criadoEm: i.criadoEm
        };
    }

    private detalhe(i: DemoImovel): ImovelDetalhe {
        const a = this.db.usuarios.find((u) => u.id === i.anuncianteId);
        const { anuncianteId, ...resto } = i;
        return {
            ...resto,
            codigo: 'IM-' + String(i.id).padStart(6, '0'),
            tipoDescricao: tipoLabel(i.tipo),
            anunciante: a ? { id: a.id, nome: a.nome, telefone: a.telefone, creci: a.creci, fotoUrl: a.fotoUrl } : null
        };
    }

    private contato(id: number, b: any) {
        const i = this.db.imoveis.find((x) => x.id === id && x.status === 'ATIVO');
        if (!i) throw new DemoError(404, 'Imóvel não encontrado');
        if (!b.nome || !b.email || !b.mensagem) throw new DemoError(400, 'Preencha nome, e-mail e mensagem');
        const c = { id: this.nextId(), imovelId: id, nome: b.nome, email: b.email, telefone: b.telefone ?? null, mensagem: b.mensagem, lido: false, criadoEm: new Date().toISOString() };
        this.db.contatos.push(c);
        this.salvarDb();
        return this.contatoDto(c);
    }

    private contatoDto(c: DemoDb['contatos'][number]) {
        const i = this.db.imoveis.find((x) => x.id === c.imovelId);
        return { ...c, imovelCodigo: 'IM-' + String(c.imovelId).padStart(6, '0'), imovelTitulo: i?.titulo ?? '' };
    }

    // ------------------------------------------------------------------ conta

    private usuarioDto(u: DemoUsuario) {
        const { senha, ...resto } = u;
        return { ...resto, perfisPermitidos: permitidos(u.papeis) };
    }

    private conta(url: string, m: string, b: any): unknown {
        const { u } = this.exigir();
        let r: RegExpMatchArray | null;
        if (url === '/app/conta/perfil') {
            if (m === 'PUT') {
                Object.assign(u, b);
                this.salvarDb();
            }
            return this.usuarioDto(u);
        }
        if (url === '/app/conta/senha') {
            if (b.senhaAtual !== u.senha) throw new DemoError(400, 'Senha atual incorreta');
            u.senha = b.novaSenha;
            this.salvarDb();
            return null;
        }
        if (url === '/app/conta/favoritos') {
            return this.db.favoritos
                .filter((f) => f.usuarioId === u.id)
                .map((f) => this.db.imoveis.find((i) => i.id === f.imovelId))
                .filter((i): i is DemoImovel => !!i)
                .map((i) => this.resumo(i));
        }
        if (url === '/app/conta/favoritos/ids') return this.db.favoritos.filter((f) => f.usuarioId === u.id).map((f) => f.imovelId);
        if ((r = url.match(/^\/app\/conta\/favoritos\/(\d+)$/))) {
            const id = +r[1];
            this.db.favoritos = this.db.favoritos.filter((f) => !(f.usuarioId === u.id && f.imovelId === id));
            if (m === 'POST') this.db.favoritos.unshift({ usuarioId: u.id, imovelId: id, criadoEm: new Date().toISOString() });
            this.salvarDb();
            return null;
        }
        if (url.startsWith('/app/conta/tokens')) {
            const sessaoAtual = this.sessao();
            if (sessaoAtual?.perfil !== 'CORRETOR' && sessaoAtual?.perfil !== 'ADMIN') throw new DemoError(403, 'Tokens de API são exclusivos para corretores e administradores');
        }
        if (url === '/app/conta/tokens') {
            if (m === 'POST') {
                if (b.perfil === 'CLIENTE') throw new DemoError(403, 'Tokens de API são exclusivos para corretores e administradores');
                if (!permitidos(u.papeis).includes(b.perfil)) throw new DemoError(403, 'Você não possui esse perfil');
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                let token = 'imv_';
                for (let i = 0; i < 40; i++) token += chars[Math.floor(Math.random() * chars.length)];
                const t = {
                    id: this.nextId(),
                    usuarioId: u.id,
                    nome: b.nome,
                    prefixo: token.slice(0, 12),
                    perfil: b.perfil,
                    criadoEm: new Date().toISOString(),
                    expiraEm: b.validadeDias ? new Date(Date.now() + b.validadeDias * 86400000).toISOString() : null,
                    ultimoUso: null,
                    revogado: false
                };
                this.db.tokens.push(t);
                this.salvarDb();
                const { usuarioId, revogado, ...info } = t;
                return { info, token };
            }
            return this.db.tokens.filter((t) => t.usuarioId === u.id && !t.revogado).map(({ usuarioId, revogado, ...info }) => info);
        }
        if ((r = url.match(/^\/app\/conta\/tokens\/(\d+)$/))) {
            const t = this.db.tokens.find((x) => x.id === +r![1] && x.usuarioId === u.id);
            if (t) t.revogado = true;
            this.salvarDb();
            return null;
        }
        throw new DemoError(404, 'Recurso não encontrado');
    }

    // ---------------------------------------------------------------- gestão

    private gestao(ctx: { u: DemoUsuario; perfil: Perfil }, rota: string, m: string, b: any, p: HttpParams): unknown {
        const admin = ctx.perfil === 'ADMIN';
        let r: RegExpMatchArray | null;
        const carregar = (id: number) => {
            const i = this.db.imoveis.find((x) => x.id === id);
            if (!i) throw new DemoError(404, 'Imóvel não encontrado');
            if (!admin && i.anuncianteId !== ctx.u.id) throw new DemoError(403, 'Você não pode alterar este anúncio');
            return i;
        };
        if (rota === 'imoveis' && m === 'GET') return this.buscar(this.filtro(p), null, admin ? undefined : ctx.u.id);
        if (rota === 'imoveis' && m === 'POST') {
            this.validar(b);
            const agora = new Date().toISOString();
            const i: DemoImovel = {
                ...this.normalizar(b),
                id: this.nextId(),
                status: !admin && this.db.config.moderarAnuncios ? 'PENDENTE' : 'ATIVO',
                destaque: false,
                visualizacoes: 0,
                anuncianteId: ctx.u.id,
                criadoEm: agora,
                atualizadoEm: agora
            };
            this.db.imoveis.unshift(i);
            this.salvarDb();
            return this.detalhe(i);
        }
        if ((r = rota.match(/^imoveis\/(\d+)$/))) {
            const i = carregar(+r[1]);
            if (m === 'PUT') {
                this.validar(b);
                Object.assign(i, this.normalizar(b), { atualizadoEm: new Date().toISOString() });
                this.salvarDb();
            }
            if (m === 'DELETE') {
                this.db.imoveis = this.db.imoveis.filter((x) => x.id !== i.id);
                this.db.contatos = this.db.contatos.filter((x) => x.imovelId !== i.id);
                this.db.favoritos = this.db.favoritos.filter((x) => x.imovelId !== i.id);
                this.salvarDb();
                return null;
            }
            return this.detalhe(i);
        }
        if ((r = rota.match(/^imoveis\/(\d+)\/status$/))) {
            const i = carregar(+r[1]);
            if (admin) {
                i.status = b.status;
                if (b.destaque != null) i.destaque = b.destaque;
            } else {
                if (!['ATIVO', 'PAUSADO', 'CONCLUIDO'].includes(b.status)) throw new DemoError(403, 'Status não permitido');
                if (i.status === 'PENDENTE' || i.status === 'BLOQUEADO') throw new DemoError(409, 'Este anúncio depende de uma decisão da administração');
                i.status = b.status;
            }
            this.salvarDb();
            return this.detalhe(i);
        }
        if (rota === 'anuncios/estatisticas') {
            const lista = admin ? this.db.imoveis : this.db.imoveis.filter((i) => i.anuncianteId === ctx.u.id);
            const ids = new Set(lista.map((i) => i.id));
            return {
                total: lista.length,
                ativos: lista.filter((i) => i.status === 'ATIVO').length,
                pendentes: lista.filter((i) => i.status === 'PENDENTE').length,
                pausados: lista.filter((i) => i.status === 'PAUSADO').length,
                visualizacoes: lista.reduce((s, i) => s + i.visualizacoes, 0),
                contatosNaoLidos: this.db.contatos.filter((c) => ids.has(c.imovelId) && !c.lido).length
            };
        }
        if (rota === 'contatos') {
            const meus = new Set(this.db.imoveis.filter((i) => admin || i.anuncianteId === ctx.u.id).map((i) => i.id));
            const lista = this.db.contatos.filter((c) => meus.has(c.imovelId)).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
            const page = Number(p.get('page') ?? 0);
            const size = Number(p.get('size') ?? 20);
            return { content: lista.slice(page * size, page * size + size).map((c) => this.contatoDto(c)), page, size, totalElements: lista.length, totalPages: Math.ceil(lista.length / size) };
        }
        if ((r = rota.match(/^contatos\/(\d+)$/))) {
            const c = this.db.contatos.find((x) => x.id === +r![1]);
            if (!c) throw new DemoError(404, 'Contato não encontrado');
            const i = this.db.imoveis.find((x) => x.id === c.imovelId);
            if (!admin && i?.anuncianteId !== ctx.u.id) throw new DemoError(403, 'Contato de outro anunciante');
            c.lido = p.get('lido') !== 'false';
            this.salvarDb();
            return this.contatoDto(c);
        }
        throw new DemoError(404, 'Recurso não encontrado');
    }

    private validar(b: any) {
        if (!b.titulo || !b.finalidade || !b.tipo || b.preco == null || !b.uf || !b.cidade || !b.bairro) {
            throw new DemoError(400, 'Preencha título, finalidade, tipo, preço, UF, cidade e bairro');
        }
    }

    private normalizar(b: any) {
        return {
            titulo: String(b.titulo).trim(),
            descricao: b.descricao ?? null,
            finalidade: b.finalidade,
            tipo: b.tipo,
            preco: Number(b.preco),
            condominio: b.condominio ?? null,
            iptu: b.iptu ?? null,
            areaUtil: b.areaUtil ?? null,
            areaTotal: b.areaTotal ?? null,
            quartos: b.quartos ?? null,
            suites: b.suites ?? null,
            banheiros: b.banheiros ?? null,
            vagas: b.vagas ?? null,
            uf: String(b.uf).toUpperCase(),
            cidade: String(b.cidade).trim(),
            bairro: String(b.bairro).trim(),
            endereco: b.endereco ?? null,
            numero: b.numero ?? null,
            cep: b.cep ?? null,
            latitude: b.latitude ?? null,
            longitude: b.longitude ?? null,
            lancamento: !!b.lancamento,
            aceitaFinanciamento: !!b.aceitaFinanciamento,
            aceitaFgts: !!b.aceitaFgts,
            aceitaPermuta: !!b.aceitaPermuta,
            escrituraRegistrada: !!b.escrituraRegistrada,
            quitado: !!b.quitado,
            fotos: (b.fotos ?? []).filter((x: { url?: string }) => !!x?.url).map((x: { url: string; origem?: OrigemFoto }) => ({ url: x.url, origem: ORIGENS_FOTO.some((o) => o.value === x.origem) ? x.origem! : 'NAO_INFORMADO' })),
            caracteristicas: (b.caracteristicas ?? []).filter((x: string) => !!x)
        };
    }

    // ------------------------------------------------------------------ admin

    private admin(url: string, m: string, b: any, p: HttpParams): unknown {
        const atual = this.exigir('ADMIN').u;
        let r: RegExpMatchArray | null;
        if (url === '/app/admin/configuracao') {
            if (m === 'PUT') {
                if (!b.nomeApp) throw new DemoError(400, 'Informe o nome do app');
                this.db.config = { ...this.db.config, ...b };
                this.salvarDb();
            }
            return this.db.config;
        }
        if (url === '/app/admin/dashboard') {
            const us = this.db.usuarios;
            return {
                usuarios: us.length,
                clientes: us.filter((u) => u.papeis.includes('CLIENTE')).length,
                corretores: us.filter((u) => u.papeis.includes('CORRETOR')).length,
                administradores: us.filter((u) => u.papeis.includes('ADMIN')).length,
                anuncios: this.gestao({ u: atual, perfil: 'ADMIN' }, 'anuncios/estatisticas', 'GET', {}, p)
            };
        }
        if (url === '/app/admin/usuarios' && m === 'GET') {
            const q = (p.get('q') ?? '').toLowerCase();
            const papel = p.get('papel') as Perfil | null;
            const lista = this.db.usuarios.filter((u) => (!q || u.nome.toLowerCase().includes(q) || u.email.includes(q)) && (!papel || u.papeis.includes(papel))).sort((a, b) => a.nome.localeCompare(b.nome));
            const page = Number(p.get('page') ?? 0);
            const size = Number(p.get('size') ?? 20);
            return { content: lista.slice(page * size, page * size + size).map((u) => this.usuarioDto(u)), page, size, totalElements: lista.length, totalPages: Math.ceil(lista.length / size) };
        }
        if (url === '/app/admin/usuarios' && m === 'POST') {
            const email = String(b.email ?? '')
                .trim()
                .toLowerCase();
            if (!b.nome || !email || !b.senha) throw new DemoError(400, 'Informe nome, e-mail e senha inicial');
            if (this.db.usuarios.some((u) => u.email === email)) throw new DemoError(409, 'Já existe uma conta com este e-mail');
            const u: DemoUsuario = {
                id: this.nextId(),
                nome: b.nome,
                email,
                senha: b.senha,
                telefone: b.telefone ?? null,
                creci: b.creci ?? null,
                documento: null,
                tipoAnunciante: null,
                fotoUrl: null,
                ativo: b.ativo !== false,
                papeis: Array.from(new Set<Perfil>([...(b.papeis ?? []), 'CLIENTE'])),
                ultimoAcesso: null,
                criadoEm: new Date().toISOString()
            };
            this.db.usuarios.push(u);
            this.salvarDb();
            return this.usuarioDto(u);
        }
        if ((r = url.match(/^\/app\/admin\/usuarios\/(\d+)$/))) {
            const u = this.db.usuarios.find((x) => x.id === +r![1]);
            if (!u) throw new DemoError(404, 'Usuário não encontrado');
            if (m === 'DELETE') {
                if (u.id === atual.id) throw new DemoError(400, 'Você não pode excluir a própria conta');
                u.ativo = false;
            } else if (m === 'PUT') {
                if (u.id === atual.id && (!b.papeis?.includes('ADMIN') || !b.ativo)) throw new DemoError(400, 'Você não pode remover o próprio acesso de administrador');
                Object.assign(u, {
                    nome: b.nome,
                    email: String(b.email).trim().toLowerCase(),
                    telefone: b.telefone ?? null,
                    creci: b.creci ?? null,
                    ativo: !!b.ativo,
                    papeis: Array.from(new Set<Perfil>([...(b.papeis ?? []), 'CLIENTE']))
                });
                if (b.senha) u.senha = b.senha;
            }
            this.salvarDb();
            return m === 'DELETE' ? null : this.usuarioDto(u);
        }
        throw new DemoError(404, 'Recurso não encontrado');
    }
}
