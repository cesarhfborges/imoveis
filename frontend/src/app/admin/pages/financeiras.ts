import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Financeira, FinanceiraForm, SISTEMAS_AMORTIZACAO, SistemaAmortizacao } from '@/app/core/models/models';
import { FinanceiraService } from '@/app/core/services/financeira.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { PageHeader } from '@/app/shared/components/page-header';

/** Cadastro das financeiras (bancos) e das regras usadas na simulação de financiamento dos anúncios. */
@Component({
    selector: 'app-financeiras-page',
    imports: [CurrencyPipe, DecimalPipe, ReactiveFormsModule, TableModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule, TextareaModule, SelectButtonModule, ToggleSwitchModule, TagModule, TooltipModule, PageHeader],
    template: `
        <app-page-header titulo="Financeiras" subtitulo="Bancos e regras usados na simulação de financiamento dos anúncios de venda.">
            <p-button label="Nova financeira" icon="pi pi-plus" (onClick)="abrir(null)" />
        </app-page-header>

        <div class="card">
            <p-table [value]="lista()" [loading]="carregando()" [tableStyle]="{ 'min-width': '56rem' }" dataKey="id">
                <ng-template #header>
                    <tr>
                        <th scope="col">Financeira</th>
                        <th scope="col">Juros</th>
                        <th scope="col">Prazo máx.</th>
                        <th scope="col">Entrada mín.</th>
                        <th scope="col">Sistema</th>
                        <th scope="col">Faixa de valor</th>
                        <th scope="col">Situação</th>
                        <th scope="col"><span class="sr-only">Ações</span></th>
                    </tr>
                </ng-template>
                <ng-template #body let-f>
                    <tr>
                        <td>
                            <div class="font-medium">{{ f.nome }}</div>
                            @if (f.descricao) {
                                <div class="text-sm text-muted-color">{{ f.descricao }}</div>
                            }
                        </td>
                        <td>{{ f.taxaJurosAnual | number: '1.2-3' }}% a.a.</td>
                        <td>{{ f.prazoMaximoMeses }} meses</td>
                        <td>{{ f.entradaMinimaPercentual | number: '1.0-2' }}%</td>
                        <td>{{ rotuloSistema(f.sistemaAmortizacao) }}</td>
                        <td class="text-sm">
                            @if (f.valorMinimoImovel || f.valorMaximoImovel) {
                                {{ f.valorMinimoImovel ? (f.valorMinimoImovel | currency: 'BRL') : 'sem mínimo' }} a
                                {{ f.valorMaximoImovel ? (f.valorMaximoImovel | currency: 'BRL') : 'sem máximo' }}
                            } @else {
                                Qualquer valor
                            }
                        </td>
                        <td><p-tag [value]="f.ativo ? 'Ativa' : 'Inativa'" [severity]="f.ativo ? 'success' : 'secondary'" /></td>
                        <td class="text-right whitespace-nowrap">
                            <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" (onClick)="abrir(f)" [ariaLabel]="'Editar ' + f.nome" pTooltip="Editar" />
                            <p-button icon="pi pi-trash" severity="danger" [text]="true" [rounded]="true" (onClick)="excluir(f)" [ariaLabel]="'Excluir ' + f.nome" pTooltip="Excluir" />
                        </td>
                    </tr>
                </ng-template>
                <ng-template #emptymessage>
                    <tr>
                        <td colspan="8" class="text-center text-muted-color py-6">Nenhuma financeira cadastrada. Sem financeiras, os anúncios não mostram o botão de simular.</td>
                    </tr>
                </ng-template>
            </p-table>
        </div>

        <p-dialog [visible]="dialogo()" (visibleChange)="dialogo.set($event)" [modal]="true" [header]="editando() ? 'Editar financeira' : 'Nova financeira'" [style]="{ width: '52rem' }" [breakpoints]="{ '960px': '96vw' }" [draggable]="false">
            <form [formGroup]="form" (ngSubmit)="salvar()" class="flex flex-col gap-5" id="form-financeira">
                <fieldset class="grid grid-cols-1 md:grid-cols-2 gap-4 border-0 p-0 m-0">
                    <legend class="font-semibold mb-2">Identificação</legend>
                    <div class="flex flex-col gap-2">
                        <label for="fin-nome">Nome *</label>
                        <input pInputText id="fin-nome" formControlName="nome" maxlength="80" placeholder="Ex.: Banco do Brasil" [attr.aria-invalid]="form.controls.nome.invalid && form.controls.nome.touched" />
                    </div>
                    <div class="flex items-center gap-3 md:pt-7">
                        <p-toggleswitch formControlName="ativo" inputId="fin-ativo" />
                        <label for="fin-ativo">Ativa (aparece para anunciantes e visitantes)</label>
                    </div>
                    <div class="flex flex-col gap-2 md:col-span-2">
                        <label for="fin-desc">Descrição curta</label>
                        <input pInputText id="fin-desc" formControlName="descricao" maxlength="500" placeholder="Ex.: Linha SBPE para imóveis residenciais" />
                    </div>
                </fieldset>

                <fieldset class="grid grid-cols-1 md:grid-cols-3 gap-4 border-0 p-0 m-0">
                    <legend class="font-semibold mb-2">Regras do financiamento</legend>
                    <div class="flex flex-col gap-2">
                        <label for="fin-taxa">Juros ao ano (%) *</label>
                        <p-inputnumber inputId="fin-taxa" formControlName="taxaJurosAnual" [minFractionDigits]="2" [maxFractionDigits]="3" [min]="0" [max]="100" suffix=" %" fluid />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="fin-prazo">Prazo máximo (meses) *</label>
                        <p-inputnumber inputId="fin-prazo" formControlName="prazoMaximoMeses" [min]="12" [max]="480" [showButtons]="true" [step]="12" fluid />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="fin-entrada">Entrada mínima (%) *</label>
                        <p-inputnumber inputId="fin-entrada" formControlName="entradaMinimaPercentual" [maxFractionDigits]="2" [min]="0" [max]="100" suffix=" %" fluid />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="fin-renda">Renda comprometida máx. (%) *</label>
                        <p-inputnumber inputId="fin-renda" formControlName="comprometimentoRendaPercentual" [maxFractionDigits]="2" [min]="1" [max]="100" suffix=" %" fluid />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="fin-idade">Idade máx. ao quitar (anos)</label>
                        <p-inputnumber inputId="fin-idade" formControlName="idadeMaximaQuitacao" [min]="18" [max]="120" placeholder="Sem limite" fluid />
                    </div>
                    <div class="flex flex-col gap-2">
                        <span id="fin-sistema" class="block">Sistema de amortização *</span>
                        <p-selectbutton formControlName="sistemaAmortizacao" [options]="sistemas" optionLabel="label" optionValue="value" [allowEmpty]="false" ariaLabelledBy="fin-sistema" size="small" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="fin-min">Valor mínimo do imóvel</label>
                        <p-inputnumber inputId="fin-min" formControlName="valorMinimoImovel" mode="currency" currency="BRL" locale="pt-BR" [min]="0" placeholder="Sem mínimo" fluid />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="fin-max">Valor máximo do imóvel</label>
                        <p-inputnumber inputId="fin-max" formControlName="valorMaximoImovel" mode="currency" currency="BRL" locale="pt-BR" [min]="0" placeholder="Sem máximo" fluid />
                    </div>
                    <div class="flex items-center gap-3 md:pt-7">
                        <p-toggleswitch formControlName="aceitaFgts" inputId="fin-fgts" />
                        <label for="fin-fgts">Aceita FGTS na entrada</label>
                    </div>
                </fieldset>

                <fieldset class="grid grid-cols-1 md:grid-cols-2 gap-4 border-0 p-0 m-0">
                    <legend class="font-semibold mb-2">Encargos mensais</legend>
                    <div class="flex flex-col gap-2">
                        <label for="fin-seguro">Seguros MIP/DFI (% ao mês sobre o saldo)</label>
                        <p-inputnumber inputId="fin-seguro" formControlName="seguroMensalPercentual" [minFractionDigits]="2" [maxFractionDigits]="4" [min]="0" [max]="10" suffix=" %" fluid />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="fin-adm">Taxa de administração (R$/mês)</label>
                        <p-inputnumber inputId="fin-adm" formControlName="taxaAdministracaoMensal" mode="currency" currency="BRL" locale="pt-BR" [min]="0" fluid />
                    </div>
                    <div class="flex flex-col gap-2 md:col-span-2">
                        <label for="fin-obs">Observações para o comprador</label>
                        <textarea pTextarea id="fin-obs" formControlName="observacoes" rows="2" maxlength="1000" placeholder="Ex.: Taxa para clientes com relacionamento; sujeita a análise de crédito."></textarea>
                    </div>
                </fieldset>
            </form>
            <ng-template #footer>
                <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="dialogo.set(false)" />
                <p-button (onClick)="salvar()" label="Salvar" icon="pi pi-check" [loading]="salvando()" />
            </ng-template>
        </p-dialog>
    `
})
export class FinanceirasPage {
    private financeiras = inject(FinanceiraService);
    private msg = inject(MessageService);
    private confirm = inject(ConfirmationService);
    private fb = inject(NonNullableFormBuilder);

