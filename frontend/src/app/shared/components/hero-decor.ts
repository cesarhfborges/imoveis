import { Component } from '@angular/core';

/**
 * Fundo decorativo das faixas de destaque (home e "Anunciar"): brilhos difusos,
 * malha de planta baixa e silhueta translúcida de prédios. Puramente visual.
 * Use dentro de um elemento com a classe "hero" (que define posição e isolamento).
 */
@Component({
    selector: 'app-hero-decor',
    host: { class: 'hero__decor', 'aria-hidden': 'true' },
    template: `
        <span class="hero__brilho hero__brilho--a"></span>
        <span class="hero__brilho hero__brilho--b"></span>
        <svg class="hero__skyline" viewBox="0 0 1440 120" preserveAspectRatio="xMidYMax slice" focusable="false">
            <path
                d="M0 120 V78 H44 V90 H72 V65 H100 V100 H160 V100 H212 V10 H240 V24 H276 V40 H304 V106 H332 V106 H376 V65 H436 V106 H508 V90 H552 V106 H580 V24 H632 V52 H676 V65 H728 V24 H764 V40 H792 V65 H844 V40 H888 V40 H916 V78 H960 V90 H1012 V10 H1040 V65 H1084 V52 H1144 V90 H1196 V52 H1240 V90 H1268 V24 H1312 V10 H1384 V52 H1456 V120 Z"
            />
        </svg>
    `
})
export class HeroDecor {}
