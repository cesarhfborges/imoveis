import { DocumentoAdmin, DocumentoPublico, DocumentoResumo, Perfil, PerfilAceite, VersaoDocumento, VersaoDocumentoDetalhe } from '@/app/core/models/models';

/** Documentos do site no modo demonstração (espelha DocumentoService do backend). */
export interface DemoDocumento extends Omit<DocumentoAdmin, 'aceitesVersaoAtual' | 'aceitesTotal'> {
    versoes: VersaoDocumentoDetalhe[];
}

export interface DemoAceiteDocumento {
    documentoId: number;
    usuarioId: number;
    versao: number;
    em: string;
}

export interface DemoDocumentosDb {
    documentos?: DemoDocumento[];
    documentoAceites?: DemoAceiteDocumento[];
}

/** Erro HTTP do modo demonstração (o DemoBackend converte em resposta). */
export type ErroDemo = (status: number, mensagem: string) => never;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function texto(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html ?? '';
    return (div.textContent ?? '').trim();
}

function modelo(id: number, tipo: DocumentoAdmin['tipo'], titulo: string, slug: string, resumo: string, conteudo: string, ordem: number, aceiteCadastro: boolean, aceitePerfil: PerfilAceite = 'TODOS'): DemoDocumento {
    const agora = new Date().toISOString();
    return {
        id,
        tipo,
        titulo,
        slug,
        resumo,
        conteudo,
        versao: 1,
        versaoEm: agora,
        ativo: false,
        publico: true,
        aceiteCadastro,
        aceiteContas: false,
        aceitePerfil,
        ordem,
        excluidoEm: null,
        atualizadoEm: agora,
        versoes: [{ versao: 1, titulo, conteudo, nota: 'Modelo inicial', publicadoEm: agora }]
    };
}

/** Os mesmos modelos iniciais da migration V32 (desativados). */
export function documentosDemo(): DemoDocumento[] {
    return [
        modelo(9101, 'TERMOS_USO', 'Termos de uso', 'termos-de-uso', 'Regras para usar o portal, criar conta e anunciar imóveis.', '<h1>Termos de uso</h1><p><em>Modelo inicial: revise e complete antes de ativar.</em></p><h2>1. Aceitação</h2><p>Ao criar uma conta ou usar o portal, você concorda com estes termos.</p><h2>2. Cadastro e conta</h2><p>[Regras de cadastro.]</p><h2>3. Anúncios</h2><p>[Regras para anúncios.]</p>', 1, true),
        modelo(9102, 'PRIVACIDADE', 'Política de privacidade (LGPD)', 'politica-de-privacidade', 'Como coletamos, usamos e protegemos os seus dados pessoais, conforme a LGPD.', '<h1>Política de privacidade</h1><p><em>Modelo inicial: revise e complete antes de ativar.</em></p><h2>1. Dados que coletamos</h2><p>[Dados de cadastro e navegação.]</p><h2>2. Seus direitos</h2><p>[Art. 18 da LGPD.]</p>', 2, true),
        modelo(9103, 'CODIGO_CONDUTA', 'Código de conduta', 'codigo-de-conduta', 'O comportamento esperado de anunciantes e usuários no portal.', '<h1>Código de conduta</h1><p><em>Modelo inicial: revise e complete antes de ativar.</em></p><h2>1. Respeito</h2><p>[Comunicação respeitosa.]</p>', 3, false, 'CORRETOR')
    ];
}

function vale(p: PerfilAceite, perfil: Perfil | null): boolean {
    return !!perfil && perfil !== 'ADMIN' && (p === 'TODOS' || p === perfil);
}

export class DocumentosDemo {
    constructor(
        private db: DemoDocumentosDb,
        private salvar: () => void,
        private erro: ErroDemo,
        private nextId: () => number
    ) {
        this.db.documentos ??= documentosDemo();
        this.db.documentoAceites ??= [];
    }

    private get lista() {
        return this.db.documentos!;
    }

