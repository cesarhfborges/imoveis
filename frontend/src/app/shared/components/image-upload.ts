import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { from, mergeMap, map, catchError, of } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { UploadService } from '@/app/core/services/conta.service';
import { mensagemErro } from '@/app/core/services/api.service';

let seq = 0;

/** Mesmo limite do servidor (spring.servlet.multipart.max-file-size). */
const TAMANHO_MAXIMO = 5 * 1024 * 1024;
/** Quantos arquivos sobem ao mesmo tempo no modo múltiplo. */
const ENVIOS_SIMULTANEOS = 3;

interface ItemEnvio {
    id: number;
    nome: string;
    previa: string;
    /** pronto = já subiu e espera as anteriores do lote para ser emitido na ordem */
    estado: 'enviando' | 'pronto' | 'erro';
    erro?: string;
    arquivo: File;
}

/**
 * Campo de imagem.
 *  - modo simples (padrão): colar uma URL ou enviar UM arquivo, com prévia — emite (urlChange);
 *  - modo múltiplo ([multiplo]="true"): arrastar e soltar ou escolher VÁRIOS arquivos de uma vez.
 *    Sobem em paralelo (3 por vez) e cada URL é emitida em (urlAdicionada) na ordem em que os
 *    arquivos foram escolhidos. Falhas ficam na lista com "tentar de novo".
 */
@Component({
    selector: 'app-image-upload',
    imports: [InputTextModule, ButtonModule],
    template: `
        @if (!multiplo()) {
            <div class="flex flex-col gap-2">
                <label [for]="id" class="font-medium">{{ rotulo() }}</label>
                <div class="flex items-center gap-3">
                    <div class="w-14 h-14 rounded-border border border-surface flex items-center justify-center overflow-hidden shrink-0 bg-surface-50 dark:bg-surface-800">
                        @if (url()) {
                            <img [src]="url()" [alt]="'Prévia: ' + rotulo()" class="max-w-full max-h-full object-contain" />
                        } @else {
                            <i class="pi pi-image text-muted-color" aria-hidden="true"></i>
                        }
                    </div>
                    <input pInputText [id]="id" class="flex-1 min-w-0" [value]="url() ?? ''" (change)="definir($any($event.target).value)" placeholder="https://... ou envie um arquivo" />
                    <input #arquivo type="file" class="hidden" [accept]="aceitar()" (change)="enviarUm($any($event.target).files); arquivo.value = ''" [attr.aria-label]="'Arquivo para ' + rotulo()" />
                    <p-button icon="pi pi-upload" [outlined]="true" [loading]="enviandoUm()" (onClick)="arquivo.click()" [ariaLabel]="'Enviar arquivo para ' + rotulo()" />
                    @if (url()) {
                        <p-button icon="pi pi-times" [text]="true" severity="secondary" (onClick)="definir(null)" [ariaLabel]="'Remover ' + rotulo()" />
                    }
                </div>
            </div>
        } @else {
            <div class="upload-multi">
                <div
                    class="upload-multi__zona"
                    [class.arrastando]="arrastando()"
                    [class.desativada]="lotado()"
                    (dragover)="aoArrastar($event)"
                    (dragleave)="aoSair($event)"
                    (drop)="aoSoltar($event)"
                >
                    <span class="upload-multi__icone" aria-hidden="true"><i class="pi pi-images"></i></span>
                    @if (lotado()) {
                        <strong>Limite de {{ limite() }} fotos atingido</strong>
                        <small>Remova alguma foto para adicionar outras.</small>
                    } @else {
                        <strong>Arraste as fotos para cá</strong>
                        <span class="text-muted-color">ou</span>
                        <p-button [label]="rotulo()" icon="pi pi-upload" (onClick)="seletor.click()" />
                        <small>JPG, PNG, WEBP ou GIF · até 5 MB cada · selecione várias de uma vez{{ vagas() !== null ? ' · restam ' + vagas() : '' }}</small>
                    }
                </div>
                <input #seletor type="file" class="hidden" multiple [accept]="aceitar()" (change)="enviarVarios($any($event.target).files); seletor.value = ''" [attr.aria-label]="rotulo()" />

                <p class="sr-only" aria-live="polite">{{ anuncio() }}</p>

                @if (fila().length) {
                    <ul class="upload-multi__fila">
                        @for (it of fila(); track it.id) {
                            <li [class.erro]="it.estado === 'erro'">
                                <img [src]="it.previa" alt="" />
                                <div class="min-w-0 flex-1">
                                    <span class="upload-multi__nome" [title]="it.nome">{{ it.nome }}</span>
                                    @if (it.estado === 'enviando') {
                                        <span class="upload-multi__estado"><i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Enviando…</span>
                                    } @else if (it.estado === 'pronto') {
                                        <span class="upload-multi__estado upload-multi__estado--ok"><i class="pi pi-check" aria-hidden="true"></i> Enviada</span>
                                    } @else {
                                        <span class="upload-multi__estado upload-multi__estado--erro"><i class="pi pi-exclamation-circle" aria-hidden="true"></i> {{ it.erro }}</span>
                                    }
                                </div>
                                @if (it.estado === 'erro') {
                                    @if (it.arquivo.size <= tamanhoMaximo) {
                                        <p-button icon="pi pi-refresh" [text]="true" size="small" (onClick)="tentarDeNovo(it)" [ariaLabel]="'Tentar enviar de novo ' + it.nome" />
                                    }
                                    <p-button icon="pi pi-times" [text]="true" size="small" severity="secondary" (onClick)="descartar(it)" [ariaLabel]="'Descartar ' + it.nome" />
                                }
                            </li>
                        }
                    </ul>
                }

                <div class="upload-multi__url">
                    <label [for]="id" class="text-sm text-muted-color">Ou cole o endereço de uma imagem</label>
                    <div class="flex gap-2">
                        <input #campoUrl pInputText [id]="id" type="url" class="flex-1 min-w-0" placeholder="https://..." (keydown.enter)="$event.preventDefault(); adicionarUrl(campoUrl)" [disabled]="lotado()" />
                        <p-button label="Adicionar" [outlined]="true" (onClick)="adicionarUrl(campoUrl)" [disabled]="lotado()" />
                    </div>
                </div>
            </div>
        }
    `
})
export class ImageUpload {
    private upload = inject(UploadService);
    private msg = inject(MessageService);

