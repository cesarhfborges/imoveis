import { Component, DestroyRef, ElementRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { FotoImovel, TipoImovel } from '@/app/core/models/models';
import { ImovelFoto } from './imovel-foto';

/**
 * Galeria de fotos do anúncio.
 *  - visão na página: altura contida, foto inteira sobre fundo desfocado, setas, contador e miniaturas;
 *  - clique na foto (ou no botão de expandir): abre em tela cheia com fundo escuro,
 *    setas nas laterais, contador no canto e botão de fechar (Esc, ← e → também funcionam).
 */
@Component({
    selector: 'app-galeria-fotos',
    imports: [ImovelFoto],
    template: `
        <div class="galeria" aria-roledescription="carrossel" [attr.aria-label]="'Fotos: ' + alt()">
            <app-imovel-foto class="galeria__foto" ajuste="contain" [clicavel]="fotos().length > 0" (abrir)="abrirTelaCheia()" [src]="atual()" [tipo]="tipo()" [semente]="semente()" [alt]="rotuloFoto(indice())" />
            @if (fotos().length > 1) {
                <button type="button" class="galeria__seta galeria__seta--esq" (click)="mover(-1)" aria-label="Foto anterior"><i class="pi pi-chevron-left" aria-hidden="true"></i></button>
                <button type="button" class="galeria__seta galeria__seta--dir" (click)="mover(1)" aria-label="Próxima foto"><i class="pi pi-chevron-right" aria-hidden="true"></i></button>
            }
            @if (fotos().length) {
                <button type="button" class="galeria__expandir" (click)="abrirTelaCheia()" aria-label="Ver fotos em tela cheia"><i class="pi pi-window-maximize" aria-hidden="true"></i></button>
            }
            @if (fotoAtual(); as f) {
                <span class="selo-origem-foto selo-origem-foto--grande" [class.ia]="f.editadaIa" [attr.title]="f.editadaIa ? 'O anunciante informou que esta imagem foi criada ou alterada com inteligência artificial' : 'O anunciante informou que esta é uma foto real, sem alterações'">
                    <i class="pi" [class.pi-sparkles]="f.editadaIa" [class.pi-camera]="!f.editadaIa" aria-hidden="true"></i>
                    {{ f.editadaIa ? 'Imagem editada com IA' : 'Foto real' }}
                </span>
            }
            <span class="galeria__contador" aria-live="polite"><i class="pi pi-camera" aria-hidden="true"></i> {{ fotos().length ? indice() + 1 : 0 }}/{{ fotos().length }}</span>
        </div>

        @if (fotos().length > 1) {
            <div class="galeria__miniaturas" role="list" aria-label="Miniaturas">
                @for (f of fotos(); track $index) {
                    <button type="button" role="listitem" class="galeria__mini" [class.ativa]="$index === indice()" (click)="indice.set($index)" [attr.aria-label]="'Ver foto ' + ($index + 1)" [attr.aria-current]="$index === indice()">
                        <img [src]="f.url" alt="" loading="lazy" />
                        @if (f.editadaIa) {
                            <span class="galeria__mini-ia" aria-hidden="true">IA</span>
                        }
                    </button>
                }
            </div>
        }

        @if (telaCheia()) {
            <div class="visualizador" role="dialog" aria-modal="true" [attr.aria-label]="'Fotos em tela cheia: ' + alt()" (click)="fecharSeFundo($event)">
                <img class="visualizador__foto" [src]="atual()" [alt]="rotuloFoto(indice())" />
                <button #fechar type="button" class="visualizador__fechar" (click)="fecharTelaCheia()" aria-label="Fechar fotos (Esc)"><i class="pi pi-times" aria-hidden="true"></i></button>
                @if (fotos().length > 1) {
                    <button type="button" class="visualizador__seta visualizador__seta--esq" (click)="mover(-1)" aria-label="Foto anterior"><i class="pi pi-chevron-left" aria-hidden="true"></i></button>
                    <button type="button" class="visualizador__seta visualizador__seta--dir" (click)="mover(1)" aria-label="Próxima foto"><i class="pi pi-chevron-right" aria-hidden="true"></i></button>
                }
                @if (fotoAtual(); as f) {
                    <span class="selo-origem-foto selo-origem-foto--grande visualizador__origem" [class.ia]="f.editadaIa">
                        <i class="pi" [class.pi-sparkles]="f.editadaIa" [class.pi-camera]="!f.editadaIa" aria-hidden="true"></i>
                        {{ f.editadaIa ? 'Imagem editada com IA' : 'Foto real, sem alterações' }}
                    </span>
                }
                <span class="visualizador__contador"><i class="pi pi-camera" aria-hidden="true"></i> {{ indice() + 1 }}/{{ fotos().length }}</span>
            </div>
        }
    `,
    host: { '(document:keydown)': 'tecla($event)' }
})
export class GaleriaFotos {
    fotos = input<FotoImovel[]>([]);
    alt = input('Imóvel');
    tipo = input<TipoImovel | null>(null);
    semente = input(1);

    indice = signal(0);
    telaCheia = signal(false);
    fotoAtual = computed<FotoImovel | null>(() => this.fotos()[this.indice()] ?? null);
    atual = computed(() => this.fotoAtual()?.url ?? null);

    private botaoFechar = viewChild<ElementRef<HTMLButtonElement>>('fechar');
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
        const ia = this.fotos()[i]?.editadaIa ? ' (imagem editada com IA)' : '';
        return `${this.alt()} - foto ${i + 1} de ${this.fotos().length || 1}${ia}`;
    }

    mover(d: number) {
        const n = this.fotos().length;
        if (n) this.indice.update((i) => (i + d + n) % n);
    }

    abrirTelaCheia() {
        if (!this.fotos().length) return;
        this.focoAnterior = document.activeElement as HTMLElement | null;
        this.telaCheia.set(true);
    }

    fecharTelaCheia() {
        this.telaCheia.set(false);
        this.focoAnterior?.focus();
    }

    fecharSeFundo(e: MouseEvent) {
        if (e.target === e.currentTarget) this.fecharTelaCheia();
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
