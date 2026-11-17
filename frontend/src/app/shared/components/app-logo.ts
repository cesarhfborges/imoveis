import { Component, computed, inject, input } from '@angular/core';
import { ConfigService } from '@/app/core/services/config.service';
import { ThemeService } from '@/app/core/services/theme.service';

/**
 * Logo do site: a imagem enviada em /admin/configuracoes (versão clara/escura)
 * ou, sem imagem, um ícone de casa com lupa + o nome do app.
 */
@Component({
    selector: 'app-logo',
    template: `
        @if (logo()) {
            <img [src]="logo()" [alt]="nomeEfetivo()" class="block h-10 w-auto max-w-[11rem] object-contain" />
        } @else {
            <span class="inline-flex items-center gap-2 select-none">
                <svg viewBox="0 0 40 40" class="h-9 w-9 shrink-0" aria-hidden="true">
                    <circle cx="17" cy="17" r="13" fill="none" stroke="var(--primary-color)" stroke-width="3.5" />
                    <path d="M10 18.5 17 12l7 6.5V25h-4.5v-4h-5v4H10z" fill="var(--primary-color)" />
                    <path d="m26.5 26.5 8 8" stroke="#16a34a" stroke-width="4.5" stroke-linecap="round" />
                </svg>
                <span class="flex flex-col leading-none">
                    <span class="font-extrabold tracking-tight text-[1.35rem] text-primary">{{ nomeEfetivo() }}</span>
                    @if (!compacto() && sloganEfetivo()) {
                        <span class="text-[0.6rem] font-semibold text-green-600 dark:text-green-400 mt-0.5">{{ sloganEfetivo() }}</span>
                    }
                </span>
            </span>
        }
    `
})
export class AppLogo {
    private config = inject(ConfigService);
    private theme = inject(ThemeService);
    compacto = input(false);
    cfg = this.config.config;

    // Opcionais, para pré-visualizar valores ainda não salvos (ex.: /admin/configuracoes).
    // undefined = usa a configuração do site; null = "sem valor".
    nome = input<string | undefined>();
    slogan = input<string | null | undefined>();
    logoUrl = input<string | null | undefined>();
    logoEscuroUrl = input<string | null | undefined>();
    /** Força a variante (true = tema escuro); sem valor, segue o tema atual. */
    escuro = input<boolean | undefined>();

    nomeEfetivo = computed(() => this.nome() ?? this.cfg().nomeApp);
    sloganEfetivo = computed(() => (this.slogan() === undefined ? this.cfg().slogan : this.slogan()));

    logo = computed(() => {
        const c = this.cfg();
        this.theme.choice();
        const claro = this.logoUrl() === undefined ? c.logoUrl : this.logoUrl();
        const escuroUrl = this.logoEscuroUrl() === undefined ? c.logoEscuroUrl : this.logoEscuroUrl();
        const escuro = this.escuro() ?? this.theme.isDark();
        return escuro && escuroUrl ? escuroUrl : claro;
    });
}