    lista = signal<Financeira[]>([]);
    carregando = signal(true);
    dialogo = signal(false);
    salvando = signal(false);
    editando = signal<Financeira | null>(null);
    sistemas = SISTEMAS_AMORTIZACAO;

    form = this.fb.group({
        nome: ['', [Validators.required, Validators.maxLength(80)]],
        descricao: [''],
        logoUrl: [''],
        ativo: [true],
        sistemaAmortizacao: this.fb.control<SistemaAmortizacao>('AMBOS'),
        taxaJurosAnual: this.fb.control<number | null>(null, Validators.required),
        prazoMaximoMeses: this.fb.control<number | null>(420, Validators.required),
        entradaMinimaPercentual: this.fb.control<number | null>(20, Validators.required),
        comprometimentoRendaPercentual: this.fb.control<number | null>(30, Validators.required),
        idadeMaximaQuitacao: this.fb.control<number | null>(80),
        valorMinimoImovel: this.fb.control<number | null>(null),
        valorMaximoImovel: this.fb.control<number | null>(null),
        seguroMensalPercentual: this.fb.control<number | null>(0),
        taxaAdministracaoMensal: this.fb.control<number | null>(25),
        aceitaFgts: [true],
        observacoes: ['']
    });

    constructor() {
        inject(ConfigService).definirTitulo('Financeiras');
        this.carregar();
    }

