import { Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Avisos } from '@/app/shared/components/avisos';
import { AppTopbar } from './app.topbar';
import { AppSidebar } from './app.sidebar';
import { AppFooter } from './app.footer';
import { LayoutService } from '@/app/layout/service/layout.service';

@Component({
    selector: 'app-layout',
    imports: [AppTopbar, AppSidebar, RouterModule, AppFooter, Avisos],
    template: `<div class="layout-wrapper" [class]="containerClass()">
        <app-topbar></app-topbar>
        <app-sidebar></app-sidebar>
        <div class="layout-main-container">
            <div class="layout-main">
                <router-outlet></router-outlet>
            </div>
            <app-footer></app-footer>
        </div>
        <div class="layout-mask"></div>
    </div>
    <app-avisos [area]="areaAvisos" />`
})
export class AppLayout {
    layoutService = inject(LayoutService);
    /** Painel do admin ou da conta (a rota diz qual). */
    areaAvisos: 'ADMIN' | 'CONTA' = inject(ActivatedRoute).snapshot.data['area'] === 'admin' ? 'ADMIN' : 'CONTA';

    constructor() {
        effect(() => {
            const state = this.layoutService.layoutState();
            if (state.mobileMenuActive) {
                document.body.classList.add('blocked-scroll');
            } else {
                document.body.classList.remove('blocked-scroll');
            }
        });
    }

    containerClass = computed(() => {
        const config = this.layoutService.layoutConfig();
        const state = this.layoutService.layoutState();
        return {
            'layout-overlay': config.menuMode === 'overlay',
            'layout-static': config.menuMode === 'static',
            'layout-static-inactive': state.staticMenuDesktopInactive && config.menuMode === 'static',
            'layout-overlay-active': state.overlayMenuActive,
            'layout-mobile-active': state.mobileMenuActive
        };
    });
}
