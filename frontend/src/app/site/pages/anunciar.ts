import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { CadastroForm } from '@/app/shared/components/cadastro-form';
import { ConfigService } from '@/app/core/services/config.service';
import { AuthService } from '@/app/core/services/auth.service';

/** "Anunciar": cadastro exclusivo de corretores e imobiliárias. */
@Component({
    selector: 'app-anunciar-page',
    imports: [RouterLink, CadastroForm],
    template: `
        <div class="site-container anunciar">
            <section>
                <div class="cta-anunciar__chapeu">Seu imóvel anunciado</div>
                <h1 class="anunciar__titulo">Em nosso portal</h1>
                <p class="text-muted-color text-lg">Alugar ou vender seu imóvel é mais fácil do que você imagina. Faça o cadastro, publique seus anúncios pelo painel e receba os contatos dos interessados.</p>
                <p class="font-semibold">Exclusivo para imobiliárias e corretores.</p>
                <ul class="anunciar__contatos">
                    @if (cfg().whatsapp) {
                        <li>
                            <i class="pi pi-whatsapp text-green-600" aria-hidden="true"></i>
                            <div><strong class="text-green-700 dark:text-green-400">Celular / WhatsApp</strong><br />{{ cfg().whatsapp }}</div>
                        </li>
                    }
                    @if (cfg().emailContato) {
                        <li>
                            <i class="pi pi-envelope" aria-hidden="true"></i>
                            <div><strong>E-mail</strong><br /><a [href]="'mailto:' + cfg().emailContato">{{ cfg().emailContato }}</a></div>
                        </li>
                    }
                    <li>
                        <i class="pi pi-comments" aria-hidden="true"></i>
                        <div><strong>Já tem cadastro?</strong><br /><a routerLink="/conta/login" class="text-primary hover:underline">Entre como corretor</a></div>
                    </li>
                </ul>
            </section>
            <section class="anunciar__form" aria-labelledby="form-anunciar">
                <h2 id="form-anunciar" class="anunciar__form-titulo">Preencha este formulário para cadastro</h2>
                @if (!cfg().permitirCadastroCorretor) {
                    <p class="text-muted-color">O cadastro de novos anunciantes está fechado no momento. Fale conosco pelos contatos ao lado.</p>
                } @else if (auth.logado() && auth.sessao().perfisDisponiveis.includes('CORRETOR')) {
                    <p>Você já é anunciante. <a routerLink="/conta/anuncios/novo" class="text-primary font-semibold hover:underline">Publicar um anúncio</a></p>
                } @else {
                    <app-cadastro-form modo="anunciante" (cadastrou)="pronto()" />
                }
            </section>
        </div>
    `
})
export class AnunciarPage {
    private router = inject(Router);
    private msg = inject(MessageService);
    private config = inject(ConfigService);
    auth = inject(AuthService);
    cfg = this.config.config;

    constructor() {
        this.config.definirTitulo('Anunciar');
    }

    pronto() {
        this.msg.add({ severity: 'success', summary: 'Cadastro feito!', detail: 'Agora publique seu primeiro anúncio.' });
        this.router.navigateByUrl('/conta/anuncios/novo');
    }
}