    id = 'img-up-' + ++seq;
    rotulo = input('Imagem');
    url = input<string | null>(null);
    aceitar = input('image/png,image/jpeg,image/webp,image/gif,image/x-icon');
    /** Ativa o envio de vários arquivos de uma vez. */
    multiplo = input(false);
    /** Modo múltiplo: total de imagens permitido e quantas já existem (para calcular as vagas). */
    limite = input<number | null>(null);
    quantidadeAtual = input(0);

    urlChange = output<string | null>();
    urlAdicionada = output<string>();

    readonly tamanhoMaximo = TAMANHO_MAXIMO;
    enviandoUm = signal(false);
    arrastando = signal(false);
    fila = signal<ItemEnvio[]>([]);
    anuncio = signal('');

    private proximoId = 0;
    private emAndamento = computed(() => this.fila().filter((i) => i.estado !== 'erro').length);
    vagas = computed(() => {
        const l = this.limite();
        return l === null ? null : Math.max(0, l - this.quantidadeAtual() - this.emAndamento());
    });
    lotado = computed(() => this.vagas() === 0);

    constructor() {
        inject(DestroyRef).onDestroy(() => this.fila().forEach((i) => URL.revokeObjectURL(i.previa)));
    }

    // ------------------------------------------------------------ modo simples
    definir(v: string | null) {
        this.urlChange.emit(v?.trim() || null);
    }

    enviarUm(files: FileList | null) {
        const f = files?.[0];
        if (!f) return;
        this.enviandoUm.set(true);
        this.upload.enviar(f).subscribe({
            next: (r) => {
                this.enviandoUm.set(false);
                this.urlChange.emit(r.url);
            },
            error: (e) => {
                this.enviandoUm.set(false);
                this.msg.add({ severity: 'error', summary: 'Envio de imagem', detail: mensagemErro(e) });
            }
        });
    }

    // ------------------------------------------------------------ modo múltiplo
    aoArrastar(e: DragEvent) {
        if (this.lotado()) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        this.arrastando.set(true);
    }

