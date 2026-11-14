import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { MessageService } from 'primeng/api';
import { DOCUMENTACAO, FINALIDADES, Finalidade, ImovelDetalhe, ImovelForm as ImovelFormDto, ORIGENS_FOTO, OrigemFoto, TIPOS, TipoImovel } from '@/app/core/models/models';
import { ImageUpload } from './image-upload';
import { MapaOsm } from './mapa-osm';
import { ImovelFoto } from './imovel-foto';

type FotoGrupo = FormGroup<{ url: FormControl<string>; origem: FormControl<OrigemFoto> }>;

/** Mesmo limite do servidor (ImovelForm.fotos @Size(max = 30)). */
const MAX_FOTOS = 30;

const SUGESTOES = ['Área de serviço', 'Armários embutidos', 'Piscina', 'Varanda', 'Churrasqueira', 'Portaria 24h', 'Academia', 'Salão de festas', 'Elevador', 'Playground', 'Ar condicionado', 'Interfone', 'Quintal', 'Mobiliado', 'Aceita pet'];

/** Formulário do anúncio, usado pelo corretor e pelo administrador. */
@Component({
    selector: 'app-imovel-form',
    imports: [ReactiveFormsModule, InputTextModule, InputNumberModule, TextareaModule, SelectModule, ToggleSwitchModule, CheckboxModule, ButtonModule, AutoCompleteModule, ImageUpload, MapaOsm, ImovelFoto],
    template: `
        <form [formGroup]="form" (ngSubmit)="enviar()" class="flex flex-col gap-6" novalidate>
            <section class="card m-0 flex flex-col gap-4">
                <h2 class="text-lg font-semibold m-0">Informações</h2>
                <div class="flex flex-col gap-2">
                    <label for="im-titulo">Título do anúncio *</label>
                    <input pInputText id="im-titulo" formControlName="titulo" maxlength="160" placeholder="Ex.: Apartamento 3 quartos com varanda" />
                </div>
                <div class="grid gap-4 md:grid-cols-3">
                    <div class="flex flex-col gap-2">
                        <label for="im-fin">Finalidade *</label>
                        <p-select inputId="im-fin" formControlName="finalidade" [options]="finalidades" optionLabel="label" optionValue="value" styleClass="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="im-tipo">Tipo *</label>
                        <p-select inputId="im-tipo" formControlName="tipo" [options]="tipos" optionLabel="label" optionValue="value" styleClass="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="im-preco">Preço (R$) *</label>
                        <p-inputnumber inputId="im-preco" formControlName="preco" mode="currency" currency="BRL" locale="pt-BR" [maxFractionDigits]="0" styleClass="w-full" inputStyleClass="w-full" />
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <label for="im-desc">Descrição</label>
                    <textarea pTextarea id="im-desc" formControlName="descricao" rows="6" [autoResize]="true"></textarea>
                </div>
                <div class="flex flex-wrap gap-6">
                    <label class="flex items-center gap-2"><p-toggleswitch formControlName="lancamento" inputId="im-lanc" /> Imóvel novo / lançamento</label>
                </div>
            </section>

            <section class="card m-0 flex flex-col gap-4" aria-labelledby="im-doc-titulo">
                <div>
                    <h2 id="im-doc-titulo" class="text-lg font-semibold m-0">Documentação e condições</h2>
                    <p class="text-sm text-muted-color mt-1 mb-0">Marque o que vale para este imóvel. Tudo aparece na página do anúncio.</p>
                </div>
                <div class="grid gap-3 sm:grid-cols-2">
                    @for (d of documentacao; track d.campo) {
                        <div class="flex items-start gap-3 p-3 rounded-border border border-surface">
                            <p-checkbox [formControlName]="d.campo" [binary]="true" [inputId]="'im-doc-' + d.campo" />
                            <label [for]="'im-doc-' + d.campo" class="cursor-pointer">
                                <span class="block font-medium">{{ d.label }}</span>
                                <span class="block text-xs text-muted-color">{{ d.dica }}</span>
                            </label>
                        </div>
                    }
                </div>
            </section>

            <section class="card m-0 flex flex-col gap-4">
                <h2 class="text-lg font-semibold m-0">Características</h2>
                <div class="grid gap-4 grid-cols-2 md:grid-cols-4">
                    @for (c of numeros; track c.campo) {
                        <div class="flex flex-col gap-2">
                            <label [for]="'im-' + c.campo">{{ c.label }}</label>
                            <p-inputnumber [inputId]="'im-' + c.campo" [formControlName]="c.campo" [min]="0" [showButtons]="c.botoes" [suffix]="c.sufixo" styleClass="w-full" inputStyleClass="w-full" />
                        </div>
                    }
                </div>
                <div class="flex flex-col gap-2">
                    <label for="im-carac">Itens do imóvel (digite e tecle Enter)</label>
                    <p-autocomplete inputId="im-carac" formControlName="caracteristicas" [multiple]="true" [typeahead]="true" [suggestions]="sugestoes()" (completeMethod)="filtrar($event.query)" [fluid]="true" />
                </div>
            </section>

            <section class="card m-0 flex flex-col gap-4">
                <h2 class="text-lg font-semibold m-0">Localização</h2>
                <div class="grid gap-4 md:grid-cols-4">
                    <div class="flex flex-col gap-2">
                        <label for="im-uf">UF *</label>
                        <input pInputText id="im-uf" formControlName="uf" maxlength="2" class="uppercase" />
                    </div>
                    <div class="flex flex-col gap-2 md:col-span-3">
                        <label for="im-cidade">Cidade *</label>
                        <input pInputText id="im-cidade" formControlName="cidade" />
                    </div>
                    <div class="flex flex-col gap-2 md:col-span-2">
                        <label for="im-bairro">Bairro *</label>
                        <input pInputText id="im-bairro" formControlName="bairro" />
                    </div>
                    <div class="flex flex-col gap-2 md:col-span-2">
                        <label for="im-cep">CEP</label>
                        <input pInputText id="im-cep" formControlName="cep" maxlength="9" />
                    </div>
                    <div class="flex flex-col gap-2 md:col-span-4">
                        <label for="im-end">Endereço</label>
                        <input pInputText id="im-end" formControlName="endereco" placeholder="Rua, quadra, conjunto..." />
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                    <p-button type="button" label="Localizar endereço no mapa" icon="pi pi-map-marker" [outlined]="true" [loading]="geocodificando()" (onClick)="localizar()" />
                    <span class="text-sm text-muted-color">ou clique no mapa para marcar a posição exata.</span>
                    @if (form.controls.latitude.value != null) {
                        <span class="text-xs text-muted-color">({{ form.controls.latitude.value }}, {{ form.controls.longitude.value }})</span>
                    }
                </div>
                <app-mapa-osm [selecionavel]="true" [centro]="centro()" [zoom]="11" altura="320px" (posicaoSelecionada)="marcar($event.lat, $event.lng)" />
            </section>

            <section class="card m-0 flex flex-col gap-4">
                <div class="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 class="text-lg font-semibold m-0">Fotos <span class="text-muted-color font-normal text-base">({{ fotos.length }}/{{ maxFotos }})</span></h2>
                        <p class="text-sm text-muted-color m-0 mt-1">A primeira foto é a capa. Em cada foto, informe se ela é <strong>real</strong> ou <strong>criada/alterada com IA</strong>; isso aparece para o cliente no anúncio.</p>
                    </div>
                    @if (fotos.length > 1) {
                        <div class="flex flex-col gap-1">
                            <label for="origem-todas" class="text-sm">Aplicar a todas as fotos</label>
                            <p-select inputId="origem-todas" [options]="origens" optionLabel="label" optionValue="value" placeholder="Escolha…" [formControl]="origemTodas" (onChange)="aplicarOrigemATodas($event.value)" styleClass="min-w-60" />
                        </div>
                    }
                </div>
                @if (fotos.length) {
                    <div class="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        @for (f of fotos.controls; track f) {
                            <div class="foto-tile" [formGroup]="f">
                                <div class="relative aspect-[4/3]">
                                    <app-imovel-foto class="w-full h-full" [src]="f.controls.url.value" [alt]="'Foto ' + ($index + 1)" />
                                    <div class="absolute top-1 right-1 flex gap-1">
                                        @if ($index > 0) {
                                            <p-button icon="pi pi-arrow-left" size="small" [rounded]="true" severity="secondary" (onClick)="moverFoto($index, -1)" [ariaLabel]="'Mover foto ' + ($index + 1) + ' para a esquerda'" />
                                        }
                                        <p-button icon="pi pi-trash" size="small" [rounded]="true" severity="danger" (onClick)="fotos.removeAt($index)" [ariaLabel]="'Remover foto ' + ($index + 1)" />
                                    </div>
                                    @if ($index === 0) {
                                        <span class="imovel-card__selo imovel-card__selo--topo">Capa</span>
                                    }
                                    @if (f.controls.origem.value !== 'NAO_INFORMADO') {
                                        <span class="selo-origem-foto" [class.ia]="f.controls.origem.value === 'IA'">
                                            <i class="pi" [class.pi-sparkles]="f.controls.origem.value === 'IA'" [class.pi-camera]="f.controls.origem.value === 'REAL'" aria-hidden="true"></i>
                                            {{ f.controls.origem.value === 'IA' ? 'IA' : 'Foto real' }}
                                        </span>
                                    }
                                </div>
                                <div class="foto-tile__origem">
                                    <label [for]="'foto-origem-' + $index">Origem da foto {{ $index + 1 }}</label>
                                    <p-select [inputId]="'foto-origem-' + $index" formControlName="origem" [options]="origens" optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body">
                                        <ng-template #selectedItem let-o>
                                            <span class="inline-flex items-center gap-2"><i class="pi {{ o.icone }}" aria-hidden="true"></i>{{ o.curto }}</span>
                                        </ng-template>
                                        <ng-template #item let-o>
                                            <span class="inline-flex items-center gap-2"><i class="pi {{ o.icone }}" aria-hidden="true"></i>{{ o.label }}</span>
                                        </ng-template>
                                    </p-select>
                                </div>
                            </div>
                        }
                    </div>
                }
                <app-image-upload rotulo="Escolher fotos" [multiplo]="true" [limite]="maxFotos" [quantidadeAtual]="fotos.length" (urlAdicionada)="fotos.push(novaFoto($event))" />
            </section>

            <div class="flex justify-end gap-2 sticky bottom-0 py-3 bg-surface-50 dark:bg-surface-950">
                <ng-content />
                <p-button type="submit" [label]="rotuloSalvar()" icon="pi pi-check" [loading]="salvando()" />
            </div>
        </form>
    `
})
export class ImovelFormComponent {
    private fb = inject(NonNullableFormBuilder);
    private msg = inject(MessageService);

