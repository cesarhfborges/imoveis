import { Avatar } from '@/app/shared/components/avatar';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { AppLogo } from '@/app/shared/components/app-logo';
import { ThemeModeToggle } from '@/app/shared/components/theme-mode-toggle';
import { NotificacoesSino } from '@/app/shared/components/notificacoes-sino';
import { AuthService } from '@/app/core/services/auth.service';
import { perfilLabel } from '@/app/core/models/models';

/**
 * Cabeçalho do site público: barra cheia, fixa no topo, com fundo sólido e borda inferior.
 *  - desktop: logo · navegação em abas (traço na cor primária encostado na borda de baixo no item ativo) · tema, anunciar, entrar/conta;
 *  - ao rolar a página a barra ganha sombra;
 *  - celular/tablet: gaveta lateral com a mesma navegação, anunciar e conta.
 */
@Component({
    selector: 'app-site-header',
    imports: [RouterLink, RouterLinkActive, DrawerModule, MenuModule, AppLogo, ThemeModeToggle, NotificacoesSino, Avatar],
    // display: contents — sem isso o host tem a altura do próprio cabeçalho e o "sticky" não gruda
    host: { style: 'display: contents', '(window:scroll)': 'aoRolar()' },
    template: `
        <header class="cabecalho" [class.cabecalho--rolado]="rolado()">
            <div class="site-container cabecalho__barra">
                <a routerLink="/" class="cabecalho__logo" aria-label="Página inicial"><app-logo [compacto]="true" /></a>

                <nav class="cabecalho__nav" aria-label="Principal">
                    @for (l of links; track l.rota) {
                        <a [routerLink]="l.rota" routerLinkActive="ativo" #rla="routerLinkActive" [attr.aria-current]="rla.isActive ? 'page' : null" class="cabecalho__link">
                            <i class="pi {{ l.icone }}" aria-hidden="true"></i>
                            <span>{{ l.label }}</span>
                        </a>
                    }
                </nav>

                <div class="cabecalho__acoes">
                    <span class="cabecalho__tema"><app-theme-mode-toggle /></span>
                    @if (auth.logado()) {
                        <span class="cabecalho__tema"><app-notificacoes-sino /></span>
                    }

                    <a routerLink="/anunciar" class="cabecalho__anunciar">
                        <i class="pi pi-megaphone" aria-hidden="true"></i>
                        <span>Anunciar imóvel</span>
                    </a>

                    @if (auth.logado()) {
                        <button type="button" class="cabecalho__conta" (click)="menuConta.toggle($event)" aria-haspopup="true" [attr.aria-label]="'Conta de ' + nomeCompleto()">
                            <app-avatar class="cabecalho__foto" [nome]="nomeCompleto()" [foto]="auth.usuario()?.fotoUrl ?? null" tamanho="2rem" />
                            <span class="cabecalho__nome">{{ primeiroNome() }}</span>
                            <i class="pi pi-chevron-down cabecalho__seta" aria-hidden="true"></i>
                        </button>
                        <p-menu #menuConta [model]="itensConta()" [popup]="true" appendTo="body" />
                    } @else {
                        <a routerLink="/conta/login" class="cabecalho__entrar">
                            <i class="pi pi-user" aria-hidden="true"></i>
                            <span>Entrar</span>
                        </a>
                    }

                    <button type="button" class="cabecalho__hamburguer" (click)="menuAberto.set(true)" aria-label="Abrir menu" [attr.aria-expanded]="menuAberto()">
                        <i class="pi pi-bars" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
        </header>

        <p-drawer [blockScroll]="true" [(visible)]="aberto" position="right" styleClass="gaveta-site" [showCloseIcon]="true">
            <ng-template #header><app-logo [compacto]="true" /></ng-template>

            <nav class="gaveta-site__nav" aria-label="Menu do celular">
                <span class="gaveta-site__rotulo">Explorar</span>
                @for (l of links; track l.rota) {
                    <a [routerLink]="l.rota" routerLinkActive="ativo" (click)="menuAberto.set(false)" class="gaveta-site__link">
                        <span class="gaveta-site__icone"><i class="pi {{ l.icone }}" aria-hidden="true"></i></span>
                        <span class="flex flex-col">
                            <span class="font-semibold">{{ l.label }}</span>
                            <small>{{ l.descricao }}</small>
                        </span>
                        <i class="pi pi-angle-right ml-auto opacity-50" aria-hidden="true"></i>
                    </a>
                }
            </nav>

            <div class="gaveta-site__rodape">
                <a routerLink="/anunciar" (click)="menuAberto.set(false)" class="gaveta-site__anunciar">
                    <i class="pi pi-megaphone" aria-hidden="true"></i>
                    <span class="flex flex-col">
                        <strong>Anunciar imóvel</strong>
                        <small>Para corretores e imobiliárias</small>
                    </span>
                </a>
                @if (auth.logado()) {
                    <div class="gaveta-site__usuario">
                        <app-avatar class="cabecalho__foto" [nome]="nomeCompleto()" [foto]="auth.usuario()?.fotoUrl ?? null" tamanho="2.5rem" />
                        <span class="flex flex-col min-w-0">
                            <strong class="truncate">{{ nomeCompleto() }}</strong>
                            <small>{{ perfil() }}</small>
                        </span>
                    </div>
                    @for (i of itensContaGaveta(); track i.label) {
                        <a [routerLink]="i.routerLink" (click)="menuAberto.set(false)" class="gaveta-site__link gaveta-site__link--simples">
                            <i class="pi {{ i.icon }}" aria-hidden="true"></i><span>{{ i.label }}</span>
                        </a>
                    }
                    <button type="button" class="gaveta-site__link gaveta-site__link--simples" (click)="menuAberto.set(false); auth.sair('/')"><i class="pi pi-sign-out" aria-hidden="true"></i><span>Sair</span></button>
                } @else {
                    <a routerLink="/conta/login" (click)="menuAberto.set(false)" class="gaveta-site__entrar"> <i class="pi pi-user" aria-hidden="true"></i> Entrar ou criar conta </a>
                }
            </div>
        </p-drawer>
    `
})
export class SiteHeader {
    auth = inject(AuthService);

