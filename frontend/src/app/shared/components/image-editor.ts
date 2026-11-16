import { Component, computed, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SliderModule } from 'primeng/slider';
import { TooltipModule } from 'primeng/tooltip';

/**
 * Como a imagem deve sair do editor: tamanho final, formato e aparência da área útil.
 * A área útil (moldura) tem a mesma proporção de largura × altura.
 */
export interface RecorteImagem {
    largura: number;
    altura: number;
    /** PNG para logos/ícones (mantém transparência); JPEG ou WEBP para fotos. */
    tipo: 'image/png' | 'image/jpeg' | 'image/webp';
    /** 0–1, só para JPEG/WEBP. Padrão 0.88. */
    qualidade?: number;
    /** Cor de fundo onde a imagem não cobre a moldura. Sem cor = transparente (JPEG sempre usa branco). */
    fundo?: string;
    /** Como a imagem começa: cobrindo a moldura (fotos) ou inteira dentro dela (logos). Padrão: cobrir. */
    ajuste?: 'cobrir' | 'conter';
    /** Moldura redonda (foto de perfil). O arquivo continua quadrado. */
    circulo?: boolean;
    /** Prévia em fundo escuro (logo para o tema escuro). */
    previaEscura?: boolean;
}

/** Margem entre a moldura e a borda do palco (px). */
const MARGEM = 28;
const ALTURA_MAX_MOLDURA = 300;
const ZOOM_MAX = 6;
/** Mesmo limite do servidor. */
const TAMANHO_MAXIMO = 5 * 1024 * 1024;

const EXTENSAO: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

/**
 * Editor de imagem em modal: o usuário move (arrastar), aproxima (controle, roda do mouse ou pinça)
 * e gira a imagem sob uma moldura fixa que mostra a área útil. Ao aplicar, a imagem é recortada,
 * redimensionada para o tamanho do {@link RecorteImagem} e emitida como File em (confirmado).
 *
 * Posição e zoom ficam relativos à moldura (x/y em frações da largura dela; zoom em múltiplos do
 * "cobrir"), então a prévia e a saída usam a mesma conta em escalas diferentes.
 */
