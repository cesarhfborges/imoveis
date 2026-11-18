import { Component, computed, effect, inject, signal } from '@angular/core';
import { DOCUMENT, DatePipe } from '@angular/common';
import { MessageService } from 'primeng/api';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { AnunciantePerfil, ImovelResumo } from '@/app/core/models/models';
import { AnuncianteService } from '@/app/core/services/anunciante.service';
import { ImovelService } from '@/app/core/services/imovel.service';
import { ConfigService } from '@/app/core/services/config.service';
import { TelefoneAnuncianteService } from '@/app/core/services/telefone-anunciante.service';
import { CepPipe, PrecoPipe, digitos, slug } from '@/app/core/pipes/formatos';
import { MapaOsm, PontoMapa } from '@/app/shared/components/mapa-osm';
import { ImovelCardMini } from '@/app/shared/components/imovel-card-mini';
import { TelefoneAnunciante } from '@/app/shared/components/telefone-anunciante';
import { EmptyState } from '@/app/shared/components/empty-state';
import { iniciaisDe } from '@/app/shared/components/avatar';

const POR_PAGINA = 12;

/** /anunciante/:id/:slug — perfil público de corretor ou imobiliária, com contato, endereço no mapa e anúncios. */
@Component({
    selector: 'app-anunciante-perfil-page',
    imports: [DatePipe, RouterLink, SkeletonModule, MapaOsm, ImovelCardMini, TelefoneAnunciante, EmptyState, CepPipe],
    template: `
        <div class="site-container py-4">
            <nav class="text-sm mb-3" aria-label="Você está em">
                <a routerLink="/imobiliarias" class="voltar"><i class="pi pi-arrow-left" aria-hidden="true"></i>Imobiliárias e corretores</a>
            </nav>

            @if (naoEncontrado()) {
                <app-empty-state titulo="Perfil não encontrado" texto="Este perfil não existe ou não está mais público." icone="pi-user-minus">
                    <a routerLink="/imobiliarias" class="botao-contorno">Ver imobiliárias e corretores</a>
                </app-empty-state>
            } @else if (!perfil()) {
                <p-skeleton height="16rem" styleClass="mb-4" borderRadius="16px" />
                <p-skeleton height="20rem" borderRadius="16px" />
            } @else {
                @let p = perfil()!;
                <!-- capa: identidade, ações e números -->
                <section class="capa entra" aria-labelledby="perfil-nome">
                    <div class="capa__fundo" [class.capa__fundo--imagem]="!!p.capaUrl && !capaFalhou()" aria-hidden="true">
                        @if (p.capaUrl && !capaFalhou()) {
                            <img class="capa__img" [src]="p.capaUrl" alt="" (error)="capaFalhou.set(true)" />
                        }
                    </div>
                    <div class="capa__corpo">
                        <div class="capa__logo" aria-hidden="true">
                            @if (p.fotoUrl && !fotoFalhou()) {
                                <img [src]="p.fotoUrl" alt="" (error)="fotoFalhou.set(true)" />
                            } @else {
                                <span>{{ iniciais() }}</span>
                            }
                        </div>
                        <div class="capa__ident">
                            <span class="selo"><i [class]="p.tipo === 'IMOBILIARIA' ? 'pi pi-building' : 'pi pi-id-card'" aria-hidden="true"></i>{{ p.tipo === 'IMOBILIARIA' ? 'Imobiliária' : 'Corretor(a) de imóveis' }}</span>
                            <h1 id="perfil-nome" class="capa__nome">{{ p.nome }}</h1>
                            @if (p.razaoSocial) {
                                <div class="capa__razao">{{ p.razaoSocial }}</div>
                            }
                            @if (p.cidade) {
                                <div class="capa__local"><i class="pi pi-map-marker" aria-hidden="true"></i>{{ p.bairro ? p.bairro + ', ' : '' }}{{ p.cidade }}/{{ p.uf }}</div>
                            }
                        </div>
                        <div class="capa__acoes">
                            @if (whatsapp(); as w) {
                                <a [href]="'https://wa.me/55' + w" target="_blank" rel="noopener" class="acao acao--whats"><i class="pi pi-whatsapp" aria-hidden="true"></i>WhatsApp<span class="sr-only"> (abre em nova aba)</span></a>
                            }
                            <button type="button" class="acao acao--primaria" (click)="irParaImoveis()"><i class="pi pi-home" aria-hidden="true"></i>Ver imóveis</button>
                            <button type="button" class="acao acao--icone" (click)="compartilhar()" aria-label="Compartilhar este perfil" title="Compartilhar"><i class="pi pi-share-alt" aria-hidden="true"></i></button>
                        </div>
                    </div>

                    <ul class="numeros" aria-label="Resumo">
                        <li class="numero">
                            <span class="numero__icone"><i class="pi pi-home" aria-hidden="true"></i></span>
                            <span
                                ><strong>{{ p.totalAnuncios }}</strong
                                ><small>{{ p.totalAnuncios === 1 ? 'imóvel anunciado' : 'imóveis anunciados' }}</small></span
                            >
                        </li>
                        @if (anos()) {
                            <li class="numero">
                                <span class="numero__icone"><i class="pi pi-briefcase" aria-hidden="true"></i></span>
                                <span
                                    ><strong>{{ anos() }}</strong
                                    ><small>{{ anos() === 1 ? 'ano de atuação' : 'anos de atuação' }}</small></span
                                >
                            </li>
                        }
                        @if (p.creci) {
                            <li class="numero">
                                <span class="numero__icone"><i class="pi pi-verified" aria-hidden="true"></i></span>
                                <span
                                    ><strong>{{ p.creci }}</strong
                                    ><small>CRECI{{ p.creciUf ? '-' + p.creciUf : '' }}</small></span
                                >
                            </li>
                        }
                        <li class="numero">
                            <span class="numero__icone"><i class="pi pi-calendar" aria-hidden="true"></i></span>
                            <span
                                ><strong>{{ p.membroDesde | date: 'MM/yyyy' }}</strong
                                ><small>no portal desde</small></span
                            >
                        </li>
                    </ul>
                </section>

                <div class="perfil-pub">
                    <div class="perfil-pub__principal">
                        @if (p.sobre || regioes().length) {
                            <section class="cartao entra" style="--atraso: 1" aria-labelledby="perfil-sobre">
                                <h2 id="perfil-sobre" class="cartao__titulo">
                                    <span class="cartao__icone"><i class="pi pi-user" aria-hidden="true"></i></span>Sobre {{ p.tipo === 'IMOBILIARIA' ? 'a imobiliária' : 'o(a) corretor(a)' }}
                                </h2>
                                @if (p.sobre) {
                                    <p class="sobre">{{ p.sobre }}</p>
                                }
                                @if (regioes().length) {
                                    <div class="regioes">
                                        <h3 class="regioes__titulo">Regiões de atuação</h3>
                                        <ul class="regioes__lista">
                                            @for (r of regioes(); track r) {
                                                <li><i class="pi pi-map-marker" aria-hidden="true"></i>{{ r }}</li>
                                            }
                                        </ul>
                                    </div>
                                }
                            </section>
                        }

                        @if (pontosImoveis().length) {
                            <!-- só os imóveis deste anunciante, enquadrados no mapa -->
                            <section class="cartao entra" style="--atraso: 2" aria-labelledby="perfil-mapa">
                                <div class="cartao__topo">
                                    <h2 id="perfil-mapa" class="cartao__titulo m-0">
                                        <span class="cartao__icone"><i class="pi pi-map" aria-hidden="true"></i></span>Onde estão os imóveis
                                    </h2>
                                    <span class="contador">{{ pontosImoveis().length }} no mapa</span>
                                </div>
                                <p class="cartao__dica">Clique num pino para ver o preço e abrir o anúncio.</p>
                                <div class="mapa-moldura">
                                    <app-mapa-osm [pontos]="pontosImoveis()" altura="380px" />
                                </div>
                            </section>
                        }

                        <section aria-labelledby="perfil-anuncios">
                            <h2 id="perfil-anuncios" class="perfil-pub__titulo">Imóveis de {{ p.nome }}</h2>
                            @if (carregandoImoveis() && !imoveis().length) {
                                <div class="perfil-pub__grade">
                                    @for (i of [1, 2, 3]; track i) {
                                        <p-skeleton height="260px" />
                                    }
                                </div>
                            } @else if (!imoveis().length) {
                                <app-empty-state titulo="Nenhum imóvel no ar" texto="Este anunciante não tem anúncios publicados no momento." icone="pi-home" />
                            } @else {
                                <div class="perfil-pub__grade" aria-live="polite">
                                    <!-- cada lote entra em cascata; os cards que já estavam não se mexem (track por id) -->
                                    @for (i of imoveis(); track i.id; let n = $index) {
                                        <app-imovel-card-mini class="card-entra" [imovel]="i" [style.--ordem]="n - inicioLote()" />
                                    }
                                    @if (carregandoImoveis()) {
                                        @for (k of [1, 2, 3, 4]; track k) {
                                            <p-skeleton height="260px" styleClass="card-carregando" />
                                        }
                                    }
                                </div>
                                @if (temMais()) {
                                    <div class="flex justify-center mt-4">
                                        <button type="button" class="botao-contorno botao-contorno--grande" [disabled]="carregandoImoveis()" (click)="carregarMais()">
                                            <i [class]="carregandoImoveis() ? 'pi pi-spin pi-spinner' : 'pi pi-plus'" aria-hidden="true"></i> Ver mais imóveis
                                        </button>
                                    </div>
                                }
                            }
                        </section>
                    </div>

                    <aside class="perfil-pub__lado" aria-label="Contato e endereço">
                        <section class="cartao cartao--contato entra" style="--atraso: 1" aria-labelledby="perfil-contato">
                            <div class="contato__faixa" aria-hidden="true"></div>
                            <h2 id="perfil-contato" class="cartao__titulo">
                                <span class="cartao__icone"><i class="pi pi-comments" aria-hidden="true"></i></span>Fale com {{ primeiroNome() }}
                            </h2>
                            <div class="flex flex-col gap-2">
                                <app-telefone-anunciante [anuncianteId]="p.id" [anunciante]="p" />
                                @if (whatsapp(); as w) {
                                    <a [href]="'https://wa.me/55' + w" target="_blank" rel="noopener" class="contato__linha contato__linha--whats"
                                        ><i class="pi pi-whatsapp" aria-hidden="true"></i><span>Conversar no WhatsApp</span><i class="pi pi-external-link contato__seta" aria-hidden="true"></i><span class="sr-only"> (abre em nova aba)</span></a
                                    >
                                }
                                @if (p.emailContato) {
                                    <a [href]="'mailto:' + p.emailContato" class="contato__linha"
                                        ><i class="pi pi-envelope" aria-hidden="true"></i><span class="truncate">{{ p.emailContato }}</span
                                        ><i class="pi pi-angle-right contato__seta" aria-hidden="true"></i
                                    ></a>
                                }
                            </div>
                            @if (p.site || p.instagram || p.facebook) {
                                <div class="redes">
                                    <span class="redes__rotulo">Na internet</span>
                                    <div class="redes__botoes">
                                        @if (p.site) {
                                            <a [href]="p.site" target="_blank" rel="noopener" class="rede rede--site" title="Site"><i class="pi pi-globe" aria-hidden="true"></i><span class="sr-only">Site (abre em nova aba)</span></a>
                                        }
                                        @if (p.instagram) {
                                            <a [href]="'https://instagram.com/' + p.instagram" target="_blank" rel="noopener" class="rede rede--instagram" title="Instagram"
                                                ><i class="pi pi-instagram" aria-hidden="true"></i><span class="sr-only">Instagram (abre em nova aba)</span></a
                                            >
                                        }
                                        @if (p.facebook) {
                                            <a [href]="linkFacebook(p.facebook)" target="_blank" rel="noopener" class="rede rede--facebook" title="Facebook"
                                                ><i class="pi pi-facebook" aria-hidden="true"></i><span class="sr-only">Facebook (abre em nova aba)</span></a
                                            >
                                        }
                                    </div>
                                </div>
                            }
                        </section>

                        <section class="cartao entra" style="--atraso: 2" aria-labelledby="perfil-endereco">
                            <h2 id="perfil-endereco" class="cartao__titulo">
                                <span class="cartao__icone"><i class="pi pi-map-marker" aria-hidden="true"></i></span>{{ p.tipo === 'IMOBILIARIA' ? 'Onde estamos' : 'Endereço comercial' }}
                            </h2>
                            <address class="endereco">
                                <strong>{{ p.logradouro }}{{ p.numero ? ', ' + p.numero : '' }}</strong>
                                @if (p.complemento) {
                                    <span>{{ p.complemento }}</span>
                                }
                                <span>{{ p.bairro }} · {{ p.cidade }}/{{ p.uf }}</span>
                                @if (p.cep) {
                                    <span class="text-muted-color">CEP {{ p.cep | cep }}</span>
                                }
                            </address>
                            @if (ponto().length) {
                                <div class="mapa-moldura mt-3">
                                    <app-mapa-osm [pontos]="ponto()" [cliqueParaCarregar]="true" altura="200px" />
                                </div>
                                <a [href]="rota()" target="_blank" rel="noopener" class="contato__linha mt-3"
                                    ><i class="pi pi-directions" aria-hidden="true"></i><span>Como chegar</span><i class="pi pi-external-link contato__seta" aria-hidden="true"></i><span class="sr-only"> (abre em nova aba)</span></a
                                >
                            }
                        </section>
                    </aside>
                </div>
            }
        </div>
    `,
    styles: `
        :host {
            --raio-cartao: 16px;
            --sombra-cartao: 0 1px 2px rgb(0 0 0 / 0.04), 0 4px 16px rgb(0 0 0 / 0.04);
            --sombra-elevada: 0 2px 4px rgb(0 0 0 / 0.05), 0 12px 28px color-mix(in srgb, var(--p-primary-color), transparent 86%);
        }
        .voltar {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            color: var(--p-primary-color);
            font-weight: 500;
            text-decoration: none;
        }
        .voltar i {
            font-size: 0.75rem;
            transition: transform 0.2s;
        }
        .voltar:hover i {
            transform: translateX(-3px);
        }

        /* ------------------------------------------------ entrada em cascata */
        .entra {
            animation: entrar 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both;
            animation-delay: calc(var(--atraso, 0) * 90ms);
        }
        @keyframes entrar {
            from {
                opacity: 0;
                transform: translateY(14px);
            }
        }

        /* ------------------------------------------------ capa */
        .capa {
            position: relative;
            overflow: hidden;
            margin-bottom: 1.25rem;
            border: 1px solid var(--site-borda);
            border-radius: var(--raio-cartao);
            background: var(--site-cartao);
            box-shadow: var(--sombra-cartao);
        }
        .capa__fundo {
            height: 9.5rem;
            background:
                radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.16) 1px, transparent 0) 0 0 / 18px 18px,
                radial-gradient(120% 140% at 85% -20%, color-mix(in srgb, var(--p-primary-400, var(--p-primary-color)), transparent 10%), transparent 60%),
                linear-gradient(120deg, var(--p-primary-color), color-mix(in srgb, var(--p-primary-color), #000 35%));
            position: relative;
        }
        /* no tema escuro a cor principal é clara: a capa fica mais fechada */
        :host-context(.app-dark) .capa__fundo {
            background:
                radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.1) 1px, transparent 0) 0 0 / 18px 18px,
                radial-gradient(120% 140% at 85% -20%, color-mix(in srgb, var(--p-primary-color), transparent 55%), transparent 60%),
                linear-gradient(120deg, color-mix(in srgb, var(--p-primary-color), #000 45%), color-mix(in srgb, var(--p-primary-color), #000 75%));
        }
        /*
         * capa enviada pelo anunciante: 8:1, a mesma proporção do recorte (RECORTES.capaPerfil), para aparecer
         * do jeito que foi enquadrada no editor. Em telas estreitas a faixa ficaria mais baixa que a logo:
         * aí ganha altura mínima e mostra o centro da imagem (corta um pouco das laterais).
         */
        .capa__fundo--imagem,
        :host-context(.app-dark) .capa__fundo--imagem {
            height: auto;
            aspect-ratio: 8 / 1;
            background: var(--p-surface-300);
        }
        /* abaixo de ~870 px a faixa 8:1 ficaria mais baixa que 6.5rem: altura fixa, imagem centralizada */
        @media (max-width: 870px) {
            .capa__fundo--imagem,
            :host-context(.app-dark) .capa__fundo--imagem {
                aspect-ratio: auto;
                height: 6.5rem;
            }
        }
        .capa__img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            animation: aparecer 0.6s ease both;
        }
        .capa__fundo--imagem::before {
            content: '';
            position: absolute;
            inset: 0;
            z-index: 1;
            background: linear-gradient(to top, rgb(0 0 0 / 0.2), transparent 35%);
        }
        @keyframes aparecer {
            from {
                opacity: 0;
                transform: scale(1.03);
            }
        }
        /* brilho que atravessa a capa devagar */
        .capa__fundo::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(100deg, transparent 30%, rgb(255 255 255 / 0.12) 50%, transparent 70%);
            background-size: 250% 100%;
            animation: brilho 7s ease-in-out infinite;
        }
        @keyframes brilho {
            0% {
                background-position: 120% 0;
            }
            60%,
            100% {
                background-position: -120% 0;
            }
        }
        /* só a logo invade a capa; nome e ações ficam abaixo dela, sobre o fundo claro */
        .capa__corpo {
            display: flex;
            flex-wrap: wrap;
            align-items: flex-start;
            gap: 1rem 1.25rem;
            padding: 1rem 1.5rem 1.25rem;
            position: relative;
        }
        .capa__logo {
            flex: none;
            display: grid;
            place-items: center;
            width: 7.5rem;
            height: 7.5rem;
            margin-top: -4.75rem;
            border-radius: 999px;
            overflow: hidden;
            background: var(--p-primary-color);
            border: 5px solid var(--site-cartao);
            box-shadow: 0 6px 20px rgb(0 0 0 / 0.18);
            transition:
                transform 0.3s,
                box-shadow 0.3s;
            z-index: 9;
        }
        .capa__logo:hover {
            transform: scale(1.04) rotate(-2deg);
            box-shadow: 0 10px 28px rgb(0 0 0 / 0.22);
        }
        .capa__logo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .capa__logo span {
            font-size: 2.4rem;
            font-weight: 800;
            color: var(--p-primary-contrast-color);
        }
        .capa__ident {
            flex: 1;
            min-width: 14rem;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.3rem;
        }
        .selo {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.2rem 0.65rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--p-primary-color);
            background: color-mix(in srgb, var(--p-primary-color), transparent 88%);
        }
        .capa__nome {
            margin: 0;
            font-size: clamp(1.4rem, 3vw, 1.9rem);
            font-weight: 800;
            line-height: 1.15;
            letter-spacing: -0.01em;
            color: var(--p-text-color);
        }
        .capa__razao {
            font-size: 0.85rem;
            color: var(--p-text-muted-color);
        }
        .capa__local {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            font-size: 0.9rem;
            color: var(--p-text-muted-color);
        }
        .capa__acoes {
            display: flex;
            flex-wrap: wrap;
            align-self: center;
            gap: 0.5rem;
        }
        .acao {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.45rem;
            height: 2.6rem;
            padding: 0 1.1rem;
            border-radius: 999px;
            border: 1px solid transparent;
            font: inherit;
            font-size: 0.9rem;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition:
                transform 0.15s,
                box-shadow 0.2s,
                background-color 0.2s,
                color 0.2s;
        }
        .acao:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgb(0 0 0 / 0.14);
        }
        .acao:focus-visible,
        .rede:focus-visible,
        .contato__linha:focus-visible {
            outline: 2px solid var(--p-primary-color);
            outline-offset: 2px;
        }
        .acao--primaria {
            background: var(--p-primary-color);
            color: var(--p-primary-contrast-color);
        }
        .acao--whats {
            background: #16a34a;
            color: #fff;
        }
        .acao--icone {
            width: 2.6rem;
            padding: 0;
            background: var(--site-cartao);
            border-color: var(--site-borda);
            color: var(--p-text-color);
        }

        /* números */
        .numeros {
            list-style: none;
            margin: 0;
            padding: 1rem 1.5rem 1.25rem;
            display: grid;
            gap: 0.75rem;
            grid-template-columns: repeat(auto-fit, minmax(min(10.5rem, 100%), 1fr));
            border-top: 1px solid var(--site-borda);
        }
        .numero {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.7rem 0.85rem;
            border-radius: 12px;
            background: color-mix(in srgb, var(--p-primary-color), transparent 95%);
            transition:
                transform 0.2s,
                background-color 0.2s;
        }
        .numero:hover {
            transform: translateY(-2px);
            background: color-mix(in srgb, var(--p-primary-color), transparent 90%);
        }
        .numero__icone {
            flex: none;
            display: grid;
            place-items: center;
            width: 2.4rem;
            height: 2.4rem;
            border-radius: 10px;
            color: var(--p-primary-contrast-color);
            background: linear-gradient(135deg, var(--p-primary-color), color-mix(in srgb, var(--p-primary-color), #000 25%));
            box-shadow: 0 4px 10px color-mix(in srgb, var(--p-primary-color), transparent 70%);
        }
        .numero strong {
            display: block;
            font-size: 1.15rem;
            line-height: 1.15;
            color: var(--p-text-color);
        }
        .numero small {
            font-size: 0.75rem;
            color: var(--p-text-muted-color);
        }

        /* ------------------------------------------------ colunas */
        .perfil-pub {
            display: grid;
            gap: 1.25rem;
            grid-template-columns: minmax(0, 1fr);
        }
        @media (min-width: 992px) {
            .perfil-pub {
                grid-template-columns: minmax(0, 1fr) 23rem;
                align-items: start;
            }
            .perfil-pub__lado {
                position: sticky;
                top: calc(var(--cabecalho-altura, 4rem) + 1rem);
            }
        }
        .perfil-pub__principal,
        .perfil-pub__lado {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
            min-width: 0;
        }

        /* ------------------------------------------------ cartões */
        .cartao {
            position: relative;
            padding: 1.25rem;
            border: 1px solid var(--site-borda);
            border-radius: var(--raio-cartao);
            background: var(--site-cartao);
            box-shadow: var(--sombra-cartao);
            transition:
                box-shadow 0.25s,
                border-color 0.25s;
        }
        .cartao:hover {
            box-shadow: var(--sombra-elevada);
            border-color: color-mix(in srgb, var(--p-primary-color), transparent 70%);
        }
        .cartao__topo {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
        }
        .cartao__titulo {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            margin: 0 0 1rem;
            font-size: 1.05rem;
            font-weight: 700;
        }
        .cartao__icone {
            display: grid;
            place-items: center;
            width: 2.1rem;
            height: 2.1rem;
            border-radius: 10px;
            font-size: 0.95rem;
            color: var(--p-primary-color);
            background: color-mix(in srgb, var(--p-primary-color), transparent 88%);
        }
        .cartao__dica {
            margin: 0.5rem 0 0.9rem;
            font-size: 0.85rem;
            color: var(--p-text-muted-color);
        }
        .contador {
            padding: 0.2rem 0.65rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--p-primary-contrast-color);
            background: var(--p-primary-color);
        }
        .mapa-moldura {
            border-radius: 12px;
            overflow: hidden;
        }
        .sobre {
            margin: 0;
            white-space: pre-line;
            line-height: 1.7;
            font-size: 0.97rem;
        }
        .regioes {
            margin-top: 1.1rem;
            padding-top: 1rem;
            border-top: 1px dashed var(--site-borda);
        }
        .regioes__titulo {
            margin: 0 0 0.6rem;
            font-size: 0.8rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--p-text-muted-color);
        }
        .regioes__lista {
            list-style: none;
            margin: 0;
            padding: 0;
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        .regioes__lista li {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.35rem 0.8rem;
            border-radius: 999px;
            font-size: 0.85rem;
            border: 1px solid color-mix(in srgb, var(--p-primary-color), transparent 75%);
            background: color-mix(in srgb, var(--p-primary-color), transparent 94%);
            transition:
                transform 0.15s,
                background-color 0.2s;
        }
        .regioes__lista li:hover {
            transform: translateY(-1px);
            background: color-mix(in srgb, var(--p-primary-color), transparent 88%);
        }
        .regioes__lista i {
            font-size: 0.75rem;
            color: var(--p-primary-color);
        }

        /* contato */
        .cartao--contato {
            overflow: hidden;
            padding-top: 1.5rem;
        }
        .contato__faixa {
            position: absolute;
            inset: 0 0 auto;
            height: 4px;
            background: linear-gradient(90deg, var(--p-primary-color), #16a34a);
        }
        .contato__linha {
            display: flex;
            align-items: center;
            gap: 0.65rem;
            padding: 0.7rem 0.85rem;
            border: 1px solid var(--site-borda);
            border-radius: 12px;
            color: var(--p-text-color);
            font-size: 0.9rem;
            font-weight: 500;
            text-decoration: none;
            transition:
                border-color 0.2s,
                background-color 0.2s,
                transform 0.15s;
        }
        .contato__linha > span {
            flex: 1;
            min-width: 0;
        }
        .contato__linha:hover {
            border-color: var(--p-primary-color);
            background: color-mix(in srgb, var(--p-primary-color), transparent 95%);
            transform: translateX(2px);
        }
        .contato__linha > i:first-child {
            color: var(--p-primary-color);
        }
        .contato__seta {
            font-size: 0.75rem;
            color: var(--p-text-muted-color);
        }
        .contato__linha--whats {
            border-color: color-mix(in srgb, #16a34a, transparent 55%);
            background: color-mix(in srgb, #16a34a, transparent 93%);
            font-weight: 600;
        }
        .contato__linha--whats > i:first-child {
            color: #16a34a;
        }
        .contato__linha--whats:hover {
            border-color: #16a34a;
            background: color-mix(in srgb, #16a34a, transparent 88%);
        }
        .redes {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px dashed var(--site-borda);
        }
        .redes__rotulo {
            font-size: 0.8rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--p-text-muted-color);
        }
        .redes__botoes {
            display: flex;
            gap: 0.5rem;
        }
        .rede {
            display: grid;
            place-items: center;
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 999px;
            border: 1px solid var(--site-borda);
            color: var(--p-text-color);
            text-decoration: none;
            transition:
                transform 0.2s,
                background 0.2s,
                color 0.2s,
                border-color 0.2s;
        }
        .rede:hover {
            transform: translateY(-3px);
            color: #fff;
            border-color: transparent;
        }
        .rede--site:hover {
            background: var(--p-primary-color);
        }
        .rede--instagram:hover {
            background: linear-gradient(45deg, #f58529, #dd2a7b 50%, #8134af);
        }
        .rede--facebook:hover {
            background: #1877f2;
        }

        /* endereço */
        .endereco {
            display: flex;
            flex-direction: column;
            gap: 0.15rem;
            font-style: normal;
            font-size: 0.9rem;
            line-height: 1.5;
        }

        /* listagem de imóveis (inalterada) */
        .perfil-pub__titulo {
            font-size: 1.05rem;
            font-weight: 700;
            margin: 0 0 0.75rem;
        }
        .perfil-pub__grade {
            display: grid;
            gap: 1rem;
            grid-template-columns: repeat(auto-fill, minmax(min(14rem, 100%), 1fr));
        }
        /* "Ver mais imóveis": os novos sobem e aparecem em cascata (70 ms entre um e outro) */
        .card-entra {
            display: block;
            animation: card-entrar 0.55s cubic-bezier(0.2, 0.75, 0.25, 1) both;
            animation-delay: calc(var(--ordem, 0) * 70ms);
        }
        @keyframes card-entrar {
            from {
                opacity: 0;
                transform: translateY(24px) scale(0.96);
                filter: blur(2px);
            }
            60% {
                filter: blur(0);
            }
        }
        :host ::ng-deep .card-carregando {
            animation: card-entrar 0.3s ease both;
        }
        @media (prefers-reduced-motion: reduce) {
            .card-entra,
            :host ::ng-deep .card-carregando {
                animation: none;
            }
        }

        @media (max-width: 575px) {
            .capa__corpo {
                padding: 0 1rem 1rem;
                justify-content: center;
                text-align: center;
            }
            .capa__ident {
                align-items: center;
                min-width: 100%;
            }
            .capa__acoes {
                justify-content: center;
                width: 100%;
            }
            .numeros {
                padding: 1rem;
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }
        @media (prefers-reduced-motion: reduce) {
            .entra,
            .capa__fundo::after,
            .capa__img {
                animation: none;
            }
            .capa__logo,
            .acao,
            .numero,
            .cartao,
            .regioes__lista li,
            .contato__linha,
            .rede,
            .voltar i {
                transition: none;
            }
            .capa__logo:hover,
            .acao:hover,
            .numero:hover,
            .regioes__lista li:hover,
            .contato__linha:hover,
            .rede:hover {
                transform: none;
            }
        }
    `
})
export class AnunciantePerfilPage {
    private route = inject(ActivatedRoute);
    private anunciantes = inject(AnuncianteService);
    private imoveisApi = inject(ImovelService);
    private config = inject(ConfigService);
    private revelados = inject(TelefoneAnuncianteService);
    private doc = inject(DOCUMENT);
    private msg = inject(MessageService);

