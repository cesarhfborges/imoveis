import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { from, mergeMap, map, catchError, of } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { UploadService } from '@/app/core/services/conta.service';
import { mensagemErro } from '@/app/core/services/api.service';

let seq = 0;

function rotuloOuImagem(r: string) {
    return r || 'Imagem';
}

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

/** Extensões mostradas na dica, a partir dos tipos aceitos. */
const EXTENSOES: Record<string, string> = {
    'image/png': 'PNG',
    'image/jpeg': 'JPG',
    'image/webp': 'WEBP',
    'image/gif': 'GIF',
    'image/x-icon': 'ICO',
    'image/svg+xml': 'SVG'
};

/**
 * Campo de imagem.
 *  - modo simples (padrão): foto, logo ou ícone com prévia grande. Clicar na prévia (ou arrastar um arquivo
 *    sobre ela) envia; dá para remover ou, se permitido, usar o endereço de uma imagem. Emite (urlChange).
 *    [formato]: circulo (foto de perfil), quadrado (ícone), retangulo (logo) ou largo (imagem de compartilhamento);
 *  - modo múltiplo ([multiplo]="true"): arrastar e soltar ou escolher VÁRIOS arquivos de uma vez.
 *    Sobem em paralelo (3 por vez) e cada URL é emitida em (urlAdicionada) na ordem em que os
 *    arquivos foram escolhidos. Falhas ficam na lista com "tentar de novo".
 */
