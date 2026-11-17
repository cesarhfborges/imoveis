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
            <app-login-form area="conta" (entrou)="entrou($event)" />
            <div rodape class="flex flex-col gap-3">
                <p class="text-center text-muted-color m-0">Ainda não tem conta?</p>
                <a routerLink="/conta/cadastro" class="p-button p-button-outlined w-full justify-center gap-2"><i class="pi pi-user-plus" aria-hidden="true"></i> Criar conta grátis</a>
                <!-- espaçamento por padding: o "p { margin }" global do tema (fora das camadas do Tailwind) anula mt-* em <p> -->
                <div class="pt-6 text-center text-sm text-muted-color">É corretor ou imobiliária? <a routerLink="/anunciar" class="text-primary font-semibold hover:underline">Saiba como anunciar</a></div>
            </div>
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

    entrou(event: any) {
        this.conta.carregarFavoritos();
        const voltar: string | undefined = this.route.snapshot.queryParams['voltar'];
        // volta para onde a pessoa estava (ex.: "Ver telefone" na página do imóvel), nunca para o painel admin
        const destinoValido = !!voltar && voltar.startsWith('/') && !voltar.startsWith('/admin');
        void this.router.navigateByUrl(destinoValido ? voltar! : event.perfil === 'CLIENTE' ? '/' : '/conta');
    }
}
