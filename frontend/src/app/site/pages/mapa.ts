import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ImovelFiltro, ImovelResumo, TipoImovel } from '@/app/core/models/models';
import { ImovelService } from '@/app/core/services/imovel.service';
import { ConfigService } from '@/app/core/services/config.service';
import { PrecoPipe, slug } from '@/app/core/pipes/formatos';
import { FiltrosBusca } from '@/app/shared/components/filtros-busca';
import { MapaOsm, PontoMapa } from '@/app/shared/components/mapa-osm';

/** Busca no mapa (OpenStreetMap): filtros à esquerda, marcadores com balão de cada imóvel. */
@Component({
    selector: 'app-mapa-page',
    imports: [FiltrosBusca, MapaOsm],
    template: `
        <div class="site-container py-4">
            <h1 class="busca__titulo mb-3">{{ pontos().length }} imóveis no mapa</h1>
            <div class="grid gap-4 lg:grid-cols-[20rem_1fr]">
                <div class="painel-lateral"><app-filtros-busca [valor]="filtro()" (buscar)="buscar($event)" /></div>
                <app-mapa-osm [pontos]="pontos()" [linksNovaJanela]="!!config.alvoAnuncio()" zoomRoda="livre" altura="min(70vh, 640px)" />
            </div>
        </div>
    `
})
export class MapaPage {
    private imoveis = inject(ImovelService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    protected config = inject(ConfigService);
    private preco = new PrecoPipe();

    filtro = signal<ImovelFiltro>({});
    lista = signal<ImovelResumo[]>([]);
    pontos = computed<PontoMapa[]>(() =>
        this.lista()
            .filter((i) => i.latitude != null && i.longitude != null)
            .map((i) => ({
                id: i.id,
                lat: i.latitude!,
                lng: i.longitude!,
                titulo: i.titulo,
                subtitulo: `${i.bairro}, ${i.cidade}`,
                preco: this.preco.transform(i.preco, i.finalidade),
                link: `/imovel/${i.id}/${slug(i.titulo)}`
            }))
    );

    constructor() {
        this.config.definirTitulo('Mapa de imóveis');
        this.route.queryParams.subscribe((qp) => {
            const f: ImovelFiltro = {
                finalidade: qp['finalidade'] ?? null,
                tipo: qp['tipo'] ? ([].concat(qp['tipo']) as TipoImovel[]) : null,
                cidade: qp['cidade'] ?? null,
                bairro: qp['bairro'] ?? null,
                quartos: qp['quartos'] ? Number(qp['quartos']) : null,
                precoMax: qp['precoMax'] ? Number(qp['precoMax']) : null,
                q: qp['q'] ?? null
            };
            this.filtro.set(f);
            this.imoveis.mapa(f).subscribe({ next: (l) => this.lista.set(l), error: () => this.lista.set([]) });
        });
    }

    buscar(f: ImovelFiltro) {
        this.router.navigate(['/mapa'], { queryParams: { finalidade: f.finalidade, tipo: f.tipo ?? null, cidade: f.cidade, bairro: f.bairro, quartos: f.quartos, precoMax: f.precoMax, q: f.q } });
    }
}
