import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputMaskModule } from 'primeng/inputmask';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, firstValueFrom, of } from 'rxjs';
import { BrasilApiCep, BrasilApiService } from '@/app/core/services/brasil-api.service';
import { digitos } from '@/app/core/pipes/formatos';
import { GeocodificacaoService, PrecisaoGeo } from '@/app/core/services/geocodificacao.service';
import { MessageService } from 'primeng/api';
import { DOCUMENTACAO, FINALIDADES, Finalidade, ImovelDetalhe, ImovelForm as ImovelFormDto, ORIGENS_FOTO, OrigemFoto, TIPOS, TipoImovel, UFS, tituloAnuncio } from '@/app/core/models/models';
import { MultiSelectModule } from 'primeng/multiselect';
import { FinanceiraService } from '@/app/core/services/financeira.service';
import { ConfigService } from '@/app/core/services/config.service';
import { ImageUpload } from './image-upload';
import { MapaOsm } from './mapa-osm';
import { ImovelFoto } from './imovel-foto';

type FotoGrupo = FormGroup<{ url: FormControl<string>; origem: FormControl<OrigemFoto> }>;

/** Mesmo limite do servidor (ImovelForm.fotos @Size(max = 30)). */
const MAX_FOTOS = 30;

const ROTULO_PRECISAO: Record<PrecisaoGeo, string> = { endereco: 'endereço', cep: 'CEP', bairro: 'bairro', cidade: 'centro da cidade' };

const SUGESTOES = ['Área de serviço', 'Armários embutidos', 'Piscina', 'Varanda', 'Churrasqueira', 'Portaria 24h', 'Academia', 'Salão de festas', 'Elevador', 'Playground', 'Ar condicionado', 'Interfone', 'Quintal', 'Mobiliado', 'Aceita pet'];

