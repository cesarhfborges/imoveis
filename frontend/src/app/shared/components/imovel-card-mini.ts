import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImovelResumo } from '@/app/core/models/models';
import { PrecoPipe, slug } from '@/app/core/pipes/formatos';
import { ImovelFoto } from './imovel-foto';
import { ConfigService } from '@/app/core/services/config.service';

/** Cartão compacto (vitrine de destaques e "imóveis similares"). */
@Component({
    selector: 'app-imovel-card-mini',
    imports: [RouterLink, ImovelFoto, PrecoPipe],
    template: `
        <a [routerLink]="link()" [attr.target]="alvo()" [attr.rel]="alvo() ? 'noopener' : null" class="card-mini">
            <div class="relative aspect-[4/3]">
                <app-imovel-foto class="w-full h-full" [src]="imovel().fotoCapa" [tipo]="imovel().tipo" [semente]="imovel().id" [alt]="imovel().titulo" [mostrarTexto]="false" />
                <span class="card-mini__preco">{{ imovel().preco | preco: imovel().finalidade }}</span>
                @if (imovel().aceitaFinanciamento) {
                    <span class="imovel-card__financia"><i class="pi pi-wallet" aria-hidden="true"></i> Financia</span>
                }
                @if (imovel().lancamento) {
                    <span class="imovel-card__selo imovel-card__selo--topo">Imóvel novo</span>
                }
            </div>
            <div class="p-3">
                <div class="font-bold text-primary text-sm uppercase truncate">{{ imovel().endereco || imovel().titulo }}</div>
                <div class="text-xs font-semibold text-muted-color uppercase truncate">{{ imovel().bairro }}, {{ imovel().cidade }}</div>
                <div class="text-xs text-muted-color mt-2 flex gap-3">
                    @if (imovel().areaUtil) {
                        <span><i class="pi pi-arrows-alt text-[0.7rem]"></i> {{ imovel().areaUtil }} m²</span>
                    }
                    @if (imovel().quartos) {
                        <span><i class="pi pi-moon text-[0.7rem]"></i> {{ imovel().quartos }} qto</span>
                    }
                    @if (imovel().vagas) {
                        <span><i class="pi pi-car text-[0.7rem]"></i> {{ imovel().vagas }}</span>
                    }
                </div>
            </div>
            @if (alvo()) {
                <span class="sr-only">(abre em nova janela)</span>
            }
        </a>
    `
})
export class ImovelCardMini {
    imovel = input.required<ImovelResumo>();
    alvo = inject(ConfigService).alvoAnuncio;
    link = computed(() => ['/imovel', this.imovel().id, slug(this.imovel().titulo)]);
}
