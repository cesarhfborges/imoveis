import { Component, computed, inject, input, output } from '@angular/core';
import { ColorOption, ThemeChoice, ThemeService, PresetName } from '@/app/core/services/theme.service';
import { TemaModo } from '@/app/core/models/models';

interface OpcaoCartao<T> {
    value: T;
    label: string;
    descricao: string;
    icone: string;
}

/**
 * Seletor de tema do site: modo (claro/escuro/auto), cor primária, surface e preset.
 * Cada grupo é um radiogroup acessível (Tab entra no grupo, a opção marcada é anunciada).
 */
@Component({
    selector: 'app-theme-picker',
    template: `
        <div class="flex flex-col gap-8">
            <!-- Modo -->
            <section aria-labelledby="tp-modo">
                <h3 id="tp-modo" class="text-base font-semibold m-0">Modo de cor</h3>
                <p class="text-sm text-muted-color mt-1 mb-3">Como o site abre para quem visita. O visitante ainda pode trocar só para ele.</p>
                <div role="radiogroup" aria-labelledby="tp-modo" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    @for (m of modos; track m.value) {
                        <button type="button" role="radio" [attr.aria-checked]="m.value === value().mode" (click)="emit({ mode: m.value })" [class]="cartao(m.value === value().mode)">
                            <span class="flex items-center justify-center w-10 h-10 rounded-full shrink-0" [class]="m.value === value().mode ? 'bg-primary text-primary-contrast' : 'bg-surface-100 dark:bg-surface-800 text-muted-color'">
                                <i [class]="'pi ' + m.icone" aria-hidden="true"></i>
                            </span>
                            <span class="flex flex-col text-left min-w-0">
                                <span class="font-medium">{{ m.label }}</span>
                                <span class="text-xs text-muted-color">{{ m.descricao }}</span>
                            </span>
                        </button>
                    }
                </div>
            </section>

            <!-- Cor primária -->
            <section aria-labelledby="tp-primaria">
                <div class="flex items-baseline justify-between gap-2">
                    <h3 id="tp-primaria" class="text-base font-semibold m-0">Cor primária</h3>
                    <span class="text-sm text-muted-color">{{ primariaAtual()?.label }}</span>
                </div>
                <p class="text-sm text-muted-color mt-1 mb-3">Botões, links, destaques e preços.</p>
                <div role="radiogroup" aria-labelledby="tp-primaria" class="flex flex-wrap gap-3">
                    @for (c of primarias(); track c.name) {
                        <button
                            type="button"
                            role="radio"
                            [attr.aria-checked]="c.name === value().primary"
                            [attr.aria-label]="c.label"
                            [title]="c.label"
                            (click)="emit({ primary: c.name })"
                            class="relative w-9 h-9 rounded-full cursor-pointer border-0 shadow-sm transition-transform hover:scale-110 outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary"
                            [class.outline-2]="c.name === value().primary"
                            [class.outline-primary]="c.name === value().primary"
                            [style.background]="corPrimaria(c)"
                        >
                            @if (c.name === value().primary) {
                                <i class="pi pi-check absolute inset-0 m-auto w-fit h-fit text-sm text-white drop-shadow" aria-hidden="true"></i>
                            }
                        </button>
                    }
                </div>
            </section>

            <!-- Surface -->
            <section aria-labelledby="tp-surface">
                <div class="flex items-baseline justify-between gap-2">
                    <h3 id="tp-surface" class="text-base font-semibold m-0">Surface</h3>
                    <span class="text-sm text-muted-color">{{ surfaceAtual()?.label }}</span>
                </div>
                <p class="text-sm text-muted-color mt-1 mb-3">Tons neutros de fundos, bordas e textos secundários.</p>
                <div role="radiogroup" aria-labelledby="tp-surface" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    @for (s of theme.surfaces; track s.name) {
                        <button
                            type="button"
                            role="radio"
                            [attr.aria-checked]="s.name === surfaceNome()"
                            (click)="emit({ surface: s.name })"
                            [class]="cartao(s.name === surfaceNome()) + ' !flex-col !items-stretch !gap-2 !p-2'"
                        >
                            <span class="flex h-6 rounded-md overflow-hidden border border-surface" aria-hidden="true">
                                @for (tom of tons; track tom) {
                                    <span class="flex-1" [style.background-color]="s.palette[tom]"></span>
                                }
                            </span>
                            <span class="flex items-center justify-between text-sm">
                                <span>{{ s.label }}</span>
                                @if (s.name === surfaceNome()) {
                                    <i class="pi pi-check text-primary text-xs" aria-hidden="true"></i>
                                }
                            </span>
                        </button>
                    }
                </div>
            </section>

            <!-- Preset -->
            <section aria-labelledby="tp-preset">
                <h3 id="tp-preset" class="text-base font-semibold m-0">Estilo dos componentes</h3>
                <p class="text-sm text-muted-color mt-1 mb-3">Formato de botões, campos, bordas e espaçamentos.</p>
                <div role="radiogroup" aria-labelledby="tp-preset" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    @for (p of presets; track p.value) {
                        <button type="button" role="radio" [attr.aria-checked]="p.value === value().preset" (click)="emit({ preset: p.value })" [class]="cartao(p.value === value().preset) + ' !items-start'">
                            <i [class]="'pi ' + p.icone + ' mt-0.5'" [class.text-primary]="p.value === value().preset" [class.text-muted-color]="p.value !== value().preset" aria-hidden="true"></i>
                            <span class="flex flex-col text-left min-w-0">
                                <span class="font-medium">{{ p.label }}</span>
                                <span class="text-xs text-muted-color">{{ p.descricao }}</span>
                            </span>
                        </button>
                    }
                </div>
            </section>
        </div>
    `
})
export class ThemePicker {
    theme = inject(ThemeService);
    value = input.required<ThemeChoice>();
    valueChange = output<ThemeChoice>();