    perfil = signal<AnunciantePerfil | null>(null);
    naoEncontrado = signal(false);
    fotoFalhou = signal(false);
    capaFalhou = signal(false);
    imoveis = signal<ImovelResumo[]>([]);
    carregandoImoveis = signal(false);
    private pagina = 0;
    private totalPaginas = 0;
    temMais = signal(false);
    /** Índice do primeiro card do último lote carregado (base do atraso da animação de entrada). */
    inicioLote = signal(0);
    /** Todos os imóveis no ar do anunciante com posição (o mapa não pagina). */
    private imoveisMapa = signal<ImovelResumo[]>([]);
    private preco = new PrecoPipe();
    pontosImoveis = computed<PontoMapa[]>(() =>
        this.imoveisMapa()
            .filter((i) => i.latitude != null && i.longitude != null)
            .map((i) => ({
                id: i.id,
                lat: i.latitude!,
                lng: i.longitude!,
                titulo: i.titulo,
                subtitulo: `${i.bairro}, ${i.cidade}`,
                preco: this.preco.transform(i.preco, i.finalidade),
                link: `/imovel/${i.id}/${slug(i.titulo)}`
            }))
    );

    iniciais = computed(() => iniciaisDe(this.perfil()?.nome));
    anos = computed(() => {
        const d = this.perfil()?.atuandoDesde;
        return d ? Math.max(new Date().getFullYear() - d, 0) || null : null;
    });
    regioes = computed(() =>
        (this.perfil()?.regioesAtuacao ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
    );
    /** WhatsApp: vem no perfil quando o telefone pode aparecer completo, ou depois do "Ver telefone". */
    whatsapp = computed(() => {
        const p = this.perfil();
        if (!p) return null;
        return digitos(p.whatsapp) || this.revelados.whatsapp({ tipo: 'anunciante', id: p.id })() || null;
    });
    ponto = computed<PontoMapa[]>(() => {
        const p = this.perfil();
        if (!p || p.latitude == null || p.longitude == null) return [];
        return [{ id: p.id, lat: p.latitude, lng: p.longitude, titulo: p.nome, subtitulo: [p.logradouro, p.numero].filter(Boolean).join(', ') }];
    });

    constructor() {
        this.route.paramMap.subscribe((pm) => this.carregar(Number(pm.get('id'))));
        effect(() => {
            const p = this.perfil();
            if (p) this.config.definirTitulo(`${p.nome} · ${p.tipo === 'IMOBILIARIA' ? 'Imobiliária' : 'Corretor'}`);
        });
    }

    private carregar(id: number) {
        this.perfil.set(null);
        this.naoEncontrado.set(false);
        this.fotoFalhou.set(false);
        this.capaFalhou.set(false);
        this.imoveis.set([]);
        this.inicioLote.set(0);
        this.imoveisMapa.set([]);
        this.pagina = 0;
        this.anunciantes.perfil(id).subscribe({
            next: (p) => {
                this.perfil.set(p);
                this.buscarImoveis();
                this.imoveisApi.mapa({ anunciante: p.id }).subscribe({ next: (l) => this.imoveisMapa.set(l), error: () => this.imoveisMapa.set([]) });
            },
            error: () => this.naoEncontrado.set(true)
        });
    }

    carregarMais() {
        // os próximos cards contam a cascata a partir daqui (os já exibidos não animam de novo)
        this.inicioLote.set(this.imoveis().length);
        this.pagina++;
        this.buscarImoveis();
    }

    private buscarImoveis() {
        const p = this.perfil();
        if (!p) return;
        this.carregandoImoveis.set(true);
        this.imoveisApi.buscar({ anunciante: p.id, ordem: 'recentes', page: this.pagina, size: POR_PAGINA }).subscribe({
            next: (r) => {
                this.imoveis.update((l) => [...l, ...r.content]);
                this.totalPaginas = r.totalPages;
                this.temMais.set(this.pagina + 1 < this.totalPaginas);
                this.carregandoImoveis.set(false);
            },
            error: () => this.carregandoImoveis.set(false)
        });
    }

    /** "Corretora Exemplo" → "Corretora"; imobiliária usa o nome todo. */
    primeiroNome = computed(() => {
        const p = this.perfil();
        if (!p) return '';
        return p.tipo === 'IMOBILIARIA' ? p.nome : p.nome.split(' ')[0];
    });

    /** "Como chegar": rota até o endereço no Google Maps. */
    rota = computed(() => {
        const p = this.perfil();
        return p?.latitude != null && p.longitude != null ? `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}` : null;
    });

    irParaImoveis() {
        const reduzir = !!this.doc.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.doc.getElementById('perfil-anuncios')?.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' });
    }

    /** Compartilhar: menu nativo do celular; no computador, copia o link. */
    async compartilhar() {
        const p = this.perfil();
        if (!p) return;
        const url = this.doc.location.href;
        const nav = this.doc.defaultView?.navigator;
        try {
            if (nav?.share) {
                await nav.share({ title: p.nome, text: `${p.nome} no portal`, url });
                return;
            }
            await nav?.clipboard.writeText(url);
            this.msg.add({ severity: 'success', summary: 'Link copiado', detail: 'O endereço deste perfil foi copiado.' });
        } catch {
            /* cancelou o compartilhamento */
        }
    }

    linkFacebook(f: string): string {
        return /^https?:\/\//i.test(f) ? f : `https://facebook.com/${f.replace(/^(www\.)?facebook\.com\//i, '')}`;
    }
}
