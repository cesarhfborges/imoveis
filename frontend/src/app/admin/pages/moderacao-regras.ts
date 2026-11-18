import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ACOES_AUTOMATICAS, CORES_TAG, Gravidade, ModeracaoConfig, TipoDenuncia, chaveGravidade, duracaoMinutos } from '@/app/core/models/models';
import { ModeracaoService } from '@/app/core/services/moderacao.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { PageHeader } from '@/app/shared/components/page-header';
import { TabelaResponsiva } from '@/app/shared/directives/tabela-responsiva';

type TipoEdicao = Omit<TipoDenuncia, 'id' | 'gravidade'> & { id: number | null; gravidadeId: number };
type GravidadeEdicao = Omit<Gravidade, 'id'> & { id: number | null };

/** Regras da moderação: automações por etapa, aprovação, avisos e tipos de denúncia com os seus prazos. */
@Component({
    selector: 'app-moderacao-regras-page',
    imports: [RouterLink, FormsModule, ButtonModule, SelectModule, InputNumberModule, InputTextModule, TextareaModule, ToggleSwitchModule, TableModule, TabelaResponsiva, TagModule, DialogModule, PageHeader],
    template: `
        <app-page-header titulo="Regras e automações" subtitulo="Prazos em minutos úteis: contam só no expediente do calendário, fora dos feriados.">
            <a routerLink="/admin/calendario" class="p-button p-button-outlined"><i class="pi pi-calendar mr-2" aria-hidden="true"></i>Calendário</a>
        </app-page-header>

        @if (cfg(); as c) {
            <form class="card" (ngSubmit)="salvarConfig()" aria-labelledby="regras-titulo">
                <h2 id="regras-titulo" class="text-lg font-semibold mt-0 mb-4">Automações e decisões</h2>

                <div class="flex flex-col gap-5">
                    <div class="flex items-start gap-3">
                        <p-toggleswitch inputId="auto" name="auto" [(ngModel)]="c.automacaoAtiva" />
                        <label for="auto">
                            <span class="font-medium block">Automações ligadas</span>
                            <span class="text-sm text-muted-color">Desligadas, o prazo continua sendo contado, mas nada acontece com o anúncio quando vence (a decisão fica com a moderação).</span>
                        </label>
                    </div>

                    <fieldset class="border border-surface rounded-lg p-4 m-0" [disabled]="!c.automacaoAtiva" [class.opacity-60]="!c.automacaoAtiva">
                        <legend class="font-semibold px-2">Quando o anunciante não responde no prazo</legend>
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div class="flex flex-col gap-1">
                                <label for="e1" class="text-sm font-medium">Etapa 1 · ao vencer o prazo do tipo</label>
                                <p-select inputId="e1" name="e1" [options]="acoes" optionLabel="label" optionValue="value" [(ngModel)]="c.etapa1Acao" />
                            </div>
                            <div class="flex flex-col gap-1">
                                <label for="e1p" class="text-sm font-medium">Prazo extra até a etapa 2 (min úteis)</label>
                                <p-inputnumber inputId="e1p" name="e1p" [(ngModel)]="c.etapa1PrazoMinutos" [min]="1" [max]="525600" [useGrouping]="false" [disabled]="c.etapa1Acao === 'BANIR' || c.etapa2Acao === 'NENHUMA'" />
                                <small class="text-muted-color">≈ {{ duracao(c.etapa1PrazoMinutos) }} úteis</small>
                            </div>
                            <div class="flex flex-col gap-1">
                                <label for="e2" class="text-sm font-medium">Etapa 2 · ao vencer o prazo extra</label>
                                <p-select inputId="e2" name="e2" [options]="acoes" optionLabel="label" optionValue="value" [(ngModel)]="c.etapa2Acao" [disabled]="c.etapa1Acao === 'BANIR'" />
                            </div>
                        </div>
                        <p class="text-sm text-muted-color mb-0 mt-3"><i class="pi pi-info-circle" aria-hidden="true"></i> {{ resumo() }}</p>
                    </fieldset>

                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div class="flex flex-col gap-1">
                            <label for="aviso" class="text-sm font-medium">Avisar o anunciante quando faltar (min úteis)</label>
                            <p-inputnumber inputId="aviso" name="aviso" [(ngModel)]="c.avisoMinutos" [min]="0" [max]="525600" [useGrouping]="false" />
                            <small class="text-muted-color">0 = sem aviso</small>
                        </div>
                        <div class="flex flex-col gap-1">
                            <label for="ajuste" class="text-sm font-medium">Prazo mínimo quando o caso volta para o anunciante (min úteis)</label>
                            <p-inputnumber inputId="ajuste" name="ajuste" [(ngModel)]="c.ajusteSlaMinutos" [min]="1" [max]="525600" [useGrouping]="false" />
                            <small class="text-muted-color">≈ {{ duracao(c.ajusteSlaMinutos) }} úteis. Quando a moderação responde, o prazo retoma de onde parou; se faltava menos que isso, ganha este prazo.</small>
                        </div>
                    </div>

                    <div class="flex items-start gap-3">
                        <p-toggleswitch inputId="reativa" name="reativa" [(ngModel)]="c.aprovarReativaAnuncio" />
                        <label for="reativa">
                            <span class="font-medium block">Ao aprovar a solução, reativar o anúncio</span>
                            <span class="text-sm text-muted-color">Se o anúncio estiver suspenso e não restar outra pendência aberta, ele volta ao status de antes (também vale ao julgar improcedente).</span>
                        </label>
                    </div>
                </div>

                <div class="flex justify-end mt-4">
                    <p-button type="submit" label="Salvar regras" icon="pi pi-check" [loading]="salvando()" />
                </div>
            </form>
        }

        <section class="card" aria-labelledby="grav-titulo">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                    <h2 id="grav-titulo" class="text-lg font-semibold m-0">Gravidades e banimento de contas</h2>
                    <p class="text-sm text-muted-color m-0">
                        Cada gravidade pode banir a conta do anunciante automaticamente depois de X denúncias procedentes dela, contando todo o histórico ou só os últimos meses. Desligado, as procedentes só são contabilizadas.
                    </p>
                </div>
                <p-button label="Nova gravidade" icon="pi pi-plus" (onClick)="editarGravidade(null)" />
            </div>
            <p-table appTabelaResponsiva [value]="gravidades()" dataKey="id" [tableStyle]="{ 'min-width': '44rem' }">
                <ng-template #header>
                    <tr>
                        <th scope="col">Gravidade</th>
                        <th scope="col">Banimento automático da conta</th>
                        <th scope="col">Situação</th>
                        <th scope="col"><span class="sr-only">Ações</span></th>
                    </tr>
                </ng-template>
                <ng-template #body let-g>
                    <tr>
                        <td><p-tag [value]="g.nome" [severity]="g.cor" /></td>
                        <td>
                            @if (g.banirContaAuto) {
                                Após <strong>{{ g.banirApos }}</strong> procedente{{ g.banirApos === 1 ? '' : 's' }}
                                {{ g.janelaMeses ? 'nos últimos ' + janela(g.janelaMeses) : 'em todo o histórico' }}
                            } @else {
                                <span class="text-muted-color">Desligado (só contabiliza)</span>
                            }
                        </td>
                        <td><p-tag [value]="g.ativo ? 'Ativa' : 'Inativa'" [severity]="g.ativo ? 'success' : 'secondary'" /></td>
                        <td class="text-right whitespace-nowrap">
                            <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" [ariaLabel]="'Editar a gravidade ' + g.nome" (onClick)="editarGravidade(g)" />
                            <p-button icon="pi pi-trash" [text]="true" [rounded]="true" severity="danger" [ariaLabel]="'Excluir a gravidade ' + g.nome" (onClick)="excluirGravidade(g)" />
                        </td>
                    </tr>
                </ng-template>
            </p-table>
        </section>

        <section class="card" aria-labelledby="tipos-titulo">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                    <h2 id="tipos-titulo" class="text-lg font-semibold m-0">Tipos de denúncia</h2>
                    <p class="text-sm text-muted-color m-0">Cada tipo tem o seu prazo de resposta. Tipos já usados não podem ser excluídos: desative-os.</p>
                </div>
                <p-button label="Novo tipo" icon="pi pi-plus" (onClick)="editar(null)" />
            </div>
            <p-table appTabelaResponsiva [value]="tipos()" dataKey="id" [tableStyle]="{ 'min-width': '48rem' }">
                <ng-template #header>
                    <tr>
                        <th scope="col">Tipo</th>
                        <th scope="col">Gravidade</th>
                        <th scope="col">Prazo</th>
                        <th scope="col">Ao abrir</th>
                        <th scope="col">Situação</th>
                        <th scope="col"><span class="sr-only">Ações</span></th>
                    </tr>
                </ng-template>
                <ng-template #body let-t>
                    <tr>
                        <td>
                            <div class="font-medium">{{ t.nome }}</div>
                            <div class="text-xs text-muted-color max-w-[28rem]">{{ t.descricao }}</div>
                        </td>
                        <td><p-tag [value]="t.gravidade.nome" [severity]="t.gravidade.cor" /></td>
                        <td class="whitespace-nowrap">
                            {{ t.slaMinutos }} min <span class="text-xs text-muted-color">({{ duracao(t.slaMinutos) }})</span>
                        </td>
                        <td>{{ t.suspenderAoAbrir ? 'Suspende o anúncio' : '—' }}</td>
                        <td><p-tag [value]="t.ativo ? 'Ativo' : 'Inativo'" [severity]="t.ativo ? 'success' : 'secondary'" /></td>
                        <td class="text-right whitespace-nowrap">
                            <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" [ariaLabel]="'Editar ' + t.nome" (onClick)="editar(t)" />
                            <p-button icon="pi pi-trash" [text]="true" [rounded]="true" severity="danger" [ariaLabel]="'Excluir ' + t.nome" (onClick)="excluir(t)" />
                        </td>
                    </tr>
                </ng-template>
            </p-table>
        </section>

        <p-dialog [blockScroll]="true" [visible]="!!edicao()" (visibleChange)="!$event && edicao.set(null)" [modal]="true" [header]="edicao()?.id ? 'Editar tipo' : 'Novo tipo'" [style]="{ width: '34rem' }" [breakpoints]="{ '640px': '96vw' }">
            @if (edicao(); as t) {
                <form class="flex flex-col gap-4" (ngSubmit)="salvarTipo(t)">
                    <div class="flex flex-col gap-1">
                        <label for="t-nome" class="font-medium">Nome</label>
                        <input pInputText id="t-nome" name="nome" [(ngModel)]="t.nome" maxlength="80" required />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="t-desc" class="font-medium">Descrição (aparece para quem denuncia)</label>
                        <textarea pTextarea id="t-desc" name="descricao" [(ngModel)]="t.descricao" rows="2" maxlength="300" [autoResize]="true"></textarea>
                    </div>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="flex flex-col gap-1">
                            <label for="t-grav" class="font-medium">Gravidade</label>
                            <p-select inputId="t-grav" name="gravidade" [options]="gravidadesAtivas()" optionLabel="nome" optionValue="id" [(ngModel)]="t.gravidadeId" placeholder="Escolha" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <label for="t-sla" class="font-medium">Prazo de resposta (min úteis)</label>
                            <p-inputnumber inputId="t-sla" name="sla" [(ngModel)]="t.slaMinutos" [min]="1" [max]="525600" [useGrouping]="false" />
                            <small class="text-muted-color">≈ {{ duracao(t.slaMinutos) }} úteis</small>
                        </div>
                        <div class="flex flex-col gap-1">
                            <label for="t-ordem" class="font-medium">Ordem na lista</label>
                            <p-inputnumber inputId="t-ordem" name="ordem" [(ngModel)]="t.ordem" [min]="0" [max]="100000" [useGrouping]="false" />
                        </div>
                    </div>
                    <label class="flex items-center gap-3 cursor-pointer">
                        <p-toggleswitch inputId="t-susp" name="susp" [(ngModel)]="t.suspenderAoAbrir" />
                        <span>Suspender o anúncio assim que a denúncia for aberta</span>
                    </label>
                    <label class="flex items-center gap-3 cursor-pointer">
                        <p-toggleswitch inputId="t-ativo" name="ativo" [(ngModel)]="t.ativo" />
                        <span>Ativo (aparece na lista de quem denuncia)</span>
                    </label>
                    <div class="flex justify-end gap-2">
                        <p-button label="Cancelar" [text]="true" severity="secondary" (onClick)="edicao.set(null)" />
                        <p-button type="submit" label="Salvar" icon="pi pi-check" [loading]="salvando()" [disabled]="!t.nome.trim() || !t.slaMinutos" />
                    </div>
                </form>
            }
        </p-dialog>

        <p-dialog [blockScroll]="true" [visible]="!!gravEdicao()" (visibleChange)="!$event && gravEdicao.set(null)" [modal]="true" [header]="gravEdicao()?.id ? 'Editar gravidade' : 'Nova gravidade'" [style]="{ width: '34rem' }" [breakpoints]="{ '640px': '96vw' }">
            @if (gravEdicao(); as g) {
                <form class="flex flex-col gap-4" (ngSubmit)="salvarGravidade(g)">
                    <div class="flex flex-col gap-1">
                        <label for="g-nome" class="font-medium">Nome</label>
                        <input pInputText id="g-nome" name="nome" [(ngModel)]="g.nome" (blur)="g.nome = limparNome(g.nome)" maxlength="40" required [attr.aria-invalid]="!!erroNome(g)" aria-describedby="g-nome-ajuda" />
                        <small id="g-nome-ajuda" [class.text-red-700]="!!erroNome(g)" [class.text-muted-color]="!erroNome(g)">
                            {{ erroNome(g) || 'Maiúsculas, acentos e espaços não diferenciam: "Grave", "grave" e "Gráve" são o mesmo nome.' }}
                        </small>
                    </div>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="flex flex-col gap-1">
                            <label for="g-cor" class="font-medium">Cor da etiqueta</label>
                            <p-select inputId="g-cor" name="cor" [options]="cores" optionLabel="label" optionValue="value" [(ngModel)]="g.cor">
                                <ng-template #item let-c><p-tag [value]="c.label" [severity]="c.value" /></ng-template>
                                <ng-template #selectedItem let-c><p-tag [value]="c.label" [severity]="c.value" /></ng-template>
                            </p-select>
                        </div>
                        <div class="flex flex-col gap-1">
                            <label for="g-ordem" class="font-medium">Ordem</label>
                            <p-inputnumber inputId="g-ordem" name="ordem" [(ngModel)]="g.ordem" [min]="0" [max]="100000" [useGrouping]="false" />
                        </div>
                    </div>
                    <fieldset class="border border-surface rounded-lg p-4 m-0 flex flex-col gap-4">
                        <legend class="font-semibold px-2">Banimento automático da conta</legend>
                        <label class="flex items-start gap-3 cursor-pointer">
                            <p-toggleswitch inputId="g-auto" name="auto" [(ngModel)]="g.banirContaAuto" />
                            <span>
                                <span class="block">Banir a conta do anunciante automaticamente</span>
                                <span class="block text-sm text-muted-color">Desligado: as denúncias procedentes desta gravidade só são contabilizadas no histórico.</span>
                            </span>
                        </label>
                        @if (g.banirContaAuto) {
                            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div class="flex flex-col gap-1">
                                    <label for="g-apos" class="font-medium">Após quantas procedentes</label>
                                    <p-inputnumber inputId="g-apos" name="apos" [(ngModel)]="g.banirApos" [min]="1" [max]="1000" [useGrouping]="false" />
                                </div>
                                <div class="flex flex-col gap-1">
                                    <label for="g-janela" class="font-medium">Considerar</label>
                                    <p-select inputId="g-janela" name="janela" [options]="janelas" optionLabel="label" optionValue="value" [(ngModel)]="g.janelaMeses" />
                                </div>
                            </div>
                            <p class="text-sm text-muted-color m-0">
                                <i class="pi pi-info-circle" aria-hidden="true"></i>
                                Ao chegar a {{ g.banirApos || 'X' }} procedente{{ g.banirApos === 1 ? '' : 's' }} "{{ g.nome || 'desta gravidade' }}" {{ g.janelaMeses ? 'nos últimos ' + janela(g.janelaMeses) : 'em todo o histórico' }}, a conta é
                                banida (não entra mais) e os anúncios dela saem do ar.
                            </p>
                        }
                    </fieldset>
                    <label class="flex items-center gap-3 cursor-pointer">
                        <p-toggleswitch inputId="g-ativo" name="ativo" [(ngModel)]="g.ativo" />
                        <span>Ativa (pode ser escolhida nos tipos de denúncia)</span>
                    </label>
                    <div class="flex justify-end gap-2">
                        <p-button label="Cancelar" [text]="true" severity="secondary" (onClick)="gravEdicao.set(null)" />
                        <p-button type="submit" label="Salvar" icon="pi pi-check" [loading]="salvando()" [disabled]="!!erroNome(g) || !g.nome.trim() || (g.banirContaAuto && !g.banirApos)" />
                    </div>
                </form>
            }
        </p-dialog>
    `
})
export class ModeracaoRegrasPage {
    private moderacao = inject(ModeracaoService);
    private msg = inject(MessageService);
    private confirm = inject(ConfirmationService);

