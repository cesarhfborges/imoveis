import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthCard } from '@/app/shared/components/auth-card';
import { LoginForm } from '@/app/shared/components/login-form';
import { ConfigService } from '@/app/core/services/config.service';

/** /admin/login: única entrada para o perfil de administrador. */
@Component({
    selector: 'app-admin-login-page',
    imports: [RouterLink, AuthCard, LoginForm],
    template: `
        <app-auth-card titulo="Administração" subtitulo="Acesso restrito aos administradores do sistema.">
            <app-login-form area="admin" (entrou)="entrou()" />
            <p class="text-center mt-6 mb-0 text-sm"><a routerLink="/" class="text-primary hover:underline">Voltar ao site</a></p>
        </app-auth-card>
    `
})
export class AdminLoginPage {
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    constructor() {
        inject(ConfigService).definirTitulo('Administração');
    }

    entrou() {
        const voltar: string | undefined = this.route.snapshot.queryParams['voltar'];
        this.router.navigateByUrl(voltar && voltar.startsWith('/admin') ? voltar : '/admin');
    }
}