    aoSair(e: DragEvent) {
        const zona = e.currentTarget as HTMLElement;
        if (!zona.contains(e.relatedTarget as Node | null)) this.arrastando.set(false);
    }

    aoSoltar(e: DragEvent) {
        e.preventDefault();
        this.arrastando.set(false);
        if (!this.lotado()) this.enviarVarios(e.dataTransfer?.files ?? null);
    }

    enviarVarios(files: FileList | null) {
        if (!files?.length) return;
        const tipos = this.aceitar().split(',').map((t) => t.trim());
        let arquivos = Array.from(files).filter((f) => tipos.includes(f.type));
        const ignorados = files.length - arquivos.length;
        const vagas = this.vagas();
        let excedentes = 0;
        if (vagas !== null && arquivos.length > vagas) {
            excedentes = arquivos.length - vagas;
            arquivos = arquivos.slice(0, vagas);
        }
        if (ignorados || excedentes) {
            const partes = [];
            if (ignorados) partes.push(`${ignorados} arquivo(s) ignorado(s) por não serem imagens aceitas`);
            if (excedentes) partes.push(`${excedentes} foto(s) além do limite de ${this.limite()}`);
            this.msg.add({ severity: 'warn', summary: 'Algumas fotos não foram adicionadas', detail: partes.join('; ') + '.' });
        }
        if (!arquivos.length) return;

        const itens: ItemEnvio[] = arquivos.map((arquivo) => ({ id: ++this.proximoId, nome: arquivo.name, previa: URL.createObjectURL(arquivo), estado: 'enviando', arquivo }));
        this.fila.update((f) => [...f, ...itens]);
        this.processar(itens);
    }

    tentarDeNovo(it: ItemEnvio) {
        const novo: ItemEnvio = { ...it, estado: 'enviando', erro: undefined };
        this.fila.update((f) => f.map((x) => (x.id === it.id ? novo : x)));
        this.processar([novo]);
    }

    descartar(it: ItemEnvio) {
        URL.revokeObjectURL(it.previa);
        this.fila.update((f) => f.filter((x) => x.id !== it.id));
    }

    adicionarUrl(campo: HTMLInputElement) {
        const v = campo.value.trim();
        if (!v) return;
        this.urlAdicionada.emit(v);
        campo.value = '';
    }

    /**
     * Envia o lote em paralelo e emite as URLs na ordem do lote: um resultado só é emitido
     * quando todos os anteriores já terminaram (a 1ª foto escolhida continua sendo a 1ª).
     */
    private processar(itens: ItemEnvio[]) {
        const resultados = new Map<number, { it: ItemEnvio; url: string | null }>();
        let proximo = 0;
        let enviadas = 0;
        from(itens.map((it, ordem) => ({ it, ordem })))
            .pipe(
                mergeMap(({ it, ordem }) => {
                    if (it.arquivo.size > TAMANHO_MAXIMO) {
                        return of({ it, ordem, url: null as string | null, erro: 'Maior que 5 MB' });
                    }
                    return this.upload.enviar(it.arquivo).pipe(
                        map((r) => ({ it, ordem, url: r.url as string | null, erro: '' })),
                        catchError((e) => of({ it, ordem, url: null as string | null, erro: mensagemErro(e) }))
                    );
                }, ENVIOS_SIMULTANEOS)
            )
            .subscribe(({ it, ordem, url, erro }) => {
                resultados.set(ordem, { it, url });
                if (url) enviadas++;
                this.fila.update((f) => f.map((x) => (x.id === it.id ? { ...x, estado: url ? 'pronto' : 'erro', erro: url ? undefined : erro } : x)));
                // emite em ordem tudo o que já está liberado; as enviadas saem da fila ao serem emitidas
                while (resultados.has(proximo)) {
                    const r = resultados.get(proximo)!;
                    if (r.url) {
                        URL.revokeObjectURL(r.it.previa);
                        this.fila.update((f) => f.filter((x) => x.id !== r.it.id));
                        this.urlAdicionada.emit(r.url);
                    }
                    proximo++;
                }
                if (proximo === itens.length) {
                    const falhas = itens.length - enviadas;
                    this.anuncio.set(`${enviadas} de ${itens.length} foto(s) enviada(s)` + (falhas ? `; ${falhas} com erro.` : '.'));
                }
            });
    }
}