    /** Tons usados na faixa de amostra de cada surface. */
    readonly tons = [50, 200, 400, 600, 800, 950] as const;

    readonly modos: OpcaoCartao<TemaModo>[] = [
        { value: 'light', label: 'Claro', descricao: 'Sempre fundo claro', icone: 'pi-sun' },
        { value: 'dark', label: 'Escuro', descricao: 'Sempre fundo escuro', icone: 'pi-moon' },
        { value: 'auto', label: 'Automático', descricao: 'Segue o sistema do visitante', icone: 'pi-desktop' }
    ];

    readonly presets: OpcaoCartao<PresetName>[] = [
        { value: 'Aura', label: 'Aura', descricao: 'Moderno e arredondado (padrão)', icone: 'pi-sparkles' },
        { value: 'Lara', label: 'Lara', descricao: 'Clássico, com mais contraste', icone: 'pi-th-large' },
        { value: 'Nora', label: 'Nora', descricao: 'Compacto e mais reto', icone: 'pi-bars' }
    ];

    primarias = computed(() => this.theme.primaryOptions(this.value().preset));
    primariaAtual = computed(() => this.primarias().find((c) => c.name === this.value().primary));
    surfaceNome = computed(() => this.value().surface ?? 'slate');
    surfaceAtual = computed(() => this.theme.surfaces.find((s) => s.name === this.surfaceNome()));

    emit(part: Partial<ThemeChoice>) {
        this.valueChange.emit({ ...this.value(), ...part });
    }

    /** Cor da amostra: o mesmo tom que os botões terão no tema claro. */
    corPrimaria(c: ColorOption) {
        // noir: preto no claro e branco no escuro; amostra dividida para aparecer nos dois modos
        if (c.name === 'noir') return 'linear-gradient(135deg, #18181b 50%, #f4f4f5 50%)';
        return c.palette[c.base ?? (this.value().preset === 'Nora' ? 600 : 500)];
    }

    /** Classes do cartão selecionável (modo, surface, preset). */
    cartao(ativo: boolean) {
        const base =
            'flex items-center gap-3 p-3 rounded-border border cursor-pointer text-color bg-surface-0 dark:bg-surface-900 transition-colors ' +
            'hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
        return ativo ? `${base} border-primary bg-primary-50 dark:bg-primary-950/40 ring-1 ring-primary` : `${base} border-surface`;
    }
}