@Component({
    selector: 'app-image-upload',
    imports: [InputTextModule, ButtonModule],
    template: `
        @if (!multiplo()) {
            <div class="foto-campo" [class]="'foto-campo foto-campo--' + formato()" [class.foto-campo--vertical]="vertical()">
                <span class="foto-campo__rotulo" [id]="id + '-rotulo'">{{ rotulo() }}</span>
                <div class="foto-campo__corpo">
                    <button
                        type="button"
                        class="foto-campo__previa"
                        [class.foto-campo__previa--escura]="fundoEscuro()"
                        [class.foto-campo__previa--vazia]="!mostrarImagem()"
                        [class.foto-campo__previa--arrastando]="arrastando()"
                        [disabled]="enviandoUm()"
                        (click)="arquivo.click()"
                        (dragover)="aoArrastarUm($event)"
                        (dragleave)="arrastando.set(false)"
                        (drop)="aoSoltarUm($event)"
                        [attr.aria-label]="(url() ? 'Trocar ' : 'Enviar ') + rotulo()"
                        [attr.aria-describedby]="id + '-dica'"
                    >
                        @if (mostrarImagem()) {
                            <img [src]="url()" alt="" (error)="falhou.set(true)" />
                        } @else if (url() && falhou()) {
                            <span class="foto-campo__vazio foto-campo__vazio--erro">
                                <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
                                <small>Não foi possível carregar</small>
                            </span>
                        } @else if (iniciais()) {
                            <span class="foto-campo__iniciais" aria-hidden="true">{{ iniciais() }}</span>
                        } @else {
                            <span class="foto-campo__vazio">
                                <i class="pi pi-image" aria-hidden="true"></i>
                                <small>Arraste ou clique</small>
                            </span>
                        }
                        <span class="foto-campo__sobreposicao" aria-hidden="true">
                            <i class="pi pi-camera"></i>
                            <span>{{ url() ? 'Trocar' : 'Enviar' }}</span>
                        </span>
                        @if (enviandoUm()) {
                            <span class="foto-campo__carregando" aria-hidden="true"><i class="pi pi-spin pi-spinner"></i></span>
                        }
                    </button>

                    <div class="foto-campo__info">
                        <div class="flex flex-wrap gap-2" [class.justify-center]="vertical()">
                            <p-button [label]="url() ? 'Trocar' : 'Enviar imagem'" icon="pi pi-upload" size="small" [outlined]="true" [loading]="enviandoUm()" (onClick)="arquivo.click()" />
                            @if (url()) {
                                <p-button label="Remover" icon="pi pi-trash" size="small" [text]="true" severity="secondary" (onClick)="definir(null)" [ariaLabel]="'Remover ' + rotulo()" />
                            }
                        </div>
                        <small class="foto-campo__dica" [id]="id + '-dica'">{{ dica() || descricaoFormatos() }}</small>
                        @if (permitirUrl()) {
                            <button type="button" class="foto-campo__link" (click)="mostrarUrl.update((v) => !v)" [attr.aria-expanded]="mostrarUrl()" [attr.aria-controls]="id + '-url'">
                                <i class="pi" [class.pi-link]="!mostrarUrl()" [class.pi-chevron-up]="mostrarUrl()" aria-hidden="true"></i>
                                {{ mostrarUrl() ? 'Fechar' : 'Usar o endereço de uma imagem' }}
                            </button>
                            @if (mostrarUrl()) {
                                <div class="flex gap-2" [id]="id + '-url'">
                                    <label [for]="id" class="sr-only">Endereço da imagem ({{ rotulo() }})</label>
                                    <input #campoUrlUm pInputText [id]="id" type="url" class="flex-1 min-w-0 p-inputtext-sm" placeholder="https://..." [value]="url() ?? ''" (keydown.enter)="$event.preventDefault(); usarUrl(campoUrlUm)" />
                                    <p-button label="Usar" size="small" (onClick)="usarUrl(campoUrlUm)" />
                                </div>
                            }
                        }
                    </div>
                </div>
                <input #arquivo type="file" class="hidden" [accept]="aceitar()" (change)="enviarUm($any($event.target).files); arquivo.value = ''" tabindex="-1" aria-hidden="true" />
                <p class="sr-only" aria-live="polite">{{ anuncio() }}</p>
            </div>
        } @else {
            <div class="upload-multi">
                <div class="upload-multi__zona" [class.arrastando]="arrastando()" [class.desativada]="lotado()" (dragover)="aoArrastar($event)" (dragleave)="aoSair($event)" (drop)="aoSoltar($event)">
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
    `,
    styles: `
        .foto-campo {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .foto-campo__rotulo {
            font-weight: 500;
        }
        .foto-campo__corpo {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
        }
        .foto-campo--vertical .foto-campo__corpo {
            flex-direction: column;
            text-align: center;
        }
        .foto-campo--vertical .foto-campo__rotulo {
            text-align: center;
        }
        .foto-campo__previa {
            position: relative;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            padding: 0;
            cursor: pointer;
            border-radius: 12px;
            border: 1px solid var(--p-content-border-color);
            background: var(--p-surface-50);
            color: var(--p-text-muted-color);
            transition:
                border-color 0.15s,
                box-shadow 0.15s;
        }
        :host-context(.app-dark) .foto-campo__previa {
            background: var(--p-surface-800);
        }
        .foto-campo__previa--vazia {
            border: 2px dashed var(--p-content-border-color);
        }
        .foto-campo__previa--escura,
        :host-context(.app-dark) .foto-campo__previa--escura {
            background: var(--p-surface-900);
            color: var(--p-surface-300);
        }
        .foto-campo__previa:hover:not(:disabled),
        .foto-campo__previa--arrastando {
            border-color: var(--p-primary-color);
        }
        .foto-campo__previa--arrastando {
            box-shadow: 0 0 0 4px color-mix(in srgb, var(--p-primary-color), transparent 80%);
        }
        .foto-campo__previa:focus-visible {
            outline: 2px solid var(--p-primary-color);
            outline-offset: 3px;
        }
        .foto-campo__previa img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            padding: 6px;
        }
        /* tamanhos por formato */
        .foto-campo--circulo .foto-campo__previa {
            width: 8rem;
            height: 8rem;
            border-radius: 50%;
        }
        .foto-campo--circulo .foto-campo__previa img {
            object-fit: cover;
            padding: 0;
        }
        .foto-campo--quadrado .foto-campo__previa {
            width: 5.5rem;
            height: 5.5rem;
        }
        .foto-campo--retangulo .foto-campo__previa {
            width: 12rem;
            height: 6rem;
        }
        .foto-campo--largo .foto-campo__previa {
            width: 14rem;
            height: 7.3rem;
        }
        .foto-campo--largo .foto-campo__previa img {
            object-fit: cover;
            padding: 0;
        }
        .foto-campo__vazio {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.3rem;
            font-size: 0.75rem;
            padding: 0.5rem;
        }
        .foto-campo__vazio i {
            font-size: 1.5rem;
        }
        .foto-campo__vazio--erro {
            color: var(--p-red-600);
        }
        .foto-campo__iniciais {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--p-primary-contrast-color);
            background: var(--p-primary-color);
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .foto-campo__sobreposicao {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.25rem;
            font-size: 0.8rem;
            font-weight: 600;
            color: #fff;
            background: rgba(15, 23, 42, 0.55);
            opacity: 0;
            transition: opacity 0.15s;
        }
        .foto-campo__sobreposicao i {
            font-size: 1.25rem;
        }
        .foto-campo__previa:hover:not(:disabled) .foto-campo__sobreposicao,
        .foto-campo__previa:focus-visible .foto-campo__sobreposicao,
        .foto-campo__previa--arrastando .foto-campo__sobreposicao {
            opacity: 1;
        }
        .foto-campo__carregando {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            color: #fff;
            background: rgba(15, 23, 42, 0.55);
        }
        .foto-campo__info {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
            min-width: 0;
            flex: 1 1 12rem;
        }
        .foto-campo--vertical .foto-campo__info {
            align-items: center;
            flex-basis: auto;
            width: 100%;
        }
        .foto-campo__dica {
            color: var(--p-text-muted-color);
        }
        .foto-campo__link {
            align-self: flex-start;
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0;
            border: 0;
            background: none;
            font-size: 0.85rem;
            color: var(--p-primary-color);
            cursor: pointer;
        }
        .foto-campo--vertical .foto-campo__link {
            align-self: center;
        }
        .foto-campo__link:hover {
            text-decoration: underline;
        }
        @media (prefers-reduced-motion: reduce) {
            .foto-campo__previa,
            .foto-campo__sobreposicao {
                transition: none;
            }
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
    /** Para onde enviar (a foto de perfil usa um endpoint liberado a qualquer usuário logado). */
    endpoint = input('/app/uploads');
    /** Ativa o envio de vários arquivos de uma vez. */
    multiplo = input(false);
    /** Modo múltiplo: total de imagens permitido e quantas já existem (para calcular as vagas). */
    limite = input<number | null>(null);
    quantidadeAtual = input(0);

    /** Modo simples: forma da prévia. */
    formato = input<'circulo' | 'quadrado' | 'retangulo' | 'largo'>('retangulo');
    /** Modo simples: prévia em cima e botões embaixo, centralizados (ex.: coluna lateral do perfil). */
    vertical = input(false);
    /** Modo simples: prévia em fundo escuro (ex.: logo para o tema escuro). */
    fundoEscuro = input(false);
    /** Modo simples: iniciais mostradas sem imagem (foto de perfil). */
    iniciais = input<string | null>(null);
    /** Modo simples: texto de ajuda (padrão: formatos e tamanho máximo). */
    dica = input<string | null>(null);
    /** Modo simples: oferece "usar o endereço de uma imagem". */
    permitirUrl = input(true);

    urlChange = output<string | null>();
    urlAdicionada = output<string>();

    readonly tamanhoMaximo = TAMANHO_MAXIMO;
    enviandoUm = signal(false);
    falhou = signal(false);
    mostrarUrl = signal(false);
    mostrarImagem = computed(() => !!this.url() && !this.falhou());
    descricaoFormatos = computed(() => {
        const ext = [...new Set(this.tipos().map((t) => EXTENSOES[t] ?? t.replace('image/', '').toUpperCase()))];
        return ext.join(', ') + ' · até 5 MB';
    });
    private tipos = computed(() =>
        this.aceitar()
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
    );
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
        // imagem nova: tenta carregar de novo
        effect(() => {
            this.url();
            this.falhou.set(false);
        });
    }

    // ------------------------------------------------------------ modo simples
    definir(v: string | null) {
        this.urlChange.emit(v?.trim() || null);
    }

    usarUrl(campo: HTMLInputElement) {
        const v = campo.value.trim();
        if (v && !/^(https?:\/\/|\/)/i.test(v)) {
            this.msg.add({ severity: 'warn', summary: rotuloOuImagem(this.rotulo()), detail: 'Informe um endereço começando com https://' });
            return;
        }
        this.definir(v || null);
        this.mostrarUrl.set(false);
    }

    aoArrastarUm(e: DragEvent) {
        if (this.enviandoUm()) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        this.arrastando.set(true);
    }

    aoSoltarUm(e: DragEvent) {
        e.preventDefault();
        this.arrastando.set(false);
        this.enviarUm(e.dataTransfer?.files ?? null);
    }

    enviarUm(files: FileList | null) {
        const f = files?.[0];
        if (!f) return;
        if (!this.tipos().includes(f.type)) {
            this.msg.add({ severity: 'warn', summary: rotuloOuImagem(this.rotulo()), detail: 'Formato não aceito. Use ' + this.descricaoFormatos().split(' · ')[0] + '.' });
            return;
        }
        if (f.size > TAMANHO_MAXIMO) {
            this.msg.add({ severity: 'warn', summary: rotuloOuImagem(this.rotulo()), detail: 'O arquivo tem mais de 5 MB.' });
            return;
        }
        this.enviandoUm.set(true);
        this.anuncio.set('Enviando ' + this.rotulo() + '…');
        this.upload.enviar(f, this.endpoint()).subscribe({
            next: (r) => {
                this.enviandoUm.set(false);
                this.anuncio.set(this.rotulo() + ' enviada.');
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
        const tipos = this.aceitar()
            .split(',')
            .map((t) => t.trim());
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
                    return this.upload.enviar(it.arquivo, this.endpoint()).pipe(
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