@Component({
    selector: 'app-image-editor',
    imports: [FormsModule, DialogModule, ButtonModule, SliderModule, TooltipModule],
    template: `
        <p-dialog [blockScroll]="true"
            [visible]="!!arquivo()"
            (visibleChange)="!$event && cancelar()"
            [modal]="true"
            [closeOnEscape]="!processando()"
            [closable]="!processando()"
            [header]="'Ajustar ' + rotulo().toLowerCase()"
            [style]="{ width: '42rem' }"
            [breakpoints]="{ '720px': '96vw' }"
            [draggable]="false"
            [resizable]="false"
            (onHide)="limpar()"
        >
            <div class="editor">
                <div
                    #palco
                    class="editor__palco"
                    [class.editor__palco--escuro]="config().previaEscura"
                    [class.editor__palco--movendo]="movendo()"
                    [style.height.px]="alturaPalco()"
                    tabindex="0"
                    role="application"
                    aria-roledescription="editor de imagem"
                    [attr.aria-label]="'Enquadramento da imagem. Arraste ou use as setas para mover, + e - para aproximar, R para girar.'"
                    [attr.aria-describedby]="id + '-ajuda'"
                    (pointerdown)="aoPressionar($event)"
                    (pointermove)="aoMover($event)"
                    (pointerup)="aoSoltar($event)"
                    (pointercancel)="aoSoltar($event)"
                    (wheel)="aoRolar($event)"
                    (keydown)="aoTeclar($event)"
                >
                    @if (fundoMoldura(); as cor) {
                        <div class="editor__fundo" [style.width.px]="moldura().w" [style.height.px]="moldura().h" [style.background]="cor" [class.editor__fundo--circulo]="config().circulo"></div>
                    }
                    @if (src(); as s) {
                        <img class="editor__img" [src]="s" alt="" draggable="false" [style.width.px]="natural().w" [style.height.px]="natural().h" [style.transform]="transformacao()" (load)="aoCarregar($event)" (error)="erro.set(true)" />
                    }
                    <div class="editor__moldura" [class.editor__moldura--circulo]="config().circulo" [style.width.px]="moldura().w" [style.height.px]="moldura().h" aria-hidden="true">
                        <span class="editor__grade"></span>
                    </div>
                    @if (erro()) {
                        <div class="editor__aviso"><i class="pi pi-exclamation-triangle" aria-hidden="true"></i> Não foi possível abrir esta imagem. Tente outro arquivo.</div>
                    } @else if (!pronta()) {
                        <div class="editor__aviso"><i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Carregando…</div>
                    }
                </div>

                <div class="editor__controles">
                    <div class="editor__linha">
                        <p-button icon="pi pi-search-minus" [text]="true" [rounded]="true" severity="secondary" ariaLabel="Diminuir" pTooltip="Diminuir" tooltipPosition="top" [disabled]="!pronta()" (onClick)="zoomPor(1 / 1.15)" />
                        <p-slider class="flex-1" [ngModel]="posicaoZoom()" (ngModelChange)="zoomDaPosicao($event)" [min]="0" [max]="POSICOES_ZOOM" [step]="1" [disabled]="!pronta()" ariaLabel="Zoom" />
                        <p-button icon="pi pi-search-plus" [text]="true" [rounded]="true" severity="secondary" ariaLabel="Aumentar" pTooltip="Aumentar" tooltipPosition="top" [disabled]="!pronta()" (onClick)="zoomPor(1.15)" />
                        <span class="editor__valor" aria-hidden="true">{{ (zoom() * 100).toFixed(0) }}%</span>
                    </div>
                    <div class="editor__linha">
                        <p-button icon="pi pi-replay" [text]="true" [rounded]="true" severity="secondary" ariaLabel="Girar 90° para a esquerda" pTooltip="Girar à esquerda" tooltipPosition="top" [disabled]="!pronta()" (onClick)="girar(-1)" />
                        <p-slider class="flex-1" [ngModel]="ajusteFino()" (ngModelChange)="mudarAjusteFino($event)" [min]="-45" [max]="45" [step]="0.5" [disabled]="!pronta()" ariaLabel="Endireitar (ajuste fino da rotação)" />
                        <p-button icon="pi pi-refresh" [text]="true" [rounded]="true" severity="secondary" ariaLabel="Girar 90° para a direita" pTooltip="Girar à direita" tooltipPosition="top" [disabled]="!pronta()" (onClick)="girar(1)" />
                        <span class="editor__valor" aria-hidden="true">{{ rotacao() }}°</span>
                    </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-2">
                    <small class="text-muted-color" [id]="id + '-ajuda'"> Arraste para posicionar. Só o que está dentro da moldura será salvo, em {{ config().largura }}×{{ config().altura }} px ({{ extensao().toUpperCase() }}). </small>
                    <p-button label="Redefinir" icon="pi pi-undo" size="small" [text]="true" [disabled]="!pronta()" (onClick)="redefinir()" />
                </div>
            </div>

            <ng-template #footer>
                <p-button label="Cancelar" [text]="true" severity="secondary" [disabled]="processando()" (onClick)="cancelar()" />
                <p-button label="Aplicar e enviar" icon="pi pi-check" [loading]="processando()" [disabled]="!pronta()" (onClick)="aplicar()" />
            </ng-template>
        </p-dialog>
    `,
    styles: `
        .editor {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        .editor__palco {
            position: relative;
            overflow: hidden;
            border-radius: 10px;
            cursor: grab;
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
            /* xadrez = transparência */
            background-color: #f1f5f9;
            background-image: linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
            background-size: 20px 20px;
            background-position:
                0 0,
                0 10px,
                10px -10px,
                -10px 0;
        }
        /* o diálogo fica no <body> (overlayAppendTo), fora do host: o tema escuro é lido do <html> */
        .editor__palco--escuro,
        ::ng-deep .app-dark .editor__palco {
            background-color: #0f172a;
            background-image: linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%);
        }
        .editor__palco--movendo {
            cursor: grabbing;
        }
        .editor__palco:focus-visible {
            outline: 2px solid var(--p-primary-color);
            outline-offset: 2px;
        }
        .editor__img {
            position: absolute;
            left: 50%;
            top: 50%;
            max-width: none;
            max-height: none;
            pointer-events: none;
            transform-origin: center;
            will-change: transform;
        }
        .editor__fundo,
        .editor__moldura {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
        }
        .editor__fundo--circulo,
        .editor__moldura--circulo {
            border-radius: 50%;
        }
        .editor__moldura {
            /* escurece o que fica fora da área útil */
            box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.6);
            outline: 2px solid rgba(255, 255, 255, 0.95);
        }
        .editor__grade {
            position: absolute;
            inset: 0;
            border-radius: inherit;
            opacity: 0;
            transition: opacity 0.15s;
            background:
                linear-gradient(to right, transparent calc(33.33% - 0.5px), rgba(255, 255, 255, 0.6) calc(33.33% - 0.5px), rgba(255, 255, 255, 0.6) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px)),
                linear-gradient(to right, transparent calc(66.66% - 0.5px), rgba(255, 255, 255, 0.6) calc(66.66% - 0.5px), rgba(255, 255, 255, 0.6) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px)),
                linear-gradient(to bottom, transparent calc(33.33% - 0.5px), rgba(255, 255, 255, 0.6) calc(33.33% - 0.5px), rgba(255, 255, 255, 0.6) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px)),
                linear-gradient(to bottom, transparent calc(66.66% - 0.5px), rgba(255, 255, 255, 0.6) calc(66.66% - 0.5px), rgba(255, 255, 255, 0.6) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px));
        }
        .editor__palco--movendo .editor__grade {
            opacity: 1;
        }
        .editor__aviso {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 1rem;
            text-align: center;
            color: #fff;
            font-weight: 500;
            background: rgba(15, 23, 42, 0.6);
        }
        .editor__controles {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }
        .editor__linha {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        .editor__valor {
            width: 3.25rem;
            text-align: right;
            font-variant-numeric: tabular-nums;
            font-size: 0.85rem;
            color: var(--p-text-muted-color);
        }
        @media (prefers-reduced-motion: reduce) {
            .editor__grade {
                transition: none;
            }
        }
    `
})
export class ImageEditor {
    private static seq = 0;
    readonly id = 'img-ed-' + ++ImageEditor.seq;

