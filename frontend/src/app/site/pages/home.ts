import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AccordionModule } from 'primeng/accordion';
import { SkeletonModule } from 'primeng/skeleton';
import { ImovelFiltro, ImovelResumo, OpcoesBusca } from '@/app/core/models/models';
import { ImovelService } from '@/app/core/services/imovel.service';
import { ConfigService } from '@/app/core/services/config.service';
import { FiltrosBusca } from '@/app/shared/components/filtros-busca';
import { ImovelCardMini } from '@/app/shared/components/imovel-card-mini';

/** Página inicial: busca em destaque, vitrine, atalhos por tipo/bairro, chamada para anunciantes e dúvidas frequentes. */
@Component({
    selector: 'app-home-page',
    imports: [RouterLink, AccordionModule, SkeletonModule, FiltrosBusca, ImovelCardMini],
    template: `
        <section class="hero" aria-labelledby="hero-titulo">
            <div class="site-container hero__conteudo">
                <div class="hero__texto">
                    <h1 id="hero-titulo">{{ cfg().slogan || 'Encontre o imóvel ideal' }}</h1>
                    <p>Casas, apartamentos, lotes e salas para comprar ou alugar, direto com corretores e imobiliárias.</p>
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
                <div>
                    <div class="cta-anunciar__chapeu">Seu imóvel anunciado</div>
                    <h2 class="cta-anunciar__titulo">Em nosso portal</h2>
                    <p>Corretores e imobiliárias publicam anúncios, recebem contatos e acompanham visualizações em um painel simples.</p>
                </div>
                <a routerLink="/anunciar" class="site-acao site-acao--escuro site-acao--grande">Quero anunciar</a>
            </div>
        </section>

        <section class="site-container secao" aria-labelledby="faq-titulo">
            <h2 id="faq-titulo" class="secao__titulo mb-4">Perguntas frequentes</h2>
            <p-accordion [value]="'0'">
                @for (p of faq; track $index) {
                    <p-accordion-panel [value]="'' + $index">
                        <p-accordion-header>{{ p.q }}</p-accordion-header>
                        <p-accordion-content><p class="m-0">{{ p.r }}</p></p-accordion-content>
                    </p-accordion-panel>
                }
            </p-accordion>
        </section>
    `
})
export class HomePage {
    private imoveis = inject(ImovelService);
    private router = inject(Router);
    private config = inject(ConfigService);
    cfg = this.config.config;

    carregando = signal(true);
    destaques = signal<ImovelResumo[]>([]);
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
