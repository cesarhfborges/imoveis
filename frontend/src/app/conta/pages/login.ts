import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthCard } from '@/app/shared/components/auth-card';
import { LoginForm } from '@/app/shared/components/login-form';
import { ContaService } from '@/app/core/services/conta.service';
import { ConfigService } from '@/app/core/services/config.service';

/** /conta/login: clientes e corretores entram na mesma tela, escolhendo o perfil. */
@Component({
    selector: 'app-conta-login-page',
    imports: [RouterLink, AuthCard, LoginForm],
    template: `
        <app-auth-card titulo="Acessar conta" subtitulo="Entre como cliente para salvar favoritos ou como corretor para gerenciar anúncios.">
            <app-login-form area="conta" (entrou)="entrou()" />
            <p class="text-center mt-6 mb-0">Ainda não tem conta? <a routerLink="/conta/cadastro" class="text-primary font-semibold hover:underline">Cadastre-se</a></p>
            <p class="text-center mt-2 mb-0 text-sm text-muted-color">Quer anunciar? <a routerLink="/anunciar" class="text-primary hover:underline">Cadastro de corretor/imobiliária</a></p>
        </app-auth-card>
    `
})
export class ContaLoginPage {
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private conta = inject(ContaService);

    constructor() {
        inject(ConfigService).definirTitulo('Acessar conta');
    }

    entrou() {
        this.conta.carregarFavoritos();
        const voltar: string | undefined = this.route.snapshot.queryParams['voltar'];
        this.router.navigateByUrl(voltar && voltar.startsWith('/') && !voltar.startsWith('/admin') ? voltar : '/conta');
    }
}
