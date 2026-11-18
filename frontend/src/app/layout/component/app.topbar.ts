import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { TagModule } from 'primeng/tag';
import { LayoutService } from '@/app/layout/service/layout.service';
import { AuthService } from '@/app/core/services/auth.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { Perfil, perfilLabel } from '@/app/core/models/models';
import { AppLogo } from '@/app/shared/components/app-logo';
import { ThemeModeToggle } from '@/app/shared/components/theme-mode-toggle';
import { NotificacoesSino } from '@/app/shared/components/notificacoes-sino';
import { Avatar } from '@/app/shared/components/avatar';

@Component({
    selector: 'app-topbar',
    imports: [RouterModule, MenuModule, TagModule, AppLogo, ThemeModeToggle, NotificacoesSino, Avatar],
    template: ` <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <!-- desktop: expande ou retrai o menu (retraído = só ícones); celular: abre ou fecha -->
            <button
                class="layout-menu-button layout-topbar-action"
                (click)="layoutService.onMenuToggle()"
                [attr.aria-label]="layoutService.isDesktop() ? (layoutService.menuRetraido() ? 'Expandir o menu' : 'Retrair o menu') : 'Abrir ou fechar o menu'"
                [attr.title]="layoutService.isDesktop() ? (layoutService.menuRetraido() ? 'Expandir o menu' : 'Retrair o menu') : null"
            >
                <i class="pi pi-bars"></i>
            </button>
            <a class="layout-topbar-logo" [routerLink]="area === 'admin' ? '/admin' : '/conta'">
                <app-logo [compacto]="true" />
            </a>
            @if (area === 'admin') {
                <p-tag value="Admin" severity="danger" class="hidden sm:inline-flex" />
            }
        </div>

        <div class="layout-topbar-actions">
            <div class="layout-config-menu">
                <app-theme-mode-toggle />
            </div>

            <app-notificacoes-sino botaoClasse="layout-topbar-action" />

            <!-- mesmo botão de conta do cabeçalho do site: foto (ou iniciais) + primeiro nome -->
            <button type="button" class="topbar-conta" (click)="menu.toggle($event)" aria-haspopup="true" [attr.aria-label]="'Conta de ' + nomeCompleto()">
                <app-avatar [nome]="nomeCompleto()" [foto]="auth.usuario()?.fotoUrl ?? null" tamanho="2rem" />
                <span class="topbar-conta__nome">{{ primeiroNome() }}</span>
                <i class="pi pi-chevron-down topbar-conta__seta" aria-hidden="true"></i>
            </button>
            <p-menu #menu [model]="itensUsuario()" [popup]="true" appendTo="body" />
        </div>
    </div>`,
    styles: `
        .topbar-conta {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            height: 2.5rem;
            padding: 0 0.65rem 0 0.25rem;
            border-radius: 999px;
            border: 1px solid var(--p-content-border-color);
            background: transparent;
            color: var(--p-text-color);
            cursor: pointer;
            transition: background 0.2s;
        }
        .topbar-conta:hover {
            background: var(--p-surface-100);
        }
        :host-context(.app-dark) .topbar-conta:hover {
            background: var(--p-surface-800);
        }
        .topbar-conta:focus-visible {
            outline: 2px solid var(--p-primary-color);
            outline-offset: 0;
        }
        .topbar-conta__nome {
            display: none;
            max-width: 9rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 0.9rem;
            font-weight: 600;
        }
        @media (min-width: 768px) {
            .topbar-conta__nome {
                display: inline;
            }
        }
        .topbar-conta__seta {
            font-size: 0.7rem;
            color: var(--p-text-muted-color);
        }
        @media (prefers-reduced-motion: reduce) {
            .topbar-conta {
                transition: none;
            }
        }
    `
})
export class AppTopbar {
    layoutService = inject(LayoutService);
    auth = inject(AuthService);
    private config = inject(ConfigService);
    private msg = inject(MessageService);
    private route = inject(ActivatedRoute);

    area: string = this.route.snapshot.data['area'] ?? 'conta';

    nomeCompleto = computed(() => this.auth.usuario()?.nome ?? '');
    primeiroNome = computed(() => this.nomeCompleto().trim().split(/\s+/)[0] ?? '');
    perfilAtual = computed(() => perfilLabel(this.auth.perfil()));

    itensUsuario = computed<MenuItem[]>(() => {
        const s = this.auth.sessao();
        const itens: MenuItem[] = [{ label: `${this.nomeCompleto()} (${this.perfilAtual()})`, disabled: true }, { label: s.usuario?.email ?? '', disabled: true, icon: 'pi pi-envelope' }, { separator: true }];
        if (this.area === 'conta') {
            const outros = (['CLIENTE', 'CORRETOR'] as Perfil[]).filter((p) => p !== s.perfil && s.perfisDisponiveis.includes(p));
            outros.forEach((p) => itens.push({ label: 'Entrar como ' + perfilLabel(p).toLowerCase(), icon: 'pi pi-sync', command: () => this.trocar(p) }));
            if (s.perfisDisponiveis.includes('ADMIN')) {
                itens.push({ label: 'Ir para a administração', icon: 'pi pi-shield', routerLink: '/admin/login' });
            }
            itens.push({ label: 'Meus dados', icon: 'pi pi-user-edit', routerLink: '/conta/perfil' });
        } else {
            itens.push({ label: 'Meu perfil', icon: 'pi pi-user-edit', routerLink: '/admin/perfil' });
        }
        itens.push({ label: 'Ver o site', icon: 'pi pi-globe', routerLink: '/' });
        itens.push({ separator: true }, { label: 'Sair', icon: 'pi pi-sign-out', command: () => this.auth.sair(this.area === 'admin' ? '/admin/login' : '/') });
        return itens;
    });

    nome = computed(() => this.config.config().nomeApp);

    trocar(p: Perfil) {
        this.auth.trocarPerfil(p).subscribe({
            next: () => {
                this.msg.add({ severity: 'success', summary: 'Perfil alterado', detail: 'Agora você está como ' + perfilLabel(p).toLowerCase() });
                location.assign('/conta');
            },
            error: (e) => this.msg.add({ severity: 'error', summary: 'Não foi possível trocar', detail: mensagemErro(e) })
        });
    }
}
