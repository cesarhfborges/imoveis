import { Component, computed, input } from '@angular/core';
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

/** Foto do imóvel; sem foto, mostra um fundo em degradê com o ícone do tipo (tons variam por id). */
@Component({
    selector: 'app-imovel-foto',
    template: `
        @if (src()) {
            <img [src]="src()" [alt]="alt()" loading="lazy" class="w-full h-full object-cover block" />
        } @else {
            <div class="w-full h-full flex flex-col items-center justify-center text-white/90 gap-2" [style.background]="fundo()" role="img" [attr.aria-label]="alt() + ' (sem foto)'">
                <i class="pi {{ icone() }} text-4xl!" aria-hidden="true"></i>
                @if (mostrarTexto()) {
                    <span class="text-xs font-semibold uppercase tracking-wider opacity-80">Foto em breve</span>
                }
            </div>
        }
    `,
    host: { class: 'block overflow-hidden' }
})
export class ImovelFoto {
    src = input<string | null>(null);
    alt = input('Imóvel');
    tipo = input<TipoImovel | null>(null);
    semente = input<number>(1);
    mostrarTexto = input(true);

    icone = computed(() => ICONES[this.tipo() ?? 'CASA'] ?? 'pi-home');

    fundo = computed(() => {
        const s = this.semente() || 1;
        const h1 = 208 + ((s * 23) % 22);
        const h2 = 150 + ((s * 37) % 50);
        return `linear-gradient(135deg, hsl(${h1} 48% 26%), hsl(${h2} 35% 42%))`;
    });
}
