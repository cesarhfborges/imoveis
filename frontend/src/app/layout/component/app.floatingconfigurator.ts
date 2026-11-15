import { Component, input } from '@angular/core';
import { ThemeModeToggle } from '@/app/shared/components/theme-mode-toggle';

/** Botões flutuantes de tema (claro, escuro ou automático, só na sessão) para telas sem topo, como as de login. */
@Component({
    selector: 'app-floating-configurator',
    imports: [ThemeModeToggle],
    template: `
        <div class="flex gap-2 top-6 right-6 z-50" [class.fixed]="float()">
            <app-theme-mode-toggle />
        </div>
    `
})
export class AppFloatingConfigurator {
    float = input<boolean>(true);
}
