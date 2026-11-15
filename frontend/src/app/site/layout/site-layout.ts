import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteHeader } from './site-header';
import { SiteFooter } from './site-footer';
import { DemoModeService } from '@/app/core/interceptors/demo.interceptor';
import { Avisos } from '@/app/shared/components/avisos';

/** Moldura do site público (acesso livre, sem login). */
@Component({
    selector: 'app-site-layout',
    imports: [RouterOutlet, SiteHeader, SiteFooter, Avisos],
    template: `
        <a href="#conteudo" class="pular-link">Pular para o conteúdo</a>
        <app-site-header />
        @if (demo.ativo()) {
            <div class="aviso-demo" role="status">
                <i class="pi pi-info-circle" aria-hidden="true"></i>
                Modo demonstração: a API não está disponível, então os dados de exemplo ficam salvos só neste navegador.
            </div>
        }
        <main id="conteudo" class="site-main">
            <router-outlet />
        </main>
        <app-site-footer />
        <app-avisos area="SITE" />
    `,
    host: { class: 'site-root' }
})
export class SiteLayout {
    demo = inject(DemoModeService);
}
