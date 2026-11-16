import { AfterViewInit, Component, ElementRef, OnDestroy, effect, input, output, signal, untracked, viewChild } from '@angular/core';
import type * as Leaflet from 'leaflet';

export interface PontoMapa {
    id: number;
    lat: number;
    lng: number;
    titulo: string;
    subtitulo?: string;
    preco?: string;
    link?: string;
    /** Texto do link no balão (padrão "Ver imóvel"). */
    rotuloLink?: string;
}

/**
 * Mapa com OpenStreetMap (gratuito) via Leaflet, carregado sob demanda.
 *  - "pontos": marcadores com balão (título, preço e link);
 *  - "selecionavel": clique no mapa escolhe a posição (formulário do anúncio);
 *  - "cliqueParaCarregar": mostra um aviso e só baixa o mapa quando a pessoa clica;
 *  - "zoomRoda": 'livre' dá zoom com a roda do mouse direto (mapa como conteúdo principal);
 *    'ctrl' (padrão) deixa a roda rolar a página e só dá zoom com Ctrl/⌘ + roda ou pinça
 *    no trackpad, mostrando um aviso — evita a página "prender" ao passar por cima do mapa.
 */
@Component({
    selector: 'app-mapa-osm',
    template: `
        <div class="mapa-osm" #caixa [style.height]="altura()">
            @if (!ativo()) {
                <button type="button" class="mapa-osm__capa" (click)="ativar()">
                    <span class="mapa-osm__aviso"><i class="pi pi-map-marker text-3xl! text-primary" aria-hidden="true"></i><span>Clique para carregar o mapa</span></span>
                </button>
            }
            <div #alvo class="w-full h-full" [class.invisible]="!ativo()"></div>
            @if (ativo() && zoomRoda() === 'ctrl') {
                <div class="mapa-osm__dica" [class.visivel]="dicaVisivel()" aria-hidden="true">Use {{ teclaZoom }} + rolagem para dar zoom no mapa</div>
            }
        </div>
        <p class="text-[0.7rem] text-muted-color mt-1 mb-0">Mapa: © colaboradores do OpenStreetMap</p>
    `
})
export class MapaOsm implements AfterViewInit, OnDestroy {
    pontos = input<PontoMapa[]>([]);
    centro = input<[number, number] | null>(null);
    zoom = input(12);
    altura = input('360px');
    selecionavel = input(false);
    cliqueParaCarregar = input(false);
    zoomRoda = input<'livre' | 'ctrl'>('ctrl');
    /** Links "Ver imóvel" dos balões abrem em nova janela. */
    linksNovaJanela = input(false);
    /**
     * true (padrão): o mapa se enquadra nos pontos sempre que eles mudam.
     * false: a vista só muda pelo [centro]/[zoom] ou ao selecionar um ponto (diretório de imobiliárias).
     */
    ajustarAosPontos = input(true);
    /** Ponto selecionado: o mapa vai até ele, destaca o pino e abre o balão. */
    selecionado = input<number | null>(null);
    /** Clique num pino (o id do ponto). */
    pontoClicado = output<number>();
    posicaoSelecionada = output<{ lat: number; lng: number }>();

    alvo = viewChild.required<ElementRef<HTMLDivElement>>('alvo');
    caixa = viewChild.required<ElementRef<HTMLDivElement>>('caixa');
    ativo = signal(false);
    dicaVisivel = signal(false);
    teclaZoom = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
    private timerDica: ReturnType<typeof setTimeout> | undefined;

    private L: typeof Leaflet | null = null;
    private mapa: Leaflet.Map | null = null;
    private camada: Leaflet.LayerGroup | null = null;
    private marcadorSelecao: Leaflet.Marker | null = null;
    private marcadores = new Map<number, Leaflet.Marker>();

    constructor() {
        effect(() => {
            const pts = this.pontos();
            const c = this.centro();
            this.linksNovaJanela(); // redesenha os balões se a configuração mudar
            if (this.mapa) {
                this.desenhar(pts, c);
            }
        });
        // vista controlada pela página (sem enquadrar nos pontos): segue o centro/zoom informados
        effect(() => {
            const c = this.centro();
            const z = this.zoom();
            if (this.ajustarAosPontos() || !c) return;
            untracked(() => this.mapa?.setView(c, z));
        });
        effect(() => {
            const id = this.selecionado();
            untracked(() => this.irParaSelecionado(id));
        });
    }

    // listener em fase de captura (o template do Angular não tem modificador ".capture")
    private ouvinteRoda = (e: WheelEvent) => this.aoRolar(e);

    ngAfterViewInit() {
        this.caixa().nativeElement.addEventListener('wheel', this.ouvinteRoda, { capture: true, passive: true });
        if (!this.cliqueParaCarregar()) {
            this.ativar();
        }
    }