    acoes = ACOES_AUTOMATICAS;
    cores = CORES_TAG;
    janelas = [
        { label: 'Todo o histórico', value: null },
        { label: 'Últimos 6 meses', value: 6 },
        { label: 'Último ano', value: 12 },
        { label: 'Últimos 2 anos', value: 24 },
        { label: 'Últimos 3 anos', value: 36 },
        { label: 'Últimos 5 anos', value: 60 }
    ];
    gravidades = signal<Gravidade[]>([]);
    gravidadesAtivas = computed(() => this.gravidades().filter((g) => g.ativo));
    gravEdicao = signal<GravidadeEdicao | null>(null);
    cfg = signal<ModeracaoConfig | null>(null);
    tipos = signal<TipoDenuncia[]>([]);
    edicao = signal<TipoEdicao | null>(null);
    salvando = signal(false);
    duracao = duracaoMinutos;

    resumo = computed(() => {
        const c = this.cfg();
        if (!c) return '';
        const nome = (a: string) => (a === 'SUSPENDER' ? 'o anúncio é suspenso' : a === 'BANIR' ? 'o anúncio é banido' : 'nada acontece');
        if (c.etapa1Acao === 'BANIR') return `Vencido o prazo, ${nome('BANIR')}.`;
        if (c.etapa2Acao === 'NENHUMA') return `Vencido o prazo, ${nome(c.etapa1Acao)}; depois disso, a decisão fica com a moderação.`;
        return `Vencido o prazo, ${nome(c.etapa1Acao)} e começa um prazo extra de ${duracaoMinutos(c.etapa1PrazoMinutos)} úteis; se ainda não houver resposta, ${nome(c.etapa2Acao)}.`;
    });

