import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppLogo } from '@/app/shared/components/app-logo';
import { ConfigService } from '@/app/core/services/config.service';
import { TelefonePipe } from '@/app/core/pipes/formatos';
import { DocumentoService } from '@/app/core/services/documento.service';

/** Rodapé em colunas: marca e redes, institucional, atalhos de busca e contato. */
@Component({
    selector: 'app-site-footer',
    imports: [RouterLink, AppLogo, TelefonePipe],
    template: `
        <footer class="site-footer">
            <div class="site-container grid gap-8 md:grid-cols-2 lg:grid-cols-4 py-10">
                <div>
                    <app-logo />
                    <p class="text-sm text-muted-color mt-3 mb-4">{{ cfg().textoRodape }}</p>
                    <div class="font-semibold mb-2">Siga-nos</div>
                    <div class="flex gap-3 text-lg">
                        @if (cfg().instagram) {
                            <a [href]="cfg().instagram" target="_blank" rel="noopener" aria-label="Instagram"><i class="pi pi-instagram"></i></a>
                        }
                        @if (cfg().facebook) {
                            <a [href]="cfg().facebook" target="_blank" rel="noopener" aria-label="Facebook"><i class="pi pi-facebook"></i></a>
                        }
                        @if (!cfg().instagram && !cfg().facebook) {
                            <span class="text-sm text-muted-color">Redes sociais configuráveis no painel</span>
                        }
                    </div>
                </div>
                <nav aria-label="Institucional">
                    <h2 class="site-footer__titulo">Institucional</h2>
                    <ul>
                        <li><a routerLink="/conta/login">Entrar / criar conta</a></li>
                        <li><a routerLink="/anunciar">Como anunciar</a></li>
                        <li><a routerLink="/mapa">Mapa de imóveis</a></li>
                        <li><a routerLink="/admin/login">Área administrativa</a></li>
                        @if (documentos.publicos().length) {
                            <li><a routerLink="/documentos">Documentos</a></li>
                        }
                    </ul>
                </nav>
                <nav aria-label="Busca de imóveis">
                    <h2 class="site-footer__titulo">Busca de imóveis</h2>
                    <ul>
                        <li><a routerLink="/venda">Imóveis à venda</a></li>
                        <li><a routerLink="/aluguel">Imóveis para alugar</a></li>
                        <li><a routerLink="/venda" [queryParams]="{ tipo: 'APARTAMENTO' }">Apartamentos à venda</a></li>
                        <li><a routerLink="/aluguel" [queryParams]="{ tipo: 'APARTAMENTO' }">Apartamentos para alugar</a></li>
                        <li><a routerLink="/venda" [queryParams]="{ tipo: 'CASA' }">Casas à venda</a></li>
                        <li><a routerLink="/imovel-novo">Lançamentos</a></li>
                    </ul>
                </nav>
                <div>
                    <h2 class="site-footer__titulo">Atendimento</h2>
                    <ul>
                        @if (cfg().telefoneContato) {
                            <li><i class="pi pi-phone mr-2" aria-hidden="true"></i>{{ cfg().telefoneContato | telefone }}</li>
                        }
                        @if (cfg().whatsapp) {
                            <li><i class="pi pi-whatsapp mr-2" aria-hidden="true"></i>{{ cfg().whatsapp | telefone }}</li>
                        }
                        @if (cfg().emailContato) {
                            <li>
                                <i class="pi pi-envelope mr-2" aria-hidden="true"></i><a [href]="'mailto:' + cfg().emailContato">{{ cfg().emailContato }}</a>
                            </li>
                        }
                        @if (cfg().endereco) {
                            <li><i class="pi pi-map-marker mr-2" aria-hidden="true"></i>{{ cfg().endereco }}</li>
                        }
                    </ul>
                </div>
            </div>
            <div class="border-t border-surface py-4 text-center text-sm text-muted-color">© {{ ano }} {{ cfg().nomeApp }}. Todos os direitos reservados.</div>
        </footer>
    `
})
export class SiteFooter {
    cfg = inject(ConfigService).config;
    /** Só para mostrar o link "Documentos" quando houver algum publicado (Configurações › Documentos). */
    documentos = inject(DocumentoService);

    constructor() {
        this.documentos.carregarPublicos();
    }

    ano = new Date().getFullYear();
}
