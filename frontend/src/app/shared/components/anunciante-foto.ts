import { Component, computed, effect, input, signal } from '@angular/core';
import { iniciaisDe } from './avatar';

/**
 * Foto (ou logo) do anunciante, corretor ou imobiliária, na caixa retangular dos cards e do anúncio.
 * Sem foto, ou se ela não carregar, mostra as iniciais. É decorativa: o nome deve estar escrito ao lado
 * (ou no `title`).
 */
@Component({
    selector: 'app-anunciante-foto',
    template: `
        @if (foto() && !falhou()) {
            <img [src]="foto()" alt="" loading="lazy" (error)="falhou.set(true)" />
        } @else {
            {{ iniciais() }}
        }
    `,
    host: {
        class: 'imovel-card__anunciante',
        '[class.imovel-card__anunciante--foto]': '!!foto() && !falhou()',
        '[class.imovel-card__anunciante--grande]': 'grande()',
        '[attr.title]': 'nome() || null',
        'aria-hidden': 'true'
    }
})
export class AnuncianteFoto {
    nome = input<string | null>(null);
    foto = input<string | null>(null);
    /** Versão maior, para a caixa de contato do anúncio. */
    grande = input(false);

    falhou = signal(false);
    iniciais = computed(() => iniciaisDe(this.nome()));

    constructor() {
        // trocou a foto (ex.: o card foi reaproveitado para outro anúncio): tenta carregar de novo
        effect(() => {
            this.foto();
            this.falhou.set(false);
        });
    }
}
