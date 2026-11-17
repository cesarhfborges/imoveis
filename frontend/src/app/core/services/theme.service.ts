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
    /** Tom da cor principal no tema claro (padrão: 500, ou 600 no preset Nora). */
    base?: 500 | 600 | 700;
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
    { name: 'ocean', label: 'Ocean', palette: { 0: '#ffffff', 50: '#fbfcfc', 100: '#F7F9F8', 200: '#EFF3F2', 300: '#DADEDD', 400: '#B1B7B6', 500: '#828787', 600: '#5F7274', 700: '#415B61', 800: '#29444E', 900: '#183240', 950: '#0c1920' } },
    // surfaces próprias, com matiz perceptível (mesma claridade da Slate em cada tom, para manter o contraste),
    { name: 'areia', label: 'Areia', palette: { 0: '#ffffff', 50: '#fef9f2', 100: '#fbf3e9', 200: '#f1e6d7', 300: '#e0d2bf', 400: '#ae9d86', 500: '#826f55', 600: '#635138', 700: '#4e3d26', 800: '#342612', 900: '#211505', 950: '#0d0600' } },
    { name: 'salvia', label: 'Sálvia', palette: { 0: '#ffffff', 50: '#f5fcf5', 100: '#eef7ee', 200: '#dfecdf', 300: '#c9d9c8', 400: '#91a691', 500: '#637a63', 600: '#455b45', 700: '#324632', 800: '#1c2e1d', 900: '#0d1c0e', 950: '#020a03' } },
    { name: 'rosado', label: 'Rosé', palette: { 0: '#ffffff', 50: '#fff8f9', 100: '#fff0f2', 200: '#f6e2e4', 300: '#e6cccf', 400: '#b6969a', 500: '#8b686d', 600: '#6b4a4e', 700: '#54373b', 800: '#392124', 900: '#251114', 950: '#100405' } },
    { name: 'noturno', label: 'Noturno', palette: { 0: '#ffffff', 50: '#f8f9ff', 100: '#f1f4ff', 200: '#e1e6fc', 300: '#ccd3ee', 400: '#969ec0', 500: '#687096', 600: '#4a5276', 700: '#373e5e', 800: '#212642', 900: '#12162c', 950: '#040615' } }
];

const PRIMARY_NAMES = ['emerald', 'green', 'lime', 'red', 'orange', 'amber', 'yellow', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];

/**
 * Cores primárias próprias do portal (além das do preset). Paletas geradas em OKLCH com a mesma escala de
 * claridade; "base" é o tom usado nos botões no tema claro, escolhido para o texto branco ter contraste AA (>= 4,5:1).
 */
