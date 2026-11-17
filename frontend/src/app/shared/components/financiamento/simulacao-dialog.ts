import { Component, computed, effect, inject, input, model, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { ChartModule } from 'primeng/chart';
import { Financeira } from '@/app/core/models/models';
import { CoresGraficoService } from '@/app/shared/components/painel/cores-grafico.service';
import { opcoesLinha } from '@/app/shared/components/painel/graficos';
import { ParametrosSimulacao, Sistema, entradaMinima, motivoInelegivel, parametrosPadrao, parcelaEstimada, prazoMaximo, simular, sistemasDa, validar } from './simulacao';

const ROTULO_SISTEMA: Record<Sistema, string> = { SAC: 'SAC (parcelas decrescentes)', PRICE: 'Price (parcelas fixas)' };

/**
 * Simulação de financiamento em etapas: escolher a financeira (só quando o anúncio oferece mais de uma),
 * informar entrada/prazo/sistema e ver o resultado. Tudo é calculado no navegador com as regras cadastradas.
 */
@Component({
    selector: 'app-simulacao-dialog',
    imports: [CurrencyPipe, DecimalPipe, ReactiveFormsModule, DialogModule, StepperModule, ButtonModule, InputNumberModule, SelectButtonModule, MessageModule, TagModule, ChartModule],
    template: `
        <p-dialog [visible]="visivel()" (visibleChange)="visivel.set($event)" [modal]="true" [dismissableMask]="true" [draggable]="false" header="Simular financiamento" [style]="{ width: '56rem' }" [breakpoints]="{ '960px': '96vw' }">
            <p class="text-muted-color mt-0">
                {{ titulo() }} · <strong class="text-color">{{ preco() | currency: 'BRL' }}</strong>
            </p>
            <p-stepper [value]="passo()" (valueChange)="passo.set($event ?? 1)" [linear]="true">
                <p-step-list>
                    @if (variasFinanceiras()) {
                        <p-step [value]="1">Financeira</p-step>
                    }
                    <p-step [value]="2">Seus dados</p-step>
                    <p-step [value]="3" [disabled]="erros().length > 0">Resultado</p-step>
                </p-step-list>
                <p-step-panels>
                    @if (variasFinanceiras()) {
                        <p-step-panel [value]="1">
                            <ng-template #content>
                                <p class="mt-0 text-muted-color">Compare as condições e escolha com qual financeira simular. A parcela estimada usa a entrada mínima e o prazo máximo de cada uma.</p>
                                <div role="radiogroup" aria-label="Financeiras disponíveis" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    @for (o of opcoes(); track o.f.id) {
                                        <button
                                            type="button"
                                            role="radio"
                                            [attr.aria-checked]="selecionada()?.id === o.f.id"
                                            [disabled]="!!o.motivo"
                                            (click)="escolher(o.f)"
                                            class="text-left p-4 rounded-border border-2 transition-colors bg-transparent cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-primary"
                                            [class]="selecionada()?.id === o.f.id ? 'border-primary bg-primary-50 dark:bg-primary-400/10' : 'border-surface hover:border-primary-300'"
                                        >
                                            <div class="flex items-center justify-between gap-2 mb-2">
                                                <span class="font-semibold text-lg text-color">{{ o.f.nome }}</span>
                                                <span class="flex gap-1">
                                                    @if (o.f.id === menorTaxaId()) {
                                                        <p-tag value="Menor taxa" severity="success" />
                                                    }
                                                    @if (o.f.id === menorParcelaId()) {
                                                        <p-tag value="Menor parcela" severity="info" />
                                                    }
                                                </span>
                                            </div>
                                            @if (o.f.descricao) {
                                                <p class="text-sm text-muted-color mt-0 mb-2">{{ o.f.descricao }}</p>
                                            }
                                            <dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm m-0">
                                                <dt class="text-muted-color">Juros</dt>
                                                <dd class="m-0 font-medium text-color">{{ o.f.taxaJurosAnual | number: '1.2-2' }}% a.a.</dd>
                                                <dt class="text-muted-color">Prazo máximo</dt>
                                                <dd class="m-0 font-medium text-color">{{ o.f.prazoMaximoMeses }} meses ({{ o.f.prazoMaximoMeses / 12 | number: '1.0-1' }} anos)</dd>
                                                <dt class="text-muted-color">Entrada mínima</dt>
                                                <dd class="m-0 font-medium text-color">{{ o.f.entradaMinimaPercentual | number: '1.0-2' }}% · {{ o.entrada | currency: 'BRL' : 'symbol' : '1.0-0' }}</dd>
                                                <dt class="text-muted-color">Sistema</dt>
                                                <dd class="m-0 font-medium text-color">{{ o.sistemas }}</dd>
                                                <dt class="text-muted-color">Renda comprometida</dt>
                                                <dd class="m-0 font-medium text-color">até {{ o.f.comprometimentoRendaPercentual | number: '1.0-0' }}%</dd>
                                                @if (o.f.idadeMaximaQuitacao) {
                                                    <dt class="text-muted-color">Idade ao quitar</dt>
                                                    <dd class="m-0 font-medium text-color">até {{ o.f.idadeMaximaQuitacao }} anos</dd>
                                                }
                                                <dt class="text-muted-color">Usa FGTS</dt>
                                                <dd class="m-0 font-medium text-color">{{ o.f.aceitaFgts ? 'Sim' : 'Não' }}</dd>
                                            </dl>
                                            @if (o.motivo) {
                                                <p class="text-sm text-red-600 dark:text-red-400 mb-0 mt-3">{{ o.motivo }}</p>
                                            } @else {
                                                <p class="mb-0 mt-3 text-sm text-muted-color">
                                                    1ª parcela estimada: <strong class="text-primary text-base">{{ o.parcela | currency: 'BRL' }}</strong>
                                                </p>
                                            }
                                            @if (o.f.observacoes) {
                                                <p class="text-xs text-muted-color mb-0 mt-2">{{ o.f.observacoes }}</p>
                                            }
                                        </button>
                                    }
                                </div>
                                <div class="flex justify-end pt-5">
                                    <p-button label="Continuar" icon="pi pi-arrow-right" iconPos="right" [disabled]="!selecionada()" (onClick)="passo.set(2)" />
                                </div>
                            </ng-template>
                        </p-step-panel>
                    }
                    <p-step-panel [value]="2">
                        <ng-template #content>
                            @if (selecionada(); as f) {
                                <p class="mt-0">
                                    Simulando com <strong>{{ f.nome }}</strong> · {{ f.taxaJurosAnual | number: '1.2-2' }}% a.a.
                                </p>
                                <form [formGroup]="form" class="grid grid-cols-1 md:grid-cols-2 gap-4" (ngSubmit)="irResultado()">
                                    <div class="flex flex-col gap-2">
                                        <label for="sim-entrada" class="font-medium">Entrada</label>
                                        <p-inputnumber inputId="sim-entrada" formControlName="entrada" mode="currency" currency="BRL" locale="pt-BR" [min]="0" [max]="preco()" fluid />
                                        <small class="text-muted-color">Mínimo {{ minimaEntrada() | currency: 'BRL' : 'symbol' : '1.0-0' }} ({{ f.entradaMinimaPercentual | number: '1.0-2' }}%){{ f.aceitaFgts ? ' · pode usar FGTS' : '' }}</small>
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <label for="sim-prazo" class="font-medium">Prazo (meses)</label>
                                        <p-inputnumber inputId="sim-prazo" formControlName="prazo" [min]="12" [max]="maxPrazo()" [showButtons]="true" [step]="12" suffix=" meses" fluid />
                                        <small class="text-muted-color">De 12 a {{ maxPrazo() }} meses ({{ maxPrazo() / 12 | number: '1.0-1' }} anos)</small>
                                    </div>
                                    @if (sistemas().length > 1) {
                                        <div class="flex flex-col gap-2 md:col-span-2">
                                            <span id="sim-sistema" class="font-medium">Sistema de amortização</span>
                                            <p-selectbutton formControlName="sistema" [options]="sistemas()" optionLabel="label" optionValue="value" [allowEmpty]="false" ariaLabelledBy="sim-sistema" />
                                            <small class="text-muted-color">SAC começa com parcela maior e termina menor, pagando menos juros no total. Price mantém a parcela fixa.</small>
                                        </div>
                                    }
                                    <div class="flex flex-col gap-2">
                                        <label for="sim-renda" class="font-medium">Renda bruta mensal <span class="text-muted-color font-normal">(opcional)</span></label>
                                        <p-inputnumber inputId="sim-renda" formControlName="renda" mode="currency" currency="BRL" locale="pt-BR" [min]="0" fluid />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <label for="sim-idade" class="font-medium">Sua idade <span class="text-muted-color font-normal">(opcional)</span></label>
                                        <p-inputnumber inputId="sim-idade" formControlName="idade" [min]="18" [max]="100" suffix=" anos" fluid />
                                        @if (f.idadeMaximaQuitacao) {
                                            <small class="text-muted-color">A idade somada ao prazo não pode passar de {{ f.idadeMaximaQuitacao }} anos.</small>
                                        }
                                    </div>
                                    @for (e of erros(); track e) {
                                        <p-message severity="warn" [text]="e" styleClass="md:col-span-2" />
                                    }
                                    <div class="flex justify-between md:col-span-2 pt-2">
                                        @if (variasFinanceiras()) {
                                            <p-button label="Voltar" icon="pi pi-arrow-left" severity="secondary" [outlined]="true" (onClick)="passo.set(1)" />
                                        } @else {
                                            <span></span>
                                        }
                                        <p-button type="submit" label="Ver resultado" icon="pi pi-calculator" [disabled]="erros().length > 0" />
                                    </div>
                                </form>
                            }
                        </ng-template>
                    </p-step-panel>
                    <p-step-panel [value]="3">
                        <ng-template #content>
                            @if (resultado(); as r) {
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div class="p-3 rounded-border bg-primary-50 dark:bg-primary-400/10">
                                        <div class="text-sm text-muted-color">1ª parcela</div>
                                        <div class="text-xl font-semibold text-primary">{{ r.primeiraParcela | currency: 'BRL' }}</div>
                                    </div>
                                    <div class="p-3 rounded-border bg-surface-100 dark:bg-surface-800">
                                        <div class="text-sm text-muted-color">Última parcela</div>
                                        <div class="text-xl font-semibold">{{ r.ultimaParcela | currency: 'BRL' }}</div>
                                    </div>
                                    <div class="p-3 rounded-border bg-surface-100 dark:bg-surface-800">
                                        <div class="text-sm text-muted-color">Valor financiado</div>
                                        <div class="text-xl font-semibold">{{ r.valorFinanciado | currency: 'BRL' : 'symbol' : '1.0-0' }}</div>
                                    </div>
                                    <div class="p-3 rounded-border bg-surface-100 dark:bg-surface-800">
                                        <div class="text-sm text-muted-color">Renda mínima</div>
                                        <div class="text-xl font-semibold">{{ r.rendaMinima | currency: 'BRL' : 'symbol' : '1.0-0' }}</div>
                                    </div>
                                </div>
                                <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-4 mb-0">
                                    <div class="flex justify-between"><dt class="text-muted-color">Financeira</dt><dd class="m-0 font-medium">{{ selecionada()?.nome }}</dd></div>
                                    <div class="flex justify-between"><dt class="text-muted-color">Sistema / prazo</dt><dd class="m-0 font-medium">{{ form.getRawValue().sistema }} · {{ form.getRawValue().prazo }} meses</dd></div>
                                    <div class="flex justify-between"><dt class="text-muted-color">Juros</dt><dd class="m-0 font-medium">{{ selecionada()?.taxaJurosAnual | number: '1.2-2' }}% a.a. ({{ r.taxaMensal * 100 | number: '1.3-3' }}% a.m.)</dd></div>
                                    <div class="flex justify-between"><dt class="text-muted-color">Total de juros</dt><dd class="m-0 font-medium">{{ r.totalJuros | currency: 'BRL' : 'symbol' : '1.0-0' }}</dd></div>
                                    <div class="flex justify-between"><dt class="text-muted-color">Seguros e taxas</dt><dd class="m-0 font-medium">{{ r.totalEncargos | currency: 'BRL' : 'symbol' : '1.0-0' }}</dd></div>
                                    <div class="flex justify-between"><dt class="text-muted-color">Total pago ao banco</dt><dd class="m-0 font-medium">{{ r.totalPago | currency: 'BRL' : 'symbol' : '1.0-0' }}</dd></div>
                                    <div class="flex justify-between"><dt class="text-muted-color">Custo total (com entrada)</dt><dd class="m-0 font-semibold">{{ r.custoTotal | currency: 'BRL' : 'symbol' : '1.0-0' }}</dd></div>
                                    @if (r.comprometimento !== null) {
                                        <div class="flex justify-between">
                                            <dt class="text-muted-color">Renda comprometida</dt>
                                            <dd class="m-0 font-semibold" [class]="r.comprometimento > (selecionada()?.comprometimentoRendaPercentual ?? 30) ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'">{{ r.comprometimento | number: '1.0-1' }}%</dd>
                                        </div>
                                    }
                                </dl>
                                @if (r.comprometimento !== null && r.comprometimento > (selecionada()?.comprometimentoRendaPercentual ?? 30)) {
                                    <p-message severity="warn" styleClass="mt-3" [text]="'A parcela passa do limite de ' + selecionada()?.comprometimentoRendaPercentual + '% da renda aceito por esta financeira. Aumente a entrada ou o prazo.'" />
                                }
                                <h3 class="text-base font-semibold mt-5 mb-2">Evolução do saldo e da parcela</h3>
                                <p-chart type="line" [data]="grafico()" [options]="opcoesGrafico()" height="220px" ariaLabel="Gráfico da evolução do saldo devedor e da parcela por ano" />
                                <p class="text-xs text-muted-color mt-3 mb-0">Simulação ilustrativa com as condições cadastradas para a financeira. Valores finais dependem da análise de crédito, avaliação do imóvel e tarifas do banco.</p>
                                <div class="flex justify-between pt-4">
                                    <p-button label="Ajustar dados" icon="pi pi-arrow-left" severity="secondary" [outlined]="true" (onClick)="passo.set(2)" />
                                    <p-button label="Fechar" (onClick)="visivel.set(false)" />
                                </div>
                            }
                        </ng-template>
                    </p-step-panel>
                </p-step-panels>
            </p-stepper>
        </p-dialog>
    `
})
export class SimulacaoDialog {
    visivel = model(false);
    titulo = input('');
    preco = input.required<number>();
    financeiras = input.required<Financeira[]>();

    private cores = inject(CoresGraficoService).cores;
    private fb = inject(NonNullableFormBuilder);

    passo = signal(1);
    selecionada = signal<Financeira | null>(null);

    form = this.fb.group({
        entrada: this.fb.control(0),
        prazo: this.fb.control(360),
        sistema: this.fb.control<Sistema>('PRICE'),
        renda: this.fb.control<number | null>(null),
        idade: this.fb.control<number | null>(null)
    });
    private valores = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

    variasFinanceiras = computed(() => this.financeiras().length > 1);

    opcoes = computed(() =>
        this.financeiras().map((f) => {
            const motivo = motivoInelegivel(f, this.preco());
            return {
                f,
                motivo,
                entrada: entradaMinima(f, this.preco()),
                parcela: motivo ? null : parcelaEstimada(f, this.preco()),
                sistemas: sistemasDa(f).join(' ou ')
            };
        })
    );
    menorTaxaId = computed(() => this.minimo(this.opcoes().filter((o) => !o.motivo), (o) => o.f.taxaJurosAnual));
    menorParcelaId = computed(() => this.minimo(this.opcoes().filter((o) => o.parcela !== null), (o) => o.parcela!));

    sistemas = computed(() => (this.selecionada() ? sistemasDa(this.selecionada()!) : []).map((s) => ({ value: s, label: ROTULO_SISTEMA[s] })));
    minimaEntrada = computed(() => (this.selecionada() ? entradaMinima(this.selecionada()!, this.preco()) : 0));
    maxPrazo = computed(() => (this.selecionada() ? prazoMaximo(this.selecionada()!, this.valores().idade ?? null) : 360));

    private parametros = computed<ParametrosSimulacao>(() => {
        const v = { ...this.form.getRawValue(), ...this.valores() };
        return { preco: this.preco(), entrada: v.entrada ?? 0, prazo: v.prazo ?? 0, sistema: v.sistema ?? 'PRICE', renda: v.renda ?? null, idade: v.idade ?? null };
    });
    erros = computed(() => (this.selecionada() ? validar(this.selecionada()!, this.parametros()) : ['Escolha uma financeira.']));
    resultado = computed(() => (this.selecionada() && this.erros().length === 0 ? simular(this.selecionada()!, this.parametros()) : null));

    /** Saldo no eixo da esquerda e parcela no da direita (escalas muito diferentes). */
    opcoesGrafico = computed(() => {
        const base = opcoesLinha(this.cores());
        return { ...base, scales: { ...base.scales, y1: { ...base.scales.y, position: 'right', grid: { drawOnChartArea: false } } } };
    });
    grafico = computed(() => {
        const r = this.resultado();
        const c = this.cores();
        return {
            labels: (r?.evolucao ?? []).map((e) => `Ano ${e.ano}`),
            datasets: [
                { label: 'Saldo devedor', data: (r?.evolucao ?? []).map((e) => Math.round(e.saldo)), borderColor: c.primaria, backgroundColor: CoresGraficoService.translucida(c.primaria), fill: true, tension: 0.3, pointRadius: 0, yAxisID: 'y' },
                { label: 'Parcela', data: (r?.evolucao ?? []).map((e) => Math.round(e.parcela)), borderColor: c.serie[2], backgroundColor: c.serie[2], tension: 0.3, pointRadius: 0, yAxisID: 'y1' }
            ]
        };
    });

    constructor() {
        // ao abrir: com uma financeira só, pula a escolha e vai direto para os dados
        effect(() => {
            if (!this.visivel()) return;
            const lista = this.financeiras();
            untracked(() => {
                const elegiveis = lista.filter((f) => !motivoInelegivel(f, this.preco()));
                if (lista.length === 1) {
                    this.escolher(lista[0], false);
                    this.passo.set(2);
                } else {
                    this.selecionada.set(null);
                    if (elegiveis.length === 1) this.escolher(elegiveis[0], false);
                    this.passo.set(1);
                }
            });
        });
    }

    escolher(f: Financeira, avancar = true) {
        this.selecionada.set(f);
        const p = parametrosPadrao(f, this.preco());
        this.form.setValue({ entrada: p.entrada, prazo: p.prazo, sistema: p.sistema, renda: this.form.getRawValue().renda, idade: this.form.getRawValue().idade });
        if (avancar) this.passo.set(2);
    }

    irResultado() {
        if (this.erros().length === 0) this.passo.set(3);
    }

    private minimo<T extends { f: Financeira }>(lista: T[], valor: (o: T) => number): number | null {
        if (lista.length < 2) return null;
        return lista.reduce((a, b) => (valor(b) < valor(a) ? b : a)).f.id;
    }
}
