import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { ImovelResumo } from '@/app/core/models/models';
import { ContaService } from '@/app/core/services/conta.service';
import { ConfigService } from '@/app/core/services/config.service';
import { PageHeader } from '@/app/shared/components/page-header';
import { ImovelCard } from '@/app/shared/components/imovel-card';
import { EmptyState } from '@/app/shared/components/empty-state';
import { ContatoForm } from '@/app/shared/components/contato-form';

@Component({
    selector: 'app-favoritos-page',
    imports: [RouterLink, DialogModule, PageHeader, ImovelCard, EmptyState, ContatoForm],
    template: `
        <app-page-header titulo="Favoritos" subtitulo="Imóveis que você salvou para ver depois." />
        @if (lista().length === 0 && !carregando()) {
            <div class="card">
                <app-empty-state titulo="Nenhum favorito ainda" texto="Toque no coração de um anúncio para salvá-lo aqui." icone="pi-heart">
                    <a routerLink="/venda" class="p-button">Buscar imóveis</a>
                </app-empty-state>
            </div>
        } @else {
            <div class="flex flex-col gap-3">
                @for (i of lista(); track i.id) {
                    <app-imovel-card [imovel]="i" [favorito]="conta.favoritos().has(i.id)" (favoritar)="remover($event)" (contatar)="contatando.set($event)" />
                }
            </div>
        }
        <p-dialog [visible]="!!contatando()" (visibleChange)="!$event && contatando.set(null)" [modal]="true" header="Contatar anunciante" [style]="{ width: '30rem' }" [breakpoints]="{ '575px': '95vw' }">
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

    constructor() {
        inject(ConfigService).definirTitulo('Favoritos');
        this.conta.listarFavoritos().subscribe({
            next: (l) => {
                this.lista.set(l);
                this.carregando.set(false);
            },
            error: () => this.carregando.set(false)
        });
    }

    remover(i: ImovelResumo) {
        this.conta.alternarFavorito(i.id).subscribe(() => this.lista.update((l) => l.filter((x) => x.id !== i.id)));
    }
}
