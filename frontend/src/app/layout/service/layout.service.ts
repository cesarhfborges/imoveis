import { Injectable, effect, signal, computed } from '@angular/core';

export interface LayoutConfig {
    preset: string;
    primary: string;
    surface: string | undefined | null;
    darkTheme: boolean;
    menuMode: string;
}

interface LayoutState {
    staticMenuDesktopInactive: boolean;
    overlayMenuActive: boolean;
    configSidebarVisible: boolean;
    mobileMenuActive: boolean;
    menuHoverActive: boolean;
    activePath: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class LayoutService {
    layoutConfig = signal<LayoutConfig>({
        preset: 'Aura',
        primary: 'marinho',
        surface: null,
        darkTheme: false,
        menuMode: 'static'
    });

    layoutState = signal<LayoutState>({
        // no desktop, "inativo" = menu retraído (só ícones; expande ao passar o mouse). A escolha fica no navegador.
        staticMenuDesktopInactive: LayoutService.lerRetraido(),
        overlayMenuActive: false,
        configSidebarVisible: false,
        mobileMenuActive: false,
        menuHoverActive: false,
        activePath: null
    });

    theme = computed(() => (this.layoutConfig().darkTheme ? 'light' : 'dark'));

    isSidebarActive = computed(() => this.layoutState().overlayMenuActive || this.layoutState().mobileMenuActive);

    isDarkTheme = computed(() => this.layoutConfig().darkTheme);

    getPrimary = computed(() => this.layoutConfig().primary);

    getSurface = computed(() => this.layoutConfig().surface);

    isOverlay = computed(() => this.layoutConfig().menuMode === 'overlay');

    transitionComplete = signal<boolean>(false);

    private initialized = false;

    constructor() {
        effect(() => {
            const config = this.layoutConfig();

            if (!this.initialized || !config) {
                this.initialized = true;
                return;
            }

            this.handleDarkModeTransition(config);
        });
    }

    private handleDarkModeTransition(config: LayoutConfig): void {
        const supportsViewTransition = 'startViewTransition' in document;

        if (supportsViewTransition) {
            this.startViewTransition(config);
        } else {
            this.toggleDarkMode(config);
        }
    }

    private startViewTransition(config: LayoutConfig): void {
        document.startViewTransition(() => {
            this.toggleDarkMode(config);
        });
    }

    toggleDarkMode(config?: LayoutConfig): void {
        const _config = config || this.layoutConfig();
        if (_config.darkTheme) {
            document.documentElement.classList.add('app-dark');
        } else {
            document.documentElement.classList.remove('app-dark');
        }
    }

    onMenuToggle() {
        if (this.isOverlay()) {
            this.layoutState.update((prev) => ({ ...prev, overlayMenuActive: !this.layoutState().overlayMenuActive }));
        }

        if (this.isDesktop()) {
            const retraido = !this.layoutState().staticMenuDesktopInactive;
            this.layoutState.update((prev) => ({ ...prev, staticMenuDesktopInactive: retraido }));
            LayoutService.gravarRetraido(retraido);
        } else {
            this.layoutState.update((prev) => ({ ...prev, mobileMenuActive: !this.layoutState().mobileMenuActive }));
        }
    }

    showConfigSidebar() {
        this.layoutState.update((prev) => ({ ...prev, configSidebarVisible: true }));
    }

    hideConfigSidebar() {
        this.layoutState.update((prev) => ({ ...prev, configSidebarVisible: false }));
    }

    /** Menu retraído no desktop: o modo preferido de quem usa este navegador (pode faltar em janela privada). */
    menuRetraido = computed(() => this.layoutState().staticMenuDesktopInactive);

    private static readonly CHAVE_RETRAIDO = 'imoveis.menu.retraido';

    private static lerRetraido(): boolean {
        try {
            return localStorage.getItem(LayoutService.CHAVE_RETRAIDO) === '1';
        } catch {
            return false;
        }
    }

    private static gravarRetraido(retraido: boolean) {
        try {
            localStorage.setItem(LayoutService.CHAVE_RETRAIDO, retraido ? '1' : '0');
        } catch {
            // sem armazenamento (janela privada, bloqueio): vale só nesta visita
        }
    }

    isDesktop() {
        return window.innerWidth > 991;
    }

    isMobile() {
        return !this.isDesktop();
    }
}
