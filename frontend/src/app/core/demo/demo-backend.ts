import { HttpParams, HttpRequest } from '@angular/common/http';
import { AnunciantePerfil, AnuncianteResumo, CONDICOES, ClientePainel, CondicaoAnuncio, Finalidade, ContagemTipo, Financeira, QuedaPreco, FatiaPainel, PainelAnuncios, PeriodoPainel, PontoDia, ExibicaoTelefone, FotoImovel, ImovelDetalhe, ImovelFiltro, ImovelResumo, ORIGENS_FOTO, OrigemFoto, PageResponse, Perfil, Sessao, StatusAnuncio, TIPOS, TipoImovel, TipoAnunciante, pendenciasPerfilPublico, tipoLabel } from '@/app/core/models/models';
import { DocumentosDemo } from './demo-documentos';
import { documentoValido } from '@/app/core/pipes/documentos';
import { DemoDb, DemoImovel, DemoUsuario, criarDemoDb, financeirasDemo, fotosMock, perfilDemo } from './demo-data';

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

/** Data local em yyyy-MM-dd. */
function diaIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function periodoValido(dias: number): PeriodoPainel {
    return dias === 7 || dias === 90 ? dias : 30;
}

/** Série dos últimos `dias` (terminando hoje, ou `deslocamento` dias antes), um ponto por dia. */
function serieDias(dias: number, valor: (dia: string) => number, deslocamento = 0): PontoDia[] {
    const hoje = new Date();
    return Array.from({ length: dias }, (_, k) => {
        const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - deslocamento - (dias - 1 - k));
        const dia = diaIso(d);
        return { dia, total: valor(dia) };
    });
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
                    // bancos antigos não tinham o perfil público: completa os anunciantes de exemplo
                    db.usuarios.forEach((u) => {
                        if (u.perfilPublico === undefined) Object.assign(u, perfilDemo(u.id));
                    });
                    db.financeiras ??= financeirasDemo();
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
            const logado = this.sessao();
            if (logado) {
                this.db.vistos = [{ usuarioId: logado.usuarioId, imovelId: i.id, em: new Date().toISOString() }, ...(this.db.vistos ?? []).filter((v) => !(v.usuarioId === logado.usuarioId && v.imovelId === i.id))].slice(0, 300);
            }
            const chave = `${i.id}|${diaIso(new Date())}`;
            this.db.visitasDiarias = { ...this.db.visitasDiarias, [chave]: (this.db.visitasDiarias?.[chave] ?? 0) + 1 };
            this.salvarDb();
            const modo = this.db.config.telefoneAnunciante ?? 'MOSTRAR';
            // logado já recebe o número completo (como no backend)
            return this.detalhe(i, modo === 'MOSTRAR_APENAS_LOGADO' && this.sessao() ? 'MOSTRAR' : modo);
        }
        // ---- diretório e perfil público de anunciantes
        if (url === '/app/public/anunciantes') return this.anunciantes(p);
        if ((r = url.match(/^\/app\/public\/anunciantes\/(\d+)$/))) return this.perfilAnunciante(+r[1]);
        if ((r = url.match(/^\/app\/public\/anunciantes\/(\d+)\/telefone$/))) {
            const modo = this.db.config.telefoneAnunciante ?? 'MOSTRAR';
            if (modo === 'OCULTAR') throw new DemoError(404, 'Telefone não disponível');
            if (modo === 'MOSTRAR_APENAS_LOGADO' && !this.sessao()) throw new DemoError(401, 'Entre na sua conta para ver o telefone do anunciante');
            const a = this.anunciantePublico(+r[1]);
            const tel = a.telefone || a.whatsapp;
            if (!tel) throw new DemoError(404, 'Telefone não disponível');
            return { telefone: tel, whatsapp: a.whatsapp ?? null };
        }
        if ((r = url.match(/^\/app\/public\/imoveis\/(\d+)\/telefone$/))) {
            const modo = this.db.config.telefoneAnunciante ?? 'MOSTRAR';
            if (modo === 'OCULTAR') throw new DemoError(404, 'Telefone não disponível');
            if (modo === 'MOSTRAR_APENAS_LOGADO' && !this.sessao()) throw new DemoError(401, 'Entre na sua conta para ver o telefone do anunciante');
            const i = this.db.imoveis.find((x) => x.id === +r![1] && x.status === 'ATIVO');
            const tel = this.db.usuarios.find((u) => u.id === i?.anuncianteId)?.telefone;
            if (!tel) throw new DemoError(404, 'Telefone não disponível');
            return { telefone: tel };
        }

        // ---- documentos do site (termos, privacidade, código de conduta…)
        if (url === '/app/public/documentos') return this.docs().publicos();
        if (url === '/app/public/documentos/cadastro') return this.docs().exigidosNoCadastro((p.get('perfil') ?? 'CLIENTE') as Perfil);
        if ((r = url.match(/^\/app\/public\/documentos\/([a-z0-9-]+)$/))) return this.docs().porSlug(r[1]);
        if (url === '/app/conta/documentos/pendentes') {
            const { u, perfil } = this.exigir();
            return this.docs().pendentes(u.id, perfil);
        }
        if (url === '/app/conta/documentos/aceites' && m === 'POST') {
            this.docs().aceitar(this.exigir().u.id, body.itens);
            return null;
        }
        if (url.startsWith('/app/admin/documentos')) {
            this.exigir('ADMIN');
            return this.docs().rota(url, m, body, p.get('excluidos') === 'true');
        }

        // ---- financeiras
        if (url === '/app/public/financeiras') return this.financeirasDb().filter((f) => f.ativo).sort((a, b) => a.nome.localeCompare(b.nome));
        if (url === '/app/admin/financeiras' || url.startsWith('/app/admin/financeiras/')) {
            this.exigir('ADMIN');
            return this.financeirasAdmin(url, m, body);
        }

        // ---- painel do cliente
        if (url === '/app/conta/painel') return this.painelCliente(this.exigir().u.id);
        if (url === '/app/conta/favoritos/quedas') return this.quedas(this.exigir().u.id);
        if (url === '/app/conta/favoritos/comparar') {
            const { u } = this.exigir();
            const meus = new Set(this.db.favoritos.filter((f) => f.usuarioId === u.id).map((f) => f.imovelId));
            const ids = [...new Set((p.get('ids') ?? '').split(',').map(Number).filter((id) => meus.has(id)))].slice(0, 4);
            const modo = this.db.config.telefoneAnunciante ?? 'MOSTRAR';
            return ids.flatMap((id) => {
                const i = this.db.imoveis.find((x) => x.id === id);
                return i ? [this.detalhe(i, modo === 'MOSTRAR_APENAS_LOGADO' ? 'MOSTRAR' : modo)] : [];
            });
        }

        // ---- conta
        // envio da foto/capa é tratado mais abaixo (junto com /app/uploads), não em conta()
        if (url.startsWith('/app/conta') && url !== '/app/conta/foto' && url !== '/app/conta/capa') return this.conta(url, m, body);

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
        if (url === '/app/uploads' || url === '/app/conta/foto' || url === '/app/conta/capa') {
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
        this.docs().validarCadastro(b.tipo, b.aceites);
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
        const exigidos = new Set(this.docs().exigidosNoCadastro(b.tipo).map((d) => d.id));
        this.db.documentoAceites = [...(this.db.documentoAceites ?? []), ...((b.aceites ?? []) as { documentoId: number; versao: number }[]).filter((a) => exigidos.has(a.documentoId)).map((a) => ({ ...a, usuarioId: u.id, em: new Date().toISOString() }))];
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
            anunciante: num('anunciante'),
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
            // ?anunciante=ID na busca pública (página do perfil do anunciante)
            if (anunciante == null && f.anunciante != null && i.anuncianteId !== f.anunciante) return false;
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

    /** Gestão (dono/admin) vê o telefone completo; o site público segue a configuração. */
    private detalhe(i: DemoImovel, modoTelefone: ExibicaoTelefone = 'MOSTRAR'): ImovelDetalhe {
        const a = this.db.usuarios.find((u) => u.id === i.anuncianteId);
        const tel = a?.telefone || null;
        const telefone = !tel || modoTelefone === 'OCULTAR' ? null : modoTelefone === 'MOSTRAR_APENAS_LOGADO' ? tel.slice(0, Math.max(0, tel.length - 4)) : tel;
        const telefoneCompleto = !!tel && modoTelefone === 'MOSTRAR';
        const { anuncianteId, financeirasTodas, financeirasIds, ...resto } = i;
        const todas = financeirasTodas ?? i.aceitaFinanciamento;
        const ids = todas ? [] : (financeirasIds ?? []);
        return {
            ...resto,
            condicoes: i.condicoes ?? [],
            contratoMinimoMeses: i.contratoMinimoMeses ?? null,
            noitesMinimas: i.noitesMinimas ?? null,
            hospedesMaximo: i.hospedesMaximo ?? null,
            taxaLimpeza: i.taxaLimpeza ?? null,
            horarioCheckin: i.horarioCheckin ?? null,
            horarioCheckout: i.horarioCheckout ?? null,
            financeirasTodas: todas,
            financeirasIds: ids,
            financeiras: this.financeirasDoAnuncio(i),
            codigo: 'IM-' + String(i.id).padStart(6, '0'),
            tipoDescricao: tipoLabel(i.tipo),
            anunciante: a ? { id: a.id, nome: a.nome, telefone, telefoneCompleto, creci: a.creci, fotoUrl: a.fotoUrl, perfilPublico: this.temPerfilPublico(a) } : null
        };
    }

    private contato(id: number, b: any) {
        const i = this.db.imoveis.find((x) => x.id === id && x.status === 'ATIVO');
        if (!i) throw new DemoError(404, 'Imóvel não encontrado');
        if (!b.nome || !b.email || !b.mensagem) throw new DemoError(400, 'Preencha nome, e-mail e mensagem');
        const c = { id: this.nextId(), imovelId: id, nome: b.nome, email: b.email, telefone: b.telefone ?? null, mensagem: b.mensagem, lido: false, criadoEm: new Date().toISOString(), usuarioId: this.sessao()?.usuarioId ?? null };
        this.db.contatos.push(c);
        this.salvarDb();
        return this.contatoDto(c);
    }

    private contatoDto(c: DemoDb['contatos'][number]) {
        const i = this.db.imoveis.find((x) => x.id === c.imovelId);
        return { ...c, imovelCodigo: 'IM-' + String(c.imovelId).padStart(6, '0'), imovelTitulo: i?.titulo ?? '' };
    }

    // ------------------------------------------------------------------ conta

    private temPerfilPublico(u: DemoUsuario): boolean {
        return u.ativo && !!u.perfilPublico && u.papeis.includes('CORRETOR');
    }

    private anunciantePublico(id: number): DemoUsuario {
        const u = this.db.usuarios.find((x) => x.id === id && this.temPerfilPublico(x));
        if (!u) throw new DemoError(404, 'Perfil não encontrado');
        return u;
    }

    private totalAtivos(id: number): number {
        return this.db.imoveis.filter((i) => i.anuncianteId === id && i.status === 'ATIVO').length;
    }

    private anunciantes(p: HttpParams): AnuncianteResumo[] {
        const sem = (s: string | null | undefined) => (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const tipo = p.get('tipo');
        const cidade = sem(p.get('cidade'));
        const q = sem(p.get('q'));
        return this.db.usuarios
            .filter((u) => this.temPerfilPublico(u))
            .filter((u) => !tipo || (u.tipoAnunciante === 'IMOBILIARIA' ? 'IMOBILIARIA' : 'CORRETOR') === tipo)
            .filter((u) => !cidade || sem(u.cidade) === cidade)
            .filter((u) => !q || [u.nome, u.razaoSocial, u.bairro, u.cidade].some((c) => sem(c).includes(q)))
            .map((u) => ({
                id: u.id,
                nome: u.nome,
                tipo: (u.tipoAnunciante === 'IMOBILIARIA' ? 'IMOBILIARIA' : 'CORRETOR') as TipoAnunciante,
                fotoUrl: u.fotoUrl,
                creci: u.creci,
                creciUf: u.creciUf ?? null,
                bairro: u.bairro ?? null,
                cidade: u.cidade ?? null,
                uf: u.uf ?? null,
                latitude: u.latitude ?? null,
                longitude: u.longitude ?? null,
                totalAnuncios: this.totalAtivos(u.id)
            }))
            .sort((a, b) => b.totalAnuncios - a.totalAnuncios || a.nome.localeCompare(b.nome));
    }

    private perfilAnunciante(id: number): AnunciantePerfil {
        const u = this.anunciantePublico(id);
        const modoConfig = this.db.config.telefoneAnunciante ?? 'MOSTRAR';
        const modo = modoConfig === 'MOSTRAR_APENAS_LOGADO' && this.sessao() ? 'MOSTRAR' : modoConfig;
        const tel = u.telefone || u.whatsapp || null;
        return {
            id: u.id,
            nome: u.nome,
            tipo: u.tipoAnunciante === 'IMOBILIARIA' ? 'IMOBILIARIA' : 'CORRETOR',
            razaoSocial: u.razaoSocial ?? null,
            fotoUrl: u.fotoUrl,
            capaUrl: u.capaUrl ?? null,
            creci: u.creci,
            creciUf: u.creciUf ?? null,
            sobre: u.sobre ?? null,
            regioesAtuacao: u.regioesAtuacao ?? null,
            atuandoDesde: u.atuandoDesde ?? null,
            site: u.site ?? null,
            instagram: u.instagram ?? null,
            facebook: u.facebook ?? null,
            emailContato: u.emailContato ?? null,
            telefone: !tel || modo === 'OCULTAR' ? null : modo === 'MOSTRAR' ? tel : tel.slice(0, Math.max(0, tel.length - 4)),
            telefoneCompleto: !!tel && modo === 'MOSTRAR',
            whatsapp: modo === 'MOSTRAR' ? (u.whatsapp ?? null) : null,
            cep: u.cep ?? null,
            logradouro: u.logradouro ?? null,
            numero: u.numero ?? null,
            complemento: u.complemento ?? null,
            bairro: u.bairro ?? null,
            cidade: u.cidade ?? null,
            uf: u.uf ?? null,
            latitude: u.latitude ?? null,
            longitude: u.longitude ?? null,
            membroDesde: u.criadoEm,
            totalAnuncios: this.totalAtivos(u.id)
        };
    }

    private usuarioDto(u: DemoUsuario) {
        const { senha, ...resto } = u;
        return { ...resto, perfisPermitidos: permitidos(u.papeis) };
    }

    /** Espelha UsuarioService.aplicarDocumento: CPF para corretor, CNPJ para imobiliária; só valida o que mudou. */
    private documentoAnunciante(u: { documento: string | null; tipoAnunciante: string | null }, tipo: TipoAnunciante | null | undefined, documento: string | null | undefined, vazioMantem: boolean) {
        const novoTipo: TipoAnunciante = tipo ?? (u.tipoAnunciante === 'IMOBILIARIA' ? 'IMOBILIARIA' : 'CORRETOR');
        let doc: string | null = String(documento ?? '').replace(/\D/g, '') || null;
        if (!doc && vazioMantem) doc = u.documento;
        const mudou = doc !== u.documento || novoTipo !== u.tipoAnunciante;
        const imobiliaria = novoTipo === 'IMOBILIARIA';
        if (mudou && doc && !documentoValido(doc, imobiliaria)) throw new DemoError(400, imobiliaria ? 'CNPJ inválido. Confira os números.' : 'CPF inválido. Confira os números.');
        return { tipoAnunciante: novoTipo, documento: doc, ...(imobiliaria ? {} : { razaoSocial: null }) };
    }

    private conta(url: string, m: string, b: any): unknown {
        const { u } = this.exigir();
        let r: RegExpMatchArray | null;
        if (url === '/app/conta/perfil') {
            if (m === 'PUT') {
                const anunciante = u.papeis.includes('CORRETOR');
                const { tipoAnunciante, documento, ...resto } = b;
                const novo = { ...u, ...resto, perfilPublico: anunciante && !!b.perfilPublico };
                // documento em branco mantém o atual: o anunciante corrige, mas não apaga o CPF/CNPJ
                if (anunciante) Object.assign(novo, this.documentoAnunciante(u, tipoAnunciante, documento, true));
                if (novo.perfilPublico) {
                    const faltando = pendenciasPerfilPublico({ ...novo, imobiliaria: novo.tipoAnunciante === 'IMOBILIARIA', nome: novo.nome ?? '', razaoSocial: novo.razaoSocial ?? '', creci: novo.creci ?? '', sobre: novo.sobre ?? '', cep: novo.cep ?? '', logradouro: novo.logradouro ?? '', numero: novo.numero ?? '', bairro: novo.bairro ?? '', cidade: novo.cidade ?? '', creciUf: novo.creciUf ?? null, uf: novo.uf ?? null, latitude: novo.latitude ?? null, longitude: novo.longitude ?? null, whatsapp: novo.whatsapp ?? null });
                    if (faltando.length) throw new DemoError(422, 'Para deixar o perfil público, complete: ' + faltando.join(', ').toLowerCase() + '.');
                }
                Object.assign(u, novo);
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
                const anterior = i.preco;
                Object.assign(i, this.normalizar(b), { atualizadoEm: new Date().toISOString() });
                if (anterior !== i.preco) this.db.precos = [...(this.db.precos ?? []), { imovelId: i.id, anterior, novo: i.preco, em: new Date().toISOString() }];
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
        if (rota === 'anuncios/painel') return this.painel(admin ? null : ctx.u.id, Number(p.get('dias') ?? 30));
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

    /** Gráficos do painel (espelha PainelService do backend). Sem histórico real, simula uma base estável por anúncio. */
    private painel(anuncianteId: number | null, diasPedidos: number): PainelAnuncios {
        const dias = periodoValido(diasPedidos);
        const lista = this.db.imoveis.filter((i) => anuncianteId == null || i.anuncianteId === anuncianteId);
        const ids = new Set(lista.map((i) => i.id));
        const contatos = this.db.contatos.filter((c) => ids.has(c.imovelId));
        const visitasDoDia = (dia: string) => {
            const n = Number(dia.replaceAll('-', '')) % 97;
            return lista.reduce((s, i) => {
                const base = i.status === 'ATIVO' ? Math.round((i.visualizacoes / 90) * (0.5 + ((i.id * 31 + n * 17) % 10) / 10)) : 0;
                return s + base + (this.db.visitasDiarias?.[`${i.id}|${dia}`] ?? 0);
            }, 0);
        };
        const contatosDoDia = (dia: string) => contatos.filter((c) => diaIso(new Date(c.criadoEm)) === dia).length;
        const visitasPorDia = serieDias(dias, visitasDoDia);
        const contatosPorDia = serieDias(dias, contatosDoDia);
        const soma = (s: PontoDia[]) => s.reduce((t, x) => t + x.total, 0);
        const agrupar = (chave: (i: DemoImovel) => string, valor: (i: DemoImovel) => number, limite = 8): FatiaPainel[] => {
            const mapa = new Map<string, number>();
            lista.forEach((i) => mapa.set(chave(i), (mapa.get(chave(i)) ?? 0) + valor(i)));
            return [...mapa].map(([rotulo, total]) => ({ rotulo, total })).sort((a, b) => b.total - a.total).slice(0, limite);
        };
        const finalidade = (i: DemoImovel) => ({ VENDA: 'Venda', ALUGUEL: 'Aluguel', TEMPORADA: 'Temporada' })[i.finalidade] ?? i.finalidade;
        const nome = (id: number) => this.db.usuarios.find((u) => u.id === id)?.nome ?? `Anunciante #${id}`;
        return {
            dias,
            resumo: {
                visitas: soma(visitasPorDia),
                visitasAnterior: soma(serieDias(dias, visitasDoDia, dias)),
                contatos: soma(contatosPorDia),
                contatosAnterior: soma(serieDias(dias, contatosDoDia, dias)),
                favoritos: this.db.favoritos.filter((f) => ids.has(f.imovelId)).length,
                visitasAcumuladas: lista.reduce((s, i) => s + i.visualizacoes, 0),
                anunciosAtivos: lista.filter((i) => i.status === 'ATIVO').length
            },
            visitasPorDia,
            contatosPorDia,
            anunciosNovosPorDia: serieDias(dias, (dia) => lista.filter((i) => diaIso(new Date(i.criadoEm)) === dia).length),
            visitasPorCidade: agrupar((i) => `${i.cidade}/${i.uf}`, (i) => i.visualizacoes),
            visitasPorBairro: agrupar((i) => `${i.bairro} (${i.cidade})`, (i) => i.visualizacoes),
            visitasPorTipo: agrupar((i) => tipoLabel(i.tipo), (i) => i.visualizacoes, 20),
            visitasPorFinalidade: agrupar(finalidade, (i) => i.visualizacoes),
            anunciosPorFinalidade: agrupar(finalidade, () => 1),
            visitasPorAnunciante: anuncianteId == null ? agrupar((i) => nome(i.anuncianteId), (i) => i.visualizacoes) : [],
            maisVistos: [...lista]
                .sort((a, b) => b.visualizacoes - a.visualizacoes)
                .slice(0, 8)
                .map((i) => ({
                    id: i.id,
                    codigo: `IM-${String(i.id).padStart(6, '0')}`,
                    titulo: i.titulo,
                    bairro: i.bairro,
                    cidade: i.cidade,
                    status: i.status,
                    visualizacoes: i.visualizacoes,
                    contatos: contatos.filter((c) => c.imovelId === i.id).length,
                    favoritos: this.db.favoritos.filter((f) => f.imovelId === i.id).length
                }))
        };
    }

    // ------------------------------------------------------------ documentos

    private docs() {
        return new DocumentosDemo(
            this.db,
            () => this.salvarDb(),
            (status, mensagem) => {
                throw new DemoError(status, mensagem);
            },
            () => this.nextId()
        );
    }

    // ------------------------------------------------------------ financeiras

    private financeirasDb(): Financeira[] {
        return (this.db.financeiras ??= financeirasDemo());
    }

    /** Espelha FinanceiraService.doAnuncio: só venda com financiamento, financeiras ativas (todas ou as escolhidas). */
    private financeirasDoAnuncio(i: DemoImovel): Financeira[] {
        if (!i.aceitaFinanciamento || i.finalidade !== 'VENDA' || this.db.config.simulacaoFinanciamento === false) return [];
        const todas = i.financeirasTodas ?? true;
        return this.financeirasDb()
            .filter((f) => f.ativo && (todas || (i.financeirasIds ?? []).includes(f.id)))
            .sort((a, b) => a.nome.localeCompare(b.nome));
    }

    private financeirasAdmin(url: string, m: string, b: any): unknown {
        const lista = this.financeirasDb();
        const r = url.match(/\/(\d+)$/);
        if (m === 'GET') return [...lista].sort((a, c) => a.nome.localeCompare(c.nome));
        if (m === 'POST' || m === 'PUT') {
            if (!b.nome || b.taxaJurosAnual == null || !b.prazoMaximoMeses) throw new DemoError(400, 'Informe nome, juros e prazo');
            if (b.valorMinimoImovel != null && b.valorMaximoImovel != null && b.valorMinimoImovel > b.valorMaximoImovel) throw new DemoError(400, 'O valor mínimo do imóvel não pode ser maior que o máximo');
            if (m === 'POST') {
                const f: Financeira = { ...b, id: this.nextId(), nome: String(b.nome).trim() };
                lista.push(f);
                this.salvarDb();
                return f;
            }
            const f = lista.find((x) => x.id === +(r?.[1] ?? 0));
            if (!f) throw new DemoError(404, 'Financeira não encontrada');
            Object.assign(f, b, { id: f.id, nome: String(b.nome).trim() });
            this.salvarDb();
            return f;
        }
        if (m === 'DELETE' && r) {
            this.db.financeiras = lista.filter((x) => x.id !== +r[1]);
            this.db.imoveis.forEach((i) => (i.financeirasIds = (i.financeirasIds ?? []).filter((id) => id !== +r[1])));
            this.salvarDb();
            return null;
        }
        throw new DemoError(404, 'Recurso não encontrado');
    }

    // ------------------------------------------------------------ painel do cliente

    private quedas(usuarioId: number): QuedaPreco[] {
        if (this.db.config.alertaQuedaPreco === false) return [];
        return this.db.favoritos
            .filter((f) => f.usuarioId === usuarioId)
            .flatMap((f) => {
                const i = this.db.imoveis.find((x) => x.id === f.imovelId);
                const hist = (this.db.precos ?? []).filter((p) => p.imovelId === f.imovelId && p.em >= f.criadoEm);
                if (!i || !hist.length) return [];
                const anterior = Math.max(...hist.map((h) => h.anterior));
                if (anterior <= i.preco) return [];
                const alteradoEm = hist.map((h) => h.em).sort().at(-1)!;
                return [{ imovelId: i.id, titulo: i.titulo, precoAnterior: anterior, precoAtual: i.preco, percentual: Math.round(((anterior - i.preco) / anterior) * 1000) / 10, alteradoEm }];
            })
            .sort((a, b) => b.alteradoEm.localeCompare(a.alteradoEm));
    }

    /** Espelha ContaPainelService.painel (recomendações por cidade/bairro/tipo/preço dos favoritos e vistos). */
    private painelCliente(usuarioId: number): ClientePainel {
        const ativos = this.db.imoveis.filter((i) => i.status === 'ATIVO');
        const favs = this.db.favoritos.filter((f) => f.usuarioId === usuarioId);
        const favIds = new Set(favs.map((f) => f.imovelId));
        const enviados = this.db.contatos.filter((c) => c.usuarioId === usuarioId);
        const porId = (id: number) => this.db.imoveis.find((i) => i.id === id);
        const vistos = (this.db.vistos ?? []).filter((v) => v.usuarioId === usuarioId).sort((a, b) => b.em.localeCompare(a.em));
        const pref = [...favs.map((f) => porId(f.imovelId)), ...vistos.map((v) => porId(v.imovelId))].filter((i): i is DemoImovel => !!i);

        const hoje = new Date();
        const atividade = Array.from({ length: 12 }, (_, k) => {
            const d = new Date(hoje.getFullYear(), hoje.getMonth() - 11 + k, 1);
            const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const doMes = (iso: string) => diaIso(new Date(iso)).startsWith(mes);
            return { mes, favoritos: favs.filter((f) => doMes(f.criadoEm)).length, contatos: enviados.filter((c) => doMes(c.criadoEm)).length };
        });

        const precos = pref.map((i) => i.preco);
        const [pmin, pmax] = precos.length ? [Math.min(...precos) * 0.7, Math.max(...precos) * 1.3] : [0, 0];
        const nota = (c: DemoImovel) => pref.filter((p) => p.bairro === c.bairro && p.cidade === c.cidade).length * 3 + pref.filter((p) => p.tipo === c.tipo).length + (c.preco >= pmin && c.preco <= pmax ? 2 : 0);
        const recomendados = ativos
            .filter((c) => !favIds.has(c.id) && pref.some((p) => p.finalidade === c.finalidade && p.cidade === c.cidade))
            .sort((a, b) => nota(b) - nota(a) || Number(b.destaque) - Number(a.destaque) || b.criadoEm.localeCompare(a.criadoEm))
            .slice(0, 6);

        const contagem = new Map<string, number>();
        favs.forEach((f) => {
            const i = porId(f.imovelId);
            if (i) contagem.set(`${i.bairro}|${i.cidade}`, (contagem.get(`${i.bairro}|${i.cidade}`) ?? 0) + 1);
        });
        const bairros = [...contagem].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k.split('|'));
        const semana = new Date(Date.now() - 7 * 86400000).toISOString();
        const novidades = ativos.filter((i) => !favIds.has(i.id) && i.criadoEm >= semana && bairros.some(([b, c]) => i.bairro === b && i.cidade === c)).slice(0, 6);

        return {
            contatosEnviados: enviados.length,
            contatosVistos: enviados.filter((c) => c.lido).length,
            atividade,
            contatosRecentes: [...enviados]
                .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
                .slice(0, 5)
                .flatMap((c) => {
                    const i = porId(c.imovelId);
                    return i ? [{ id: c.id, imovelId: i.id, imovelCodigo: 'IM-' + String(i.id).padStart(6, '0'), imovelTitulo: i.titulo, bairro: i.bairro, cidade: i.cidade, imovelStatus: i.status, mensagem: c.mensagem, visto: c.lido, criadoEm: c.criadoEm, fotoCapa: i.fotos[0]?.url ?? null }] : [];
                }),
            vistosRecentes: vistos.map((v) => porId(v.imovelId)).filter((i): i is DemoImovel => !!i && i.status === 'ATIVO').slice(0, 8).map((i) => this.resumo(i)),
            recomendados: recomendados.map((i) => this.resumo(i)),
            novidades: { bairros: bairros.map(([b, c]) => `${b} (${c})`), imoveis: novidades.map((i) => this.resumo(i)) },
            quedasPreco: this.quedas(usuarioId),
            financiamentos: favs
                .map((f) => porId(f.imovelId))
                .filter((i): i is DemoImovel => !!i && i.status === 'ATIVO')
                .map((i) => ({ imovel: this.resumo(i), financeiras: this.financeirasDoAnuncio(i) }))
                .filter((f) => f.financeiras.length > 0)
                .slice(0, 6)
        };
    }

    private condicoesDaFinalidade(b: any) {
        const venda = b.finalidade === 'VENDA';
        const aluguel = b.finalidade === 'ALUGUEL';
        const temporada = b.finalidade === 'TEMPORADA';
        const permitidas = new Set((CONDICOES[b.finalidade as Finalidade] ?? []).flatMap((g) => g.itens.map((i) => i.codigo)));
        const financia = venda && !!b.aceitaFinanciamento;
        return {
            aceitaFinanciamento: financia,
            aceitaFgts: venda && !!b.aceitaFgts,
            aceitaPermuta: venda && !!b.aceitaPermuta,
            escrituraRegistrada: venda && !!b.escrituraRegistrada,
            quitado: venda && !!b.quitado,
            condicoes: ((b.condicoes ?? []) as CondicaoAnuncio[]).filter((c) => permitidas.has(c)),
            contratoMinimoMeses: aluguel ? (b.contratoMinimoMeses ?? null) : null,
            noitesMinimas: temporada ? (b.noitesMinimas ?? null) : null,
            hospedesMaximo: temporada ? (b.hospedesMaximo ?? null) : null,
            taxaLimpeza: temporada ? (b.taxaLimpeza ?? null) : null,
            horarioCheckin: temporada ? b.horarioCheckin || null : null,
            horarioCheckout: temporada ? b.horarioCheckout || null : null,
            financeirasTodas: financia && !!b.financeirasTodas,
            financeirasIds: financia && !b.financeirasTodas ? ((b.financeiras ?? []) as number[]) : []
        };
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
            // como no backend: itens de venda só em venda; condições e campos só da finalidade escolhida
            ...this.condicoesDaFinalidade(b),
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
                anuncios: this.gestao({ u: atual, perfil: 'ADMIN' }, 'anuncios/estatisticas', 'GET', {}, p),
                cadastrosPorDia: serieDias(periodoValido(Number(p.get('dias') ?? 30)), (dia) => us.filter((u) => diaIso(new Date(u.criadoEm)) === dia).length)
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
                ...(b.papeis?.includes('CORRETOR') ? this.documentoAnunciante({ documento: null, tipoAnunciante: null }, b.tipoAnunciante, b.documento, false) : {}),
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
        // exclusão definitiva (LGPD): a conta e tudo o que é dela
        if ((r = url.match(/^\/app\/admin\/usuarios\/(\d+)\/definitivo$/)) && m === 'DELETE') {
            const id = +r[1];
            if (id === atual.id) throw new DemoError(400, 'Você não pode excluir a própria conta');
            if (!this.db.usuarios.some((u) => u.id === id)) throw new DemoError(404, 'Usuário não encontrado');
            const anuncios = new Set(this.db.imoveis.filter((i) => i.anuncianteId === id).map((i) => i.id));
            this.db.imoveis = this.db.imoveis.filter((i) => !anuncios.has(i.id));
            this.db.contatos = this.db.contatos.filter((c) => !anuncios.has(c.imovelId) && c.usuarioId !== id);
            this.db.favoritos = this.db.favoritos.filter((f) => !anuncios.has(f.imovelId) && f.usuarioId !== id);
            this.db.tokens = this.db.tokens.filter((t) => t.usuarioId !== id);
            this.db.vistos = (this.db.vistos ?? []).filter((v) => !anuncios.has(v.imovelId) && v.usuarioId !== id);
            this.db.precos = (this.db.precos ?? []).filter((p) => !anuncios.has(p.imovelId));
            this.db.documentoAceites = (this.db.documentoAceites ?? []).filter((a) => a.usuarioId !== id);
            this.db.usuarios = this.db.usuarios.filter((u) => u.id !== id);
            this.salvarDb();
            return null;
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
                    papeis: Array.from(new Set<Perfil>([...(b.papeis ?? []), 'CLIENTE'])),
                    ...(b.papeis?.includes('CORRETOR') ? this.documentoAnunciante(u, b.tipoAnunciante, b.documento, false) : {})
                });
                if (b.senha) u.senha = b.senha;
            }
            this.salvarDb();
            return m === 'DELETE' ? null : this.usuarioDto(u);
        }
        throw new DemoError(404, 'Recurso não encontrado');
    }
}