    valor = input<ImovelDetalhe | null>(null);
    salvando = input(false);
    rotuloSalvar = input('Salvar anúncio');
    salvar = output<ImovelFormDto>();

    finalidades = FINALIDADES;
    documentacao = DOCUMENTACAO;
    tipos = TIPOS;
    numeros = [
        { campo: 'areaUtil', label: 'Área útil', sufixo: ' m²', botoes: false },
        { campo: 'areaTotal', label: 'Área total', sufixo: ' m²', botoes: false },
        { campo: 'quartos', label: 'Quartos', sufixo: '', botoes: true },
        { campo: 'suites', label: 'Suítes', sufixo: '', botoes: true },
        { campo: 'banheiros', label: 'Banheiros', sufixo: '', botoes: true },
        { campo: 'vagas', label: 'Vagas', sufixo: '', botoes: true },
        { campo: 'condominio', label: 'Condomínio (R$)', sufixo: '', botoes: false },
        { campo: 'iptu', label: 'IPTU anual (R$)', sufixo: '', botoes: false }
    ];

    sugestoes = signal<string[]>([]);
    centro = signal<[number, number] | null>(null);
    geocodificando = signal(false);

    form = this.fb.group({
        titulo: ['', [Validators.required, Validators.maxLength(160)]],
        descricao: [''],
        finalidade: this.fb.control<Finalidade>('VENDA'),
        tipo: this.fb.control<TipoImovel>('APARTAMENTO'),
        preco: this.fb.control<number | null>(null, Validators.required),
        condominio: this.fb.control<number | null>(null),
        iptu: this.fb.control<number | null>(null),
        areaUtil: this.fb.control<number | null>(null),
        areaTotal: this.fb.control<number | null>(null),
        quartos: this.fb.control<number | null>(null),
        suites: this.fb.control<number | null>(null),
        banheiros: this.fb.control<number | null>(null),
        vagas: this.fb.control<number | null>(null),
        uf: ['DF', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
        cidade: ['', Validators.required],
        bairro: ['', Validators.required],
        endereco: [''],
        cep: [''],
        latitude: this.fb.control<number | null>(null),
        longitude: this.fb.control<number | null>(null),
        lancamento: [false],
        aceitaFinanciamento: [false],
        aceitaFgts: [false],
        aceitaPermuta: [false],
        escrituraRegistrada: [false],
        quitado: [false],
        caracteristicas: this.fb.control<string[]>([]),
        fotos: this.fb.array<FotoGrupo>([])
    });

    readonly maxFotos = MAX_FOTOS;
    readonly origens = ORIGENS_FOTO;
    /** Seletor "aplicar a todas": volta a ficar vazio depois de aplicar. */
    origemTodas = new FormControl<OrigemFoto | null>(null);

    get fotos(): FormArray<FotoGrupo> {
        return this.form.controls.fotos;
    }

    constructor() {
        effect(() => {
            const v = this.valor();
            if (!v) return;
            this.fotos.clear();
            v.fotos.forEach((f) => this.fotos.push(this.novaFoto(f.url, f.origem)));
            this.form.patchValue({ ...v, descricao: v.descricao ?? '', endereco: v.endereco ?? '', cep: v.cep ?? '', caracteristicas: [...v.caracteristicas] });
            this.centro.set(v.latitude != null && v.longitude != null ? [v.latitude, v.longitude] : null);
        });
    }

    novaFoto(url: string, origem: OrigemFoto = 'NAO_INFORMADO'): FotoGrupo {
        return this.fb.group({ url: [url], origem: [origem] });
    }

    aplicarOrigemATodas(origem: OrigemFoto | null) {
        if (!origem) return;
        this.fotos.controls.forEach((c) => c.controls.origem.setValue(origem));
        queueMicrotask(() => this.origemTodas.setValue(null));
    }

    moverFoto(i: number, d: number) {
        const c = this.fotos.at(i);
        this.fotos.removeAt(i);
        this.fotos.insert(i + d, c);
    }

    filtrar(q: string) {
        const t = q.toLowerCase();
        this.sugestoes.set([...SUGESTOES.filter((s) => s.toLowerCase().includes(t)), ...(q.trim() && !SUGESTOES.some((s) => s.toLowerCase() === t) ? [q.trim()] : [])]);
    }

    marcar(lat: number, lng: number) {
        this.form.patchValue({ latitude: lat, longitude: lng });
    }

    /** Busca as coordenadas do endereço no Nominatim (geocodificação gratuita do OpenStreetMap). */
    async localizar() {
        const v = this.form.getRawValue();
        const q = [v.endereco, v.bairro, v.cidade, v.uf, 'Brasil'].filter(Boolean).join(', ');
        if (!v.cidade) {
            this.msg.add({ severity: 'warn', summary: 'Localização', detail: 'Preencha ao menos a cidade.' });
            return;
        }
        this.geocodificando.set(true);
        try {
            const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=pt-BR&q=' + encodeURIComponent(q));
            const lista = (await r.json()) as { lat: string; lon: string }[];
            if (lista.length) {
                const lat = +Number(lista[0].lat).toFixed(7);
                const lng = +Number(lista[0].lon).toFixed(7);
                this.marcar(lat, lng);
                this.centro.set([lat, lng]);
            } else {
                this.msg.add({ severity: 'info', summary: 'Endereço não encontrado', detail: 'Clique no mapa para marcar a posição.' });
            }
        } catch {
            this.msg.add({ severity: 'error', summary: 'Localização', detail: 'Não foi possível consultar o mapa agora.' });
        } finally {
            this.geocodificando.set(false);
        }
    }

    enviar() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Confira o formulário', detail: 'Preencha título, preço, UF, cidade e bairro.' });
            return;
        }
        const v = this.form.getRawValue();
        this.salvar.emit({ ...v, preco: v.preco ?? 0, uf: v.uf.toUpperCase(), descricao: v.descricao || null, endereco: v.endereco || null, cep: v.cep || null });
    }
}