    async ativar() {
        this.ativo.set(true);
        if (this.mapa) return;
        const L = (await import('leaflet')).default ?? (await import('leaflet'));
        this.L = L as typeof Leaflet;
        const centro = this.centro() ?? this.mediaPontos() ?? [-15.7939, -47.8828];
        this.mapa = this.L.map(this.alvo().nativeElement, { scrollWheelZoom: true, wheelPxPerZoomLevel: 90 }).setView(centro, this.zoom());
        this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
        }).addTo(this.mapa);
        this.camada = this.L.layerGroup().addTo(this.mapa);
        if (this.selecionavel()) {
            this.mapa.on('click', (e: Leaflet.LeafletMouseEvent) => {
                this.marcarSelecao(e.latlng.lat, e.latlng.lng);
                this.posicaoSelecionada.emit({ lat: +e.latlng.lat.toFixed(7), lng: +e.latlng.lng.toFixed(7) });
            });
        }
        this.desenhar(this.pontos(), this.centro());
        setTimeout(() => this.mapa?.invalidateSize(), 50);
    }

    /**
     * Captura a roda antes do Leaflet. No modo 'ctrl', sem Ctrl/⌘ o evento não chega ao
     * mapa (a página rola normalmente) e aparece a dica; com Ctrl/⌘ (ou pinça, que o
     * navegador envia como ctrlKey) o Leaflet recebe e dá zoom, bloqueando o zoom da página.
     */
    aoRolar(e: WheelEvent) {
        if (!this.mapa || this.zoomRoda() === 'livre' || e.ctrlKey || e.metaKey) {
            this.dicaVisivel.set(false);
            return;
        }
        e.stopPropagation();
        this.dicaVisivel.set(true);
        clearTimeout(this.timerDica);
        this.timerDica = setTimeout(() => this.dicaVisivel.set(false), 1500);
    }

    private icone(ativo = false): Leaflet.DivIcon {
        return this.L!.divIcon({ className: ativo ? 'pino-mapa pino-mapa--ativo' : 'pino-mapa', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -26] });
    }

    /** Destaca o pino selecionado; com voar = true, leva o mapa até ele (sem zoom exagerado) e abre o balão. */
    private irParaSelecionado(id: number | null, voar = true) {
        if (!this.mapa) return;
        this.marcadores.forEach((m, k) => {
            m.setIcon(this.icone(k === id));
            m.setZIndexOffset(k === id ? 1000 : 0);
        });
        const m = id != null ? this.marcadores.get(id) : undefined;
        if (!m) {
            if (voar) this.mapa.closePopup();
            return;
        }
        if (voar) {
            const zoom = Math.max(this.mapa.getZoom(), 15);
            const reduzir = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (reduzir) this.mapa.setView(m.getLatLng(), zoom);
            else this.mapa.flyTo(m.getLatLng(), zoom, { duration: 0.6 });
            m.openPopup();
        }
    }

    private desenhar(pts: PontoMapa[], centro: [number, number] | null) {
        if (!this.L || !this.mapa || !this.camada) return;
        this.camada.clearLayers();
        this.marcadores.clear();
        for (const p of pts) {
            const m = this.L.marker([p.lat, p.lng], { icon: this.icone(), title: p.titulo, keyboard: true });
            const html = `<div class="text-sm"><strong>${esc(p.titulo)}</strong>${p.subtitulo ? `<br><span>${esc(p.subtitulo)}</span>` : ''}${p.preco ? `<br><b class="text-primary">${esc(p.preco)}</b>` : ''}${
                p.link ? `<br><a href="${esc(p.link)}"${this.linksNovaJanela() ? ` target="_blank" rel="noopener">${esc(p.rotuloLink ?? 'Ver imóvel')}<span class="sr-only"> (abre em nova janela)</span>` : `>${esc(p.rotuloLink ?? 'Ver imóvel')}`}</a>` : ''
            }</div>`;
            m.bindPopup(html);
            m.on('click', () => this.pontoClicado.emit(p.id));
            m.addTo(this.camada);
            this.marcadores.set(p.id, m);
        }
        // redesenhou (ex.: filtro): mantém o destaque, sem mexer na vista
        this.irParaSelecionado(this.selecionado(), false);
        if (!this.ajustarAosPontos()) {
            return;
        }
        if (this.selecionavel() && centro) {
            this.marcarSelecao(centro[0], centro[1]);
            this.mapa.setView(centro, Math.max(this.mapa.getZoom(), 15));
        } else if (pts.length > 1) {
            this.mapa.fitBounds(this.L.latLngBounds(pts.map((p) => [p.lat, p.lng] as [number, number])), { padding: [30, 30], maxZoom: 15 });
        } else if (pts.length === 1) {
            this.mapa.setView([pts[0].lat, pts[0].lng], 15);
        } else if (centro) {
            this.mapa.setView(centro, this.zoom());
        }
    }

    private marcarSelecao(lat: number, lng: number) {
        if (!this.L || !this.mapa) return;
        if (!this.marcadorSelecao) {
            this.marcadorSelecao = this.L.marker([lat, lng], { icon: this.icone() }).addTo(this.mapa);
        } else {
            this.marcadorSelecao.setLatLng([lat, lng]);
        }
    }

    private mediaPontos(): [number, number] | null {
        const pts = this.pontos();
        if (!pts.length) return null;
        return [pts.reduce((s, p) => s + p.lat, 0) / pts.length, pts.reduce((s, p) => s + p.lng, 0) / pts.length];
    }

    ngOnDestroy() {
        clearTimeout(this.timerDica);
        this.caixa().nativeElement.removeEventListener('wheel', this.ouvinteRoda, { capture: true });
        this.mapa?.remove();
    }
}

function esc(s: string): string {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
