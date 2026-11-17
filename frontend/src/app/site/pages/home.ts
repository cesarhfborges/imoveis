import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AccordionModule } from 'primeng/accordion';
import { SkeletonModule } from 'primeng/skeleton';
import { ImovelFiltro, ImovelResumo, OpcoesBusca } from '@/app/core/models/models';
import { ImovelService } from '@/app/core/services/imovel.service';
import { ConfigService } from '@/app/core/services/config.service';
import { AuthService } from '@/app/core/services/auth.service';
import { ContaService } from '@/app/core/services/conta.service';
import { DadosEstruturadosService, siteJsonLd } from '@/app/core/services/dados-estruturados.service';
import { FiltrosBusca } from '@/app/shared/components/filtros-busca';
import { ImovelCardMini } from '@/app/shared/components/imovel-card-mini';
import { HeroDecor } from '@/app/shared/components/hero-decor';

/** Página inicial: busca em destaque, vitrine, atalhos por tipo/bairro, chamada para anunciantes e dúvidas frequentes. */
@Component({
    selector: 'app-home-page',
    imports: [RouterLink, AccordionModule, SkeletonModule, FiltrosBusca, ImovelCardMini, HeroDecor],
    template: `
        <section class="hero" aria-labelledby="hero-titulo">
            <app-hero-decor />
            <div class="site-container hero__conteudo">
                <div class="hero__texto">
                    <span class="hero__chapeu"><i class="pi pi-sparkles" aria-hidden="true"></i> Compra, aluguel, lançamentos e temporada</span>
                    <h1 id="hero-titulo">
                        {{ titulo().inicio }}
                        @if (titulo().destaque) {
                            <span class="hero__destaque">{{ titulo().destaque }}</span>
                        }
                    </h1>
                    <p class="hero__sub">Casas, apartamentos, lotes e salas para comprar ou alugar, direto com corretores e imobiliárias.</p>
                    <ul class="hero__selos">
                        <li><i class="pi pi-search" aria-hidden="true"></i> Busca livre, sem cadastro</li>
                        <li><i class="pi pi-comments" aria-hidden="true"></i> Contato direto com o anunciante</li>
                        <li><i class="pi pi-verified" aria-hidden="true"></i> Corretores com CRECI</li>
                    </ul>
                </div>
                <div class="hero__busca">
                    <app-filtros-busca variante="hero" (buscar)="buscar($event)" />
                </div>
            </div>
        </section>

        <section class="site-container secao" aria-labelledby="destaques-titulo">
            <div class="flex items-end justify-between gap-4 mb-4">
                <h2 id="destaques-titulo" class="secao__titulo">Imóveis em destaque</h2>
                <a routerLink="/venda" class="text-primary font-semibold hover:underline">Ver todos</a>
            </div>
            <div class="grade-cards">
                @if (carregando()) {
                    @for (i of [1, 2, 3, 4]; track i) {
                        <p-skeleton height="260px" />
                    }
                } @else {
                    @for (i of destaques(); track i.id) {
                        <app-imovel-card-mini [imovel]="i" />
                    }
                }
            </div>
        </section>

        <!-- para quem está logado: os últimos imóveis abertos (regra "Vistos recentemente") -->
        @if (continuar().length) {
            <section class="site-container secao" aria-labelledby="continuar-titulo">
                <div class="flex items-end justify-between gap-4 mb-4">
                    <h2 id="continuar-titulo" class="secao__titulo">Continue de onde parou</h2>
                    <a routerLink="/conta/vistos" class="text-primary font-semibold hover:underline">Ver histórico</a>
                </div>
                <div class="grade-cards">
                    @for (i of continuar(); track i.id) {
                        <app-imovel-card-mini [imovel]="i" />
                    }
                </div>
            </section>
        }

        <section class="site-container secao" aria-labelledby="tipos-titulo">
            <h2 id="tipos-titulo" class="secao__titulo mb-4">Busque por tipo</h2>
            <div class="grade-tipos">
                @for (t of atalhos; track t.label) {
                    <a [routerLink]="t.rota" [queryParams]="t.params" class="tipo-atalho">
                        <i class="pi {{ t.icone }} text-2xl!" aria-hidden="true"></i>
                        <span>{{ t.label }}</span>
                    </a>
                }
            </div>
        </section>

        @if (opcoes().localidades.length) {
            <section class="site-container secao" aria-labelledby="bairros-titulo">
                <h2 id="bairros-titulo" class="secao__titulo mb-4">Bairros com anúncios</h2>
                <div class="flex flex-wrap gap-2">
                    @for (l of opcoes().localidades; track l.cidade) {
                        @for (b of l.bairros; track b) {
                            <a routerLink="/venda" [queryParams]="{ cidade: l.cidade, bairro: b }" class="pilula pilula--link">{{ b }}, {{ l.cidade }}</a>
                        }
                    }
                </div>
            </section>
        }

        <section class="site-container secao">
            <div class="cta-anunciar">
                <div class="cta-anunciar__conteudo">
                    <span class="cta-anunciar__chapeu"><i class="pi pi-megaphone" aria-hidden="true"></i> Para corretores e imobiliárias</span>
                    <h2 id="cta-anunciar-titulo" class="cta-anunciar__titulo">Seu imóvel na frente de quem está procurando</h2>
                    <p class="cta-anunciar__texto">Publique anúncios, receba contatos e acompanhe visitas e resultados em um painel simples.</p>
                    <ul class="cta-anunciar__beneficios">
                        <li><i class="pi pi-bolt" aria-hidden="true"></i> Publicação em minutos</li>
                        <li><i class="pi pi-inbox" aria-hidden="true"></i> Contatos direto no painel</li>
                        <li><i class="pi pi-chart-line" aria-hidden="true"></i> Visitas por dia e por região</li>
                    </ul>
                    <div class="cta-anunciar__acoes">
                        <a routerLink="/anunciar" class="cta-anunciar__botao cta-anunciar__botao--principal">Quero anunciar <i class="pi pi-arrow-right" aria-hidden="true"></i></a>
                        <a routerLink="/conta/login" class="cta-anunciar__botao cta-anunciar__botao--contorno">Já anuncio, entrar</a>
                    </div>
                </div>

                <!-- ilustração do painel do anunciante (decorativa) -->
                <div class="cta-anunciar__ilustracao" aria-hidden="true">
                    <div class="cta-anunciar__painel">
                        <div class="cta-anunciar__painel-topo">
                            <span></span><span></span><span></span>
                        </div>
                        <div class="cta-anunciar__stats">
                            <div>
                                <small>Visitas na semana</small>
                                <strong>1.284</strong>
                                <em><i class="pi pi-arrow-up"></i> 18%</em>
                            </div>
                            <div>
                                <small>Contatos</small>
                                <strong>37</strong>
                                <em><i class="pi pi-arrow-up"></i> 9%</em>
                            </div>
                        </div>
                        <div class="cta-anunciar__barras">
                            @for (h of barrasCta; track $index) {
                                <span [style.height.%]="h"></span>
                            }
                        </div>
                    </div>
                    <div class="cta-anunciar__notificacao">
                        <span class="cta-anunciar__notificacao-icone"><i class="pi pi-envelope"></i></span>
                        <span>
                            <strong>Novo contato</strong>
                            <small>"Gostaria de agendar uma visita…"</small>
                        </span>
                    </div>
                </div>
            </div>
        </section>

        <section class="site-container secao" aria-labelledby="faq-titulo">
            <h2 id="faq-titulo" class="secao__titulo mb-4">Perguntas frequentes</h2>
            <p-accordion [value]="'0'">
                @for (p of faq; track $index) {
                    <p-accordion-panel [value]="'' + $index">
                        <p-accordion-header>{{ p.q }}</p-accordion-header>
                        <p-accordion-content
                            ><p class="m-0">{{ p.r }}</p></p-accordion-content
                        >
                    </p-accordion-panel>
                }
            </p-accordion>
        </section>
    `
})
export class HomePage {
    /** Alturas (%) das barras da ilustração do card "anunciar". */
    readonly barrasCta = [38, 52, 45, 70, 62, 84, 100];
    private imoveis = inject(ImovelService);
    private router = inject(Router);
    private config = inject(ConfigService);
    private auth = inject(AuthService);
    private conta = inject(ContaService);
    private dadosEstruturados = inject(DadosEstruturadosService);
    cfg = this.config.config;

