import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { DocumentoPublico, tipoDocumentoInfo } from '@/app/core/models/models';
import { DocumentoService } from '@/app/core/services/documento.service';
import { ConfigService } from '@/app/core/services/config.service';
import { DocumentoConteudo, TituloDocumento } from '@/app/shared/components/documento-conteudo';
import { AppLogo } from '@/app/shared/components/app-logo';

/** Leitura de um documento (/documentos/:slug) com índice gerado pelos títulos, versão e impressão. */
@Component({
    selector: 'app-documento-page',
    imports: [DatePipe, RouterLink, DocumentoConteudo, AppLogo],
    template: `
        <div class="site-container secao">
            @if (doc(); as d) {
                <nav aria-label="Caminho" class="text-sm text-muted-color mb-4 flex items-center gap-2 print:hidden">
                    <a routerLink="/documentos" class="hover:text-primary hover:underline">Documentos</a>
                    <i class="pi pi-angle-right text-xs" aria-hidden="true"></i>
                    <span aria-current="page">{{ d.titulo }}</span>
                </nav>
                <div class="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] items-start">
                    @if (titulos().length > 1) {
                        <aside class="lg:sticky lg:top-28 print:hidden" aria-labelledby="indice-titulo">
                            <div class="p-4 rounded-border border border-surface bg-surface-0 dark:bg-surface-900">
                                <h2 id="indice-titulo" class="text-sm font-semibold uppercase tracking-wide text-muted-color mt-0 mb-3">Nesta página</h2>
                                <ol class="list-none p-0 m-0 flex flex-col gap-1 text-sm">
                                    @for (t of titulos(); track t.id) {
                                        <li [style.padding-left.rem]="(t.nivel - nivelMinimo()) * 0.85">
                                            <a [href]="'/documentos/' + d.slug + '#' + t.id" (click)="irPara($event, t.id)" class="block py-1 text-muted-color hover:text-primary" [class.font-semibold]="t.nivel === nivelMinimo()">{{ t.texto }}</a>
                                        </li>
                                    }
                                </ol>
                            </div>
                        </aside>
                    }
                    <article class="documento-impressao min-w-0 p-6 md:p-10 rounded-border border border-surface bg-surface-0 dark:bg-surface-900" [class.lg:col-span-2]="titulos().length <= 1" aria-labelledby="doc-titulo">
                        <!-- só na impressão: logo e nome do site no topo da folha -->
                        <div class="documento-impressao__marca" aria-hidden="true">
                            <app-logo [escuro]="false" />
                            @if (temLogoImagem()) {
                                <span class="documento-impressao__nome">
                                    <strong>{{ nomeSite() }}</strong>
                                    @if (slogan()) {
                                        <small>{{ slogan() }}</small>
                                    }
                                </span>
                            }
                        </div>
                        <header class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 mb-8 border-b border-surface">
                            <div>
                                <span class="inline-flex items-center gap-2 text-sm font-semibold text-primary"><i class="pi {{ info().icone }}" aria-hidden="true"></i> {{ info().label }}</span>
                                <h1 id="doc-titulo" class="text-3xl font-bold mt-2 mb-2">{{ d.titulo }}</h1>
                                <div class="text-sm text-muted-color">Versão {{ d.versao }} · em vigor desde {{ d.versaoEm | date: 'dd/MM/yyyy' }}</div>
                                <!-- só na impressão: de onde veio o documento -->
                                <div class="documento-impressao__origem">{{ nomeSite() }} · {{ endereco() }}</div>
                            </div>
                            <button type="button" class="site-acao site-acao--claro shrink-0 print:hidden" (click)="imprimir()"><i class="pi pi-print" aria-hidden="true"></i> Imprimir / PDF</button>
                        </header>
                        <app-documento-conteudo [html]="d.conteudo" (titulos)="titulos.set($event)" />
                    </article>
                </div>
            } @else if (naoEncontrado()) {
                <div class="text-center py-16">
                    <h1 class="text-2xl font-semibold">Documento não encontrado</h1>
                    <div class="text-muted-color mb-6">Ele pode ter sido removido ou o endereço mudou.</div>
                    <a routerLink="/documentos" class="site-acao site-acao--escuro">Ver todos os documentos</a>
                </div>
            } @else {
                <div class="text-muted-color py-16 text-center"><i class="pi pi-spin pi-spinner mr-2" aria-hidden="true"></i> Carregando…</div>
            }
        </div>
    `
})
export class DocumentoPage {
    private documentos = inject(DocumentoService);
    private config = inject(ConfigService);

    slug = input.required<string>();
    naoEncontrado = signal(false);
    titulos = signal<TituloDocumento[]>([]);
    nivelMinimo = computed(() => Math.min(...this.titulos().map((t) => t.nivel), 6));

    doc = toSignal(
        toObservable(this.slug).pipe(
            tap(() => this.naoEncontrado.set(false)),
            switchMap((s) =>
                this.documentos.porSlug(s).pipe(
                    tap((d) => this.config.definirTitulo(d.titulo)),
                    catchError(() => {
                        this.naoEncontrado.set(true);
                        return of(null as DocumentoPublico | null);
                    })
                )
            )
        ),
        { initialValue: null }
    );
    info = computed(() => tipoDocumentoInfo(this.doc()?.tipo ?? 'OUTRO'));

    irPara(e: Event, id: string) {
        e.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + id);
    }

    nomeSite = computed(() => this.config.config().nomeApp);
    slogan = computed(() => this.config.config().slogan);
    /** Com logo em imagem, o nome vai ao lado; sem imagem, o componente de logo já mostra o nome. */
    temLogoImagem = computed(() => !!this.config.config().logoUrl);
    endereco = computed(() => (typeof location !== 'undefined' ? `${location.origin}/documentos/${this.slug()}` : ''));

    constructor() {
        // enquanto o documento está aberto, imprimir (botão ou Ctrl+P) sai só com o documento
        if (typeof document !== 'undefined') {
            document.body.classList.add('imprimindo-documento');
            inject(DestroyRef).onDestroy(() => document.body.classList.remove('imprimindo-documento'));
        }
    }

    imprimir() {
        window.print();
    }
}