/** Formulário do anúncio, usado pelo corretor e pelo administrador. */
@Component({
    selector: 'app-imovel-form',
    imports: [
        ReactiveFormsModule,
        MultiSelectModule,
        InputTextModule,
        InputNumberModule,
        TextareaModule,
        SelectModule,
        ToggleSwitchModule,
        CheckboxModule,
        ButtonModule,
        AutoCompleteModule,
        InputGroupModule,
        InputGroupAddonModule,
        InputMaskModule,
        ImageUpload,
        MapaOsm,
        ImovelFoto
    ],
    template: `
        <form [formGroup]="form" (ngSubmit)="enviar()" class="flex flex-col gap-6" novalidate>
            <section class="card m-0 flex flex-col gap-4" aria-labelledby="im-info-titulo">
                <div>
                    <h2 id="im-info-titulo" class="text-lg font-semibold m-0">Informações e localização</h2>
                    <p class="text-sm text-muted-color mt-1 mb-0">O título do anúncio é montado a partir do endereço.</p>
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
                <div class="flex flex-wrap gap-6">
                    <label class="flex items-center gap-2"><p-toggleswitch formControlName="lancamento" inputId="im-lanc" /> Imóvel novo / lançamento</label>
                </div>
                <div class="grid gap-4 grid-cols-2 md:grid-cols-12">
                    <div class="flex flex-col gap-2 col-span-2 md:col-span-3">
                        <label for="im-cep">CEP</label>
                        <p-inputgroup>
                            <p-inputmask
                                inputId="im-cep"
                                formControlName="cep"
                                mask="99.999-999"
                                [unmask]="true"
                                [autoClear]="false"
                                placeholder="00.000-000"
                                autocomplete="postal-code"
                                inputmode="numeric"
                                (keydown.enter)="$event.preventDefault(); buscarCep()"
                            />
                            <p-inputgroup-addon>
                                <p-button type="button" icon="pi pi-search" severity="secondary" ariaLabel="Buscar endereço pelo CEP" [loading]="buscandoCep()" (onClick)="buscarCep()" />
                            </p-inputgroup-addon>
                        </p-inputgroup>
                    </div>
                    <div class="flex flex-col gap-2 col-span-2 md:col-span-7">
                        <label for="im-end">Logradouro</label>
                        <input pInputText id="im-end" formControlName="endereco" maxlength="200" placeholder="Rua, quadra, conjunto..." autocomplete="address-line1" />
                    </div>
                    <div class="flex flex-col gap-2 col-span-2 md:col-span-2">
                        <label for="im-num">Número</label>
                        <input pInputText id="im-num" formControlName="numero" maxlength="20" placeholder="Ex.: 12, s/n" />
                    </div>
                    <div class="flex flex-col gap-2 col-span-2 md:col-span-5">
                        <label for="im-bairro">Bairro *</label>
                        <input pInputText id="im-bairro" formControlName="bairro" />
                    </div>
                    <div class="flex flex-col gap-2 md:col-span-5">
                        <label for="im-cidade">Cidade *</label>
                        <input pInputText id="im-cidade" formControlName="cidade" autocomplete="address-level2" />
                    </div>
                    <div class="flex flex-col gap-2 md:col-span-2">
                        <label for="im-uf">UF *</label>
                        <p-select inputId="im-uf" formControlName="uf" [options]="ufs" placeholder="UF" [filter]="true" styleClass="w-full" appendTo="body" />
                    </div>
                </div>
                <div class="flex flex-col gap-1 p-3 rounded-border border border-surface">
                    <span class="text-xs text-muted-color">Título do anúncio (gerado automaticamente)</span>
                    <strong class="text-base">{{ tituloPrevia() || 'Preencha endereço, bairro e cidade' }}</strong>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                    <p-button type="button" label="Localizar endereço no mapa" icon="pi pi-map-marker" [outlined]="true" [loading]="geocodificando()" (onClick)="localizar()" [disabled]="buscandoCep()" />
                    <span class="text-sm text-muted-color">ou clique no mapa para marcar a posição exata.</span>
                    @if (form.controls.latitude.value != null) {
                        <span class="text-xs text-muted-color">({{ form.controls.latitude.value }}, {{ form.controls.longitude.value }})</span>
                    }
                </div>
                <app-mapa-osm [selecionavel]="true" [centro]="centro()" [zoom]="11" altura="320px" (posicaoSelecionada)="marcar($event.lat, $event.lng)" />
            </section>

            <section class="card m-0 flex flex-col gap-4" aria-labelledby="im-desc-titulo">
                <h2 id="im-desc-titulo" class="text-lg font-semibold m-0">Descrição</h2>
                <div class="flex flex-col gap-2">
                    <label for="im-titulo">Título da descrição *</label>
                    <input pInputText id="im-titulo" formControlName="titulo" maxlength="160" placeholder="Ex.: Apartamento 3 quartos com varanda" aria-describedby="im-titulo-dica" />
                    <small id="im-titulo-dica" class="text-muted-color">Aparece como subtítulo, logo acima do texto da descrição.</small>
                </div>
                <div class="flex flex-col gap-2">
                    <label for="im-desc">Descrição</label>
                    <textarea pTextarea id="im-desc" formControlName="descricao" rows="6" [autoResize]="true"></textarea>
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
                @if (valores().aceitaFinanciamento) {
                    <div class="flex flex-col gap-3 p-4 rounded-border border border-surface" role="group" aria-labelledby="im-fin-titulo">
                        <div>
                            <h3 id="im-fin-titulo" class="text-base font-semibold m-0">Financeiras para simulação</h3>
                            <p class="text-xs text-muted-color mt-1 mb-0">
                                @if (valores().finalidade === 'VENDA') {
                                    O visitante poderá simular o financiamento com as financeiras escolhidas (regras cadastradas pela administração).
                                } @else {
                                    A simulação de financiamento só aparece em anúncios de venda.
                                }
                            </p>
                        </div>
                        @if (!simulacaoLigada()) {
                            <p class="text-sm text-muted-color m-0"><i class="pi pi-info-circle" aria-hidden="true"></i> A simulação de financiamento está desativada no site pela administração. Suas escolhas ficam salvas e passam a valer quando ela for reativada.</p>
                        }
                        @if (financeirasAtivas().length === 0) {
                            <p class="text-sm text-muted-color m-0">Nenhuma financeira cadastrada ainda. O botão de simular aparece quando a administração cadastrar alguma.</p>
                        }
                        <div class="flex items-center gap-2">
                            <p-checkbox formControlName="financeirasTodas" [binary]="true" inputId="im-fin-todas" />
                            <label for="im-fin-todas" class="cursor-pointer">Aceitar todas as financeiras (inclusive as cadastradas no futuro)</label>
                        </div>
                        @if (!valores().financeirasTodas) {
                            <div class="flex flex-col gap-2">
                                <label for="im-fin-lista">Financeiras aceitas</label>
                                <p-multiselect
                                    inputId="im-fin-lista"
                                    formControlName="financeiras"
                                    [options]="financeirasAtivas()"
                                    optionLabel="nome"
                                    optionValue="id"
                                    display="chip"
                                    placeholder="Selecione uma ou mais"
                                    [showToggleAll]="true"
                                    [fluid]="true"
                                    emptyMessage="Nenhuma financeira cadastrada"
                                >
                                    <ng-template #item let-f>
                                        <div class="flex flex-col">
                                            <span>{{ f.nome }}</span>
                                            <small class="text-muted-color">{{ f.taxaJurosAnual }}% a.a. · até {{ f.prazoMaximoMeses }} meses · entrada mín. {{ f.entradaMinimaPercentual }}%</small>
                                        </div>
                                    </ng-template>
                                </p-multiselect>
                                @if (valores().financeiras?.length === 0) {
                                    <small class="text-muted-color">Sem financeira selecionada, o botão de simular não aparece no anúncio.</small>
                                }
                            </div>
                        }
                    </div>
                }
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
                <div class="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 class="text-lg font-semibold m-0">
                            Fotos <span class="text-muted-color font-normal text-base">({{ fotos.length }}/{{ maxFotos }})</span>
                        </h2>
                        <p class="text-sm text-muted-color m-0 mt-1">A primeira foto é a capa. Em cada foto, informe se ela é <strong>real</strong> ou <strong>criada/alterada com IA</strong>; isso aparece para o cliente no anúncio.</p>
                    </div>

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

                                    Fotos sem indicação não tiveram a origem informada.

                            </p>
                        </div>
                    </aside>

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
    private brasilApi = inject(BrasilApiService);
    private geo = inject(GeocodificacaoService);

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
    /** Financeiras ativas para o anunciante escolher quais aceita. */
    /** Regra "Simulação de financiamento" (aba Regras em /admin/configuracoes). */
    private configSite = inject(ConfigService).config;
    simulacaoLigada = computed(() => this.configSite().simulacaoFinanciamento !== false);
    financeirasAtivas = toSignal(inject(FinanceiraService).ativas().pipe(catchError(() => of([]))), { initialValue: [] });
    centro = signal<[number, number] | null>(null);
    geocodificando = signal(false);
    buscandoCep = signal(false);

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
        uf: ['DF', [Validators.required, Validators.pattern(new RegExp(`^(${UFS.join('|')})$`))]],
        cidade: ['', Validators.required],
        bairro: ['', Validators.required],
        endereco: [''],
        numero: [''],
        cep: [''],
        latitude: this.fb.control<number | null>(null),
        longitude: this.fb.control<number | null>(null),
        lancamento: [false],
        aceitaFinanciamento: [false],
        aceitaFgts: [false],
        aceitaPermuta: [false],
        escrituraRegistrada: [false],
        quitado: [false],
        financeirasTodas: [true],
        financeiras: this.fb.control<number[]>([]),
        caracteristicas: this.fb.control<string[]>([]),
        fotos: this.fb.array<FotoGrupo>([])
    });

    protected valores = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
    /** Prévia do título público, composto pelo endereço. */
    tituloPrevia = computed(() => tituloAnuncio(this.valores()));

    readonly ufs = UFS;
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
            this.form.patchValue({ ...v, uf: v.uf?.toUpperCase() ?? 'DF', descricao: v.descricao ?? '', endereco: v.endereco ?? '', numero: v.numero ?? '', cep: digitos(v.cep), caracteristicas: [...v.caracteristicas], financeirasTodas: v.financeirasTodas ?? false, financeiras: [...(v.financeirasIds ?? [])] });
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

    /** Preenche logradouro, bairro, cidade e UF a partir do CEP (BrasilAPI). Só roda pelo botão do campo CEP. */
    async buscarCep() {
        const cep = BrasilApiService.limparCep(this.form.controls.cep.value);
        if (cep.length !== 8) {
            this.msg.add({ severity: 'warn', summary: 'CEP', detail: 'Informe um CEP com 8 dígitos.' });
            return;
        }
        this.buscandoCep.set(true);
        try {
            const r = await firstValueFrom(this.brasilApi.cep(cep));
            const uf = r.state?.toUpperCase();
            this.form.patchValue({
                cep,
                ...(r.street ? { endereco: r.street } : {}),
                ...(r.neighborhood ? { bairro: r.neighborhood } : {}),
                ...(r.city ? { cidade: r.city } : {}),
                ...(uf && UFS.includes(uf) ? { uf } : {})
            });
            this.form.markAsDirty();
            if (!r.street || !r.neighborhood) {
                this.msg.add({ severity: 'info', summary: 'CEP encontrado', detail: 'Este CEP não traz logradouro/bairro. Complete manualmente.' });
            }
            await this.localizar(r);
        } catch (e) {
            const naoEncontrado = e instanceof HttpErrorResponse && e.status === 404;
            this.msg.add({
                severity: naoEncontrado ? 'warn' : 'error',
                summary: 'CEP',
                detail: naoEncontrado ? 'CEP não encontrado.' : 'Não foi possível consultar o CEP agora.'
            });
        } finally {
            this.buscandoCep.set(false);
        }
    }

    /**
     * Posiciona o mapa pelo endereço do formulário (Nominatim, do mais preciso ao mais genérico).
     * Vindo da busca por CEP, usa como último recurso a coordenada da BrasilAPI (aproximada, nível cidade).
     */
    async localizar(cep?: BrasilApiCep) {
        const v = this.form.getRawValue();
        if (!v.cidade && BrasilApiService.limparCep(v.cep).length !== 8) {
            this.msg.add({ severity: 'warn', summary: 'Localização', detail: 'Preencha ao menos a cidade ou o CEP.' });
            return;
        }
        this.geocodificando.set(true);
        try {
            let r = await this.geo.localizar(v).catch(() => null);
            const c = cep?.location?.coordinates;
            if (!r && c?.latitude && c?.longitude) {
                r = { lat: +Number(c.latitude).toFixed(7), lng: +Number(c.longitude).toFixed(7), precisao: 'cidade' };
            }
            if (!r) {
                this.msg.add({ severity: 'info', summary: 'Endereço não encontrado', detail: 'Clique no mapa para marcar a posição.' });
                return;
            }
            this.marcar(r.lat, r.lng);
            this.centro.set([r.lat, r.lng]);
            if (r.precisao !== 'endereco') {
                this.msg.add({ severity: 'info', summary: 'Posição aproximada', detail: `Localizado pelo ${ROTULO_PRECISAO[r.precisao]}. Clique no mapa para ajustar o ponto exato.` });
            }
        } finally {
            this.geocodificando.set(false);
        }
    }

    enviar() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Confira o formulário', detail: 'Preencha preço, UF, cidade, bairro e o título da descrição.' });
            return;
        }
        const v = this.form.getRawValue();
        this.salvar.emit({ ...v, preco: v.preco ?? 0, uf: v.uf.toUpperCase(), descricao: v.descricao || null, endereco: v.endereco || null, numero: v.numero.trim() || null, cep: digitos(v.cep) || null });
    }
}