    /** Título do hero dividido para destacar o fim da frase (as duas últimas palavras). */
    titulo = computed(() => {
        const palavras = (this.cfg().slogan || 'Encontre o imóvel ideal').trim().split(/\s+/);
        const n = palavras.length >= 4 ? 2 : palavras.length > 1 ? 1 : 0;
        return { inicio: palavras.slice(0, palavras.length - n).join(' '), destaque: palavras.slice(palavras.length - n).join(' ') };
    });

    carregando = signal(true);
    destaques = signal<ImovelResumo[]>([]);
    /** Últimos imóveis abertos pelo usuário logado (vazio para visitantes ou com a regra desligada). */
    continuar = signal<ImovelResumo[]>([]);
    opcoes = signal<OpcoesBusca>({ tipos: [], localidades: [] });

    atalhos = [
        { label: 'Apartamentos', icone: 'pi-building', rota: '/venda', params: { tipo: 'APARTAMENTO' } },
        { label: 'Casas', icone: 'pi-home', rota: '/venda', params: { tipo: 'CASA' } },
        { label: 'Condomínios', icone: 'pi-shield', rota: '/venda', params: { tipo: 'CASA_CONDOMINIO' } },
        { label: 'Lotes', icone: 'pi-map', rota: '/venda', params: { tipo: 'LOTE' } },
        { label: 'Comerciais', icone: 'pi-briefcase', rota: '/aluguel', params: { tipo: 'SALA' } },
        { label: 'Lançamentos', icone: 'pi-star', rota: '/imovel-novo', params: {} }
    ];

