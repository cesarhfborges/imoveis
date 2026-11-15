import { Injectable, computed, inject, signal } from '@angular/core';
import { $t } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import Lara from '@primeuix/themes/lara';
import Nora from '@primeuix/themes/nora';
import { LayoutService } from '@/app/layout/service/layout.service';
import { TemaModo } from '@/app/core/models/models';

export const PRESETS = { Aura, Lara, Nora } as const;
export type PresetName = keyof typeof PRESETS;

export type Palette = Partial<Record<0 | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950, string>>;

export interface ColorOption {
    name: string;
    label: string;
    palette: Palette;
}

export interface ThemeChoice {
    preset: PresetName;
    primary: string;
    surface: string | null;
    mode: TemaModo;
}

/** Azul-marinho padrão do portal (próximo do tom dos botões do site de referência). */
const MARINHO: Palette = {
    50: '#eef3fa',
    100: '#d5e1f2',
    200: '#abc3e5',
    300: '#7c9fd2',
    400: '#4f78b9',
    500: '#2f5a9c',
    600: '#234a85',
    700: '#1c3c6d',
    800: '#18325a',
    900: '#152a4a',
    950: '#0d1a2f'
};

export const SURFACES: ColorOption[] = [
    { name: 'slate', label: 'Slate', palette: { 0: '#ffffff', 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' } },
    { name: 'gray', label: 'Gray', palette: { 0: '#ffffff', 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827', 950: '#030712' } },
    { name: 'zinc', label: 'Zinc', palette: { 0: '#ffffff', 50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8', 400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46', 800: '#27272a', 900: '#18181b', 950: '#09090b' } },
    { name: 'neutral', label: 'Neutral', palette: { 0: '#ffffff', 50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4', 400: '#a3a3a3', 500: '#737373', 600: '#525252', 700: '#404040', 800: '#262626', 900: '#171717', 950: '#0a0a0a' } },
    { name: 'stone', label: 'Stone', palette: { 0: '#ffffff', 50: '#fafaf9', 100: '#f5f5f4', 200: '#e7e5e4', 300: '#d6d3d1', 400: '#a8a29e', 500: '#78716c', 600: '#57534e', 700: '#44403c', 800: '#292524', 900: '#1c1917', 950: '#0c0a09' } },
    { name: 'soho', label: 'Soho', palette: { 0: '#ffffff', 50: '#ececec', 100: '#dedfdf', 200: '#c4c4c6', 300: '#adaeb0', 400: '#97979b', 500: '#7f8084', 600: '#6a6b70', 700: '#55565b', 800: '#3f4046', 900: '#2c2c34', 950: '#16161d' } },
    { name: 'viva', label: 'Viva', palette: { 0: '#ffffff', 50: '#f3f3f3', 100: '#e7e7e8', 200: '#cfd0d0', 300: '#b7b8b9', 400: '#9fa1a1', 500: '#87898a', 600: '#6e7173', 700: '#565a5b', 800: '#3e4244', 900: '#262b2c', 950: '#0e1315' } },
    { name: 'ocean', label: 'Ocean', palette: { 0: '#ffffff', 50: '#fbfcfc', 100: '#F7F9F8', 200: '#EFF3F2', 300: '#DADEDD', 400: '#B1B7B6', 500: '#828787', 600: '#5F7274', 700: '#415B61', 800: '#29444E', 900: '#183240', 950: '#0c1920' } }
];

const PRIMARY_NAMES = ['emerald', 'green', 'lime', 'orange', 'amber', 'yellow', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];

/** Modo (claro/escuro/automático) escolhido pelo usuário: só nesta sessão do navegador. */
const SESSION_KEY = 'imoveis.tema.modo';
/** Preferência antiga (cores por visitante, no localStorage): não existe mais, é apagada. */
const LEGADO_KEY = 'imoveis.tema';

/**
 * Tema do site: preset (Aura/Lara/Nora), cor primária, surface e modo (claro, escuro ou automático).
 * Tudo vem da configuração do sistema (definida em /admin/configuracoes). O usuário só troca o modo,
 * e essa troca vale apenas para a sessão do navegador: não altera a configuração do sistema.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
    private layout = inject(LayoutService);
    private media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    private siteDefault = signal<ThemeChoice>({ preset: 'Aura', primary: 'marinho', surface: null, mode: 'auto' });
    readonly choice = signal<ThemeChoice>({ preset: 'Aura', primary: 'marinho', surface: null, mode: 'auto' });

    readonly mode = computed(() => this.choice().mode);
    readonly surfaces = SURFACES;
    readonly presets = Object.keys(PRESETS) as PresetName[];

    readonly primaryColors = computed<ColorOption[]>(() => this.primaryOptions(this.choice().preset));

    constructor() {
        this.media?.addEventListener('change', () => {
            if (this.choice().mode === 'auto') {
                this.syncDark();
            }
        });
    }

    primaryOptions(preset: PresetName): ColorOption[] {
        const primitive = (PRESETS[preset] as any).primitive ?? {};
        const list: ColorOption[] = [
            { name: 'marinho', label: 'Marinho', palette: MARINHO },
            { name: 'noir', label: 'Noir', palette: {} }
        ];
        for (const name of PRIMARY_NAMES) {
            list.push({ name, label: name.charAt(0).toUpperCase() + name.slice(1), palette: primitive[name] ?? {} });
        }
        return list;
    }

    /** Define o tema do sistema (vindo da configuração) e aplica, com o modo da sessão, se o usuário trocou. */
    initFromSite(def: Partial<ThemeChoice>) {
        try {
            localStorage.removeItem(LEGADO_KEY);
        } catch {
            /* ignore */
        }
        this.siteDefault.set({
            preset: (def.preset && def.preset in PRESETS ? def.preset : 'Aura') as PresetName,
            primary: def.primary || 'marinho',
            surface: def.surface ?? null,
            mode: def.mode ?? 'auto'
        });
        this.restaurar();
    }

    /** Troca o modo (claro, escuro ou automático) só nesta sessão do navegador. */
    setMode(mode: TemaModo) {
        try {
            sessionStorage.setItem(SESSION_KEY, mode);
        } catch {
            /* ignore */
        }
        this.apply({ ...this.choice(), mode });
    }

    /** Reaplica o tema do sistema com o modo da sessão (ex.: ao sair da pré-visualização das configurações). */
    restaurar() {
        const modo = this.modoDaSessao();
        this.apply({ ...this.siteDefault(), ...(modo ? { mode: modo } : {}) });
    }

    /** Descarta o modo da sessão e aplica exatamente o tema do sistema. */
    resetToSite() {
        try {
            sessionStorage.removeItem(SESSION_KEY);
        } catch {
            /* ignore */
        }
        this.apply(this.siteDefault());
    }

    /** Aplica o tema na tela (sem salvar nada). */
    apply(choice: ThemeChoice) {
        this.choice.set(choice);
        this.layout.layoutConfig.update((c) => ({ ...c, preset: choice.preset, primary: choice.primary, surface: choice.surface }));
        const preset = PRESETS[choice.preset] ?? Aura;
        const surface = SURFACES.find((s) => s.name === choice.surface)?.palette;
        $t().preset(preset).preset(this.presetExt(choice)).surfacePalette(surface).use({ useDefaultOptions: true });
        this.syncDark();
    }

    isDark(): boolean {
        const mode = this.choice().mode;
        return mode === 'dark' || (mode === 'auto' && !!this.media?.matches);
    }

    private syncDark() {
        const dark = this.isDark();
        if (this.layout.layoutConfig().darkTheme !== dark) {
            this.layout.layoutConfig.update((c) => ({ ...c, darkTheme: dark }));
        }
        // garante a classe mesmo antes do efeito de transição do layout
        document.documentElement.classList.toggle('app-dark', dark);
    }

    private modoDaSessao(): TemaModo | null {
        try {
            const m = sessionStorage.getItem(SESSION_KEY);
            return m === 'light' || m === 'dark' || m === 'auto' ? m : null;
        } catch {
            return null;
        }
    }

    private presetExt(choice: ThemeChoice): any {
        const color = this.primaryOptions(choice.preset).find((c) => c.name === choice.primary) ?? this.primaryOptions(choice.preset)[0];
        if (color.name === 'noir') {
            return {
                semantic: {
                    primary: {
                        50: '{surface.50}',
                        100: '{surface.100}',
                        200: '{surface.200}',
                        300: '{surface.300}',
                        400: '{surface.400}',
                        500: '{surface.500}',
                        600: '{surface.600}',
                        700: '{surface.700}',
                        800: '{surface.800}',
                        900: '{surface.900}',
                        950: '{surface.950}'
                    },
                    colorScheme: {
                        light: {
                            primary: { color: '{primary.950}', contrastColor: '#ffffff', hoverColor: '{primary.800}', activeColor: '{primary.700}' },
                            highlight: { background: '{primary.950}', focusBackground: '{primary.700}', color: '#ffffff', focusColor: '#ffffff' }
                        },
                        dark: {
                            primary: { color: '{primary.50}', contrastColor: '{primary.950}', hoverColor: '{primary.200}', activeColor: '{primary.300}' },
                            highlight: { background: '{primary.50}', focusBackground: '{primary.300}', color: '{primary.950}', focusColor: '{primary.950}' }
                        }
                    }
                }
            };
        }
        const escuro = color.name === 'marinho';
        const lightBase = escuro ? 700 : choice.preset === 'Nora' ? 600 : 500;
        const nora = choice.preset === 'Nora';
        return {
            semantic: {
                primary: color.palette,
                colorScheme: {
                    light: {
                        primary: { color: `{primary.${lightBase}}`, contrastColor: '#ffffff', hoverColor: `{primary.${lightBase + 100}}`, activeColor: `{primary.${Math.min(lightBase + 200, 900)}}` },
                        highlight: nora
                            ? { background: '{primary.600}', focusBackground: '{primary.700}', color: '#ffffff', focusColor: '#ffffff' }
                            : { background: '{primary.50}', focusBackground: '{primary.100}', color: '{primary.700}', focusColor: '{primary.800}' }
                    },
                    dark: {
                        primary: escuro
                            ? { color: '{primary.300}', contrastColor: '{surface.900}', hoverColor: '{primary.200}', activeColor: '{primary.100}' }
                            : nora
                              ? { color: '{primary.500}', contrastColor: '{surface.900}', hoverColor: '{primary.400}', activeColor: '{primary.300}' }
                              : { color: '{primary.400}', contrastColor: '{surface.900}', hoverColor: '{primary.300}', activeColor: '{primary.200}' },
                        highlight: nora
                            ? { background: '{primary.500}', focusBackground: '{primary.400}', color: '{surface.900}', focusColor: '{surface.900}' }
                            : { background: 'color-mix(in srgb, {primary.400}, transparent 84%)', focusBackground: 'color-mix(in srgb, {primary.400}, transparent 76%)', color: 'rgba(255,255,255,.87)', focusColor: 'rgba(255,255,255,.87)' }
                    }
                }
            }
        };
    }
}