    constructor() {
        inject(ConfigService).definirTitulo('Regras da moderação');
        this.moderacao.config().subscribe((c) => this.cfg.set(c));
        this.carregarTipos();
        this.carregarGravidades();
    }

    carregarGravidades() {
        this.moderacao.gravidades().subscribe((g) => this.gravidades.set(g));
    }

    janela(meses: number) {
        return meses % 12 === 0 ? (meses === 12 ? '12 meses (1 ano)' : `${meses} meses (${meses / 12} anos)`) : `${meses} meses`;
    }

    limparNome(nome: string) {
        return nome.trim().replace(/\s+/g, ' ');
    }

    /** Mesmo nome de outra gravidade, sem diferença de maiúsculas, acentos ou espaços. */
    erroNome(g: GravidadeEdicao): string | null {
        const chave = chaveGravidade(g.nome || '');
        if (!chave) return null;
        const igual = this.gravidades().find((x) => x.id !== g.id && chaveGravidade(x.nome) === chave);
        return igual ? `Já existe a gravidade "${igual.nome}".` : null;
    }

    editarGravidade(g: Gravidade | null) {
        this.gravEdicao.set(g ? { ...g } : { id: null, nome: '', cor: 'info', ordem: (this.gravidades().length + 1) * 10, ativo: true, banirContaAuto: false, banirApos: null, janelaMeses: 12 });
    }

