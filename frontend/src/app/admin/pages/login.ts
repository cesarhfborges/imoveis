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
        <app-auth-card titulo="Administração" subtitulo="Entre com a sua conta de administrador do sistema." selo="Área restrita">
            <app-login-form area="admin" (entrou)="entrou()" />
            <p rodape class="text-center text-sm text-muted-color m-0">Não é administrador? <a routerLink="/conta/login" class="text-primary font-semibold hover:underline">Entrar como cliente ou corretor</a></p>
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
