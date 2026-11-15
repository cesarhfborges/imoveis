import { DestroyRef, Directive, ElementRef, inject, input, output } from '@angular/core';

/** Distância mínima (px) para valer como deslize, ou um deslize curto e rápido (px/ms). */
const DISTANCIA_MIN = 50;
const VELOCIDADE_MIN = 0.4;
/** Até aqui (px) ainda não se sabe se o dedo vai na horizontal ou na vertical. */
const FOLGA = 10;
/** Deslize para baixo que fecha (px). */
const DISTANCIA_FECHAR = 100;

/**
 * Gesto de deslizar o dedo (toque ou caneta; o mouse continua usando as setas).
 *  - horizontal: emite (deslizar) com +1 (próximo, dedo para a esquerda) ou -1 (anterior);
 *  - vertical para baixo, se [deslizarVertical]: emite (deslizarBaixo) — usado para fechar a tela cheia.
 * Enquanto o dedo arrasta, o host recebe a classe "deslizando" e as variáveis CSS
 * --deslize-x / --deslize-y (em px), para o conteúdo acompanhar o dedo.
 * Um arrasto não dispara o clique de quem está dentro (ex.: abrir a foto em tela cheia).
 */
@Directive({
    selector: '[appDeslizar]',
    host: {
        '[style.touch-action]': 'deslizarVertical() ? "none" : "pan-y pinch-zoom"',
        '(pointerdown)': 'inicio($event)',
        '(pointermove)': 'arrasto($event)',
        '(pointerup)': 'fim($event)',
        '(pointercancel)': 'limpar()'
    }
})
export class Deslizar {
    private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    /** false: o conteúdo só "resiste" ao arrasto e nada é emitido (ex.: uma foto só). */
    deslizarAtivo = input(true);
    /** Há item antes/depois? Sem ele, o arrasto naquela direção só "resiste" (efeito elástico de fim de lista). */
    temAnterior = input(true);
    temProximo = input(true);
    deslizarVertical = input(false);
    deslizar = output<1 | -1>();
    deslizarBaixo = output<void>();

    private id: number | null = null;
    private x0 = 0;
    private y0 = 0;
    private t0 = 0;
    private eixo: 'x' | 'y' | null = null;
    private engolirClique = false;

    constructor() {
        // na fase de captura, para barrar o clique antes de chegar ao botão da foto
        const clique = (e: Event) => {
            if (this.engolirClique) {
                e.stopPropagation();
                e.preventDefault();
                this.engolirClique = false;
            }
        };
        this.el.addEventListener('click', clique, true);
        inject(DestroyRef).onDestroy(() => this.el.removeEventListener('click', clique, true));
    }

    inicio(e: PointerEvent) {
        if (e.pointerType === 'mouse' || !e.isPrimary) return;
        this.id = e.pointerId;
        this.x0 = e.clientX;
        this.y0 = e.clientY;
        this.t0 = e.timeStamp;
        this.eixo = null;
        this.engolirClique = false;
    }

    arrasto(e: PointerEvent) {
        if (e.pointerId !== this.id) return;
        const dx = e.clientX - this.x0;
        const dy = e.clientY - this.y0;
        if (!this.eixo) {
            if (Math.abs(dx) < FOLGA && Math.abs(dy) < FOLGA) return;
            this.eixo = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
            if (this.eixo === 'y' && !this.deslizarVertical()) {
                // rolagem da página: deixa com o navegador
                this.limpar();
                return;
            }
            this.el.classList.add('deslizando');
        }
        if (this.eixo === 'x') {
            this.el.style.setProperty('--deslize-x', `${this.pode(dx) ? dx : dx * 0.25}px`);
        } else {
            this.el.style.setProperty('--deslize-y', `${Math.max(0, dy)}px`);
        }
    }

    fim(e: PointerEvent) {
        if (e.pointerId !== this.id) return;
        const dx = e.clientX - this.x0;
        const dy = e.clientY - this.y0;
        const ms = Math.max(1, e.timeStamp - this.t0);
        if (this.eixo === 'x') {
            this.engolirClique = true;
            const rapido = Math.abs(dx) / ms > VELOCIDADE_MIN && Math.abs(dx) > FOLGA * 2;
            if (this.pode(dx) && (Math.abs(dx) > DISTANCIA_MIN || rapido)) {
                this.deslizar.emit(dx < 0 ? 1 : -1);
            }
        } else if (this.eixo === 'y') {
            this.engolirClique = true;
            if (dy > DISTANCIA_FECHAR) this.deslizarBaixo.emit();
        }
        this.limpar();
    }

    /** dx > 0: dedo para a direita (volta ao anterior); dx < 0: avança. */
    private pode(dx: number) {
        return this.deslizarAtivo() && (dx > 0 ? this.temAnterior() : this.temProximo());
    }

    limpar() {
        this.id = null;
        this.eixo = null;
        this.el.classList.remove('deslizando');
        this.el.style.removeProperty('--deslize-x');
        this.el.style.removeProperty('--deslize-y');
    }
}
