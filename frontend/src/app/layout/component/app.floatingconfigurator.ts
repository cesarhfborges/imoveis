import { Component, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { StyleClassModule } from 'primeng/styleclass';
import { AppConfigurator } from './app.configurator';
import { ThemeModeToggle } from '@/app/shared/components/theme-mode-toggle';

/** Botões flutuantes de tema (modo e paleta) para telas sem topo, como as de login. */
@Component({
    selector: 'app-floating-configurator',
    imports: [ButtonModule, StyleClassModule, AppConfigurator, ThemeModeToggle],
    template: `
        <div class="flex gap-2 top-6 right-6 z-50" [class.fixed]="float()">
            <app-theme-mode-toggle />
            <div class="relative">
                <button type="button" class="layout-topbar-action layout-topbar-action-highlight" pStyleClass="@next" enterFromClass="hidden" enterActiveClass="animate-scalein" leaveToClass="hidden" leaveActiveClass="animate-fadeout" [hideOnOutsideClick]="true" aria-label="Cores do tema">
                    <i class="pi pi-palette"></i>
                </button>
                <app-configurator />
            </div>
        </div>
    `
})
export class AppFloatingConfigurator {
    float = input<boolean>(true);
}
