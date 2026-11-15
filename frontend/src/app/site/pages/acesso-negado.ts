import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EmptyState } from '@/app/shared/components/empty-state';
import { AuthService } from '@/app/core/services/auth.service';
import { perfilLabel } from '@/app/core/models/models';

@Component({
    selector: 'app-acesso-negado-page',
    imports: [RouterLink, EmptyState],
    template: `
        <div class="site-container py-10">
            <app-empty-state titulo="Acesso não permitido" [texto]="texto" icone="pi-lock">
                <div class="flex flex-wrap gap-2 justify-center">
                    @if (area === 'admin') {
                        <a routerLink="/admin/login" class="site-acao site-acao--escuro">Entrar como administrador</a>
                    } @else {
                        <a routerLink="/conta/login" class="site-acao site-acao--escuro">Entrar com outro perfil</a>
                    }
                    <a routerLink="/" class="site-acao site-acao--claro">Voltar ao início</a>
                </div>
            </app-empty-state>
        </div>
    `
})
export class AcessoNegadoPage {
    private auth = inject(AuthService);
    area = inject(ActivatedRoute).snapshot.queryParams['area'] ?? 'conta';
    texto = this.auth.logado() ? `Você está conectado como ${perfilLabel(this.auth.perfil()).toLowerCase()}, e esta área pede outro perfil.` : 'Faça login para continuar.';
}
