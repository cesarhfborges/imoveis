import { Component, computed, inject, input } from '@angular/core';
import { ConfigService } from '@/app/core/services/config.service';
import { ThemeService } from '@/app/core/services/theme.service';

/**
 * Logo do site: a imagem enviada em /admin/configuracoes (versão clara/escura)
 * ou, sem imagem, o nome do app (e o slogan).
 */
@Component({
    selector: 'app-logo',
    template: `
        @if (logo()) {
            <img [src]="logo()" [alt]="nomeEfetivo()" class="block h-10 w-auto max-w-[11rem] object-contain" />
        } @else {
            <span class="inline-flex items-center select-none">
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