    rotuloSistema(s: SistemaAmortizacao) {
        return SISTEMAS_AMORTIZACAO.find((x) => x.value === s)?.label ?? s;
    }

    carregar() {
        this.carregando.set(true);
        this.financeiras.listar().subscribe({
            next: (l) => {
                this.lista.set(l);
                this.carregando.set(false);
            },
            error: () => this.carregando.set(false)
        });
    }

    abrir(f: Financeira | null) {
        this.editando.set(f);
        this.form.reset();
        if (f) {
            this.form.patchValue({ ...f, descricao: f.descricao ?? '', logoUrl: f.logoUrl ?? '', observacoes: f.observacoes ?? '' });
        }
        this.dialogo.set(true);
    }

    salvar() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Confira o formulário', detail: 'Informe nome, juros, prazo, entrada mínima e renda comprometida.' });
            return;
        }
        const v = this.form.getRawValue();
        const dados: FinanceiraForm = {
            ...v,
            descricao: v.descricao || null,
            logoUrl: v.logoUrl || null,
            observacoes: v.observacoes || null,
            taxaJurosAnual: v.taxaJurosAnual ?? 0,
            prazoMaximoMeses: v.prazoMaximoMeses ?? 360,
            entradaMinimaPercentual: v.entradaMinimaPercentual ?? 0,
            comprometimentoRendaPercentual: v.comprometimentoRendaPercentual ?? 30,
            seguroMensalPercentual: v.seguroMensalPercentual ?? 0,
            taxaAdministracaoMensal: v.taxaAdministracaoMensal ?? 0
        };
        const atual = this.editando();
        this.salvando.set(true);
        (atual ? this.financeiras.atualizar(atual.id, dados) : this.financeiras.criar(dados)).subscribe({
            next: () => {
                this.salvando.set(false);
                this.dialogo.set(false);
                this.msg.add({ severity: 'success', summary: atual ? 'Financeira atualizada' : 'Financeira cadastrada' });
                this.carregar();
            },
            error: (e) => {
                this.salvando.set(false);
                this.msg.add({ severity: 'error', summary: 'Não foi possível salvar', detail: mensagemErro(e) });
            }
        });
    }

    excluir(f: Financeira) {
        this.confirm.confirm({
            header: 'Excluir financeira',
            message: `"${f.nome}" deixará de aparecer nas simulações, inclusive nos anúncios que a selecionaram. Para só pausar, prefira desativá-la. Continuar?`,
            acceptButtonProps: { label: 'Excluir', severity: 'danger' },
            rejectButtonProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
            accept: () =>
                this.financeiras.excluir(f.id).subscribe({
                    next: () => this.carregar(),
                    error: (e) => this.msg.add({ severity: 'error', summary: 'Erro', detail: mensagemErro(e) })
                })
        });
    }
}