    private ativos() {
        return this.lista.filter((d) => d.ativo && !d.excluidoEm).sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo));
    }

    private publico(d: DemoDocumento): DocumentoPublico {
        return { id: d.id, tipo: d.tipo, titulo: d.titulo, slug: d.slug, resumo: d.resumo, conteudo: d.conteudo, versao: d.versao, versaoEm: d.versaoEm };
    }

    private admin(d: DemoDocumento): DocumentoAdmin {
        const { versoes, ...resto } = d;
        const aceites = this.db.documentoAceites!.filter((a) => a.documentoId === d.id);
        return { ...resto, aceitesVersaoAtual: aceites.filter((a) => a.versao === d.versao).length, aceitesTotal: aceites.length };
    }

    private carregar(id: number) {
        return this.lista.find((d) => d.id === id) ?? this.erro(404, 'Documento não encontrado');
    }

    // ---- site e conta
    publicos(): DocumentoResumo[] {
        return this.ativos()
            .filter((d) => d.publico)
            .map((d) => {
                const { conteudo, ...resumo } = this.publico(d);
                return resumo;
            });
    }

    porSlug(slug: string): DocumentoPublico {
        const d = this.ativos().find((x) => x.slug === slug);
        return d ? this.publico(d) : this.erro(404, 'Documento não encontrado');
    }

    exigidosNoCadastro(perfil: Perfil): DocumentoPublico[] {
        return this.ativos()
            .filter((d) => d.aceiteCadastro && vale(d.aceitePerfil, perfil))
            .map((d) => this.publico(d));
    }

    pendentes(usuarioId: number, perfil: Perfil): DocumentoPublico[] {
        return this.ativos()
            .filter((d) => d.aceiteContas && vale(d.aceitePerfil, perfil))
            .filter((d) => !this.db.documentoAceites!.some((a) => a.documentoId === d.id && a.usuarioId === usuarioId && a.versao === d.versao))
            .map((d) => this.publico(d));
    }

    aceitar(usuarioId: number, itens: { documentoId: number; versao: number }[]) {
        for (const i of itens ?? []) {
            const d = this.carregar(i.documentoId);
            if (!d.ativo || d.excluidoEm) this.erro(404, 'Documento não encontrado');
            if (d.versao !== i.versao) this.erro(409, `"${d.titulo}" foi atualizado. Recarregue a página para ler a versão nova.`);
            if (!this.db.documentoAceites!.some((a) => a.documentoId === d.id && a.usuarioId === usuarioId && a.versao === d.versao)) {
                this.db.documentoAceites!.push({ documentoId: d.id, usuarioId, versao: d.versao, em: new Date().toISOString() });
            }
        }
        this.salvar();
    }

    validarCadastro(perfil: Perfil, itens: { documentoId: number; versao: number }[] | undefined) {
        const enviados = new Set((itens ?? []).map((i) => `${i.documentoId}:${i.versao}`));
        const faltando = this.exigidosNoCadastro(perfil).filter((d) => !enviados.has(`${d.id}:${d.versao}`));
        if (faltando.length) this.erro(400, 'Para criar a conta, leia e aceite: ' + faltando.map((d) => d.titulo).join(', ') + '.');
    }

    // ---- administração
    rota(url: string, m: string, b: any, excluidos: boolean): unknown {
        let r: RegExpMatchArray | null;
        if (url === '/app/admin/documentos' && m === 'GET') {
            return this.lista
                .filter((d) => excluidos || !d.excluidoEm)
                .sort((a, c) => Number(!!a.excluidoEm) - Number(!!c.excluidoEm) || a.ordem - c.ordem || a.titulo.localeCompare(c.titulo))
                .map((d) => this.admin(d));
        }
        if (url === '/app/admin/documentos' && m === 'POST') {
            const agora = new Date().toISOString();
            const d: DemoDocumento = { ...this.validar(b, null), id: this.nextId(), versao: 1, versaoEm: agora, excluidoEm: null, atualizadoEm: agora, versoes: [] };
            d.versoes.push({ versao: 1, titulo: d.titulo, conteudo: d.conteudo, nota: b.notaVersao || null, publicadoEm: agora });
            this.lista.push(d);
            this.salvar();
            return this.admin(d);
        }
        if ((r = url.match(/^\/app\/admin\/documentos\/(\d+)\/versoes\/(\d+)$/))) {
            return this.carregar(+r[1]).versoes.find((v) => v.versao === +r![2]) ?? this.erro(404, 'Versão não encontrada');
        }
        if ((r = url.match(/^\/app\/admin\/documentos\/(\d+)\/versoes$/))) {
            const d = this.carregar(+r[1]);
            return [...d.versoes]
                .sort((a, c) => c.versao - a.versao)
                .map<VersaoDocumento>((v) => ({ versao: v.versao, titulo: v.titulo, nota: v.nota, publicadoEm: v.publicadoEm, aceites: this.db.documentoAceites!.filter((a) => a.documentoId === d.id && a.versao === v.versao).length }));
        }
        if ((r = url.match(/^\/app\/admin\/documentos\/(\d+)\/situacao$/))) {
            const d = this.carregar(+r[1]);
            if (d.excluidoEm) this.erro(409, 'Restaure o documento antes de ativar');
            if (b.ativo && !texto(d.conteudo)) this.erro(400, 'Escreva o conteúdo do documento antes de ativar');
            d.ativo = !!b.ativo;
            this.salvar();
            return this.admin(d);
        }
        if ((r = url.match(/^\/app\/admin\/documentos\/(\d+)\/restaurar$/))) {
            const d = this.carregar(+r[1]);
            if (this.lista.some((x) => x.id !== d.id && !x.excluidoEm && x.slug === d.slug)) this.erro(409, `Outro documento já usa o endereço /documentos/${d.slug}.`);
            d.excluidoEm = null;
            d.ativo = false;
            this.salvar();
            return this.admin(d);
        }
        if ((r = url.match(/^\/app\/admin\/documentos\/(\d+)$/))) {
            const d = this.carregar(+r[1]);
            if (m === 'DELETE') {
                d.ativo = false;
                d.excluidoEm = new Date().toISOString();
                this.salvar();
                return null;
            }
            if (m === 'PUT') {
                if (d.excluidoEm) this.erro(409, 'Restaure o documento antes de editar');
                const novo = this.validar(b, d.id);
                const mudou = novo.titulo !== d.titulo || novo.conteudo !== d.conteudo;
                Object.assign(d, novo, { atualizadoEm: new Date().toISOString() });
                if (mudou && b.novaVersao) {
                    d.versao += 1;
                    d.versaoEm = new Date().toISOString();
                    d.versoes.push({ versao: d.versao, titulo: d.titulo, conteudo: d.conteudo, nota: b.notaVersao || null, publicadoEm: d.versaoEm });
                } else if (mudou) {
                    const v = d.versoes.find((x) => x.versao === d.versao);
                    if (v) Object.assign(v, { titulo: d.titulo, conteudo: d.conteudo });
                }
                this.salvar();
            }
            return this.admin(d);
        }
        return this.erro(404, 'Recurso não encontrado');
    }

    private validar(b: any, id: number | null) {
        const slug = String(b.slug ?? '').trim();
        if (!b.titulo || !SLUG.test(slug)) this.erro(400, 'Informe o título e um endereço válido');
        if (this.lista.some((x) => x.id !== id && !x.excluidoEm && x.slug === slug)) this.erro(409, `Já existe um documento com o endereço /documentos/${slug}`);
        if (b.ativo && !texto(b.conteudo)) this.erro(400, 'Escreva o conteúdo do documento antes de ativar');
        return {
            tipo: b.tipo,
            titulo: String(b.titulo).trim(),
            slug,
            resumo: b.resumo || null,
            conteudo: b.conteudo ?? '',
            ativo: !!b.ativo,
            publico: !!b.publico,
            aceiteCadastro: !!b.aceiteCadastro,
            aceiteContas: !!b.aceiteContas,
            aceitePerfil: (b.aceitePerfil ?? 'TODOS') as PerfilAceite,
            ordem: Number(b.ordem ?? 0)
        };
    }
}
