import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyState } from '@/app/shared/components/empty-state';

@Component({
    selector: 'app-nao-encontrado-page',
    imports: [RouterLink, EmptyState],
    template: `
        <div class="site-container py-10">
            <app-empty-state titulo="Página não encontrada" texto="O endereço pode ter mudado. Que tal fazer uma nova busca?" icone="pi-compass">
                <a routerLink="/venda" class="site-acao site-acao--escuro">Buscar imóveis</a>
            </app-empty-state>
        </div>
    `
})
export class NaoEncontradoPage {}
