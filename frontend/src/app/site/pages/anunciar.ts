import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { CadastroForm } from '@/app/shared/components/cadastro-form';
import { HeroDecor } from '@/app/shared/components/hero-decor';
import { ConfigService } from '@/app/core/services/config.service';
import { AuthService } from '@/app/core/services/auth.service';

/**
 * "Anunciar": cadastro exclusivo de corretores e imobiliárias.
 * Faixa de destaque no topo; abaixo, "como funciona" + contatos à esquerda e o
 * formulário num cartão à direita, que sobe sobre a faixa no desktop.
 */
@Component({
    selector: 'app-anunciar-page',
    imports: [RouterLink, CadastroForm, HeroDecor],
    template: `
        <section class="hero anunciar-topo" aria-labelledby="anunciar-titulo">
            <app-hero-decor />
            <div class="site-container anunciar-topo__grade">
                <div class="hero__texto">
                    <span class="hero__chapeu"><i class="pi pi-verified" aria-hidden="true"></i> Exclusivo para corretores e imobiliárias</span>
                    <h1 id="anunciar-titulo">Seu imóvel anunciado <span class="hero__destaque">em nosso portal</span></h1>
                    <p class="hero__sub">Alugar ou vender é mais fácil do que você imagina. Faça o cadastro, publique seus anúncios pelo painel e receba os contatos dos interessados.</p>
                    <ul class="hero__selos">
                        <li><i class="pi pi-images" aria-hidden="true"></i> Anúncios com fotos e mapa</li>
                        <li><i class="pi pi-inbox" aria-hidden="true"></i> Contatos direto no painel</li>
                        <li><i class="pi pi-chart-line" aria-hidden="true"></i> Visualizações de cada anúncio</li>
                    </ul>
                </div>
            </div>
        </section>

        <div class="site-container anunciar">
            <div class="anunciar__info">
                <section aria-labelledby="como-funciona">
                    <h2 id="como-funciona" class="anunciar__subtitulo">Como funciona</h2>
                    <ol class="anunciar__passos">
                        @for (p of passos; track p.titulo; let i = $index) {
                            <li>
                                <span class="anunciar__passo-num" aria-hidden="true">{{ i + 1 }}</span>
                                <div>
                                    <h3>{{ p.titulo }}</h3>
                                    <p>{{ p.texto }}</p>
                                </div>
                            </li>
                        }
                    </ol>
                </section>

                <section aria-labelledby="fale-conosco">
                    <h2 id="fale-conosco" class="anunciar__subtitulo">Fale com a gente</h2>
                    <ul class="anunciar__contatos">
                        @if (cfg().whatsapp) {
                            <li>
                                <span class="anunciar__contato-icone anunciar__contato-icone--whats"><i class="pi pi-whatsapp" aria-hidden="true"></i></span>
                                <div>
                                    <small>Celular / WhatsApp</small><strong>{{ cfg().whatsapp }}</strong>
                                </div>
                            </li>
                        }
                        @if (cfg().emailContato) {
                            <li>
                                <span class="anunciar__contato-icone"><i class="pi pi-envelope" aria-hidden="true"></i></span>
                                <div>
                                    <small>E-mail</small><a [href]="'mailto:' + cfg().emailContato">{{ cfg().emailContato }}</a>
                                </div>
                            </li>
                        }
                        <li>
                            <span class="anunciar__contato-icone"><i class="pi pi-sign-in" aria-hidden="true"></i></span>
                            <div><small>Já tem cadastro?</small><a routerLink="/conta/login">Entre como corretor</a></div>
                        </li>
                    </ul>
                </section>
            </div>

            <section class="anunciar__form" aria-labelledby="form-anunciar">
                <header class="anunciar__form-cabecalho">
                    <span class="anunciar__form-icone" aria-hidden="true"><i class="pi pi-user-plus"></i></span>
                    <div>
                        <h2 id="form-anunciar">Crie sua conta de anunciante</h2>
                        <p>Assim que terminar, você já segue para publicar o primeiro anúncio.</p>
                    </div>
                </header>
                @if (!cfg().permitirCadastroCorretor) {
                    <p class="text-muted-color m-0">O cadastro de novos anunciantes está fechado no momento. Fale conosco pelos contatos ao lado.</p>
                } @else if (auth.logado() && auth.sessao().perfisDisponiveis.includes('CORRETOR')) {
                    <p class="m-0">Você já é anunciante. <a routerLink="/conta/anuncios/novo" class="text-primary font-semibold hover:underline">Publicar um anúncio</a></p>
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

    passos = [
        { titulo: 'Cadastre-se', texto: 'Informe seus dados e o CRECI, como corretor ou imobiliária.' },
        { titulo: 'Publique pelo painel', texto: 'Cadastre o imóvel com fotos, valores, características e a localização no mapa.' },
        { titulo: 'Receba os contatos', texto: 'As mensagens dos interessados chegam no seu painel, junto com as visualizações de cada anúncio.' }
    ];

    constructor() {
        this.config.definirTitulo('Anunciar');
    }

    pronto() {
        this.msg.add({ severity: 'success', summary: 'Cadastro feito!', detail: 'Agora publique seu primeiro anúncio.' });
        this.router.navigateByUrl('/conta/anuncios/novo');
    }
}
