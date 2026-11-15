import { Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { FotoImovel, TipoImovel } from '@/app/core/models/models';
import { ImovelFoto } from './imovel-foto';
import { Deslizar } from '@/app/shared/directives/deslizar';

/**
 * Galeria de fotos do anúncio.
 *  - visão na página: altura contida, foto inteira sobre fundo desfocado, setas, contador e miniaturas;
 *  - clique na foto (ou no botão de expandir): abre em tela cheia com fundo escuro,
 *    setas nas laterais, contador no canto e botão de fechar (Esc, ← e → também funcionam);
 *  - no celular: deslizar o dedo para os lados troca a foto (nas duas visões) e, na tela cheia,
 *    deslizar para baixo fecha.
 */
@Component({
    selector: 'app-galeria-fotos',
    imports: [ImovelFoto, Deslizar],
    template: `
        <!-- Com a tela cheia aberta, a galeria inteira sai do DOM (nada é desenhado nem atualizado por baixo).
             Abrir: a foto "voa" da galeria para a tela cheia; a galeria esmaece, encolhe e o conteúdo sobe.
             Fechar: o caminho inverso (o conteúdo desce, a galeria reaparece e a foto volta para o lugar). -->
        @if (galeriaNoDom()) {
            <div #conteudo class="galeria-conteudo">
                <div
                    class="galeria"
                    appDeslizar
                    [deslizarAtivo]="fotos().length > 1"
                    [temAnterior]="indice() > 0"
                    [temProximo]="indice() < fotos().length - 1"
                    (deslizar)="mover($event)"
                    aria-roledescription="carrossel"
                    [attr.aria-label]="'Fotos: ' + alt()"
                >
                    @if (fotos().length) {
                        <!-- todas as fotos lado a lado; a faixa anda uma largura por foto e acompanha o dedo -->
                        <div class="carrossel-trilho" [style.--i]="indice()">
                            @for (f of fotos(); track $index) {
                                <app-imovel-foto
                                    class="carrossel-slide galeria__foto"
                                    ajuste="contain"
                                    [clicavel]="true"
                                    (abrir)="abrirTelaCheia()"
                                    [src]="f.url"
                                    [alt]="rotuloFoto($index)"
                                    [inert]="$index !== indice()"
                                    [attr.aria-hidden]="$index !== indice() ? 'true' : null"
                                />
                            }
                        </div>
                    } @else {
                        <app-imovel-foto class="galeria__foto" ajuste="contain" [src]="null" [tipo]="tipo()" [semente]="semente()" [alt]="alt()" />
                    }
                    @if (fotos().length > 1) {
                        <button type="button" class="galeria__seta galeria__seta--esq" (click)="mover(-1)" aria-label="Foto anterior"><i class="pi pi-chevron-left" aria-hidden="true"></i></button>
                        <button type="button" class="galeria__seta galeria__seta--dir" (click)="mover(1)" aria-label="Próxima foto"><i class="pi pi-chevron-right" aria-hidden="true"></i></button>
                    }
                    @if (fotos().length) {
                        <button #expandir type="button" class="galeria__expandir" (click)="abrirTelaCheia()" aria-label="Ver fotos em tela cheia"><i class="pi pi-window-maximize" aria-hidden="true"></i></button>
                    }
                    @if (fotoAtual(); as f) {
                        @if (f.origem !== 'NAO_INFORMADO') {
                            <span
                                class="selo-origem-foto selo-origem-foto--grande"
                                [class.ia]="f.origem === 'IA'"
                                [attr.title]="f.origem === 'IA' ? 'O anunciante informou que esta imagem foi criada ou alterada com inteligência artificial' : 'O anunciante informou que esta é uma foto real, sem alterações'"
                            >
                                <i class="pi" [class.pi-sparkles]="f.origem === 'IA'" [class.pi-camera]="f.origem === 'REAL'" aria-hidden="true"></i>
                                {{ f.origem === 'IA' ? 'Editada/gerada com IA' : 'Foto real' }}
                            </span>
                        }
                    }
                    <span class="galeria__contador" aria-live="polite"><i class="pi pi-camera" aria-hidden="true"></i> {{ fotos().length ? indice() + 1 : 0 }}/{{ fotos().length }}</span>
                </div>

                @if (fotos().length > 1) {
                    <div class="galeria__miniaturas" role="list" aria-label="Miniaturas">
                        @for (f of fotos(); track $index) {
                            <button type="button" role="listitem" class="galeria__mini" [class.ativa]="$index === indice()" (click)="indice.set($index)" [attr.aria-label]="'Ver foto ' + ($index + 1)" [attr.aria-current]="$index === indice()">
                                <img [src]="f.url" alt="" loading="lazy" />
                                @if (f.origem === 'IA') {
                                    <span class="galeria__mini-ia" aria-hidden="true">IA</span>
                                }
                            </button>
                        }
                    </div>
                }

                @if (algumaInformada()) {
                    <aside class="aviso-origem-fotos" aria-labelledby="aviso-origem-titulo">
                        <i class="pi pi-info-circle" aria-hidden="true"></i>
                        <div>
                            <h2 id="aviso-origem-titulo">Sobre as fotos deste anúncio</h2>
                            <p>
                                As indicações <strong>Foto real</strong> e <strong>Editada/gerada com IA</strong> foram declaradas pelo próprio anunciante. Exibimos essa informação por transparência com você, em linha com os princípios de
                                transparência da LGPD (Lei nº 13.709/2018) e com o direito à informação clara previsto no Código de Defesa do Consumidor (Lei nº 8.078/1990, art. 6º, III).
                            </p>
                            <p>
                                A veracidade das imagens e a correspondência com o estado real do imóvel são de responsabilidade do anunciante. Imagens criadas ou alteradas com inteligência artificial podem não representar o imóvel exatamente como
                                ele é: confirme os detalhes na visita.
                                @if (algumaNaoInformada()) {
                                    Fotos sem indicação não tiveram a origem informada.
                                }
                            </p>
                        </div>
                    </aside>
                }
            </div>
        }

        @if (telaCheia()) {
            <div
                #visualizador
                class="visualizador"
                appDeslizar
                [deslizarAtivo]="fotos().length > 1"
                [temAnterior]="indice() > 0"
                [temProximo]="indice() < fotos().length - 1"
                [deslizarVertical]="true"
                (deslizar)="mover($event)"
                (deslizarBaixo)="fecharTelaCheia()"
                role="dialog"
                aria-modal="true"
                [attr.aria-label]="'Fotos em tela cheia: ' + alt()"
                (click)="fecharSeFundo($event)"
            >
                <div class="visualizador__fundo" aria-hidden="true"></div>
                <div class="carrossel-trilho visualizador__trilho" [style.--i]="indice()">
                    @for (f of fotos(); track $index) {
                        <div class="carrossel-slide visualizador__slide" [inert]="$index !== indice()" [attr.aria-hidden]="$index !== indice() ? 'true' : null">
                            <img class="visualizador__foto" [src]="f.url" [alt]="rotuloFoto($index)" draggable="false" />
                        </div>
                    }
                </div>
                <button #fechar type="button" class="visualizador__fechar" (click)="fecharTelaCheia()" aria-label="Fechar fotos (Esc)"><i class="pi pi-times" aria-hidden="true"></i></button>
                @if (fotos().length > 1) {
                    <button type="button" class="visualizador__seta visualizador__seta--esq" (click)="mover(-1)" aria-label="Foto anterior"><i class="pi pi-chevron-left" aria-hidden="true"></i></button>
                    <button type="button" class="visualizador__seta visualizador__seta--dir" (click)="mover(1)" aria-label="Próxima foto"><i class="pi pi-chevron-right" aria-hidden="true"></i></button>
                }
                @if (fotoAtual(); as f) {
                    @if (f.origem !== 'NAO_INFORMADO') {
                        <span class="selo-origem-foto selo-origem-foto--grande visualizador__origem" [class.ia]="f.origem === 'IA'">
                            <i class="pi" [class.pi-sparkles]="f.origem === 'IA'" [class.pi-camera]="f.origem === 'REAL'" aria-hidden="true"></i>
                            {{ f.origem === 'IA' ? 'Imagem criada ou alterada com IA' : 'Foto real, sem alterações' }}
                        </span>
                    }
                }
                <span class="visualizador__contador"><i class="pi pi-camera" aria-hidden="true"></i> {{ indice() + 1 }}/{{ fotos().length }}</span>
            </div>
        }
    `,
    host: { class: 'block', '(document:keydown)': 'tecla($event)' }
})
export class GaleriaFotos {
    fotos = input<FotoImovel[]>([]);
    alt = input('Imóvel');
    tipo = input<TipoImovel | null>(null);
    semente = input(1);

    indice = signal(0);
    telaCheia = signal(false);
    fotoAtual = computed<FotoImovel | null>(() => this.fotos()[this.indice()] ?? null);
    /** O aviso sobre a origem das fotos só aparece se o anunciante informou a origem de alguma. */
    algumaInformada = computed(() => this.fotos().some((f) => f.origem === 'REAL' || f.origem === 'IA'));
    algumaNaoInformada = computed(() => this.fotos().some((f) => f.origem === 'NAO_INFORMADO'));

    private botaoFechar = viewChild<ElementRef<HTMLButtonElement>>('fechar');
    private botaoExpandir = viewChild<ElementRef<HTMLButtonElement>>('expandir');
    private conteudo = viewChild<ElementRef<HTMLElement>>('conteudo');
    private visualizador = viewChild<ElementRef<HTMLElement>>('visualizador');
    /** A galeria (fotos, miniaturas, aviso) está no DOM? Sai depois da animação de abertura e volta antes da de fechamento. */
    galeriaNoDom = signal(true);
    /** Evita abrir/fechar de novo no meio de uma animação. */
    private animando = false;
    private injector = inject(Injector);
    private focoAnterior: HTMLElement | null = null;

    constructor() {
        // se sair da página com a foto aberta, libera a rolagem
        inject(DestroyRef).onDestroy(() => this.travarRolagem(false));
        // nova lista de fotos (outro anúncio): volta para a primeira
        effect(() => {
            this.fotos();
            this.indice.set(0);
        });
        // foco no botão de fechar ao abrir; trava a rolagem da página enquanto aberto
        effect(() => {
            const aberto = this.telaCheia();
            this.travarRolagem(aberto);
            if (aberto) {
                queueMicrotask(() => this.botaoFechar()?.nativeElement.focus());
            }
        });
    }

    /**
     * Trava a rolagem da página (em qualquer largura de tela) enquanto a foto está em tela cheia.
     * Compensa a largura da barra de rolagem para o conteúdo não "pular" ao abrir.
     */
    private travarRolagem(travar: boolean) {
        const html = document.documentElement;
        if (travar) {
            const barra = window.innerWidth - html.clientWidth;
            html.classList.add('rolagem-travada');
            document.body.style.paddingRight = barra > 0 ? `${barra}px` : '';
        } else {
            html.classList.remove('rolagem-travada');
            document.body.style.paddingRight = '';
        }
    }

    rotuloFoto(i: number) {
        const o = this.fotos()[i]?.origem;
        const sufixo = o === 'IA' ? ' (imagem criada ou alterada com IA)' : o === 'REAL' ? ' (foto real)' : '';
        return `${this.alt()} - foto ${i + 1} de ${this.fotos().length || 1}${sufixo}`;
    }

    mover(d: number) {
        const n = this.fotos().length;
        if (n) this.indice.update((i) => (i + d + n) % n);
    }

    // ------------------------------------------------------------ animações de abrir/fechar

    private duracao(ms: number) {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms;
    }

    /** Espera o Angular aplicar no DOM as mudanças de estado (ex.: a galeria voltar). */
    private renderizar() {
        return new Promise<void>((r) => afterNextRender(() => r(), { injector: this.injector }));
    }

    /** Espera a imagem estar pronta para medir o tamanho real (com limite, para não travar). */
    private async pronta(img: HTMLImageElement) {
        if (img.complete && img.naturalWidth) return;
        await Promise.race([img.decode().catch(() => undefined), new Promise((r) => setTimeout(r, 150))]);
    }

    /** Área que a foto atual ocupa de fato dentro da galeria (ela usa object-fit: contain). */
    private async retanguloNaGaleria(): Promise<DOMRect | null> {
        const slide = this.conteudo()?.nativeElement.querySelectorAll('.galeria .carrossel-slide')[this.indice()];
        const img = slide?.querySelector<HTMLImageElement>('img');
        if (!img) return null;
        await this.pronta(img);
        const caixa = img.getBoundingClientRect();
        const { naturalWidth: nw, naturalHeight: nh } = img;
        if (!nw || !nh) return caixa;
        const escala = Math.min(caixa.width / nw, caixa.height / nh);
        const w = nw * escala;
        const h = nh * escala;
        return new DOMRect(caixa.x + (caixa.width - w) / 2, caixa.y + (caixa.height - h) / 2, w, h);
    }

    private fotoTelaCheia() {
        return this.visualizador()?.nativeElement.querySelectorAll<HTMLImageElement>('.visualizador__foto')[this.indice()] ?? null;
    }

    /** Fundo escuro, botões, contador e selo da tela cheia (tudo menos as fotos). */
    private moldura() {
        return Array.from(this.visualizador()?.nativeElement.querySelectorAll<HTMLElement>(':scope > :not(.carrossel-trilho)') ?? []);
    }

    /** transform que faz um elemento que está em "real" aparecer em "aparente" (técnica FLIP). */
    private flip(aparente: DOMRect, real: DOMRect) {
        return `translate(${aparente.x - real.x}px, ${aparente.y - real.y}px) scale(${aparente.width / real.width}, ${aparente.height / real.height})`;
    }

    async abrirTelaCheia() {
        if (!this.fotos().length || this.telaCheia() || this.animando) return;
        this.animando = true;
        this.focoAnterior = document.activeElement as HTMLElement | null;
        const origem = await this.retanguloNaGaleria();
        const cont = this.conteudo()?.nativeElement;
        const altura = cont?.offsetHeight ?? 0;

        this.telaCheia.set(true);
        await this.renderizar();
        const vis = this.visualizador()?.nativeElement;
        const foto = this.fotoTelaCheia();
        // escondido até medir a foto, para não aparecer um quadro já no tamanho final
        if (vis) vis.style.visibility = 'hidden';
        if (foto) await this.pronta(foto);
        if (vis) vis.style.visibility = '';

        const animacoes: Animation[] = this.moldura().map((el) => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: this.duracao(300), easing: 'ease-out' }));
        const destino = foto?.getBoundingClientRect();
        if (foto && origem && destino?.width) {
            animacoes.push(
                foto.animate(
                    [
                        { transformOrigin: '0 0', transform: this.flip(origem, destino) },
                        { transformOrigin: '0 0', transform: 'none' }
                    ],
                    { duration: this.duracao(420), easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
                )
            );
        }

        // galeria esmaece, encolhe e o conteúdo de baixo sobe
        if (cont) {
            await cont.animate([{ opacity: 1 }, { opacity: 0 }], { duration: this.duracao(180), fill: 'forwards' }).finished;
            cont.style.overflow = 'hidden';
            await cont.animate([{ height: `${altura}px` }, { height: '0px' }], { duration: this.duracao(320), easing: 'ease-in-out', fill: 'forwards' }).finished;
        }
        this.galeriaNoDom.set(false);
        await Promise.allSettled(animacoes.map((a) => a.finished));
        this.animando = false;
    }

    async fecharTelaCheia() {
        if (!this.telaCheia() || this.animando) return;
        this.animando = true;

        // galeria volta (ainda transparente) e o conteúdo de baixo desce
        this.galeriaNoDom.set(true);
        await this.renderizar();
        const cont = this.conteudo()?.nativeElement;
        if (cont) {
            cont.style.opacity = '0';
            const altura = cont.offsetHeight;
            cont.style.overflow = 'hidden';
            await cont.animate([{ height: '0px' }, { height: `${altura}px` }], { duration: this.duracao(320), easing: 'ease-in-out' }).finished;
            cont.style.overflow = '';
        }

        // a foto volta para o lugar dela na galeria; fundo e botões somem
        const foto = this.fotoTelaCheia();
        const destino = await this.retanguloNaGaleria();
        const atual = foto?.getBoundingClientRect();
        const animacoes: Animation[] = this.moldura().map((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: this.duracao(320), easing: 'ease-in', fill: 'forwards' }));
        if (foto && destino && atual?.width) {
            animacoes.push(
                foto.animate(
                    [
                        { transformOrigin: '0 0', transform: 'none' },
                        { transformOrigin: '0 0', transform: this.flip(destino, atual) }
                    ],
                    {
                        duration: this.duracao(420),
                        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                        fill: 'forwards'
                    }
                )
            );
        }
        await Promise.allSettled(animacoes.map((a) => a.finished));

        // a foto "pousou" exatamente sobre a da galeria: troca sem emenda
        if (cont) cont.style.opacity = '';
        this.telaCheia.set(false);
        this.animando = false;
        await this.renderizar();
        const alvo = this.focoAnterior?.isConnected ? this.focoAnterior : this.botaoExpandir()?.nativeElement;
        alvo?.focus({ preventScroll: true });
        this.focoAnterior = null;
    }

    /** Clique fora da foto e dos botões (no fundo escuro) fecha. */
    fecharSeFundo(e: MouseEvent) {
        if (!(e.target as Element).closest('img, button')) this.fecharTelaCheia();
    }

    tecla(e: KeyboardEvent) {
        if (!this.telaCheia()) return;
        if (e.key === 'Escape') this.fecharTelaCheia();
        else if (e.key === 'ArrowLeft') this.mover(-1);
        else if (e.key === 'ArrowRight') this.mover(1);
        else if (e.key === 'Tab') {
            // mantém o foco dentro do visualizador
            const botoes = Array.from(document.querySelectorAll<HTMLButtonElement>('.visualizador button'));
            if (!botoes.length) return;
            const i = botoes.indexOf(document.activeElement as HTMLButtonElement);
            const prox = e.shiftKey ? (i <= 0 ? botoes.length - 1 : i - 1) : i === botoes.length - 1 ? 0 : i + 1;
            botoes[prox].focus();
            e.preventDefault();
        }
    }
}
