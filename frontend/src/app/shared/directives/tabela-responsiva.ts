import { afterNextRender, DestroyRef, Directive, effect, ElementRef, inject, input } from '@angular/core';

/** Marca o data-label posto por esta diretiva (os escritos no template não são tocados). */
const AUTO = 'data-label-auto';

/**
 * Tabela do PrimeNG que vira uma lista de cards no celular (abaixo de 768px).
 * O PrimeNG 20+ não tem mais o responsiveLayout="stack"; o visual fica em
 * assets/layout/_tabela-responsiva.scss e esta diretiva só marca as células:
 *  - data-label: o texto do <th> da mesma coluna (rótulo mostrado à esquerda do valor);
 *  - data-titulo: a célula da [colunaTitulo], que sobe para o topo do card, sem rótulo;
 *  - data-linha-inteira: células com colspan (ex.: "Nenhum registro encontrado").
 * Um <th> só com texto .sr-only (ex.: "Ações") gera rótulo vazio. Para não ter rótulo
 * numa célula, escreva data-label="" nela no template.
 * As linhas são remarcadas sempre que o PrimeNG redesenha o corpo (paginação, filtro…).
 */
@Directive({
    selector: 'p-table[appTabelaResponsiva]',
    host: { class: 'tabela-responsiva' }
})
export class TabelaResponsiva {
    private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    /** Índice da coluna que vira o título do card; null = nenhuma. */
    colunaTitulo = input<number | null>(0);

    private agendado = false;

    constructor() {
        const destroyRef = inject(DestroyRef);
        afterNextRender(() => {
            const observador = new MutationObserver(() => this.agendar());
            observador.observe(this.el, { childList: true, subtree: true });
            destroyRef.onDestroy(() => observador.disconnect());
            this.marcar();
        });
        effect(() => {
            this.colunaTitulo();
            this.agendar();
        });
    }

    private agendar() {
        if (this.agendado || typeof requestAnimationFrame === 'undefined') return;
        this.agendado = true;
        requestAnimationFrame(() => {
            this.agendado = false;
            this.marcar();
        });
    }

    private marcar() {
        const tabela = this.el.querySelector('table');
        if (!tabela) return;

        const rotulos: string[] = [];
        for (const th of Array.from(tabela.tHead?.rows[0]?.cells ?? [])) {
            const texto = textoVisivel(th);
            for (let i = 0; i < th.colSpan; i++) rotulos.push(texto);
        }

        const titulo = this.colunaTitulo();
        for (const corpo of Array.from(tabela.tBodies)) {
            for (const linha of Array.from(corpo.rows)) {
                let coluna = 0;
                for (const celula of Array.from(linha.cells)) {
                    const inteira = celula.colSpan > 1;
                    const ehTitulo = !inteira && coluna === titulo;
                    celula.toggleAttribute('data-linha-inteira', inteira);
                    celula.toggleAttribute('data-titulo', ehTitulo);
                    if (!celula.hasAttribute('data-label') || celula.hasAttribute(AUTO)) {
                        if (inteira || ehTitulo) {
                            celula.removeAttribute('data-label');
                            celula.removeAttribute(AUTO);
                        } else {
                            celula.setAttribute('data-label', rotulos[coluna] ?? '');
                            celula.setAttribute(AUTO, '');
                        }
                    }
                    coluna += celula.colSpan;
                }
            }
        }
    }
}

/** Texto do cabeçalho sem o que é só para leitor de tela. */
function textoVisivel(th: HTMLElement): string {
    const copia = th.cloneNode(true) as HTMLElement;
    copia.querySelectorAll('.sr-only').forEach((e) => e.remove());
    return (copia.textContent ?? '').replace(/\s+/g, ' ').trim();
}
