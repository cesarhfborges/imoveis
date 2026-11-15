import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DiaExpediente, Feriado, duracaoMinutos } from '@/app/core/models/models';
import { ModeracaoService } from '@/app/core/services/moderacao.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { PageHeader } from '@/app/shared/components/page-header';
import { endOfDay, format, formatDate, startOfDay } from 'date-fns';

const NOMES_DIAS = ['', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
/** Ordem de exibição: domingo a sábado. */
const ORDEM = [7, 1, 2, 3, 4, 5, 6];

type FeriadoEdicao = Omit<Feriado, 'id'> & { id: number | null };

/** Calendário geral do sistema: expediente semanal e feriados (os prazos úteis só correm no expediente). */
@Component({
    selector: 'app-calendario-page',
    imports: [DatePipe, FormsModule, ButtonModule, CheckboxModule, InputTextModule, InputNumberModule, SelectModule, TableModule, TagModule, DialogModule, ToggleSwitchModule, PageHeader],
    template: `
        <app-page-header titulo="Calendário" subtitulo="Expediente e feriados do sistema. Os prazos em minutos úteis (como o das denúncias) só contam dentro do expediente e fora dos feriados." />

        <form class="card" (ngSubmit)="salvarExpediente()" aria-labelledby="exp-titulo">
            <h2 id="exp-titulo" class="text-lg font-semibold mt-0 mb-4">Expediente semanal</h2>
            <div class="flex flex-col gap-1 mb-4 max-w-xs">
                <label for="fuso" class="text-sm font-medium">Fuso horário</label>
                <p-select inputId="fuso" name="fuso" [options]="fusos" [(ngModel)]="fuso" [editable]="true" />
            </div>
            <table class="w-full max-w-2xl border-collapse">
                <thead>
                    <tr class="text-left text-sm text-muted-color">
                        <th scope="col" class="py-2 font-medium">Dia</th>
                        <th scope="col" class="py-2 font-medium">Funciona</th>
                        <th scope="col" class="py-2 font-medium">Início</th>
                        <th scope="col" class="py-2 font-medium">Fim</th>
                    </tr>
                </thead>
                <tbody>
                    @for (d of dias(); track d.diaSemana) {
                        <tr class="border-t border-surface" [class.opacity-60]="!d.ativo">
                            <th scope="row" class="py-2 pr-4 text-left font-medium">{{ nomeDia(d.diaSemana) }}</th>
                            <td class="py-2 pr-4"><p-checkbox [binary]="true" [(ngModel)]="d.ativo" [name]="'ativo' + d.diaSemana" [inputId]="'ativo' + d.diaSemana" [ariaLabel]="nomeDia(d.diaSemana) + ': funciona'" /></td>
                            <td class="py-2 pr-4"><input type="time" pInputText [(ngModel)]="d.inicio" [name]="'ini' + d.diaSemana" [disabled]="!d.ativo" [attr.aria-label]="nomeDia(d.diaSemana) + ': início'" class="w-32" /></td>
                            <td class="py-2">
                                <input
                                    type="time"
                                    pInputText
                                    [ngModel]="d.fim === '24:00' ? '23:59' : d.fim"
                                    (ngModelChange)="d.fim = $event"
                                    [name]="'fim' + d.diaSemana"
                                    [disabled]="!d.ativo"
                                    [attr.aria-label]="nomeDia(d.diaSemana) + ': fim'"
                                    class="w-32"
                                />
                            </td>
                        </tr>
                    }
                </tbody>
            </table>
            <div class="flex justify-end mt-4">
                <p-button type="submit" label="Salvar expediente" icon="pi pi-check" [loading]="salvando()" />
            </div>
        </form>

        <section class="card" aria-labelledby="fer-titulo">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                    <h2 id="fer-titulo" class="text-lg font-semibold m-0">Feriados e paradas</h2>
                    <p class="text-sm text-muted-color m-0">Data e hora de início e fim. Ex.: véspera de Natal a partir das 13:00. "Repete todo ano" vale para datas fixas.</p>
                </div>
                <p-button label="Novo feriado" icon="pi pi-plus" (onClick)="editar(null)" />
            </div>
            <p-table [value]="feriados()" dataKey="id" [tableStyle]="{ 'min-width': '40rem' }">
                <ng-template #header>
                    <tr>
                        <th scope="col">Feriado</th>
                        <th scope="col">Início</th>
                        <th scope="col">Fim</th>
                        <th scope="col">Repete</th>
                        <th scope="col"><span class="sr-only">Ações</span></th>
                    </tr>
                </ng-template>
                <ng-template #body let-f>
                    <tr>
                        <td class="font-medium">{{ f.titulo }}</td>
                        <td>{{ f.inicio | date: (f.recorrente ? "dd/MM 'às' HH:mm" : "dd/MM/yyyy 'às' HH:mm") }}</td>
                        <td>{{ f.fim | date: (f.recorrente ? "dd/MM 'às' HH:mm" : "dd/MM/yyyy 'às' HH:mm") }}</td>
                        <td>
                            @if (f.recorrente) {
                                <p-tag value="Todo ano" severity="info" />
                            }
                        </td>
                        <td class="text-right whitespace-nowrap">
                            <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" [ariaLabel]="'Editar ' + f.titulo" (onClick)="editar(f)" />
                            <p-button icon="pi pi-trash" [text]="true" [rounded]="true" severity="danger" [ariaLabel]="'Excluir ' + f.titulo" (onClick)="excluir(f)" />
                        </td>
                    </tr>
                </ng-template>
                <ng-template #emptymessage>
                    <tr>
                        <td colspan="5" class="text-center py-6 text-muted-color">Nenhum feriado cadastrado.</td>
                    </tr>
                </ng-template>
            </p-table>
        </section>

        <section class="card" aria-labelledby="sim-titulo">
            <h2 id="sim-titulo" class="text-lg font-semibold mt-0 mb-1">Simular um prazo</h2>
            <p class="text-sm text-muted-color mt-0">Confira quando vence um prazo em minutos úteis com o calendário salvo.</p>
            <form class="flex flex-col sm:flex-row sm:items-end gap-3" (ngSubmit)="simular()">
                <div class="flex flex-col gap-1">
                    <label for="sim-ini" class="text-sm font-medium">Início</label>
                    <input type="datetime-local" pInputText id="sim-ini" name="simIni" [(ngModel)]="simInicio" />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="sim-min" class="text-sm font-medium">Minutos úteis</label>
                    <p-inputnumber inputId="sim-min" name="simMin" [(ngModel)]="simMinutos" [min]="1" [max]="525600" [useGrouping]="false" />
                </div>
                <p-button type="submit" label="Calcular" icon="pi pi-calculator" [outlined]="true" />
            </form>
            @if (simResultado(); as r) {
                <p class="mt-3 mb-0" role="status">
                    {{ duracao(simMinutos) }} úteis a partir de {{ r.inicio | date: "dd/MM/yyyy 'às' HH:mm" }} vencem em <strong>{{ r.prazo ? (r.prazo | date: "EEEE, dd/MM/yyyy 'às' HH:mm") : 'nunca (sem expediente configurado)' }}</strong>.
                </p>
            }
        </section>

        <p-dialog [visible]="!!edicao()" (visibleChange)="!$event && edicao.set(null)" [modal]="true" [header]="edicao()?.id ? 'Editar feriado' : 'Novo feriado'" [style]="{ width: '30rem' }" [breakpoints]="{ '640px': '96vw' }">
            @if (edicao(); as f) {
                <form class="flex flex-col gap-4" (ngSubmit)="salvarFeriado(f)">
                    <div class="flex flex-col gap-1">
                        <label for="f-tit" class="font-medium">Nome</label>
                        <input pInputText id="f-tit" name="titulo" [(ngModel)]="f.titulo" maxlength="120" required placeholder="Ex.: Véspera de Natal" />
                    </div>
<!--                    <div class="grid gap-4 sm:grid-cols-2">-->
<!--                        <div class="flex flex-col gap-1">-->
<!--                            <label for="f-ini" class="font-medium">Início</label>-->
<!--                            <input type="datetime-local" pInputText id="f-ini" name="inicio" [(ngModel)]="f.inicio" required />-->
<!--                        </div>-->
<!--                        <div class="flex flex-col gap-1">-->
<!--                            <label for="f-fim" class="font-medium">Fim</label>-->
<!--                            <input type="datetime-local" pInputText id="f-fim" name="fim" [(ngModel)]="f.fim" required />-->
<!--                        </div>-->
<!--                    </div>-->
                    <label class="flex items-center gap-3 cursor-pointer">
                        <label for="f-ini" class="font-medium">Início</label>
                        <input type="datetime-local" pInputText id="f-ini" name="inicio" [(ngModel)]="f.inicio" required />
                    </label>
                    <label class="flex items-center gap-3 cursor-pointer">
                        <label for="f-fim" class="font-medium">Fim</label>
                        <input type="datetime-local" pInputText id="f-fim" name="fim" [(ngModel)]="f.fim" required />
                    </label>
                    <label class="flex items-center gap-3 cursor-pointer">
                        <p-toggleswitch inputId="f-rec" name="recorrente" [(ngModel)]="f.recorrente" />
                        <span>Repete todo ano na mesma data e hora</span>
                    </label>
                    <div class="flex justify-end gap-2">
                        <p-button label="Cancelar" [text]="true" severity="secondary" (onClick)="edicao.set(null)" />
                        <p-button type="submit" label="Salvar" icon="pi pi-check" [loading]="salvando()" [disabled]="!f.titulo.trim() || !f.inicio || !f.fim" />
                    </div>
                </form>
            }
        </p-dialog>
    `
})
export class CalendarioPage {
    private moderacao = inject(ModeracaoService);
    private msg = inject(MessageService);
    private confirm = inject(ConfirmationService);

    fusos = ['America/Sao_Paulo', 'America/Manaus', 'America/Cuiaba', 'America/Rio_Branco', 'America/Noronha', 'America/Belem', 'America/Fortaleza', 'America/Recife', 'America/Bahia'];
    fuso = 'America/Sao_Paulo';
    dias = signal<DiaExpediente[]>([]);
    feriados = signal<Feriado[]>([]);
    edicao = signal<FeriadoEdicao | null>(null);
    salvando = signal(false);
    duracao = duracaoMinutos;

    simInicio = '';
    simMinutos = 120;
    simResultado = signal<{ inicio: string; prazo: string | null } | null>(null);

    constructor() {
        inject(ConfigService).definirTitulo('Calendário');
        this.carregar();
    }

    carregar() {
        this.moderacao.calendario().subscribe((c) => {
            this.fuso = c.fuso;
            this.dias.set(ORDEM.map((n) => ({ ...(c.expediente.find((d) => d.diaSemana === n) ?? { diaSemana: n, ativo: false, inicio: '08:00', fim: '18:00' }) })));
            this.feriados.set(c.feriados);
        });
    }

    nomeDia(n: number) {
        return NOMES_DIAS[n];
    }

    salvarExpediente() {
        // "23:59" no campo de fim é tratado como fim do dia (24:00)
        const dias = this.dias().map((d) => ({ ...d, fim: d.fim === '23:59' ? '24:00' : d.fim }));
        this.salvando.set(true);
        this.moderacao.salvarExpediente(this.fuso, dias).subscribe({
            next: () => {
                this.salvando.set(false);
                this.msg.add({ severity: 'success', summary: 'Expediente salvo', detail: 'Vale para os novos prazos.' });
                this.carregar();
            },
            error: (e) => {
                this.salvando.set(false);
                this.msg.add({ severity: 'error', summary: 'Não foi possível salvar', detail: mensagemErro(e) });
            }
        });
    }

    editar(f: Feriado | null) {
        const dataAtual = startOfDay(new Date());
        this.edicao.set(
            f
                ? { ...f }
                : {
                      id: null,
                      titulo: '',
                      inicio: format(dataAtual, 'yyyy-MM-dd') + 'T00:00', // `${ano}-12-25T00:00`,
                      fim: format(endOfDay(dataAtual), 'yyyy-MM-dd') + 'T23:59', //`${ano}-12-26T00:00`,
                      recorrente: true
                  }
        );
    }

    salvarFeriado(f: FeriadoEdicao) {
        this.salvando.set(true);
        this.moderacao.salvarFeriado(f).subscribe({
            next: () => {
                this.salvando.set(false);
                this.edicao.set(null);
                this.carregar();
                this.msg.add({ severity: 'success', summary: 'Feriado salvo' });
            },
            error: (e) => {
                this.salvando.set(false);
                this.msg.add({ severity: 'error', summary: 'Não foi possível salvar', detail: mensagemErro(e) });
            }
        });
    }

    excluir(f: Feriado) {
        this.confirm.confirm({
            header: 'Excluir feriado',
            message: `Excluir "${f.titulo}"?`,
            acceptLabel: 'Excluir',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => this.moderacao.excluirFeriado(f.id).subscribe({ next: () => this.carregar(), error: (e) => this.msg.add({ severity: 'error', summary: 'Erro', detail: mensagemErro(e) }) })
        });
    }

    simular() {
        const inicio = this.simInicio ? new Date(this.simInicio).toISOString() : null;
        this.moderacao.simular(this.simMinutos, inicio).subscribe((r) => this.simResultado.set(r));
    }
}