    links = [
        { label: 'Comprar', rota: '/venda', icone: 'pi-tag', descricao: 'Imóveis à venda' },
        { label: 'Alugar', rota: '/aluguel', icone: 'pi-key', descricao: 'Para morar ou trabalhar' },
        { label: 'Lançamentos', rota: '/imovel-novo', icone: 'pi-sparkles', descricao: 'Imóveis novos e na planta' },
        { label: 'Temporada', rota: '/temporada', icone: 'pi-sun', descricao: 'Estadias curtas' },
        { label: 'Mapa', rota: '/mapa', icone: 'pi-map', descricao: 'Busque pela localização' },
        { label: 'Imobiliárias', rota: '/imobiliarias', icone: 'pi-building', descricao: 'Imobiliárias e corretores' }
    ];

    menuAberto = signal(false);
    get aberto() {
        return this.menuAberto();
    }
    set aberto(v: boolean) {
        this.menuAberto.set(v);
    }

    /** true depois que a página rolou um pouco: cabeçalho mais baixo e com sombra. */
    rolado = signal(false);
    aoRolar() {
        const r = window.scrollY > 8;
        if (r !== this.rolado()) this.rolado.set(r);
    }

    nomeCompleto = computed(() => this.auth.usuario()?.nome ?? '');
    primeiroNome = computed(() => this.nomeCompleto().trim().split(/\s+/)[0] ?? '');
    perfil = computed(() => perfilLabel(this.auth.sessao().perfil));

    /** Atalhos da conta (sem cabeçalho/separadores/sair), reaproveitados no menu e na gaveta. */
    itensContaGaveta = computed<MenuItem[]>(() => {
        const p = this.auth.sessao().perfil;
        if (p === 'ADMIN') {
            return [{ label: 'Administração', icon: 'pi-shield', routerLink: '/admin' }];
        }
        const itens: MenuItem[] = [
            { label: 'Minha conta', icon: 'pi-home', routerLink: '/conta' },
            { label: 'Favoritos', icon: 'pi-heart', routerLink: '/conta/favoritos' },
            { label: 'Minhas denúncias', icon: 'pi-flag', routerLink: '/conta/denuncias' }
        ];
        if (p === 'CORRETOR') {
            itens.push({ label: 'Meus anúncios', icon: 'pi-building', routerLink: '/conta/anuncios' });
            itens.push({ label: 'Pendências', icon: 'pi-exclamation-circle', routerLink: '/conta/pendencias' });
        }
        return itens;
    });

    itensConta = computed<MenuItem[]>(() => [
        { label: `${this.nomeCompleto()} (${this.perfil()})`, disabled: true },
        { separator: true },
        ...this.itensContaGaveta().map((i) => ({ ...i, icon: `pi ${i.icon}` })),
        { separator: true },
        { label: 'Sair', icon: 'pi pi-sign-out', command: () => this.auth.sair('/') }
    ]);
}
