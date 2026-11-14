import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ThemePicker } from '@/app/shared/components/theme-picker';
import { ThemeService } from '@/app/core/services/theme.service';

/** Painel suspenso do Sakai para o visitante ajustar o tema (fica salvo no navegador). */
@Component({
    selector: 'app-configurator',
    imports: [FormsModule, SelectButtonModule, ThemePicker],
    template: `
        <app-theme-picker [value]="theme.choice()" (valueChange)="theme.update($event)" />
        @if (theme.hasUserOverride()) {
            <button type="button" class="mt-4 text-sm text-primary font-medium cursor-pointer hover:underline" (click)="theme.resetToSite()">Voltar ao tema padrão do site</button>
        }
    `,
    host: {
        class: 'hidden absolute top-13 right-0 w-80 p-4 bg-surface-0 dark:bg-surface-900 border border-surface rounded-border origin-top shadow-[0px_3px_5px_rgba(0,0,0,0.02),0px_0px_2px_rgba(0,0,0,0.05),0px_1px_4px_rgba(0,0,0,0.08)] z-50'
    }
})
export class AppConfigurator {
    theme = inject(ThemeService);
}