    /** Arquivo a editar; o modal fica aberto enquanto houver um. */
    arquivo = input<File | null>(null);
    config = input.required<RecorteImagem>();
    rotulo = input('Imagem');

    confirmado = output<File>();
    cancelado = output<void>();

    private palco = viewChild<ElementRef<HTMLDivElement>>('palco');
    private imagem: HTMLImageElement | null = null;

    src = signal<string | null>(null);
    natural = signal({ w: 0, h: 0 });
    pronta = signal(false);
    erro = signal(false);
    processando = signal(false);
    movendo = signal(false);
    private larguraPalco = signal(0);

    /** Posição do centro da imagem em relação ao centro da moldura, em frações da largura da moldura. */
    x = signal(0);
    y = signal(0);
    /** Múltiplos da escala que faz a imagem cobrir a moldura. */
    zoom = signal(1);
    /** Rotação em quartos de volta (0–3) + ajuste fino em graus. */
    quartos = signal(0);
    ajusteFino = signal(0);
    rotacao = computed(() => {
        const r = this.quartos() * 90 + this.ajusteFino();
        return Math.round(((((r + 180) % 360) + 360) % 360) - 180);
    });

    extensao = computed(() => EXTENSAO[this.config().tipo]);
    fundoMoldura = computed(() => {
        const c = this.config();
        return c.tipo === 'image/jpeg' ? c.fundo || '#ffffff' : c.fundo || null;
    });

