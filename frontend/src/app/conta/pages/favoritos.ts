import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ImovelResumo, QuedaPreco } from '@/app/core/models/models';
import { ContaService } from '@/app/core/services/conta.service';
import { ConfigService } from '@/app/core/services/config.service';
import { PageHeader } from '@/app/shared/components/page-header';
import { ImovelCard } from '@/app/shared/components/imovel-card';
import { EmptyState } from '@/app/shared/components/empty-state';
import { ContatoForm } from '@/app/shared/components/contato-form';

@Component({
    selector: 'app-favoritos-page',
    imports: [RouterLink, CurrencyPipe, DecimalPipe, DialogModule, TagModule, PageHeader, ImovelCard, EmptyState, ContatoForm],
    template: `
        <app-page-header titulo="Favoritos" subtitulo="Imóveis que você salvou para ver depois.">
            @if (lista().length >= 2) {
                <a routerLink="/conta/comparar" [queryParams]="{ ids: idsComparacao() }" class="p-button p-button-outlined"><i class="pi pi-clone" aria-hidden="true"></i> Comparar favoritos</a>
            }
        </app-page-header>
        @if (lista().length === 0 && !carregando()) {
            <div class="card">
                <app-empty-state titulo="Nenhum favorito ainda" texto="Toque no coração de um anúncio para salvá-lo aqui." icone="pi-heart">
                    <a routerLink="/venda" class="p-button">Buscar imóveis</a>
                </app-empty-state>
            </div>
        } @else {
            <div class="flex flex-col gap-3">
                @for (i of lista(); track i.id) {
                    @if (quedas().get(i.id); as q) {
                        <div class="flex flex-wrap items-center gap-2 -mb-1 text-sm" role="note">
                            <p-tag severity="success" [value]="'↓ ' + (q.percentual | number: '1.0-1') + '%'" [attr.aria-label]="'Preço caiu ' + (q.percentual | number: '1.0-1') + ' por cento'" />
                            <span class="text-muted-color">
                                Baixou de <s>{{ q.precoAnterior | currency: 'BRL' : 'symbol' : '1.0-0' }}</s> para
                                <strong class="text-color">{{ q.precoAtual | currency: 'BRL' : 'symbol' : '1.0-0' }}</strong> desde que você salvou
                            </span>
                        </div>
                    }
                    <app-imovel-card [imovel]="i" [favorito]="conta.favoritos().has(i.id)" (favoritar)="remover($event)" (contatar)="contatando.set($event)" />
                }
            </div>
        }
        <p-dialog [blockScroll]="true" [visible]="!!contatando()" (visibleChange)="!$event && contatando.set(null)" [modal]="true" header="Contatar anunciante" [style]="{ width: '30rem' }" [breakpoints]="{ '575px': '95vw' }">
            @if (contatando(); as c) {
                <app-contato-form [imovelId]="c.id" />
            }
        </p-dialog>
    `
})
export class FavoritosPage {
    conta = inject(ContaService);
    lista = signal<ImovelResumo[]>([]);
    carregando = signal(true);
    contatando = signal<ImovelResumo | null>(null);
    /** Já abre a comparação com os 2 favoritos mais recentes. */
    idsComparacao = computed(() =>
        this.lista()
            .slice(0, 2)
            .map((i) => i.id)
            .join(',')
    );
    /** Favoritos que baixaram de preço desde que foram salvos, por id do imóvel. */
    quedas = signal(new Map<number, QuedaPreco>());

    constructor() {
        inject(ConfigService).definirTitulo('Favoritos');
        this.conta.listarFavoritos().subscribe({
            next: (l) => {
                this.lista.set(l);
                this.carregando.set(false);
            },
            error: () => this.carregando.set(false)
        });
        this.conta.quedasPreco().subscribe({ next: (l) => this.quedas.set(new Map(l.map((q) => [q.imovelId, q]))), error: () => undefined });
    }

    remover(i: ImovelResumo) {
        this.conta.alternarFavorito(i.id).subscribe(() => this.lista.update((l) => l.filter((x) => x.id !== i.id)));
    }
}
