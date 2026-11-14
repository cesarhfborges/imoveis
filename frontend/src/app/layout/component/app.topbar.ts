import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { StyleClassModule } from 'primeng/styleclass';
import { MenuModule } from 'primeng/menu';
import { TagModule } from 'primeng/tag';
import { AppConfigurator } from './app.configurator';
import { LayoutService } from '@/app/layout/service/layout.service';
import { AuthService } from '@/app/core/services/auth.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { Perfil, perfilLabel } from '@/app/core/models/models';
import { AppLogo } from '@/app/shared/components/app-logo';
import { ThemeModeToggle } from '@/app/shared/components/theme-mode-toggle';

@Component({
    selector: 'app-topbar',
    imports: [RouterModule, StyleClassModule, MenuModule, TagModule, AppConfigurator, AppLogo, ThemeModeToggle],
    template: ` <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" (click)="layoutService.onMenuToggle()" aria-label="Abrir ou fechar o menu">
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
                <div class="relative">
                    <button
                        class="layout-topbar-action layout-topbar-action-highlight"
                        pStyleClass="@next"
                        enterFromClass="hidden"
                        enterActiveClass="animate-scalein"
                        leaveToClass="hidden"
                        leaveActiveClass="animate-fadeout"
                        [hideOnOutsideClick]="true"
                        aria-label="Cores do tema"
                    >
                        <i class="pi pi-palette"></i>
                    </button>
                    <app-configurator />
                </div>
            </div>

            <button type="button" class="layout-topbar-action !w-auto !rounded-full px-3 gap-2" (click)="menu.toggle($event)" aria-label="Menu do usuário">
                <i class="pi pi-user"></i>
                <span class="hidden md:inline text-sm font-medium">{{ primeiroNome() }}</span>
                <span class="hidden md:inline text-xs text-muted-color">({{ perfilAtual() }})</span>
                <i class="pi pi-angle-down text-xs"></i>
            </button>
            <p-menu #menu [model]="itensUsuario()" [popup]="true" appendTo="body" />
        </div>
    </div>`
})
export class AppTopbar {
    layoutService = inject(LayoutService);
    private auth = inject(AuthService);
    private config = inject(ConfigService);
    private msg = inject(MessageService);
    private route = inject(ActivatedRoute);

    area: string = this.route.snapshot.data['area'] ?? 'conta';

    primeiroNome = computed(() => (this.auth.usuario()?.nome ?? '').split(' ')[0]);
    perfilAtual = computed(() => perfilLabel(this.auth.perfil()));

    itensUsuario = computed<MenuItem[]>(() => {
        const s = this.auth.sessao();
        const itens: MenuItem[] = [{ label: s.usuario?.email ?? '', disabled: true, icon: 'pi pi-envelope' }, { separator: true }];
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
