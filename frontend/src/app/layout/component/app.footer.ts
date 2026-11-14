import { Component, inject } from '@angular/core';
import { ConfigService } from '@/app/core/services/config.service';

@Component({
    selector: 'app-footer',
    template: `<div class="layout-footer text-sm">
        {{ config.config().nomeApp }} · {{ ano }} · feito com
        <a href="https://primeng.org" target="_blank" rel="noopener noreferrer" class="text-primary font-bold hover:underline">PrimeNG</a>
    </div>`
})
export class AppFooter {
    config = inject(ConfigService);
    ano = new Date().getFullYear();
}