    moldura = computed(() => {
        const c = this.config();
        const proporcao = c.largura / c.altura;
        let w = Math.max(this.larguraPalco() - MARGEM * 2, 120);
        let h = w / proporcao;
        if (h > ALTURA_MAX_MOLDURA) {
            h = ALTURA_MAX_MOLDURA;
            w = h * proporcao;
        }
        return { w, h };
    });
    alturaPalco = computed(() => Math.max(this.moldura().h + MARGEM * 2, 220));

    /**
     * Fotos (ajuste "cobrir"): a imagem sempre cobre a moldura inteira, sem sobrar área vazia (que sairia
     * branca). Logos e favicon ("conter", PNG transparente) podem ficar menores que a moldura.
     */
    private preencher = computed(() => this.config().ajuste !== 'conter');

    /** Ângulo total da imagem, em radianos (quartos de volta + ajuste fino). */
    private angulo = computed(() => ((this.quartos() * 90 + this.ajusteFino()) * Math.PI) / 180);

    /**
     * Caixa da moldura vista nos eixos da imagem girada: o retângulo w×h girado de -θ ocupa W'×H'.
     * A imagem (já em escala) precisa ser pelo menos desse tamanho para cobrir a moldura.
     */
    private molduraGirada = computed(() => {
        const { w, h } = this.moldura();
        const c = Math.abs(Math.cos(this.angulo()));
        const sn = Math.abs(Math.sin(this.angulo()));
        return { w: w * c + h * sn, h: w * sn + h * c };
    });

    /** Menor zoom (em múltiplos do "cobrir") que ainda cobre a moldura no ângulo atual: 1 sem rotação fina. */
    private zoomCobrir = computed(() => {
        const { w: iw, h: ih } = this.natural();
        const m = this.moldura();
        if (!iw || !ih) return 1;
        const g = this.molduraGirada();
        return Math.max(g.w / iw, g.h / ih) / this.cobrir(m.w, m.h);
    });

    /** Zoom mínimo: fotos param quando a imagem encosta na moldura; logos podem ir à metade do "caber inteira". */
    private zoomMin = computed(() => (this.preencher() ? this.zoomCobrir() : Math.min(1, this.razaoConter()) * 0.5));
    readonly logMax = Math.log(ZOOM_MAX);
    logMin = computed(() => Math.log(this.zoomMin()));
    zoomLog = computed(() => Math.log(this.zoom()));
    /**
     * Posição da alça do zoom (0…POSICOES_ZOOM), em escala logarítmica entre o zoom mínimo e o máximo.
     * A faixa do slider é fixa: o mínimo depende da imagem e da moldura, e o p-slider não reposiciona
     * a alça quando o [min] muda depois de desenhado (a alça ficava no lugar errado e o zoom saltava).
     */
    readonly POSICOES_ZOOM = 1000;
    posicaoZoom = computed(() => Math.round(((this.zoomLog() - this.logMin()) / (this.logMax - this.logMin())) * this.POSICOES_ZOOM));

    /** Escala (px de tela por px da imagem) que faz a imagem cobrir uma moldura w×h. */
    private cobrir(w: number, h: number) {
        const { w: iw, h: ih } = this.dimensoesGiradas();
        return iw && ih ? Math.max(w / iw, h / ih) : 1;
    }
    private dimensoesGiradas = computed(() => {
        const n = this.natural();
        return this.quartos() % 2 ? { w: n.h, h: n.w } : n;
    });
    private razaoConter = computed(() => {
        const { w: iw, h: ih } = this.dimensoesGiradas();
        const { w, h } = this.moldura();
        if (!iw || !ih) return 1;
        return Math.min(w / iw, h / ih) / Math.max(w / iw, h / ih);
    });

    transformacao = computed(() => {
        const m = this.moldura();
        const s = this.zoom() * this.cobrir(m.w, m.h);
        const graus = this.quartos() * 90 + this.ajusteFino();
        return `translate(-50%, -50%) translate(${this.x() * m.w}px, ${this.y() * m.w}px) rotate(${graus}deg) scale(${s})`;
    });

    private ponteiros = new Map<number, { x: number; y: number }>();

