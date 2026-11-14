import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { AuthService } from '@/app/core/services/auth.service';

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

    private area = (this.route.snapshot.data['area'] as string) ?? this.route.parent?.snapshot.data['area'] ?? 'conta';

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
                        { label: 'Contatos recebidos', icon: 'pi pi-fw pi-inbox', routerLink: ['/admin/contatos'] }
                    ]
                },
                {
                    label: 'Sistema',
                    items: [
                        { label: 'Usuários e permissões', icon: 'pi pi-fw pi-users', routerLink: ['/admin/usuarios'] },
                        { label: 'Configurações do site', icon: 'pi pi-fw pi-cog', routerLink: ['/admin/configuracoes'] },
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
                    { label: 'Contatos recebidos', icon: 'pi pi-fw pi-inbox', routerLink: ['/conta/contatos'] }
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
