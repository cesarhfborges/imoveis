import { Component, DestroyRef, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { AuthService } from '@/app/core/services/auth.service';
import { ConfigService } from '@/app/core/services/config.service';
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
    private config = inject(ConfigService);

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

    /**
     * Um menu por perfil: a sessão carrega só o perfil escolhido no login, e cada um vê apenas o que é dele. Para usar
     * outro perfil (ex.: o corretor salvar favoritos como cliente), troca-se pelo menu da conta no topo. Itens que
     * dependem de regras do site somem com a regra desligada, e grupos que ficam vazios somem junto.
     */
    model = computed<MenuItem[]>(() => {
        if (this.area === 'admin') return this.menuAdmin();
        const grupos = this.auth.perfil() === 'CORRETOR' ? this.menuCorretor() : this.menuCliente();
        return grupos.filter((g) => g.items?.length);
    });

    /** Administração: o portal inteiro (anúncios, moderação, pessoas, site) e a conta do próprio administrador. */
    private menuAdmin(): MenuItem[] {
        return [
            { label: 'Visão geral', items: [{ label: 'Painel', icon: 'pi pi-fw pi-home', routerLink: ['/admin'] }] },
            {
                label: 'Anúncios',
                items: [
                    { label: 'Todos os anúncios', icon: 'pi pi-fw pi-building', routerLink: ['/admin/anuncios'] },
                    { label: 'Novo anúncio', icon: 'pi pi-fw pi-plus', routerLink: ['/admin/anuncios/novo'] },
                    // contatos dos anúncios publicados pela própria administração
                    { label: 'Contatos recebidos', icon: 'pi pi-fw pi-inbox', routerLink: ['/admin/contatos'] }
                ]
            },
            {
                label: 'Moderação',
                items: [
                    { label: 'Denúncias', icon: 'pi pi-fw pi-flag', routerLink: ['/admin/denuncias'], badge: AppMenu.selo(this.moderacao.contadorAdmin().aguardandoVoce) },
                    { label: 'Regras e automações', icon: 'pi pi-fw pi-sliders-h', routerLink: ['/admin/moderacao'] }
                ]
            },
            { label: 'Pessoas', items: [{ label: 'Usuários e permissões', icon: 'pi pi-fw pi-users', routerLink: ['/admin/usuarios'] }] },
            {
                label: 'Site e conteúdo',
                items: [
                    { label: 'Configurações do site', icon: 'pi pi-fw pi-cog', routerLink: ['/admin/configuracoes'] },
                    { label: 'Avisos e cookies', icon: 'pi pi-fw pi-megaphone', routerLink: ['/admin/avisos'] }
                ]
            },
            {
                label: 'Cadastros de apoio',
                items: [
                    { label: 'Financeiras', icon: 'pi pi-fw pi-calculator', routerLink: ['/admin/financeiras'] },
                    { label: 'Calendário', icon: 'pi pi-fw pi-calendar', routerLink: ['/admin/calendario'] }
                ]
            },
            {
                label: 'Minha conta',
                items: [
                    { label: 'Meu perfil', icon: 'pi pi-fw pi-user', routerLink: ['/admin/perfil'] },
                    { label: 'Tokens da API', icon: 'pi pi-fw pi-key', routerLink: ['/admin/api'] }
                ]
            }
        ];
    }

    /** Corretor e imobiliária: a área de trabalho (anúncios e atendimento). As ferramentas de comprador ficam no perfil cliente. */
    private menuCorretor(): MenuItem[] {
        const cfg = this.config.config();
        return [
            { label: 'Visão geral', items: [{ label: 'Início', icon: 'pi pi-fw pi-home', routerLink: ['/conta'] }] },
            {
                label: 'Anúncios',
                items: [
                    { label: 'Meus anúncios', icon: 'pi pi-fw pi-building', routerLink: ['/conta/anuncios'] },
                    { label: 'Novo anúncio', icon: 'pi pi-fw pi-plus', routerLink: ['/conta/anuncios/novo'] },
                    { label: 'Pendências', icon: 'pi pi-fw pi-exclamation-circle', routerLink: ['/conta/pendencias'], badge: AppMenu.selo(this.moderacao.contadorAnunciante().aguardandoVoce) }
                ]
            },
            {
                label: 'Atendimento',
                items: [
                    { label: 'Contatos recebidos', icon: 'pi pi-fw pi-inbox', routerLink: ['/conta/contatos'] },
                    ...(cfg.agendamentoVisita !== false ? [{ label: 'Visitas aos meus anúncios', icon: 'pi pi-fw pi-calendar', routerLink: ['/conta/visitas'] }] : [])
                ]
            },
            {
                label: 'Minha conta',
                items: [
                    { label: 'Meus dados', icon: 'pi pi-fw pi-user', routerLink: ['/conta/perfil'] },
                    { label: 'Tokens da API', icon: 'pi pi-fw pi-key', routerLink: ['/conta/api'] }
                ]
            }
        ];
    }

    /** Cliente: procurar imóveis e acompanhar o que pediu (visitas e denúncias). */
    private menuCliente(): MenuItem[] {
        const cfg = this.config.config();
        return [
            { label: 'Visão geral', items: [{ label: 'Início', icon: 'pi pi-fw pi-home', routerLink: ['/conta'] }] },
            {
                label: 'Imóveis',
                items: [
                    { label: 'Buscar imóveis', icon: 'pi pi-fw pi-search', routerLink: ['/venda'] },
                    { label: 'Favoritos', icon: 'pi pi-fw pi-heart', routerLink: ['/conta/favoritos'] },
                    { label: 'Comparar favoritos', icon: 'pi pi-fw pi-clone', routerLink: ['/conta/comparar'] },
                    ...(cfg.vistosRecentes !== false ? [{ label: 'Vistos recentemente', icon: 'pi pi-fw pi-eye', routerLink: ['/conta/vistos'] }] : [])
                ]
            },
            {
                label: 'Acompanhamento',
                items: [
                    ...(cfg.agendamentoVisita !== false ? [{ label: 'Minhas visitas', icon: 'pi pi-fw pi-calendar', routerLink: ['/conta/visitas'] }] : []),
                    { label: 'Minhas denúncias', icon: 'pi pi-fw pi-flag', routerLink: ['/conta/denuncias'] }
                ]
            },
            { label: 'Minha conta', items: [{ label: 'Meus dados', icon: 'pi pi-fw pi-user', routerLink: ['/conta/perfil'] }] }
        ];
    }
}
