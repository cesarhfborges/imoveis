import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ThemeChoice, ThemeService } from '@/app/core/services/theme.service';
import { TemaModo } from '@/app/core/models/models';

/**
 * Seletor reutilizável de tema: modo (claro/escuro/auto), cor primária, surface e preset.
 * Usado no configurador do topo e na página de configurações do admin.
 */
@Component({
    selector: 'app-theme-picker',
    imports: [FormsModule, SelectButtonModule],
    template: `
        <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
                <span class="text-sm text-muted-color font-semibold">Modo</span>
                <p-selectbutton [options]="modos" optionLabel="label" optionValue="value" [ngModel]="value().mode" (ngModelChange)="emit({ mode: $event })" [allowEmpty]="false" size="small" />
            </div>
            <div>
                <span class="text-sm text-muted-color font-semibold">Cor primária</span>
                <div class="pt-2 flex gap-2 flex-wrap justify-start">
                    @for (c of theme.primaryOptions(value().preset); track c.name) {
                        <button
                            type="button"
                            [title]="c.label"
                            [attr.aria-label]="'Cor ' + c.label"
                            (click)="emit({ primary: c.name })"
                            [class.outline-2]="c.name === value().primary"
                            [class.outline-primary]="c.name === value().primary"
                            class="cursor-pointer w-6 h-6 rounded-full flex shrink-0 outline-offset-2 shadow"
                            [style.background-color]="c.name === 'noir' ? 'var(--text-color)' : c.palette[c.name === 'marinho' ? 700 : 500]"
                        ></button>
                    }
                </div>
            </div>
            <div>
                <span class="text-sm text-muted-color font-semibold">Surface</span>
                <div class="pt-2 flex gap-2 flex-wrap justify-start">
                    @for (s of theme.surfaces; track s.name) {
                        <button
                            type="button"
                            [title]="s.label"
                            [attr.aria-label]="'Surface ' + s.label"
                            (click)="emit({ surface: s.name })"
                            [class.outline-2]="(value().surface ?? 'slate') === s.name"
                            [class.outline-primary]="(value().surface ?? 'slate') === s.name"
                            class="cursor-pointer w-6 h-6 rounded-full flex shrink-0 outline-offset-2"
                            [style.background-color]="s.palette[500]"
                        ></button>
                    }
                </div>
            </div>
            <div class="flex flex-col gap-2">
                <span class="text-sm text-muted-color font-semibold">Preset</span>
                <p-selectbutton [options]="theme.presets" [ngModel]="value().preset" (ngModelChange)="emit({ preset: $event })" [allowEmpty]="false" size="small" />
            </div>
        </div>
    `
})
export class ThemePicker {
    theme = inject(ThemeService);
    value = input.required<ThemeChoice>();
    valueChange = output<ThemeChoice>();

    modos: { label: string; value: TemaModo }[] = [
        { label: 'Claro', value: 'light' },
        { label: 'Escuro', value: 'dark' },
        { label: 'Auto', value: 'auto' }
    ];

    emit(part: Partial<ThemeChoice>) {
        this.valueChange.emit({ ...this.value(), ...part });
    }
}
