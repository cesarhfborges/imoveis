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
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { BrasilApiCep, BrasilApiService } from '@/app/core/services/brasil-api.service';
import { digitos } from '@/app/core/pipes/formatos';
import { GeocodificacaoService, PrecisaoGeo } from '@/app/core/services/geocodificacao.service';
import { MessageService } from 'primeng/api';
import { CONDICOES, CondicaoAnuncio, DOCUMENTACAO, FINALIDADES, finalidadeLabel, Finalidade, ImovelDetalhe, ImovelForm as ImovelFormDto, ORIGENS_FOTO, OrigemFoto, TIPOS, TipoImovel, UFS, tituloAnuncio } from '@/app/core/models/models';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressBarModule } from 'primeng/progressbar';
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
        ProgressBarModule,
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
        <form [formGroup]="form" (ngSubmit)="enviar()" novalidate>
            <div class="grid grid-cols-12 gap-6 items-start">
                <!-- coluna principal -->
                <div class="col-span-12 xl:col-span-8 flex flex-col gap-6 min-w-0">
                    <section id="im-sec-info" class="card m-0 flex flex-col gap-5 scroll-mt-24" aria-labelledby="im-info-titulo">
                        <header class="flex items-start gap-3">
                            <span class="flex items-center justify-center w-10 h-10 rounded-border bg-primary-50 dark:bg-primary-400/10 text-primary shrink-0"><i class="pi pi-home" aria-hidden="true"></i></span>
                            <div>
                                <h2 id="im-info-titulo" class="text-lg font-semibold m-0">Informações principais</h2>
                                <p class="text-sm text-muted-color mt-1 mb-0">Finalidade, tipo e preço do imóvel.</p>
                            </div>
                        </header>
                        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div class="flex flex-col gap-2">
                                <label for="im-fin" class="font-medium">Finalidade *</label>
                                <p-select inputId="im-fin" formControlName="finalidade" [options]="finalidades" optionLabel="label" optionValue="value" styleClass="w-full" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label for="im-tipo" class="font-medium">Tipo *</label>
                                <p-select inputId="im-tipo" formControlName="tipo" [options]="tipos" optionLabel="label" optionValue="value" styleClass="w-full" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label for="im-preco" class="font-medium">Preço *</label>
                                <p-inputnumber inputId="im-preco" formControlName="preco" mode="currency" currency="BRL" locale="pt-BR" styleClass="w-full" inputStyleClass="w-full" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <span class="font-medium" aria-hidden="true">Lançamento</span>
                                <label for="im-lanc" class="flex items-center justify-between gap-3 px-3 rounded-border border border-surface cursor-pointer h-[2.625rem]" [class.border-primary]="valores().lancamento">
                                    <span class="text-sm">Imóvel novo</span>
                                    <p-toggleswitch formControlName="lancamento" inputId="im-lanc" ariaLabel="Imóvel novo ou lançamento" />
                                </label>
                            </div>
                        </div>
                    </section>

                    <section id="im-sec-local" class="card m-0 flex flex-col gap-5 scroll-mt-24" aria-labelledby="im-local-titulo">
                        <header class="flex items-start gap-3">
                            <span class="flex items-center justify-center w-10 h-10 rounded-border bg-primary-50 dark:bg-primary-400/10 text-primary shrink-0"><i class="pi pi-map-marker" aria-hidden="true"></i></span>
                            <div>
                                <h2 id="im-local-titulo" class="text-lg font-semibold m-0">Localização</h2>
                                <p class="text-sm text-muted-color mt-1 mb-0">O título do anúncio é montado a partir do endereço. Comece pelo CEP para preencher o resto.</p>
                            </div>
                        </header>
                        <div class="grid gap-4 grid-cols-2 md:grid-cols-12">
                            <div class="flex flex-col gap-2 col-span-2 md:col-span-3">
                                <label for="im-cep" class="font-medium">CEP</label>
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
                                <label for="im-end" class="font-medium">Logradouro</label>
                                <input pInputText id="im-end" formControlName="endereco" maxlength="200" placeholder="Rua, quadra, conjunto..." autocomplete="address-line1" />
                            </div>
                            <div class="flex flex-col gap-2 col-span-2 md:col-span-2">
                                <label for="im-num" class="font-medium">Número</label>
                                <input pInputText id="im-num" formControlName="numero" maxlength="20" placeholder="Ex.: 12, s/n" />
                            </div>
                            <div class="flex flex-col gap-2 col-span-2 md:col-span-5">
                                <label for="im-bairro" class="font-medium">Bairro *</label>
                                <input pInputText id="im-bairro" formControlName="bairro" />
                            </div>
                            <div class="flex flex-col gap-2 md:col-span-5">
                                <label for="im-cidade" class="font-medium">Cidade *</label>
                                <input pInputText id="im-cidade" formControlName="cidade" autocomplete="address-level2" />
                            </div>
                            <div class="flex flex-col gap-2 md:col-span-2">
                                <label for="im-uf" class="font-medium">UF *</label>
                                <p-select inputId="im-uf" formControlName="uf" [options]="ufs" placeholder="UF" [filter]="true" styleClass="w-full" appendTo="body" />
                            </div>
                        </div>
                        <div class="flex items-start gap-3 p-3 rounded-border bg-surface-50 dark:bg-surface-800 border border-surface">
                            <i class="pi pi-tag text-primary mt-1" aria-hidden="true"></i>
                            <div class="min-w-0">
                                <span class="block text-xs text-muted-color">Título do anúncio (gerado automaticamente)</span>
                                <strong class="text-base block truncate">{{ tituloPrevia() || 'Preencha endereço, bairro e cidade' }}</strong>
                            </div>
                        </div>
                        <div class="flex flex-col gap-3">
                            <div class="flex flex-wrap items-center justify-between gap-3">
                                <div class="flex flex-wrap items-center gap-3">
                                    <p-button type="button" label="Localizar no mapa" icon="pi pi-map-marker" [outlined]="true" [loading]="geocodificando()" (onClick)="localizar()" [disabled]="buscandoCep()" />
                                    <span class="text-sm text-muted-color">ou clique no mapa para marcar a posição exata.</span>
                                </div>
                                @if (form.controls.latitude.value != null) {
                                    <span class="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400"
                                        ><i class="pi pi-check-circle" aria-hidden="true"></i> Posição marcada ({{ form.controls.latitude.value }}, {{ form.controls.longitude.value }})</span
                                    >
                                } @else {
                                    <span class="inline-flex items-center gap-1 text-xs text-muted-color"><i class="pi pi-circle" aria-hidden="true"></i> Sem posição no mapa</span>
                                }
                            </div>
                            <div class="rounded-border overflow-hidden border border-surface">
                                <app-mapa-osm [selecionavel]="true" [centro]="centro()" [zoom]="11" altura="320px" (posicaoSelecionada)="marcar($event.lat, $event.lng)" />
                            </div>
                        </div>
                    </section>

                    <section id="im-sec-desc" class="card m-0 flex flex-col gap-5 scroll-mt-24" aria-labelledby="im-desc-titulo">
                        <header class="flex items-start gap-3">
                            <span class="flex items-center justify-center w-10 h-10 rounded-border bg-primary-50 dark:bg-primary-400/10 text-primary shrink-0"><i class="pi pi-align-left" aria-hidden="true"></i></span>
                            <div>
                                <h2 id="im-desc-titulo" class="text-lg font-semibold m-0">Descrição</h2>
                                <p class="text-sm text-muted-color mt-1 mb-0">Conte o que o imóvel tem de melhor. Bons textos recebem mais contatos.</p>
                            </div>
                        </header>
                        <div class="flex flex-col gap-2">
                            <label for="im-titulo" class="font-medium">Título da descrição *</label>
                            <input pInputText id="im-titulo" formControlName="titulo" maxlength="160" placeholder="Ex.: Apartamento 3 quartos com varanda" aria-describedby="im-titulo-dica" />
                            <div class="flex justify-between gap-3">
                                <small id="im-titulo-dica" class="text-muted-color">Aparece como subtítulo, logo acima do texto da descrição.</small>
                                <small class="text-muted-color shrink-0">{{ (valores().titulo ?? '').length }}/160</small>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="im-desc" class="font-medium">Descrição</label>
                            <textarea pTextarea id="im-desc" formControlName="descricao" rows="6" [autoResize]="true" aria-describedby="im-desc-dica"></textarea>
                            <small id="im-desc-dica" class="text-muted-color">{{ (valores().descricao ?? '').length }} caracteres{{ (valores().descricao ?? '').length < 150 ? ' · recomendamos pelo menos 150' : '' }}</small>
                        </div>
                    </section>

                    <section id="im-sec-carac" class="card m-0 flex flex-col gap-5 scroll-mt-24" aria-labelledby="im-carac-titulo">
                        <header class="flex items-start gap-3">
                            <span class="flex items-center justify-center w-10 h-10 rounded-border bg-primary-50 dark:bg-primary-400/10 text-primary shrink-0"><i class="pi pi-th-large" aria-hidden="true"></i></span>
                            <div>
                                <h2 id="im-carac-titulo" class="text-lg font-semibold m-0">Características e custos</h2>
                                <p class="text-sm text-muted-color mt-1 mb-0">Áreas, cômodos, vagas e despesas fixas.</p>
                            </div>
                        </header>
                        <div class="grid gap-4 grid-cols-2 md:grid-cols-4">
                            @for (c of numeros; track c.campo) {
                                <div class="flex flex-col gap-2 min-w-0">
                                    <label [for]="'im-' + c.campo" class="font-medium">{{ c.label }}</label>
                                    @if (c.moeda) {
                                        <p-inputnumber [inputId]="'im-' + c.campo" [formControlName]="c.campo" [min]="0" mode="currency" currency="BRL" locale="pt-BR" [fluid]="true" />
                                    } @else {
                                        <p-inputnumber [inputId]="'im-' + c.campo" [formControlName]="c.campo" [min]="0" [showButtons]="c.botoes" [suffix]="c.sufixo" [fluid]="true" />
                                    }
                                </div>
                            }
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="im-carac" class="font-medium">Itens do imóvel</label>
                            <p-autocomplete
                                inputId="im-carac"
                                formControlName="caracteristicas"
                                [multiple]="true"
                                [typeahead]="true"
                                [suggestions]="sugestoes()"
                                (completeMethod)="filtrar($event.query)"
                                [fluid]="true"
                                aria-describedby="im-carac-dica"
                            />
                            <small id="im-carac-dica" class="text-muted-color">Digite e tecle Enter. Ex.: piscina, varanda, armários embutidos.</small>
                        </div>
                    </section>

                    <section id="im-sec-doc" class="card m-0 flex flex-col gap-5 scroll-mt-24" aria-labelledby="im-doc-titulo">
                        <header class="flex items-start gap-3">
                            <span class="flex items-center justify-center w-10 h-10 rounded-border bg-primary-50 dark:bg-primary-400/10 text-primary shrink-0"><i class="pi pi-file-check" aria-hidden="true"></i></span>
                            <div>
                                <h2 id="im-doc-titulo" class="text-lg font-semibold m-0">{{ tituloCondicoes() }}</h2>
                                <p class="text-sm text-muted-color mt-1 mb-0">Os itens mudam conforme a finalidade ({{ rotuloFinalidade() }}). Marque o que vale para este imóvel: tudo aparece na página do anúncio.</p>
                            </div>
                        </header>
                        @if (valores().finalidade === 'VENDA') {
                            <fieldset class="flex flex-col gap-3 border-0 p-0 m-0">
                                <legend class="font-semibold mb-1">Pagamento e documentação</legend>
                                <div class="grid gap-3 sm:grid-cols-2">
                                    @for (d of documentacao; track d.campo) {
                                        <label
                                            [for]="'im-doc-' + d.campo"
                                            class="flex items-start gap-3 p-3 rounded-border border cursor-pointer transition-colors"
                                            [class]="valores()[d.campo] ? 'border-primary bg-primary-50 dark:bg-primary-400/10' : 'border-surface hover:border-primary-300'"
                                        >
                                            <p-checkbox [formControlName]="d.campo" [binary]="true" [inputId]="'im-doc-' + d.campo" />
                                            <span>
                                                <span class="block font-medium">{{ d.label }}</span>
                                                <span class="block text-xs text-muted-color">{{ d.dica }}</span>
                                            </span>
                                        </label>
                                    }
                                </div>
                                @if (valores().aceitaFinanciamento) {
                                    <div class="flex flex-col gap-3 p-4 rounded-border bg-surface-50 dark:bg-surface-800 border border-surface" role="group" aria-labelledby="im-fin-titulo">
                                        <div class="flex items-start gap-2">
                                            <i class="pi pi-calculator text-primary mt-1" aria-hidden="true"></i>
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
                                        </div>
                                        @if (!simulacaoLigada()) {
                                            <p class="text-sm text-muted-color m-0">
                                                <i class="pi pi-info-circle" aria-hidden="true"></i> A simulação de financiamento está desativada no site pela administração. Suas escolhas ficam salvas e passam a valer quando ela for reativada.
                                            </p>
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
                                                <label for="im-fin-lista" class="font-medium">Financeiras aceitas</label>
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
                            </fieldset>
                        }
                        @if (valores().finalidade === 'ALUGUEL') {
                            <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                <div class="flex flex-col gap-2 min-w-0">
                                    <label for="im-contrato" class="font-medium">Contrato mínimo</label>
                                    <p-inputnumber inputId="im-contrato" formControlName="contratoMinimoMeses" [min]="1" [max]="120" suffix=" meses" [showButtons]="true" placeholder="Ex.: 30 meses" [fluid]="true" />
                                </div>
                            </div>
                        }
                        @if (valores().finalidade === 'TEMPORADA') {
                            <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                <div class="flex flex-col gap-2 min-w-0">
                                    <label for="im-noites" class="font-medium">Mínimo de noites</label>
                                    <p-inputnumber inputId="im-noites" formControlName="noitesMinimas" [min]="1" [max]="365" [showButtons]="true" suffix=" noites" [fluid]="true" />
                                </div>
                                <div class="flex flex-col gap-2 min-w-0">
                                    <label for="im-hospedes" class="font-medium">Hóspedes (máx.)</label>
                                    <p-inputnumber inputId="im-hospedes" formControlName="hospedesMaximo" [min]="1" [max]="100" [showButtons]="true" [fluid]="true" />
                                </div>
                                <div class="flex flex-col gap-2 min-w-0">
                                    <label for="im-limpeza" class="font-medium">Taxa de limpeza</label>
                                    <p-inputnumber inputId="im-limpeza" formControlName="taxaLimpeza" mode="currency" currency="BRL" locale="pt-BR" [min]="0" [fluid]="true" />
                                </div>
                                <div class="flex flex-col gap-2 min-w-0">
                                    <label for="im-checkin" class="font-medium">Check-in a partir de</label>
                                    <p-inputmask inputId="im-checkin" formControlName="horarioCheckin" mask="99:99" placeholder="14:00" [autoClear]="false" inputmode="numeric" [fluid]="true" />
                                </div>
                                <div class="flex flex-col gap-2 min-w-0">
                                    <label for="im-checkout" class="font-medium">Check-out até</label>
                                    <p-inputmask inputId="im-checkout" formControlName="horarioCheckout" mask="99:99" placeholder="11:00" [autoClear]="false" inputmode="numeric" [fluid]="true" />
                                </div>
                            </div>
                        }
                        @for (g of gruposCondicoes(); track g.id) {
                            <fieldset class="flex flex-col gap-3 border-0 p-0 m-0">
                                <legend class="font-semibold mb-1">
                                    {{ g.titulo }} <span class="block text-xs font-normal text-muted-color">{{ g.descricao }}</span>
                                </legend>
                                <div class="grid gap-3 sm:grid-cols-2">
                                    @for (c of g.itens; track c.codigo) {
                                        <label
                                            [for]="'im-cond-' + c.codigo"
                                            class="flex items-start gap-3 p-3 rounded-border border cursor-pointer transition-colors"
                                            [class]="(valores().condicoes ?? []).includes(c.codigo) ? 'border-primary bg-primary-50 dark:bg-primary-400/10' : 'border-surface hover:border-primary-300'"
                                        >
                                            <p-checkbox formControlName="condicoes" [value]="c.codigo" [inputId]="'im-cond-' + c.codigo" />
                                            <span class="flex items-start gap-2">
                                                <i class="pi {{ c.icone }} text-primary mt-1" aria-hidden="true"></i>
                                                <span>
                                                    <span class="block font-medium">{{ c.label }}</span>
                                                    <span class="block text-xs text-muted-color">{{ c.dica }}</span>
                                                </span>
                                            </span>
                                        </label>
                                    }
                                </div>
                            </fieldset>
                        }
                    </section>

                    <section id="im-sec-fotos" class="card m-0 flex flex-col gap-5 scroll-mt-24" aria-labelledby="im-fotos-titulo">
                        <header class="flex flex-wrap items-start justify-between gap-3">
                            <div class="flex items-start gap-3">
                                <span class="flex items-center justify-center w-10 h-10 rounded-border bg-primary-50 dark:bg-primary-400/10 text-primary shrink-0"><i class="pi pi-images" aria-hidden="true"></i></span>
                                <div>
                                    <h2 id="im-fotos-titulo" class="text-lg font-semibold m-0">
                                        Fotos <span class="text-muted-color font-normal text-base">({{ fotos.length }}/{{ maxFotos }})</span>
                                    </h2>
                                    <p class="text-sm text-muted-color m-0 mt-1">A primeira foto é a capa. Em cada foto, informe se ela é <strong>real</strong> ou <strong>criada/alterada com IA</strong>.</p>
                                </div>
                            </div>
                            @if (fotos.length > 1) {
                                <div class="flex flex-col gap-1">
                                    <label for="origem-todas" class="text-sm">Aplicar a todas as fotos</label>
                                    <p-select
                                        inputId="origem-todas"
                                        [options]="origens"
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="Escolha…"
                                        [formControl]="origemTodas"
                                        (onChange)="aplicarOrigemATodas($event.value)"
                                        styleClass="min-w-60"
                                    />
                                </div>
                            }
                        </header>

                        @if (fotos.length) {
                            <div class="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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

                        <aside class="aviso-origem-fotos m-0" aria-labelledby="aviso-origem-titulo">
                            <i class="pi pi-info-circle" aria-hidden="true"></i>
                            <div>
                                <h2 id="aviso-origem-titulo">Declaração sobre a origem das fotos</h2>
                                <p>
                                    A classificação das imagens como <strong>Foto real</strong> ou <strong>Editada/gerada com IA</strong> é feita por você no momento do cadastro.
                                    <strong>Embora o sistema permita publicar o anúncio sem essa marcação</strong>, a veracidade e a fiel correspondência das fotos com o estado atual do imóvel são de sua inteira responsabilidade.
                                </p>
                                <p>
                                    O uso de inteligência artificial para simular reformas, mobiliário ou ocultar defeitos sem a devida sinalização pode configurar propaganda enganosa. Em caso de reclamação ou denúncia, você responderá conforme as
                                    diretrizes do portal e as penalidades previstas na legislação — em especial a LGPD (Lei nº 13.709/2018) e o Código de Defesa do Consumidor (Lei nº 8.078/1990, art. 6º, III).
                                </p>
                                <p>Nosso portal mantém um compromisso inegociável com a lei, a transparência, a veracidade das informações e, acima de tudo, com a verdade nas relações entre anunciantes e interessados.</p>
                            </div>
                        </aside>
                    </section>
                </div>

                <!-- painel lateral: prévia, qualidade e atalhos -->
                <aside class="col-span-12 xl:col-span-4 flex flex-col gap-6 xl:sticky xl:top-24 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto" aria-label="Resumo do anúncio">
                    <div class="card m-0 p-0! overflow-hidden">
                        <div class="relative aspect-[16/10] bg-surface-100 dark:bg-surface-800">
                            <app-imovel-foto class="w-full h-full" [src]="capa()" [tipo]="valores().tipo ?? 'APARTAMENTO'" [semente]="valor()?.id ?? 0" alt="Prévia da capa do anúncio" [mostrarTexto]="!capa()" />
                            @if (valores().lancamento) {
                                <span class="imovel-card__selo imovel-card__selo--topo">Imóvel novo</span>
                            }
                        </div>
                        <div class="p-4 flex flex-col gap-1">
                            <span class="text-xs uppercase tracking-wide text-muted-color">Prévia na busca</span>
                            <span class="text-xl font-semibold">{{ precoPrevia() }}</span>
                            <span class="font-semibold text-primary truncate">{{ tituloPrevia() || 'Endereço do imóvel' }}</span>
                            <span class="text-sm text-muted-color truncate">{{ valores().bairro || 'Bairro' }}, {{ valores().cidade || 'Cidade' }}</span>
                            <div class="flex flex-wrap gap-3 text-sm text-muted-color mt-2">
                                @if (valores().areaUtil) {
                                    <span><i class="pi pi-arrows-alt text-xs" aria-hidden="true"></i> {{ valores().areaUtil }} m²</span>
                                }
                                @if (valores().quartos) {
                                    <span><i class="pi pi-box text-xs" aria-hidden="true"></i> {{ valores().quartos }} quarto(s)</span>
                                }
                                @if (valores().vagas) {
                                    <span><i class="pi pi-car text-xs" aria-hidden="true"></i> {{ valores().vagas }} vaga(s)</span>
                                }
                            </div>
                        </div>
                    </div>

                    <div class="card m-0 flex flex-col gap-3">
                        <div class="flex items-center justify-between">
                            <h2 class="text-base font-semibold m-0">Qualidade do anúncio</h2>
                            <span class="text-sm font-semibold" [class]="qualidadePct() === 100 ? 'text-green-700 dark:text-green-400' : 'text-muted-color'">{{ qualidadePct() }}%</span>
                        </div>
                        <p-progressbar [value]="qualidadePct()" [showValue]="false" styleClass="h-2" ariaLabel="Qualidade do anúncio" />
                        <ul class="list-none p-0 m-0 flex flex-col gap-1">
                            @for (c of checklist(); track c.rotulo) {
                                <li>
                                    <a [href]="'#' + c.secao" (click)="irPara($event, c.secao)" class="flex items-center gap-2 text-sm py-1 px-1 rounded-border hover:bg-emphasis" [class]="c.ok ? 'text-color' : 'text-muted-color'">
                                        <i class="pi" [class]="c.ok ? 'pi-check-circle text-green-600 dark:text-green-400' : 'pi-circle'" aria-hidden="true"></i>
                                        <span class="grow">{{ c.rotulo }}</span>
                                        <span class="sr-only">{{ c.ok ? '(feito)' : '(pendente)' }}</span>
                                    </a>
                                </li>
                            }
                        </ul>
                    </div>

                    <nav class="card m-0 hidden xl:flex flex-col gap-1" aria-label="Seções do formulário">
                        <h2 class="text-base font-semibold mt-0 mb-2">Ir para</h2>
                        @for (s of secoes; track s.id) {
                            <a [href]="'#' + s.id" (click)="irPara($event, s.id)" class="flex items-center gap-2 text-sm py-1.5 px-2 rounded-border hover:bg-emphasis text-color">
                                <i class="pi {{ s.icone }} text-primary text-xs" aria-hidden="true"></i> {{ s.titulo }}
                            </a>
                        }
                    </nav>
                </aside>
            </div>

            <!-- barra de ações -->
            <div class="sticky bottom-0 z-20 mt-6 -mx-2 px-2 py-3 bg-surface-50/95 dark:bg-surface-950/95 backdrop-blur border-t border-surface">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <span class="text-sm" role="status" aria-live="polite">
                        @if (sujo()) {
                            <span class="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400"><i class="pi pi-circle-fill text-[0.5rem]" aria-hidden="true"></i> Alterações não salvas</span>
                        } @else if (valor()) {
                            <span class="inline-flex items-center gap-2 text-muted-color"><i class="pi pi-check text-xs" aria-hidden="true"></i> Tudo salvo</span>
                        }
                    </span>
                    <div class="flex gap-2">
                        <ng-content />
                        <p-button type="submit" [label]="rotuloSalvar()" icon="pi pi-check" [loading]="salvando()" />
                    </div>
                </div>
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
    /** Grupos de condições da finalidade escolhida (garantias do aluguel, regras da temporada…). */
    gruposCondicoes = computed(() => CONDICOES[this.valores().finalidade ?? 'VENDA']);
    tituloCondicoes = computed(() => ({ VENDA: 'Documentação e condições de venda', ALUGUEL: 'Condições do aluguel', TEMPORADA: 'Condições da temporada' })[this.valores().finalidade ?? 'VENDA']);
    rotuloFinalidade = computed(() => finalidadeLabel(this.valores().finalidade ?? 'VENDA').toLowerCase());
    tipos = TIPOS;
    numeros = [
        { campo: 'areaUtil', label: 'Área útil', sufixo: ' m²', botoes: false },
        { campo: 'areaTotal', label: 'Área total', sufixo: ' m²', botoes: false },
        { campo: 'quartos', label: 'Quartos', sufixo: '', botoes: true },
        { campo: 'suites', label: 'Suítes', sufixo: '', botoes: true },
        { campo: 'banheiros', label: 'Banheiros', sufixo: '', botoes: true },
        { campo: 'vagas', label: 'Vagas', sufixo: '', botoes: true },
        { campo: 'condominio', label: 'Condomínio', sufixo: '', botoes: false, moeda: true },
        { campo: 'iptu', label: 'IPTU anual', sufixo: '', botoes: false, moeda: true }
    ];

    sugestoes = signal<string[]>([]);
    /** Financeiras ativas para o anunciante escolher quais aceita. */
    /** Regra "Simulação de financiamento" (aba Regras em /admin/configuracoes). */
    private configSite = inject(ConfigService).config;
    simulacaoLigada = computed(() => this.configSite().simulacaoFinanciamento !== false);
    financeirasAtivas = toSignal(
        inject(FinanceiraService)
            .ativas()
            .pipe(catchError(() => of([]))),
        { initialValue: [] }
    );
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
        condicoes: this.fb.control<CondicaoAnuncio[]>([]),
        contratoMinimoMeses: this.fb.control<number | null>(null),
        noitesMinimas: this.fb.control<number | null>(null),
        hospedesMaximo: this.fb.control<number | null>(null),
        taxaLimpeza: this.fb.control<number | null>(null),
        horarioCheckin: [''],
        horarioCheckout: [''],
        financeirasTodas: [true],
        financeiras: this.fb.control<number[]>([]),
        caracteristicas: this.fb.control<string[]>([]),
        fotos: this.fb.array<FotoGrupo>([])
    });

    protected valores = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
    /** Há alterações ainda não salvas (volta a falso quando o anúncio salvo é recarregado). */
    sujo = toSignal(this.form.events.pipe(map(() => this.form.dirty)), { initialValue: false });

    readonly secoes = [
        { id: 'im-sec-info', titulo: 'Informações principais', icone: 'pi-home' },
        { id: 'im-sec-local', titulo: 'Localização', icone: 'pi-map-marker' },
        { id: 'im-sec-desc', titulo: 'Descrição', icone: 'pi-align-left' },
        { id: 'im-sec-carac', titulo: 'Características e custos', icone: 'pi-th-large' },
        { id: 'im-sec-doc', titulo: 'Documentação e condições', icone: 'pi-file-check' },
        { id: 'im-sec-fotos', titulo: 'Fotos', icone: 'pi-images' }
    ];

    capa = computed(() => this.valores().fotos?.[0]?.url ?? null);
    precoPrevia = computed(() => {
        const v = this.valores();
        if (!v.preco) return 'Preço a definir';
        const preco = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.preco);
        return v.finalidade === 'ALUGUEL' ? `${preco}/mês` : v.finalidade === 'TEMPORADA' ? `${preco}/diária` : preco;
    });

    /** O que deixa o anúncio completo, com a seção onde se resolve cada item. */
    checklist = computed(() => {
        const v = this.valores();
        const fotos = v.fotos ?? [];
        return [
            { rotulo: 'Preço informado', ok: !!v.preco, secao: 'im-sec-info' },
            { rotulo: 'Endereço completo', ok: !!v.endereco?.trim() && !!v.bairro?.trim() && !!v.cidade?.trim(), secao: 'im-sec-local' },
            { rotulo: 'Posição no mapa', ok: v.latitude != null, secao: 'im-sec-local' },
            { rotulo: 'Descrição com 150+ caracteres', ok: (v.descricao ?? '').trim().length >= 150, secao: 'im-sec-desc' },
            { rotulo: 'Área e cômodos', ok: !!v.areaUtil && v.quartos != null, secao: 'im-sec-carac' },
            { rotulo: 'Pelo menos 3 itens do imóvel', ok: (v.caracteristicas ?? []).length >= 3, secao: 'im-sec-carac' },
            { rotulo: 'Pelo menos 5 fotos', ok: fotos.length >= 5, secao: 'im-sec-fotos' },
            { rotulo: 'Origem de todas as fotos', ok: fotos.length > 0 && fotos.every((f) => f.origem && f.origem !== 'NAO_INFORMADO'), secao: 'im-sec-fotos' }
        ];
    });
    qualidadePct = computed(() => {
        const c = this.checklist();
        return Math.round((c.filter((x) => x.ok).length / c.length) * 100);
    });

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
            this.form.patchValue({
                ...v,
                uf: v.uf?.toUpperCase() ?? 'DF',
                descricao: v.descricao ?? '',
                endereco: v.endereco ?? '',
                numero: v.numero ?? '',
                cep: digitos(v.cep),
                caracteristicas: [...v.caracteristicas],
                condicoes: [...(v.condicoes ?? [])],
                horarioCheckin: v.horarioCheckin ?? '',
                horarioCheckout: v.horarioCheckout ?? '',
                financeirasTodas: v.financeirasTodas ?? false,
                financeiras: [...(v.financeirasIds ?? [])]
            });
            this.centro.set(v.latitude != null && v.longitude != null ? [v.latitude, v.longitude] : null);
            this.form.markAsPristine();
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

    irPara(evento: Event, id: string) {
        evento.preventDefault();
        const el = document.getElementById(id);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el?.querySelector<HTMLElement>('input, textarea, [tabindex]')?.focus({ preventScroll: true });
    }

    enviar() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Confira o formulário', detail: 'Preencha preço, UF, cidade, bairro e o título da descrição.' });
            return;
        }
        const v = this.form.getRawValue();
        // horário incompleto da máscara ("14:__") vira nulo; só vão as condições da finalidade escolhida
        const horario = (h: string) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(h) ? h : null);
        const permitidas = new Set(CONDICOES[v.finalidade].flatMap((g) => g.itens.map((i) => i.codigo)));
        this.salvar.emit({
            ...v,
            preco: v.preco ?? 0,
            uf: v.uf.toUpperCase(),
            descricao: v.descricao || null,
            endereco: v.endereco || null,
            numero: v.numero.trim() || null,
            cep: digitos(v.cep) || null,
            condicoes: v.condicoes.filter((c) => permitidas.has(c)),
            horarioCheckin: horario(v.horarioCheckin),
            horarioCheckout: horario(v.horarioCheckout)
        });
    }
}
