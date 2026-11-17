import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthCard } from '@/app/shared/components/auth-card';
import { CadastroForm } from '@/app/shared/components/cadastro-form';
import { ConfigService } from '@/app/core/services/config.service';

@Component({
    selector: 'app-cadastro-page',
    imports: [RouterLink, AuthCard, CadastroForm],
    template: `
        <app-auth-card titulo="Criar conta" subtitulo="É grátis e leva menos de um minuto." largura="44rem">
            <app-cadastro-form modo="escolha" (cadastrou)="router.navigateByUrl('/conta')" />
            <div rodape class="flex flex-col gap-3">
                <p class="text-center text-muted-color m-0">Já tem conta?</p>
                <a routerLink="/conta/login" class="p-button p-button-outlined w-full justify-center gap-2"><i class="pi pi-sign-in" aria-hidden="true"></i> Entrar na minha conta</a>
            </div>
        </app-auth-card>
    `
})
export class CadastroPage {
    router = inject(Router);

    constructor() {
        inject(ConfigService).definirTitulo('Criar conta');
    }
}
