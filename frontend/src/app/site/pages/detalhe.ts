import { Component, computed, inject, input, signal, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { DOCUMENTACAO, ImovelDetalhe, ImovelResumo, finalidadeLabel } from '@/app/core/models/models';
import { ImovelService } from '@/app/core/services/imovel.service';
import { ContaService } from '@/app/core/services/conta.service';
import { AuthService } from '@/app/core/services/auth.service';
import { ConfigService } from '@/app/core/services/config.service';
import { PrecoPipe, TempoAtrasPipe, ValorM2Pipe } from '@/app/core/pipes/formatos';
import { ImovelFoto } from '@/app/shared/components/imovel-foto';
import { ContatoForm } from '@/app/shared/components/contato-form';
import { MapaOsm, PontoMapa } from '@/app/shared/components/mapa-osm';
import { ImovelCardMini } from '@/app/shared/components/imovel-card-mini';
import { EmptyState } from '@/app/shared/components/empty-state';

/** Página do imóvel. */
@Component({
    selector: 'app-detalhe-page',
    imports: [RouterLink, ButtonModule, SkeletonModule, TagModule, PrecoPipe, ValorM2Pipe, TempoAtrasPipe, ImovelFoto, ContatoForm, MapaOsm, ImovelCardMini, EmptyState],
    template: `
        @if (erro()) {
            <div class="site-container py-10">
                <app-empty-state titulo="Imóvel não encontrado" texto="Este anúncio pode ter sido removido ou pausado pelo anunciante." icone="pi-exclamation-circle">
                    <a routerLink="/venda" class="site-acao site-acao--escuro">Voltar para a busca</a>
                </app-empty-state>
            </div>
        } @else if (!imovel()) {
            <div class="site-container py-6 grid gap-6 lg:grid-cols-[1fr_22rem]"><p-skeleton height="420px" /><p-skeleton height="420px" /></div>
        } @else {
            @let i = imovel()!;
            <div class="site-container detalhe">
                <div class="detalhe__principal">
                    <div class="galeria" aria-roledescription="carrossel" aria-label="Fotos do imóvel">
                        <app-imovel-foto class="galeria__foto" [src]="fotoAtual()" [tipo]="i.tipo" [semente]="i.id" [alt]="i.titulo + ' - foto ' + (indice() + 1)" />
                        @if (i.fotos.length > 1) {
                            <button type="button" class="galeria__seta galeria__seta--esq" (click)="mover(-1)" aria-label="Foto anterior"><i class="pi pi-chevron-left"></i></button>
                            <button type="button" class="galeria__seta galeria__seta--dir" (click)="mover(1)" aria-label="Próxima foto"><i class="pi pi-chevron-right"></i></button>
                        }
                        <span class="galeria__contador"><i class="pi pi-camera" aria-hidden="true"></i> {{ i.fotos.length ? indice() + 1 : 0 }}/{{ i.fotos.length }}</span>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                        @if (i.anunciante?.telefone) {
                            <a [href]="'tel:' + i.anunciante!.telefone" class="botao-contorno justify-center"><i class="pi pi-phone" aria-hidden="true"></i> Ligue agora</a>
                        }
                        <a href="#contato" class="botao-contorno justify-center"><i class="pi pi-envelope" aria-hidden="true"></i> Enviar e-mail</a>
                        <button type="button" class="botao-contorno justify-center" (click)="copiarLink()"><i class="pi pi-link" aria-hidden="true"></i> Copiar link</button>
                        <a [href]="linkWhatsapp()" target="_blank" rel="noopener" class="botao-contorno justify-center"><i class="pi pi-whatsapp" aria-hidden="true"></i> Compartilhe</a>
                    </div>

                    <div class="flex flex-wrap items-start justify-between gap-3 mt-6">
                        <h1 class="detalhe__titulo">{{ i.titulo }}</h1>
                        <span class="flex gap-2">
                            @if (i.lancamento) {
                                <p-tag value="Imóvel novo" />
                            }
                            <p-tag [value]="finalidadeLabel(i.finalidade)" severity="secondary" />
                        </span>
                    </div>
                    <div class="flex flex-wrap items-baseline gap-x-6 gap-y-1 mt-2">
                        <span class="text-lg">R$ <strong class="detalhe__preco">{{ precoSemRs() }}</strong></span>
                        @if (i.finalidade === 'VENDA' && i.areaUtil) {
                            <span>Valor R$/m²: <strong class="text-primary text-lg">{{ i.preco | valorM2: i.areaUtil }}</strong></span>
                        }
                    </div>
                    @if (i.aceitaFinanciamento || i.aceitaFgts || i.aceitaPermuta) {
                        <div class="flex flex-wrap gap-2 mt-3">
                            @if (i.aceitaFinanciamento) {
                                <span class="selo-condicao"><i class="pi pi-check" aria-hidden="true"></i> Aceita financiamento</span>
                            }
                            @if (i.aceitaFgts) {
                                <span class="selo-condicao"><i class="pi pi-check" aria-hidden="true"></i> Aceita FGTS</span>
                            }
                            @if (i.aceitaPermuta) {
                                <span class="selo-condicao"><i class="pi pi-check" aria-hidden="true"></i> Aceita permuta</span>
                            }
                        </div>
                    }
                    <div class="local-pilula mt-3"><i class="pi pi-map-marker" aria-hidden="true"></i> {{ i.cidade }} - {{ i.bairro }}</div>

                    <dl class="detalhe__fatos">
                        <div><dt>Publicado</dt><dd>{{ i.criadoEm | tempoAtras }}</dd></div>
                        <div><dt>Código</dt><dd>{{ i.codigo }}</dd></div>
                        <div><dt>Tipo</dt><dd>{{ i.tipoDescricao }}</dd></div>
                        @if (i.areaUtil) {
                            <div><dt>Área útil</dt><dd>{{ i.areaUtil }} m²</dd></div>
                        }
                        @if (i.quartos) {
                            <div><dt>Quartos</dt><dd>{{ i.quartos }}</dd></div>
                        }
                        @if (i.suites) {
                            <div><dt>Suítes</dt><dd>{{ i.suites }}</dd></div>
                        }
                        @if (i.banheiros) {
                            <div><dt>Banheiros</dt><dd>{{ i.banheiros }}</dd></div>
                        }
                        @if (i.vagas) {
                            <div><dt>Vagas</dt><dd>{{ i.vagas }}</dd></div>
                        }
                        @if (i.condominio) {
                            <div><dt>Condomínio</dt><dd>{{ i.condominio | preco }}</dd></div>
                        }
                        @if (i.iptu) {
                            <div><dt>IPTU</dt><dd>{{ i.iptu | preco }}</dd></div>
                        }
                    </dl>

                    <section class="bloco" aria-labelledby="desc-titulo">
                        <h2 id="desc-titulo">Descrição</h2>
                        <div class="detalhe__descricao" [class.recolhida]="!descricaoAberta()">{{ i.descricao || 'O anunciante ainda não escreveu uma descrição.' }}</div>
                        <button type="button" class="text-primary font-semibold mt-2" (click)="descricaoAberta.set(!descricaoAberta())" [attr.aria-expanded]="descricaoAberta()">
                            {{ descricaoAberta() ? 'Ver menos' : 'Ver mais' }} <i class="pi" [class.pi-angle-up]="descricaoAberta()" [class.pi-angle-down]="!descricaoAberta()" aria-hidden="true"></i>
                        </button>
                    </section>

                    <section class="bloco" aria-labelledby="doc-titulo">
                        <h2 id="doc-titulo">Documentação e condições</h2>
                        <ul class="lista-doc">
                            @for (d of documentacao; track d.campo) {
                                @let sim = !!i[d.campo];
                                <li [class.sim]="sim">
                                    <i class="pi" [class.pi-check-circle]="sim" [class.pi-times-circle]="!sim" aria-hidden="true"></i>
                                    <span>
                                        <strong>{{ d.label }}:</strong> {{ sim ? 'Sim' : 'Não' }}
                                        <span class="block text-xs text-muted-color">{{ d.dica }}</span>
                                    </span>
                                </li>
                            }
                        </ul>
                    </section>

                    @if (i.caracteristicas.length) {
                        <section class="bloco" aria-labelledby="carac-titulo">
                            <h2 id="carac-titulo">Características</h2>
                            <ul class="lista-check">
                                @for (c of i.caracteristicas; track c) {
                                    <li><i class="pi pi-check" aria-hidden="true"></i>{{ c }}</li>
                                }
                            </ul>
                        </section>
                    }

                    <section class="bloco" aria-labelledby="local-titulo">
                        <h2 id="local-titulo">Localização</h2>
                        <p class="text-primary font-semibold uppercase text-sm">{{ i.uf }} - {{ i.cidade }} - {{ i.bairro }}{{ i.endereco ? ' - ' + i.endereco : '' }}</p>
                        @if (pontos().length) {
                            <app-mapa-osm [pontos]="pontos()" [cliqueParaCarregar]="true" altura="320px" />
                        } @else {
                            <p class="text-muted-color">O anunciante não informou a posição no mapa.</p>
                        }
                    </section>

                    <nav class="trilha" aria-label="Você está em">
                        <a routerLink="/">Início</a> / <a [routerLink]="rotaFinalidade()">Imóveis {{ finalidadeLabel(i.finalidade).toLowerCase() }}</a> /
                        <a [routerLink]="rotaFinalidade()" [queryParams]="{ cidade: i.cidade }">{{ i.cidade }}</a> /
                        <a [routerLink]="rotaFinalidade()" [queryParams]="{ cidade: i.cidade, bairro: i.bairro }">{{ i.bairro }}</a> / <span>{{ i.codigo }}</span>
                    </nav>
                </div>

                <aside class="detalhe__lateral" aria-label="Contato">
                    <div class="grid grid-cols-1 gap-2 mb-3">
                        <button type="button" class="botao-contorno justify-center" (click)="favoritar()" [attr.aria-pressed]="favorito()">
                            <i class="pi" [class.pi-heart-fill]="favorito()" [class.pi-heart]="!favorito()" aria-hidden="true"></i> {{ favorito() ? 'Favoritado' : 'Favoritar' }}
                        </button>
                    </div>
                    <div class="caixa-contato" id="contato">
                        @if (i.anunciante; as a) {
                            <div class="flex items-center gap-3 mb-3">
                                <span class="imovel-card__anunciante">{{ iniciais(a.nome) }}</span>
                                <div>
                                    <div class="font-semibold">{{ a.nome }}</div>
                                    <div class="text-xs text-muted-color">Creci: {{ a.creci || '—' }}</div>
                                </div>
                            </div>
                        }
                        <h2 class="text-base font-semibold text-center mb-3">Contate o anunciante</h2>
                        <app-contato-form [imovelId]="i.id" />
                        @if (i.anunciante?.telefone) {
                            <div class="text-center mt-4 text-lg"><i class="pi pi-phone mr-2" aria-hidden="true"></i>{{ i.anunciante!.telefone }}</div>
                        }
                    </div>
                </aside>
            </div>

            @if (similares().length) {
                <section class="site-container secao" aria-labelledby="similares-titulo">
                    <h2 id="similares-titulo" class="secao__titulo mb-4">Imóveis similares</h2>
                    <div class="grade-cards">
                        @for (s of similares(); track s.id) {
                            <app-imovel-card-mini [imovel]="s" />
                        }
                    </div>
                </section>
            }
        }
    `
})
export class DetalhePage {
    private imoveis = inject(ImovelService);
    private conta = inject(ContaService);
    private auth = inject(AuthService);
    private router = inject(Router);
    private msg = inject(MessageService);
    private config = inject(ConfigService);

    /** :id da rota (ligado pelo router). */
    id = input.required<string>();

    imovel = signal<ImovelDetalhe | null>(null);
    similares = signal<ImovelResumo[]>([]);
    erro = signal(false);
    indice = signal(0);
    descricaoAberta = signal(false);
    finalidadeLabel = finalidadeLabel;
    documentacao = DOCUMENTACAO;

    fotoAtual = computed(() => this.imovel()?.fotos[this.indice()] ?? null);
    favorito = computed(() => this.conta.favoritos().has(Number(this.id())));
    precoSemRs = computed(() => {
        const i = this.imovel();
        if (!i) return '';
        const v = i.preco.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
        return v + (i.finalidade === 'ALUGUEL' ? '/mês' : i.finalidade === 'TEMPORADA' ? '/dia' : '');
    });
    pontos = computed<PontoMapa[]>(() => {
        const i = this.imovel();
        return i?.latitude != null && i.longitude != null ? [{ id: i.id, lat: i.latitude, lng: i.longitude, titulo: i.titulo, subtitulo: `${i.bairro}, ${i.cidade}` }] : [];
    });
    rotaFinalidade = computed(() => {
        const i = this.imovel();
        return i?.lancamento ? '/imovel-novo' : i?.finalidade === 'ALUGUEL' ? '/aluguel' : i?.finalidade === 'TEMPORADA' ? '/temporada' : '/venda';
    });
    linkWhatsapp = computed(() => 'https://wa.me/?text=' + encodeURIComponent((this.imovel()?.titulo ?? '') + ' ' + location.href));

    constructor() {
        effect(() => {
            const id = Number(this.id());
            this.imovel.set(null);
            this.erro.set(false);
            this.indice.set(0);
            this.imoveis.detalhe(id).subscribe({
                next: (i) => {
                    this.imovel.set(i);
                    this.config.definirTitulo(i.titulo);
                },
                error: () => this.erro.set(true)
            });
            this.imoveis.similares(id).subscribe({ next: (s) => this.similares.set(s), error: () => this.similares.set([]) });
        });
    }

    mover(d: number) {
        const n = this.imovel()?.fotos.length ?? 0;
        if (n) this.indice.update((i) => (i + d + n) % n);
    }

    iniciais(nome: string) {
        return nome
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0])
            .join('')
            .toUpperCase();
    }

    copiarLink() {
        navigator.clipboard?.writeText(location.href).then(() => this.msg.add({ severity: 'success', summary: 'Link copiado' }));
    }

    favoritar() {
        if (!this.auth.logado()) {
            this.router.navigate(['/conta/login'], { queryParams: { voltar: this.router.url } });
            return;
        }
        this.conta.alternarFavorito(Number(this.id())).subscribe();
    }
}
