import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppLogo } from './app-logo';
import { AppFloatingConfigurator } from '@/app/layout/component/app.floatingconfigurator';
import { Avisos } from './avisos';

/** Moldura das telas de login/cadastro (estilo das páginas de autenticação do Sakai). */
@Component({
    selector: 'app-auth-card',
    imports: [RouterLink, AppLogo, AppFloatingConfigurator, Avisos],
    template: `
        <app-floating-configurator />
        <main class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen px-4 py-16">
            <div class="w-full" [style.max-width]="largura()">
                <a routerLink="/" class="inline-flex items-center gap-2 mb-4 px-3 py-2 rounded-border text-sm font-medium text-muted-color hover:text-primary hover:bg-emphasis transition-colors">
                    <i class="pi pi-arrow-left" aria-hidden="true"></i> Voltar ao site
                </a>
                <div class="rounded-[2rem] p-[0.3rem]" style="background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                    <div class="w-full bg-surface-0 dark:bg-surface-900 py-10 px-6 sm:px-12 rounded-[1.8rem]">
                        <div class="text-center mb-8">
                            <a routerLink="/" class="inline-block mb-6" aria-label="Página inicial do site"><app-logo /></a>
                            <h1 class="text-surface-900 dark:text-surface-0 text-2xl font-semibold mb-2">{{ titulo() }}</h1>
                            @if (subtitulo()) {
                                <p class="text-muted-color m-0">{{ subtitulo() }}</p>
                            }
                        </div>
                        <ng-content />
                    </div>
                </div>
            </div>
        </main>
        <app-avisos area="SITE" />
    `
})
export class AuthCard {
    titulo = input.required<string>();
    subtitulo = input<string | null>(null);
    largura = input('30rem');
}