    faq = [
        { q: 'Preciso criar conta para pesquisar?', r: 'Não. A busca e a página de cada imóvel são livres. A conta serve para salvar favoritos e, para corretores, publicar anúncios.' },
        { q: 'Como falo com o anunciante?', r: 'Na página do imóvel, preencha "Contate o anunciante". A mensagem chega no painel do corretor ou imobiliária.' },
        { q: 'Quem pode anunciar?', r: 'Corretores e imobiliárias com CRECI. Faça o cadastro em "Anunciar" e publique pelo seu painel.' },
        { q: 'Existe uma API para integrar meus anúncios?', r: 'Sim, para corretores e imobiliárias. No painel do anunciante, em "Tokens da API", você gera um token Bearer para consultar e gerenciar seus anúncios por integração.' }
    ];

    constructor() {
        this.config.definirTitulo();
        // o site e a busca para os buscadores (refaz se a configuração mudar)
        effect(() => this.dadosEstruturados.definir('site', siteJsonLd(this.cfg(), location.origin)));
        inject(DestroyRef).onDestroy(() => this.dadosEstruturados.remover('site'));
        // a sessão e a configuração chegam depois: refaz a consulta quando o login ou a regra mudam
        effect(() => {
            const mostrar = this.auth.logado() && this.cfg().vistosRecentes !== false;
            untracked(() => {
                if (!mostrar) {
                    this.continuar.set([]);
                    return;
                }
                this.conta.vistos(0, 4).subscribe({ next: (p) => this.continuar.set(p.content.map((v) => v.imovel)), error: () => this.continuar.set([]) });
            });
        });
        this.imoveis.destaques(8).subscribe({
            next: (d) => {
                this.destaques.set(d);
                this.carregando.set(false);
            },
            error: () => this.carregando.set(false)
        });
        this.imoveis.opcoes().subscribe({ next: (o) => this.opcoes.set(o), error: () => undefined });
    }

    buscar(f: ImovelFiltro) {
        const rota = f.lancamento ? '/imovel-novo' : f.finalidade === 'ALUGUEL' ? '/aluguel' : f.finalidade === 'TEMPORADA' ? '/temporada' : '/venda';
        this.router.navigate([rota], { queryParams: { tipo: f.tipo ?? null, uf: f.uf, cidade: f.cidade, bairro: f.bairro, quartos: f.quartos, precoMax: f.precoMax, q: f.q } });
    }
}