    salvarGravidade(g: GravidadeEdicao) {
        const corpo = { ...g, nome: this.limparNome(g.nome), banirApos: g.banirContaAuto ? g.banirApos : g.banirApos };
        this.salvando.set(true);
        this.moderacao.salvarGravidade(corpo).subscribe({
            next: () => {
                this.salvando.set(false);
                this.gravEdicao.set(null);
                this.carregarGravidades();
                this.carregarTipos();
                this.msg.add({ severity: 'success', summary: 'Gravidade salva' });
            },
            error: (e) => {
                this.salvando.set(false);
                this.msg.add({ severity: 'error', summary: 'Não foi possível salvar', detail: mensagemErro(e) });
            }
        });
    }

    excluirGravidade(g: Gravidade) {
        this.confirm.confirm({
            header: 'Excluir gravidade',
            message: `Excluir a gravidade "${g.nome}"? Se ela estiver em uso por tipos ou denúncias, desative-a.`,
            acceptLabel: 'Excluir',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () =>
                this.moderacao.excluirGravidade(g.id).subscribe({
                    next: () => this.carregarGravidades(),
                    error: (e) => this.msg.add({ severity: 'error', summary: 'Não foi possível excluir', detail: mensagemErro(e) })
                })
        });
    }

    carregarTipos() {
        this.moderacao.tiposAdmin().subscribe((t) => this.tipos.set(t));
    }

