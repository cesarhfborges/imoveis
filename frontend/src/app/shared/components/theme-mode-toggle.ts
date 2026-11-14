import { Component, computed, inject } from '@angular/core';
import { ThemeService } from '@/app/core/services/theme.service';
import { TemaModo } from '@/app/core/models/models';

/** Botão que alterna Claro → Escuro → Automático (segue o sistema). */
@Component({
    selector: 'app-theme-mode-toggle',
    template: `
        <button type="button" [class]="buttonClass" (click)="proximo()" [title]="'Tema: ' + rotulo()" [attr.aria-label]="'Tema: ' + rotulo() + '. Clique para trocar'">
            <i [class]="icone()"></i>
        </button>
    `
})
export class ThemeModeToggle {
    private theme = inject(ThemeService);
    buttonClass = 'layout-topbar-action';

    private ordem: TemaModo[] = ['light', 'dark', 'auto'];

    icone = computed(() => {
        const m = this.theme.mode();
        return m === 'light' ? 'pi pi-sun' : m === 'dark' ? 'pi pi-moon' : 'pi pi-desktop';
    });

    rotulo = computed(() => {
        const m = this.theme.mode();
        return m === 'light' ? 'claro' : m === 'dark' ? 'escuro' : 'automático';
    });

    proximo() {
        const i = this.ordem.indexOf(this.theme.mode());
        this.theme.update({ mode: this.ordem[(i + 1) % this.ordem.length] });
    }
}
