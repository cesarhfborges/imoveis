import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { AppLogo } from '@/app/shared/components/app-logo';
import { ThemeModeToggle } from '@/app/shared/components/theme-mode-toggle';
import { AuthService } from '@/app/core/services/auth.service';
import { perfilLabel } from '@/app/core/models/models';

/** Cabeçalho do site público: logo, abas de navegação, "Anunciar" e "Acessar conta". */
@Component({
    selector: 'app-site-header',
    imports: [RouterLink, RouterLinkActive, DrawerModule, MenuModule, AppLogo, ThemeModeToggle],
    template: `
        <header class="site-header">
            <div class="site-container site-header__linha">
                <a routerLink="/" class="shrink-0" aria-label="Página inicial"><app-logo /></a>

                <nav class="site-nav" aria-label="Principal">
                    @for (l of links; track l.rota) {
                        <a [routerLink]="l.rota" routerLinkActive="ativo" class="site-nav__item">
                            {{ l.label }} <i class="pi pi-arrow-right text-xs" aria-hidden="true"></i>
                        </a>
                    }
                </nav>

                <div class="flex items-center gap-2 ml-auto">
                    <app-theme-mode-toggle />
                    <a routerLink="/anunciar" class="site-acao site-acao--claro hidden md:inline-flex"><i class="pi pi-bell" aria-hidden="true"></i> Anunciar</a>
                    @if (auth.logado()) {
                        <button type="button" class="site-acao site-acao--escuro" (click)="menuConta.toggle($event)" aria-haspopup="true">
                            <i class="pi pi-user" aria-hidden="true"></i>
                            <span class="hidden sm:inline">{{ primeiroNome() }}</span>
                            <i class="pi pi-angle-down text-xs" aria-hidden="true"></i>
                        </button>
                        <p-menu #menuConta [model]="itensConta()" [popup]="true" appendTo="body" />
                    } @else {
                        <a routerLink="/conta/login" class="site-acao site-acao--escuro"><i class="pi pi-user" aria-hidden="true"></i><span class="hidden sm:inline">Acessar Conta</span></a>
                    }
                    <button type="button" class="site-acao site-acao--claro lg:hidden" (click)="menuAberto.set(true)" aria-label="Abrir menu"><i class="pi pi-bars"></i></button>
                </div>
            </div>
        </header>

        <p-drawer [(visible)]="aberto" position="right" header="Menu" styleClass="w-72">
            <nav class="flex flex-col gap-1" aria-label="Menu do celular">
                @for (l of links; track l.rota) {
                    <a [routerLink]="l.rota" (click)="menuAberto.set(false)" class="p-3 rounded-border hover:bg-emphasis font-medium">{{ l.label }}</a>
                }
                <a routerLink="/anunciar" (click)="menuAberto.set(false)" class="p-3 rounded-border hover:bg-emphasis font-medium">Anunciar</a>
                @if (!auth.logado()) {
                    <a routerLink="/conta/login" (click)="menuAberto.set(false)" class="p-3 rounded-border hover:bg-emphasis font-medium">Acessar conta</a>
                }
            </nav>
        </p-drawer>
    `
})
export class SiteHeader {
    auth = inject(AuthService);
    private router = inject(Router);

    links = [
        { label: 'Venda', rota: '/venda' },
        { label: 'Aluguel', rota: '/aluguel' },
        { label: 'Imóvel Novo', rota: '/imovel-novo' },
        { label: 'Temporada', rota: '/temporada' },
        { label: 'Mapa', rota: '/mapa' }
    ];

    menuAberto = signal(false);
    get aberto() {
        return this.menuAberto();
    }
    set aberto(v: boolean) {
        this.menuAberto.set(v);
    }

    primeiroNome = computed(() => (this.auth.usuario()?.nome ?? '').split(' ')[0]);

    itensConta = computed<MenuItem[]>(() => {
        const s = this.auth.sessao();
        const itens: MenuItem[] = [{ label: `${s.usuario?.nome ?? ''} (${perfilLabel(s.perfil)})`, disabled: true }, { separator: true }];
        if (s.perfil === 'ADMIN') {
            itens.push({ label: 'Administração', icon: 'pi pi-shield', routerLink: '/admin' });
        } else {
            itens.push({ label: 'Minha conta', icon: 'pi pi-home', routerLink: '/conta' });
            itens.push({ label: 'Favoritos', icon: 'pi pi-heart', routerLink: '/conta/favoritos' });
            if (s.perfil === 'CORRETOR') {
                itens.push({ label: 'Meus anúncios', icon: 'pi pi-building', routerLink: '/conta/anuncios' });
            }
        }
        itens.push({ separator: true }, { label: 'Sair', icon: 'pi pi-sign-out', command: () => this.auth.sair('/') });
        return itens;
    });
}