    constructor() {
        // abre um arquivo novo
        effect((onCleanup) => {
            const f = this.arquivo();
            if (!f) return;
            const url = URL.createObjectURL(f);
            this.pronta.set(false);
            this.erro.set(false);
            this.natural.set({ w: 0, h: 0 });
            this.src.set(url);
            onCleanup(() => URL.revokeObjectURL(url));
        });
        // acompanha a largura do palco (muda com a janela)
        effect((onCleanup) => {
            const el = this.palco()?.nativeElement;
            if (!el) return;
            const ro = new ResizeObserver(([e]) => {
                this.larguraPalco.set(e.contentRect.width);
                this.reenquadrar();
            });
            ro.observe(el);
            onCleanup(() => ro.disconnect());
        });
    }

    aoCarregar(e: Event) {
        const img = e.target as HTMLImageElement;
        if (!img.naturalWidth || !img.naturalHeight) {
            this.erro.set(true);
            return;
        }
        this.imagem = img;
        this.natural.set({ w: img.naturalWidth, h: img.naturalHeight });
        this.redefinir();
        this.pronta.set(true);
        queueMicrotask(() => this.palco()?.nativeElement.focus({ preventScroll: true }));
    }

    redefinir() {
        this.quartos.set(0);
        this.ajusteFino.set(0);
        this.x.set(0);
        this.y.set(0);
        // fotos: zoom em que a moldura fica inteira dentro da imagem (encosta na altura ou na largura)
        this.zoom.set(this.config().ajuste === 'conter' ? this.razaoConter() : 1);
    }

    /**
     * Define a posição (centro da imagem em relação ao centro da moldura, em frações da largura da moldura),
     * limitada para que, nas fotos, a moldura nunca saia da imagem — inclusive com a imagem girada.
     */
    private posicionar(x: number, y: number) {
        if (this.preencher() && this.pronta()) {
            const { w: iw, h: ih } = this.natural();
            const m = this.moldura();
            const s = this.zoom() * this.cobrir(m.w, m.h);
            const g = this.molduraGirada();
            const a = this.angulo();
            const [cos, sen] = [Math.cos(a), Math.sin(a)];
            // deslocamento em px, levado para os eixos da imagem
            const ox = x * m.w;
            const oy = y * m.w;
            let u = ox * cos + oy * sen;
            let v = -ox * sen + oy * cos;
            // quanto a imagem sobra além da moldura, de cada lado
            const folgaX = Math.max(0, (s * iw - g.w) / 2);
            const folgaY = Math.max(0, (s * ih - g.h) / 2);
            u = Math.min(folgaX, Math.max(-folgaX, u));
            v = Math.min(folgaY, Math.max(-folgaY, v));
            x = (u * cos - v * sen) / m.w;
            y = (u * sen + v * cos) / m.w;
        }
        this.x.set(x);
        this.y.set(y);
    }

    /** Garante o zoom mínimo do ângulo atual e reenquadra a posição. */
    private reenquadrar() {
        if (this.zoom() < this.zoomMin()) this.zoom.set(this.zoomMin());
        this.posicionar(this.x(), this.y());
    }

    mudarAjusteFino(graus: number) {
        this.ajusteFino.set(graus);
        this.reenquadrar();
    }

    // ------------------------------------------------------------ zoom / rotação
    zoomDaPosicao(posicao: number) {
        this.zoomPara(Math.exp(this.logMin() + (posicao / this.POSICOES_ZOOM) * (this.logMax - this.logMin())));
    }

    zoomPor(fator: number, cx = 0, cy = 0) {
        this.zoomPara(this.zoom() * fator, cx, cy);
    }

    /** Muda o zoom mantendo parado o ponto (cx, cy) — em px a partir do centro da moldura. */
    zoomPara(novo: number, cx = 0, cy = 0) {
        const anterior = this.zoom();
        const z = Math.min(ZOOM_MAX, Math.max(this.zoomMin(), novo));
        if (z === anterior) return;
        const w = this.moldura().w;
        const k = z / anterior;
        this.zoom.set(z);
        this.posicionar((cx + (this.x() * w - cx) * k) / w, (cy + (this.y() * w - cy) * k) / w);
    }