const CORES_PROPRIAS: ColorOption[] = [
    { name: 'vinho', label: 'Vinho', base: 700, palette: { 50: '#fef4f5', 100: '#fee6e8', 200: '#ffccd0', 300: '#ffa6b0', 400: '#ef7c8d', 500: '#d35d71', 600: '#b8445a', 700: '#9a2e45', 800: '#7d2035', 900: '#651528', 950: '#420616' } },
    { name: 'terracota', label: 'Terracota', base: 600, palette: { 50: '#fef4f1', 100: '#ffe7e0', 200: '#ffcebf', 300: '#feaa90', 400: '#eb8565', 500: '#cf6746', 600: '#b44e2e', 700: '#963919', 800: '#7a290d', 900: '#631e05', 950: '#400e00' } },
    { name: 'cobre', label: 'Cobre', base: 600, palette: { 50: '#fef5f0', 100: '#fee8db', 200: '#fed0b5', 300: '#f5b189', 400: '#dd8f5f', 500: '#c1723f', 600: '#a75a25', 700: '#8b450d', 800: '#713401', 900: '#592801', 950: '#391700' } },
    { name: 'caramelo', label: 'Caramelo', base: 600, palette: { 50: '#fff5eb', 100: '#fce9d6', 200: '#f6d4b1', 300: '#e9b884', 400: '#d09859', 500: '#b57b37', 600: '#9b641a', 700: '#804e01', 800: '#663d00', 900: '#512f00', 950: '#321c01' } },
    { name: 'ocre', label: 'Ocre', base: 700, palette: { 50: '#fbf7e8', 100: '#f6edd0', 200: '#ecdaa5', 300: '#dbc171', 400: '#c0a23c', 500: '#a58604', 600: '#896f02', 700: '#6e5802', 800: '#574602', 900: '#453600', 950: '#2a2001' } },
    { name: 'oliva', label: 'Oliva', base: 600, palette: { 50: '#f5f9ec', 100: '#eaf0d8', 200: '#d7e1b4', 300: '#bdcb89', 400: '#9fae5f', 500: '#83923f', 600: '#6c7a24', 700: '#56620b', 800: '#444e03', 900: '#353d01', 950: '#1f2500' } },
    { name: 'floresta', label: 'Floresta', base: 700, palette: { 50: '#effaf1', 100: '#ddf4e2', 200: '#bee7c7', 300: '#97d3a7', 400: '#70b884', 500: '#509c67', 600: '#378450', 700: '#216b3c', 800: '#14562d', 900: '#0a4421', 950: '#002a11' } },
    { name: 'petroleo', label: 'Petróleo', base: 700, palette: { 50: '#eef9fc', 100: '#dcf1f7', 200: '#bbe3ed', 300: '#92cedc', 400: '#69b1c2', 500: '#4996a7', 600: '#2e7d8f', 700: '#166575', 800: '#07515e', 900: '#003f4b', 950: '#00272f' } },
    { name: 'ardosia', label: 'Ardósia', base: 600, palette: { 50: '#f3f7fb', 100: '#e6eef6', 200: '#cfdceb', 300: '#b2c5da', 400: '#91a7bf', 500: '#758ca4', 600: '#5e748b', 700: '#495d72', 800: '#38495c', 900: '#2b3949', 950: '#18232e' } },
    { name: 'lavanda', label: 'Lavanda', base: 600, palette: { 50: '#f7f5ff', 100: '#edeafe', 200: '#dbd5fe', 300: '#c3b9f7', 400: '#a698e1', 500: '#8b7cc6', 600: '#7364ac', 700: '#5d4e90', 800: '#493d75', 900: '#392e5f', 950: '#231a3e' } },
    { name: 'ameixa', label: 'Ameixa', base: 700, palette: { 50: '#fff2fd', 100: '#fde4fa', 200: '#f7caf2', 300: '#e9aae3', 400: '#d087c9', 500: '#b46aae', 600: '#9b5295', 700: '#803d7b', 800: '#672e63', 900: '#53224f', 950: '#351033' } }
];

/** Nomes em português das cores do preset (o identificador salvo continua o original, ex.: "blue"). */
const ROTULOS_PRESET: Record<string, string> = {
    emerald: 'Esmeralda', green: 'Verde', lime: 'Lima', red: 'Vermelho', orange: 'Laranja', amber: 'Âmbar', yellow: 'Amarelo',
    teal: 'Verde-azulado', cyan: 'Ciano', sky: 'Céu', blue: 'Azul', indigo: 'Índigo', violet: 'Violeta', purple: 'Roxo',
    fuchsia: 'Fúcsia', pink: 'Rosa', rose: 'Rubi'
};

/** Ordem das cores no seletor: próximas por matiz (vermelhos → laranjas → amarelos → verdes → azuis → roxos → rosas). */
const ORDEM_PRIMARIAS = ['marinho', 'noir', 'vinho', 'red', 'rose', 'terracota', 'cobre', 'orange', 'caramelo', 'amber', 'ocre', 'yellow', 'oliva', 'lime', 'green', 'floresta', 'emerald', 'teal', 'petroleo', 'cyan', 'sky', 'blue', 'ardosia', 'indigo', 'lavanda', 'violet', 'purple', 'ameixa', 'fuchsia', 'pink'];

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
        const list: ColorOption[] = [{ name: 'marinho', label: 'Marinho', palette: MARINHO, base: 700 }, { name: 'noir', label: 'Noir', palette: {} }, ...CORES_PROPRIAS];
        for (const name of PRIMARY_NAMES) {
            if (primitive[name]) list.push({ name, label: ROTULOS_PRESET[name] ?? name, palette: primitive[name] });
        }
        const pos = (n: string) => (ORDEM_PRIMARIAS.indexOf(n) + 1 || 999);
        return list.sort((a, b) => pos(a.name) - pos(b.name));
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
        // cores de base 700 (marinho, vinho, floresta...) são escuras: no tema escuro usam um tom mais claro
        const escuro = color.base === 700;
        const lightBase = color.base ?? (choice.preset === 'Nora' ? 600 : 500);
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