    salvarConfig() {
        const c = this.cfg();
        if (!c) return;
        const corpo = { ...c, etapa2Acao: c.etapa1Acao === 'BANIR' ? 'NENHUMA' : c.etapa2Acao } as ModeracaoConfig;
        this.salvando.set(true);
        this.moderacao.salvarConfig(corpo).subscribe({
            next: (n) => {
                this.cfg.set(n);
                this.salvando.set(false);
                this.msg.add({ severity: 'success', summary: 'Regras salvas' });
            },
            error: (e) => {
                this.salvando.set(false);
                this.msg.add({ severity: 'error', summary: 'Não foi possível salvar', detail: mensagemErro(e) });
            }
        });
    }

    editar(t: TipoDenuncia | null) {
        if (t) {
            const { gravidade, ...resto } = t;
            this.edicao.set({ ...resto, gravidadeId: gravidade.id });
        } else {
            this.edicao.set({ id: null, nome: '', descricao: '', gravidadeId: this.gravidadesAtivas()[0]?.id ?? 0, slaMinutos: 600, suspenderAoAbrir: false, ativo: true, ordem: (this.tipos().length + 1) * 10 });
        }
    }

    salvarTipo(t: TipoEdicao) {
        this.salvando.set(true);
        this.moderacao.salvarTipo(t).subscribe({
            next: () => {
                this.salvando.set(false);
                this.edicao.set(null);
                this.carregarTipos();
                this.msg.add({ severity: 'success', summary: 'Tipo salvo' });
            },
            error: (e) => {
                this.salvando.set(false);
                this.msg.add({ severity: 'error', summary: 'Não foi possível salvar', detail: mensagemErro(e) });
            }
        });
    }

    excluir(t: TipoDenuncia) {
        this.confirm.confirm({
            header: 'Excluir tipo',
            message: `Excluir o tipo "${t.nome}"? Se ele já foi usado em denúncias, desative-o.`,
            acceptLabel: 'Excluir',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () =>
                this.moderacao.excluirTipo(t.id).subscribe({
                    next: () => this.carregarTipos(),
                    error: (e) => this.msg.add({ severity: 'error', summary: 'Não foi possível excluir', detail: mensagemErro(e) })
                })
        });
    }
}