    girar(sentido: 1 | -1) {
        const conterAntes = this.config().ajuste === 'conter' && Math.abs(this.zoom() - this.razaoConter()) < 0.001;
        // gira também a posição para a imagem continuar no mesmo lugar em relação à moldura
        const [x, y] = [this.x(), this.y()];
        this.quartos.update((q) => (q + sentido + 4) % 4);
        if (conterAntes) this.zoom.set(this.razaoConter());
        else this.zoom.update((z) => Math.min(ZOOM_MAX, Math.max(this.zoomMin(), z)));
        this.posicionar(sentido === 1 ? -y : y, sentido === 1 ? x : -x);
    }

    // ------------------------------------------------------------ arrastar / pinça / roda / teclado
    aoPressionar(e: PointerEvent) {
        if (!this.pronta() || (e.pointerType === 'mouse' && e.button !== 0)) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        this.ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
        this.movendo.set(true);
    }

    aoMover(e: PointerEvent) {
        const antes = this.ponteiros.get(e.pointerId);
        if (!antes) return;
        const w = this.moldura().w;
        if (this.ponteiros.size === 1) {
            this.posicionar(this.x() + (e.clientX - antes.x) / w, this.y() + (e.clientY - antes.y) / w);
        } else if (this.ponteiros.size === 2) {
            const outro = [...this.ponteiros].find(([id]) => id !== e.pointerId)![1];
            const distAntes = Math.hypot(antes.x - outro.x, antes.y - outro.y);
            const distAgora = Math.hypot(e.clientX - outro.x, e.clientY - outro.y);
            // move pela metade do deslocamento (o ponto médio anda metade)
            this.posicionar(this.x() + (e.clientX - antes.x) / 2 / w, this.y() + (e.clientY - antes.y) / 2 / w);
            if (distAntes > 0) {
                const c = this.centroMoldura();
                this.zoomPor(distAgora / distAntes, (e.clientX + outro.x) / 2 - c.x, (e.clientY + outro.y) / 2 - c.y);
            }
        }
        this.ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    aoSoltar(e: PointerEvent) {
        this.ponteiros.delete(e.pointerId);
        if (!this.ponteiros.size) this.movendo.set(false);
    }

    aoRolar(e: WheelEvent) {
        if (!this.pronta()) return;
        e.preventDefault();
        const c = this.centroMoldura();
        this.zoomPor(Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015)), e.clientX - c.x, e.clientY - c.y);
    }

    aoTeclar(e: KeyboardEvent) {
        if (!this.pronta()) return;
        const passo = (e.shiftKey ? 1 : 10) / this.moldura().w;
        switch (e.key) {
            case 'ArrowLeft':
                this.posicionar(this.x() - passo, this.y());
                break;
            case 'ArrowRight':
                this.posicionar(this.x() + passo, this.y());
                break;
            case 'ArrowUp':
                this.posicionar(this.x(), this.y() - passo);
                break;
            case 'ArrowDown':
                this.posicionar(this.x(), this.y() + passo);
                break;
            case '+':
            case '=':
                this.zoomPor(1.1);
                break;
            case '-':
                this.zoomPor(1 / 1.1);
                break;
            case 'r':
                this.girar(1);
                break;
            case 'R':
                this.girar(-1);
                break;
            default:
                return;
        }
        e.preventDefault();
    }

    private centroMoldura() {
        const r = this.palco()!.nativeElement.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    // ------------------------------------------------------------ saída
    cancelar() {
        if (this.processando()) return;
        this.cancelado.emit();
    }

    limpar() {
        this.ponteiros.clear();
        this.movendo.set(false);
        this.pronta.set(false);
        this.src.set(null);
        this.imagem = null;
    }

    async aplicar() {
        const img = this.imagem;
        const f = this.arquivo();
        if (!img || !f || this.processando()) return;
        this.processando.set(true);
        try {
            const blob = await this.gerar(img);
            const base = f.name.replace(/\.[^.]+$/, '') || 'imagem';
            const ext = EXTENSAO[blob.type] ?? 'png';
            this.confirmado.emit(new File([blob], `${base}.${ext}`, { type: blob.type }));
        } catch (err) {
            console.error(err);
            this.erro.set(true);
        } finally {
            this.processando.set(false);
        }
    }

    /** Desenha o enquadramento atual num canvas do tamanho final e codifica. */
    private async gerar(img: HTMLImageElement): Promise<Blob> {
        const c = this.config();
        const W = c.largura;
        const H = c.altura;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        const fundo = this.fundoMoldura();
        if (fundo) {
            ctx.fillStyle = fundo;
            ctx.fillRect(0, 0, W, H);
        }

        const escala = this.zoom() * this.cobrir(W, H);
        // reduzir muito de uma vez no canvas serrilha; o navegador reduz melhor com createImageBitmap
        let fonte: CanvasImageSource = img;
        let fw = img.naturalWidth;
        let fh = img.naturalHeight;
        let escalaRestante = escala;
        if (escala < 0.5 && 'createImageBitmap' in window) {
            try {
                const rw = Math.max(1, Math.round(fw * escala));
                const rh = Math.max(1, Math.round(fh * escala));
                fonte = await createImageBitmap(img, { resizeWidth: rw, resizeHeight: rh, resizeQuality: 'high' });
                escalaRestante = escala * (fw / rw);
                fw = rw;
                fh = rh;
            } catch {
                /* usa a imagem original */
            }
        }

        ctx.translate(W / 2 + this.x() * W, H / 2 + this.y() * W);
        ctx.rotate(((this.quartos() * 90 + this.ajusteFino()) * Math.PI) / 180);
        ctx.scale(escalaRestante, escalaRestante);
        ctx.drawImage(fonte, -fw / 2, -fh / 2, fw, fh);
        if (fonte instanceof ImageBitmap) fonte.close();

        let qualidade = c.qualidade ?? 0.88;
        let blob = await paraBlob(canvas, c.tipo, qualidade);
        // garante o limite do servidor nos formatos com perda
        while (blob.size > TAMANHO_MAXIMO && c.tipo !== 'image/png' && qualidade > 0.4) {
            qualidade -= 0.1;
            blob = await paraBlob(canvas, c.tipo, qualidade);
        }
        if (blob.size > TAMANHO_MAXIMO) throw new Error('Imagem final acima de 5 MB');
        return blob;
    }
}

