import { AnuncianteFoto } from '@/app/shared/components/anunciante-foto';
import { Component, computed, inject, input, signal, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { DOCUMENTACAO, ImovelDetalhe, ImovelResumo, finalidadeLabel, statusInfo, tituloAnuncio } from '@/app/core/models/models';
import { GestaoAnunciosService, ImovelService } from '@/app/core/services/imovel.service';
import { ContaService } from '@/app/core/services/conta.service';
import { AuthService } from '@/app/core/services/auth.service';
import { ConfigService } from '@/app/core/services/config.service';
import { CepPipe, PrecoPipe, TempoAtrasPipe, ValorM2Pipe } from '@/app/core/pipes/formatos';
import { TelefoneAnunciante } from '@/app/shared/components/telefone-anunciante';
import { GaleriaFotos } from '@/app/shared/components/galeria-fotos';
import { ContatoForm } from '@/app/shared/components/contato-form';
import { MapaOsm, PontoMapa } from '@/app/shared/components/mapa-osm';
import { ImovelCardMini } from '@/app/shared/components/imovel-card-mini';
import { EmptyState } from '@/app/shared/components/empty-state';
import { DenunciarDialog } from '@/app/shared/components/denunciar-dialog';

/** Página do imóvel. */
@Component({
    selector: 'app-detalhe-page',
    imports: [RouterLink, ButtonModule, SkeletonModule, PrecoPipe, ValorM2Pipe, TempoAtrasPipe, CepPipe, TelefoneAnunciante, GaleriaFotos, ContatoForm, MapaOsm, ImovelCardMini, EmptyState, DenunciarDialog, AnuncianteFoto],
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
            @if (previa()) {
                <div class="site-container">
                    <div class="detalhe__previa" role="status">
                        <i class="pi pi-eye" aria-hidden="true"></i>
                        <div>
                            <strong>Prévia · anúncio {{ statusLabel(i.status).toLowerCase() }}</strong>
                            <span>Este anúncio não aparece para o público. Só {{ ehAdmin() ? 'a moderação' : 'você' }} consegue ver esta página, do jeito que ela vai ficar quando voltar ao ar.</span>
                        </div>
                    </div>
                </div>
            }
            <div class="site-container detalhe">
                <div class="detalhe__principal">
                    <nav class="trilha" aria-label="Você está em">
                        <a routerLink="/">Início</a>
                        <i class="pi pi-angle-right" aria-hidden="true"></i>
                        <a [routerLink]="rotaFinalidade()">Imóveis {{ finalidadeLabel(i.finalidade).toLowerCase() }}</a>
                        <i class="pi pi-angle-right" aria-hidden="true"></i>
                        <a [routerLink]="rotaFinalidade()" [queryParams]="{ cidade: i.cidade }">{{ i.cidade }}</a>
                        <i class="pi pi-angle-right" aria-hidden="true"></i>
                        <a [routerLink]="rotaFinalidade()" [queryParams]="{ cidade: i.cidade, bairro: i.bairro }">{{ i.bairro }}</a>
                        <i class="pi pi-angle-right" aria-hidden="true"></i>
                        <span aria-current="page">{{ i.codigo }}</span>
                    </nav>

                    <app-galeria-fotos [fotos]="i.fotos" [alt]="tituloAnuncio(i)" [tipo]="i.tipo" [semente]="i.id" />

                    <!-- o que é, onde fica e quanto custa, num cartão só -->
                    <section class="detalhe__valores" aria-labelledby="detalhe-titulo">
                        <header class="detalhe__cabecalho">
                            <div class="detalhe__selos">
                                <span class="detalhe__selo detalhe__selo--forte">{{ finalidadeLabel(i.finalidade) }}</span>
                                <span class="detalhe__selo">{{ i.tipoDescricao }}</span>
                                @if (i.lancamento) {
                                    <span class="detalhe__selo detalhe__selo--novo"><i class="pi pi-sparkles" aria-hidden="true"></i> Imóvel novo</span>
                                }
                            </div>
                            <h1 id="detalhe-titulo" class="detalhe__titulo">{{ tituloAnuncio(i) }}</h1>
                            <a [href]="ancora('local-titulo')" (click)="irPara($event, 'local-titulo')" class="detalhe__endereco">
                                <i class="pi pi-map-marker" aria-hidden="true"></i>
                                <span class="detalhe__endereco-mapa">Ver no mapa</span>
                            </a>
                            <div class="detalhe__meta">
                                <span
                                    >Código <strong>{{ i.codigo }}</strong></span
                                >
                                <span aria-hidden="true">·</span>
                                <span>Publicado {{ i.criadoEm | tempoAtras }}</span>
                                <span class="detalhe__compartilhar">
                                    <button type="button" class="detalhe__icone-acao" (click)="copiarLink()" aria-label="Copiar link do anúncio" title="Copiar link"><i class="pi pi-link" aria-hidden="true"></i></button>
                                    <a [href]="linkWhatsapp()" target="_blank" rel="noopener" class="detalhe__icone-acao" aria-label="Compartilhar no WhatsApp" title="Compartilhar no WhatsApp"><i class="pi pi-whatsapp" aria-hidden="true"></i></a>
                                </span>
                            </div>
                        </header>

                        <div class="detalhe__preco-linha">
                            <div class="detalhe__valor-principal">
                                <span class="detalhe__rotulo">{{ rotuloPreco() }}</span>
                                <span class="detalhe__preco">{{ i.preco | preco: i.finalidade }}</span>
                            </div>
                            @if (i.condominio || i.iptu || (i.finalidade === 'VENDA' && i.areaUtil)) {
                                <dl class="detalhe__custos">
                                    @if (i.condominio) {
                                        <div>
                                            <dt>Condomínio</dt>
                                            <dd>{{ i.condominio | preco }}<small>/mês</small></dd>
                                        </div>
                                    }
                                    @if (i.iptu) {
                                        <div>
                                            <dt>IPTU</dt>
                                            <dd>{{ i.iptu | preco }}</dd>
                                        </div>
                                    }
                                    @if (i.finalidade === 'VENDA' && i.areaUtil) {
                                        <div>
                                            <dt>Valor do m²</dt>
                                            <dd>{{ i.preco | valorM2: i.areaUtil }}</dd>
                                        </div>
                                    }
                                </dl>
                            }
                        </div>
                        @if (i.aceitaFinanciamento || i.aceitaFgts || i.aceitaPermuta) {
                            <ul class="detalhe__condicoes" aria-label="Formas de pagamento aceitas">
                                @if (i.aceitaFinanciamento) {
                                    <li><i class="pi pi-wallet" aria-hidden="true"></i> Aceita financiamento</li>
                                }
                                @if (i.aceitaFgts) {
                                    <li><i class="pi pi-check" aria-hidden="true"></i> Aceita FGTS</li>
                                }
                                @if (i.aceitaPermuta) {
                                    <li><i class="pi pi-sync" aria-hidden="true"></i> Aceita permuta</li>
                                }
                            </ul>
                        }
                        <div class="detalhe__contato-rapido">
                            <app-telefone-anunciante class="contents" [imovelId]="i.id" [anunciante]="i.anunciante" variante="botao" />
                            <a [href]="ancora('contato')" (click)="irPara($event, 'contato')" class="botao-contorno justify-center"><i class="pi pi-envelope" aria-hidden="true"></i> Enviar mensagem</a>
                        </div>
                    </section>

                    <!-- 3. como é: números principais -->
                    @if (ficha().length) {
                        <section aria-labelledby="ficha-titulo">
                            <h2 id="ficha-titulo" class="sr-only">Principais características</h2>
                            <dl class="detalhe__ficha">
                                @for (f of ficha(); track f.rotulo) {
                                    <div>
                                        <i class="pi {{ f.icone }}" aria-hidden="true"></i>
                                        <dt>{{ f.rotulo }}</dt>
                                        <dd>{{ f.valor }}</dd>
                                    </div>
                                }
                            </dl>
                        </section>
                    }

                    <section class="bloco" aria-labelledby="desc-titulo">
                        <h2 id="desc-titulo">Descrição</h2>
                        @if (i.titulo) {
                            <h3 class="detalhe__descricao-titulo">{{ i.titulo }}</h3>
                        }
                        <div class="detalhe__descricao" [class.recolhida]="!descricaoAberta()">{{ i.descricao || 'O anunciante ainda não escreveu uma descrição.' }}</div>
                        @if (i.descricao) {
                            <button type="button" class="text-primary font-semibold mt-2" (click)="descricaoAberta.set(!descricaoAberta())" [attr.aria-expanded]="descricaoAberta()">
                                {{ descricaoAberta() ? 'Ver menos' : 'Ver mais' }} <i class="pi" [class.pi-angle-up]="descricaoAberta()" [class.pi-angle-down]="!descricaoAberta()" aria-hidden="true"></i>
                            </button>
                        }
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

                    <section class="bloco" aria-labelledby="doc-titulo">
                        <h2 id="doc-titulo">Documentação e condições</h2>
                        <ul class="lista-doc">
                            @for (d of documentacao; track d.campo) {
                                @let sim = !!i[d.campo];
                                <li [class.sim]="sim">
                                    <i class="pi" [class.pi-check-circle]="sim" [class.pi-minus-circle]="!sim" aria-hidden="true"></i>
                                    <span>
                                        <strong>{{ d.label }}</strong>
                                        <span class="lista-doc__status">{{ sim ? 'Sim' : 'Não' }}</span>
                                        <span class="block text-xs text-muted-color">{{ d.dica }}</span>
                                    </span>
                                </li>
                            }
                        </ul>
                    </section>

                    <section class="bloco" aria-labelledby="local-titulo">
                        <h2 id="local-titulo">Localização</h2>
                        <p class="detalhe__endereco-completo">
                            <i class="pi pi-map-marker" aria-hidden="true"></i>
                            <span>
                                @if (i.endereco) {
                                    <strong class="block">{{ i.endereco }}{{ i.numero ? ', ' + i.numero : '' }}</strong>
                                }
                                {{ i.bairro }}, {{ i.cidade }}/{{ i.uf }}{{ i.cep ? ' · CEP ' + (i.cep | cep) : '' }}
                            </span>
                        </p>
                        @if (pontos().length) {
                            <app-mapa-osm [pontos]="pontos()" [cliqueParaCarregar]="true" altura="320px" />
                        } @else {
                            <p class="text-muted-color">O anunciante não informou a posição no mapa.</p>
                        }
                    </section>
                </div>

                <aside class="detalhe__lateral" aria-label="Contato">
                    <div class="grid grid-cols-1 gap-2 mb-3">
                        <button type="button" class="botao-contorno justify-center" (click)="favoritar()" [attr.aria-pressed]="favorito()">
                            <i class="pi" [class.pi-heart-fill]="favorito()" [class.pi-heart]="!favorito()" aria-hidden="true"></i> {{ favorito() ? 'Favoritado' : 'Favoritar' }}
                        </button>
                    </div>
                    @if (i.aceitaFinanciamento) {
                        <div class="selo-lateral-financiamento"><i class="pi pi-wallet" aria-hidden="true"></i> Aceita financiamento{{ i.aceitaFgts ? ' e FGTS' : '' }}</div>
                    }
                    <div class="caixa-contato" id="contato">
                        @if (i.anunciante; as a) {
                            <div class="flex items-center gap-3 mb-3">
                                <app-anunciante-foto [nome]="a.nome" [foto]="a.fotoUrl" [grande]="true" />
                                <div>
                                    <div class="font-semibold">{{ a.nome }}</div>
                                    <div class="text-xs text-muted-color">Creci: {{ a.creci || '—' }}</div>
                                </div>
                            </div>
                        }
                        <h2 class="text-base font-semibold text-center mb-3">Contate o anunciante</h2>
                        @if (previa()) {
                            <p class="text-sm text-muted-color text-center m-0">O formulário de contato fica disponível quando o anúncio estiver no ar.</p>
                        } @else {
                            <app-contato-form [imovelId]="i.id" />
                        }
                        <app-telefone-anunciante class="block mt-4" [imovelId]="i.id" [anunciante]="i.anunciante" />
                    </div>
                    @if (!previa()) {
                        <button type="button" class="detalhe__denunciar" (click)="denunciaAberta.set(true)"><i class="pi pi-flag" aria-hidden="true"></i> Denunciar anúncio</button>
                    }
                </aside>
            </div>

            <app-denunciar-dialog [imovelId]="i.id" [codigo]="i.codigo" [(visivel)]="denunciaAberta" />

            @if (similares().length) {
                <section class="site-container secao" aria-labelledby="similares-titulo">
                    <h2 id="similares-titulo" class="secao__titulo mb-4">Imóveis similares</h2>
                    <div class="grade-cards">
                        @for (s of similares(); track s.id) {
                            <app-imovel-card-mini [imovel]="s" [usarNovaJanela]="true" />
                        }
                    </div>
                </section>
            }
        }
    `
})
export class DetalhePage {
    private imoveis = inject(ImovelService);
    private gestao = inject(GestaoAnunciosService);
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
    /** Anúncio fora do ar (suspenso, pausado…) aberto pela moderação ou pelo dono. */
    previa = computed(() => {
        const s = this.imovel()?.status;
        return !!s && s !== 'ATIVO';
    });
    ehAdmin = computed(() => this.auth.perfil() === 'ADMIN');
    statusLabel = (s: ImovelDetalhe['status']) => statusInfo(s).label.replace(/\s*\(.*\)$/, '');
    descricaoAberta = signal(false);
    denunciaAberta = signal(false);
    finalidadeLabel = finalidadeLabel;
    tituloAnuncio = tituloAnuncio;
    documentacao = DOCUMENTACAO;

    favorito = computed(() => this.conta.favoritos().has(Number(this.id())));
    rotuloPreco = computed(() => {
        const f = this.imovel()?.finalidade;
        return f === 'ALUGUEL' ? 'Aluguel' : f === 'TEMPORADA' ? 'Diária' : 'Valor de venda';
    });
    /** Números principais do imóvel, em cartões com ícone (só os informados). */
    ficha = computed(() => {
        const i = this.imovel();
        if (!i) return [];
        const m2 = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' m²';
        const itens: { icone: string; valor: string; rotulo: string }[] = [];
        if (i.areaUtil) itens.push({ icone: 'pi-expand', valor: m2(i.areaUtil), rotulo: 'Área útil' });
        if (i.areaTotal && i.areaTotal !== i.areaUtil) itens.push({ icone: 'pi-th-large', valor: m2(i.areaTotal), rotulo: 'Área total' });
        if (i.quartos) itens.push({ icone: 'pi-moon', valor: String(i.quartos), rotulo: i.quartos === 1 ? 'Quarto' : 'Quartos' });
        if (i.suites) itens.push({ icone: 'pi-star', valor: String(i.suites), rotulo: i.suites === 1 ? 'Suíte' : 'Suítes' });
        if (i.banheiros) itens.push({ icone: 'pi-inbox', valor: String(i.banheiros), rotulo: i.banheiros === 1 ? 'Banheiro' : 'Banheiros' });
        if (i.vagas) itens.push({ icone: 'pi-car', valor: String(i.vagas), rotulo: i.vagas === 1 ? 'Vaga' : 'Vagas' });
        return itens;
    });
    pontos = computed<PontoMapa[]>(() => {
        const i = this.imovel();
        return i?.latitude != null && i.longitude != null ? [{ id: i.id, lat: i.latitude, lng: i.longitude, titulo: `${i.tipoDescricao} · ${finalidadeLabel(i.finalidade)}`, subtitulo: tituloAnuncio(i) }] : [];
    });
    rotaFinalidade = computed(() => {
        const i = this.imovel();
        return i?.lancamento ? '/imovel-novo' : i?.finalidade === 'ALUGUEL' ? '/aluguel' : i?.finalidade === 'TEMPORADA' ? '/temporada' : '/venda';
    });
    linkWhatsapp = computed(() => {
        const i = this.imovel();
        return 'https://wa.me/?text=' + encodeURIComponent((i ? tituloAnuncio(i) + ' ' : '') + location.href);
    });

    constructor() {
        effect(() => {
            const id = Number(this.id());
            this.imovel.set(null);
            this.erro.set(false);
            this.imoveis.detalhe(id).subscribe({
                next: (i) => {
                    this.imovel.set(i);
                    this.config.definirTitulo(tituloAnuncio(i));
                },
                // fora do ar a consulta pública não acha: a moderação e o dono veem a prévia pela área de gestão
                error: () => this.carregarPrevia(id)
            });
            this.imoveis.similares(id).subscribe({ next: (s) => this.similares.set(s), error: () => this.similares.set([]) });
        });
    }

    private carregarPrevia(id: number) {
        const perfil = this.auth.perfil();
        const area = perfil === 'ADMIN' ? 'admin' : perfil === 'CORRETOR' ? 'corretor' : null;
        if (!this.auth.logado() || !area) {
            this.erro.set(true);
            return;
        }
        this.gestao.obter(area, id).subscribe({
            next: (i) => {
                this.imovel.set(i);
                this.config.definirTitulo('Prévia: ' + tituloAnuncio(i));
            },
            error: () => this.erro.set(true)
        });
    }

    /** Endereço da própria página com o fragmento (o <base href="/"> faria "#x" apontar para a home). */
    ancora(id: string) {
        return this.router.url.split('#')[0] + '#' + id;
    }

    /** Rola até a seção (respeitando o scroll-margin do cabeçalho fixo) e leva o foco para ela. */
    irPara(e: Event, id: string) {
        const alvo = document.getElementById(id);
        if (!alvo) return;
        e.preventDefault();
        const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        alvo.scrollIntoView({ behavior: reduzido ? 'auto' : 'smooth', block: 'start' });
        if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1');
        alvo.focus({ preventScroll: true });
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
