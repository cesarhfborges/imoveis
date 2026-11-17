import { Component, DestroyRef, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { AuthService } from '@/app/core/services/auth.service';
import { ModeracaoService } from '@/app/core/services/moderacao.service';
import { RealtimeService, canalDoUsuario } from '@/app/core/services/realtime.service';
import { ContadorPendencias } from '@/app/core/models/models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/** Menu lateral: muda conforme a área (conta/admin) e o perfil ativo. */
@Component({
    selector: 'app-menu',
    imports: [AppMenuitem],
    template: `<ul class="layout-menu">
        @for (item of model(); track item.label) {
            @if (!item.separator) {
                <li app-menuitem [item]="item" [root]="true"></li>
            } @else {
                <li class="menu-separator"></li>
            }
        }
    </ul> `
})
export class AppMenu {
    private auth = inject(AuthService);
    private route = inject(ActivatedRoute);

    private moderacao = inject(ModeracaoService);

    private area = (this.route.snapshot.data['area'] as string) ?? this.route.parent?.snapshot.data['area'] ?? 'conta';

    constructor() {
        // selos do menu (denúncias aguardando a moderação / pendências aguardando o anunciante)
        const atualizar = () => {
            if (this.area === 'admin') this.moderacao.atualizarContadorAdmin();
            else if (this.auth.perfil() === 'CORRETOR') this.moderacao.atualizarContadorAnunciante();
        };
        atualizar();
        // em tempo real o backend manda o contador a cada mudança; a consulta fica como reserva
        const realtime = inject(RealtimeService);
        const t = setInterval(() => !realtime.conectado() && atualizar(), 60_000);
        inject(DestroyRef).onDestroy(() => clearInterval(t));
        if (this.area === 'admin') {
            realtime
                .ouvir<ContadorPendencias>('private-admin.moderacao', 'contador')
                .pipe(takeUntilDestroyed())
                .subscribe((c) => this.moderacao.contadorAdmin.set(c));
        } else {
            const id = this.auth.usuario()?.id;
            if (id && this.auth.perfil() === 'CORRETOR') {
                realtime
                    .ouvir<ContadorPendencias>(canalDoUsuario(id), 'pendencias.contador')
                    .pipe(takeUntilDestroyed())
                    .subscribe((c) => this.moderacao.contadorAnunciante.set(c));
            }
        }
    }

    private static selo(n: number): string | undefined {
        return n > 0 ? (n > 99 ? '99+' : String(n)) : undefined;
    }

    model = computed<MenuItem[]>(() => {
        const perfil = this.auth.perfil();
        if (this.area === 'admin') {
            return [
                { label: 'Administração', items: [{ label: 'Painel', icon: 'pi pi-fw pi-home', routerLink: ['/admin'] }] },
                {
                    label: 'Anúncios',
                    items: [
                        { label: 'Todos os anúncios', icon: 'pi pi-fw pi-building', routerLink: ['/admin/anuncios'] },
                        { label: 'Novo anúncio', icon: 'pi pi-fw pi-plus', routerLink: ['/admin/anuncios/novo'] },
                        { label: 'Contatos dos meus anúncios', icon: 'pi pi-fw pi-inbox', routerLink: ['/admin/contatos'] }
                    ]
                },
                {
                    label: 'Moderação',
                    items: [
                        { label: 'Denúncias', icon: 'pi pi-fw pi-flag', routerLink: ['/admin/denuncias'], badge: AppMenu.selo(this.moderacao.contadorAdmin().aguardandoVoce) },
                        { label: 'Regras e automações', icon: 'pi pi-fw pi-sliders-h', routerLink: ['/admin/moderacao'] }
                    ]
                },
                {
                    label: 'Sistema',
                    items: [
                        { label: 'Usuários e permissões', icon: 'pi pi-fw pi-users', routerLink: ['/admin/usuarios'] },
                        { label: 'Configurações do site', icon: 'pi pi-fw pi-cog', routerLink: ['/admin/configuracoes'] },
                        { label: 'Avisos e cookies', icon: 'pi pi-fw pi-megaphone', routerLink: ['/admin/avisos'] },
                        { label: 'Financeiras', icon: 'pi pi-fw pi-calculator', routerLink: ['/admin/financeiras'] },
                        { label: 'Calendário', icon: 'pi pi-fw pi-calendar', routerLink: ['/admin/calendario'] },
                        { label: 'Tokens da API', icon: 'pi pi-fw pi-key', routerLink: ['/admin/api'] }
                    ]
                },
                {
                    label: 'Atalhos',
                    items: [
                        { label: 'Meu perfil', icon: 'pi pi-fw pi-user', routerLink: ['/admin/perfil'] },
                        { label: 'Ver o site', icon: 'pi pi-fw pi-globe', routerLink: ['/'] }
                    ]
                }
            ];
        }
        const itens: MenuItem[] = [
            {
                label: 'Minha conta',
                items: [
                    { label: 'Início', icon: 'pi pi-fw pi-home', routerLink: ['/conta'] },
                    { label: 'Favoritos', icon: 'pi pi-fw pi-heart', routerLink: ['/conta/favoritos'] },
                    { label: 'Comparar favoritos', icon: 'pi pi-fw pi-clone', routerLink: ['/conta/comparar'] },
                    { label: 'Minhas denúncias', icon: 'pi pi-fw pi-flag', routerLink: ['/conta/denuncias'] },
                    { label: 'Meus dados', icon: 'pi pi-fw pi-user', routerLink: ['/conta/perfil'] }
                ]
            }
        ];
        if (perfil === 'CORRETOR') {
            itens.push({
                label: 'Anunciante',
                items: [
                    { label: 'Meus anúncios', icon: 'pi pi-fw pi-building', routerLink: ['/conta/anuncios'] },
                    { label: 'Novo anúncio', icon: 'pi pi-fw pi-plus', routerLink: ['/conta/anuncios/novo'] },
                    { label: 'Contatos recebidos', icon: 'pi pi-fw pi-inbox', routerLink: ['/conta/contatos'] },
                    { label: 'Pendências', icon: 'pi pi-fw pi-exclamation-circle', routerLink: ['/conta/pendencias'], badge: AppMenu.selo(this.moderacao.contadorAnunciante().aguardandoVoce) }
                ]
            });
        }
        if (perfil === 'CORRETOR') {
            // tokens da API aberta: só corretores (clientes não têm)
            itens.push({
                label: 'Integrações',
                items: [{ label: 'Tokens da API', icon: 'pi pi-fw pi-key', routerLink: ['/conta/api'] }]
            });
        }
        itens.push({ label: 'Site', items: [{ label: 'Buscar imóveis', icon: 'pi pi-fw pi-search', routerLink: ['/venda'] }] });
        return itens;
    });
}
