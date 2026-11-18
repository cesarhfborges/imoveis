import { provideHttpClient, withFetch, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID, inject, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling, withRouterConfig } from '@angular/router';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { appRoutes } from './app.routes';
import { demoInterceptor } from '@/app/core/interceptors/demo.interceptor';
import { ConfigService } from '@/app/core/services/config.service';
import { AuthService } from '@/app/core/services/auth.service';
import { ContaService } from '@/app/core/services/conta.service';

registerLocaleData(localePt);

/** Antes da primeira tela: configuração do site (nome, SEO, tema) e sessão do usuário. */
async function iniciar() {
    const config = inject(ConfigService);
    const auth = inject(AuthService);
    const conta = inject(ContaService);
    await config.carregar();
    await auth.carregar();
    conta.carregarFavoritos();
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(
            appRoutes,
            withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
            withComponentInputBinding(),
            withRouterConfig({ paramsInheritanceStrategy: 'always' })
        ),
        provideHttpClient(withFetch(), withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }), withInterceptors([demoInterceptor])),
        provideZonelessChangeDetection(),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        MessageService,
        ConfirmationService,
        providePrimeNG({
            theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } },
            // diálogos, drawers, listas, menus e tooltips no <body>: assim ficam à frente de tudo. Em 'self' (padrão)
            // eles ficavam presos no contexto de empilhamento da página (barra fixa, mapa, campos) e algo passava por cima
            overlayAppendTo: 'body',
            translation: {
                accept: 'Sim',
                reject: 'Não',
                choose: 'Escolher',
                upload: 'Enviar',
                cancel: 'Cancelar',
                clear: 'Limpar',
                apply: 'Aplicar',
                emptyMessage: 'Nenhum resultado',
                emptyFilterMessage: 'Nenhum resultado',
                selectionMessage: '{0} selecionados',
                weak: 'Fraca',
                medium: 'Média',
                strong: 'Forte',
                passwordPrompt: 'Digite uma senha',
                dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
                dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
                dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
                monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
                monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                today: 'Hoje'
            }
        }),
        provideAppInitializer(iniciar)
    ]
};