function paraBlob(canvas: HTMLCanvasElement, tipo: string, qualidade: number): Promise<Blob> {
    return new Promise((ok, falha) => canvas.toBlob((b) => (b ? ok(b) : falha(new Error('Falha ao gerar a imagem'))), tipo, qualidade));
}

/** Tamanhos esperados pelo sistema para cada imagem editável. */
export const RECORTES = {
    /** Logo do cabeçalho (exibida com 40 px de altura e até ~176 px de largura): 4:1, transparente. */
    logo: { largura: 800, altura: 200, tipo: 'image/png', ajuste: 'conter' },
    logoEscuro: { largura: 800, altura: 200, tipo: 'image/png', ajuste: 'conter', previaEscura: true },
    /** Ícone da aba: quadrado, transparente. */
    favicon: { largura: 256, altura: 256, tipo: 'image/png', ajuste: 'conter' },
    /** Open Graph (WhatsApp, Facebook, LinkedIn…). */
    compartilhamento: { largura: 1200, altura: 630, tipo: 'image/jpeg', qualidade: 0.85 },
    /** Foto de perfil: quadrada, mostrada em círculo. */
    fotoPerfil: { largura: 512, altura: 512, tipo: 'image/jpeg', qualidade: 0.88, circulo: true },
    /** Capa do perfil público do anunciante: faixa fina 8:1, exibida nessa mesma proporção na página do perfil. */
    capaPerfil: { largura: 1600, altura: 200, tipo: 'image/jpeg', qualidade: 0.85 }
} satisfies Record<string, RecorteImagem>;
