import { Component, computed, input, signal } from '@angular/core';

/** Iniciais do nome: primeira letra do primeiro e do último nome ("Maria da Silva" -> "MS"). */
export function iniciaisDe(nome: string | null | undefined): string {
    const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean);
    const ini = (partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '');
    return ini.toUpperCase() || '?';
}

/**
 * Avatar redondo: a foto de perfil da conta ou, sem foto (ou se ela não carregar), as iniciais do nome.
 * Com `icone`, mostra o ícone no lugar das iniciais (ex.: a moderação, para quem não deve ver quem é o admin).
 * É decorativo: o nome deve estar escrito ao lado.
 */
@Component({
    selector: 'app-avatar',
    template: `
        @if (foto() && !falhou()) {
            <img [src]="foto()" alt="" class="w-full h-full object-cover" (error)="falhou.set(true)" />
        } @else if (icone()) {
            <i class="pi {{ icone() }}" aria-hidden="true"></i>
        } @else {
            <span aria-hidden="true">{{ iniciais() }}</span>
        }
    `,
    host: {
        class: 'inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden font-bold select-none',
        '[class]': "'avatar avatar--' + tom()",
        '[style.width]': 'tamanho()',
        '[style.height]': 'tamanho()',
        '[style.fontSize]': 'fonte()',
        'aria-hidden': 'true'
    },
    styles: `
        :host(.avatar--primario) {
            color: var(--p-primary-contrast-color);
            background: var(--p-primary-color);
        }
        :host(.avatar--neutro) {
            color: var(--p-text-color);
            background: var(--p-surface-200);
        }
        :host-context(.app-dark):host(.avatar--neutro) {
            background: var(--p-surface-700);
        }
        :host(.avatar--moderacao) {
            color: #fff;
            background: var(--p-surface-700);
        }
    `
})
export class Avatar {
    nome = input<string | null>(null);
    foto = input<string | null>(null);
    icone = input<string | null>(null);
    /** Cor do fundo quando não há foto. */
    tom = input<'primario' | 'neutro' | 'moderacao'>('primario');
    tamanho = input('2.25rem');

    falhou = signal(false);
    iniciais = computed(() => iniciaisDe(this.nome()));
    /** Fonte proporcional ao tamanho. */
    fonte = computed(() => `calc(${this.tamanho()} * 0.38)`);
}
