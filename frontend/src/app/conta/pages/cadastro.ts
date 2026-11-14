import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthCard } from '@/app/shared/components/auth-card';
import { CadastroForm } from '@/app/shared/components/cadastro-form';
import { ConfigService } from '@/app/core/services/config.service';

@Component({
    selector: 'app-cadastro-page',
    imports: [RouterLink, AuthCard, CadastroForm],
    template: `
        <app-auth-card titulo="Criar conta" subtitulo="É grátis e leva menos de um minuto." largura="34rem">
            <app-cadastro-form modo="escolha" (cadastrou)="router.navigateByUrl('/conta')" />
            <p class="text-center mt-6 mb-0">Já tem conta? <a routerLink="/conta/login" class="text-primary font-semibold hover:underline">Entrar</a></p>
        </app-auth-card>
    `
})
export class CadastroPage {
    router = inject(Router);

    constructor() {
        inject(ConfigService).definirTitulo('Criar conta');
    }
}
