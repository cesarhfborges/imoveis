import { Component, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TipoImovel } from '@/app/core/models/models';

const ICONES: Partial<Record<TipoImovel, string>> = {
    APARTAMENTO: 'pi-building',
    COBERTURA: 'pi-building',
    KITNET: 'pi-building',
    FLAT: 'pi-building',
    PREDIO: 'pi-building-columns',
    SALA: 'pi-briefcase',
    LOJA: 'pi-shop',
    GALPAO: 'pi-warehouse',
    LOTE: 'pi-map',
    CHACARA: 'pi-sun'
};

/**
 * Foto do imóvel; sem foto, mostra um fundo em degradê com o ícone do tipo (tons variam por id).
 *  - ajuste "cover": preenche o espaço (cartões);
 *  - ajuste "contain": mostra a foto inteira sobre um fundo desfocado dela mesma (galeria);
 *  - clicavel: vira um botão que emite (abrir) — usado para abrir a foto em tela cheia.
 */
@Component({
    selector: 'app-imovel-foto',
    template: `
        @if (src()) {
            @if (clicavel()) {
                <button type="button" class="foto-botao" (click)="abrir.emit()" [attr.aria-label]="'Ampliar ' + alt()">
                    <ng-container [ngTemplateOutlet]="imagem" />
                    <span class="foto-botao__lupa" aria-hidden="true"><i class="pi pi-search-plus"></i></span>
                </button>
            } @else {
                <ng-container [ngTemplateOutlet]="imagem" />
            }
        } @else {
            <div class="w-full h-full flex flex-col items-center justify-center text-white/90 gap-2" [style.background]="fundo()" role="img" [attr.aria-label]="alt() + ' (sem foto)'">
                <i class="pi {{ icone() }} text-4xl!" aria-hidden="true"></i>
                @if (mostrarTexto()) {
                    <span class="text-xs font-semibold uppercase tracking-wider opacity-80">Foto em breve</span>
                }
            </div>
        }

        <ng-template #imagem>
            @if (ajuste() === 'contain') {
                <span class="foto-fundo" [style.background-image]="'url(' + src() + ')'" aria-hidden="true"></span>
                <img [src]="src()" [alt]="alt()" loading="lazy" class="relative w-full h-full object-contain block" />
            } @else {
                <img [src]="src()" [alt]="alt()" loading="lazy" class="w-full h-full object-cover block" />
            }
        </ng-template>
    `,
    imports: [NgTemplateOutlet],
    host: { class: 'block overflow-hidden relative' }
})
export class ImovelFoto {
    src = input<string | null>(null);
    alt = input('Imóvel');
    tipo = input<TipoImovel | null>(null);
    semente = input<number>(1);
    mostrarTexto = input(true);
    ajuste = input<'cover' | 'contain'>('cover');
    clicavel = input(false);
    abrir = output<void>();

    icone = computed(() => ICONES[this.tipo() ?? 'CASA'] ?? 'pi-home');

    fundo = computed(() => {
        const s = this.semente() || 1;
        const h1 = 208 + ((s * 23) % 22);
        const h2 = 150 + ((s * 37) % 50);
        return `linear-gradient(135deg, hsl(${h1} 48% 26%), hsl(${h2} 35% 42%))`;
    });
}
