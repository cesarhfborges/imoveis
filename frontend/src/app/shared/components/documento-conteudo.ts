import { Component, computed, inject, input, output, effect } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface TituloDocumento {
    id: string;
    texto: string;
    nivel: number;
}

function slugTitulo(texto: string): string {
    return (
        texto
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 60) || 'secao'
    );
}

/** Dá id aos títulos (h1–h3) do HTML e devolve o HTML ajustado e a lista para o índice. */
export function prepararDocumento(html: string): { html: string; titulos: TituloDocumento[] } {
    if (typeof document === 'undefined' || !html) return { html: html ?? '', titulos: [] };
    const div = document.createElement('div');
    div.innerHTML = html;
    const usados = new Map<string, number>();
    const titulos: TituloDocumento[] = [];
    div.querySelectorAll('h1, h2, h3').forEach((h) => {
        const texto = (h.textContent ?? '').trim();
        if (!texto) return;
        const base = slugTitulo(texto);
        const n = usados.get(base) ?? 0;
        usados.set(base, n + 1);
        const id = n ? `${base}-${n + 1}` : base;
        h.id = id;
        titulos.push({ id, texto, nivel: Number(h.tagName[1]) });
    });
    // marcadores de lista do editor (spans de UI do Quill) não fazem sentido na leitura
    div.querySelectorAll('.ql-ui').forEach((e) => e.remove());
    // texto colado do Word/Docs/chat vem com todo espaço como &nbsp;: sem isso o parágrafo não quebra linha
    const textos = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
    for (let n = textos.nextNode(); n; n = textos.nextNode()) {
        if (n.nodeValue?.includes('\u00A0')) n.nodeValue = n.nodeValue.replace(/\u00A0/g, ' ');
    }
    return { html: div.innerHTML, titulos };
}

/**
 * Conteúdo de um documento (termos, privacidade…) para leitura. O HTML já vem limpo pelo backend
 * (TextoDocumento: lista de tags/atributos permitidos), por isso é confiado aqui para manter cores e alinhamento,
 * que a sanitização padrão do Angular removeria.
 */
@Component({
    selector: 'app-documento-conteudo',
    template: `<div class="documento-conteudo" [innerHTML]="seguro()"></div>`
})
export class DocumentoConteudo {
    private sanitizer = inject(DomSanitizer);

    html = input<string>('');
    /** Títulos encontrados (para montar o índice). */
    titulos = output<TituloDocumento[]>();

    private preparado = computed(() => prepararDocumento(this.html()));
    seguro = computed<SafeHtml>(() => this.sanitizer.bypassSecurityTrustHtml(this.preparado().html));

    constructor() {
        effect(() => this.titulos.emit(this.preparado().titulos));
    }
}
