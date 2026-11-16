import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { Subscription, merge, tap } from 'rxjs';
import {
    Denuncia,
    ImovelInfo,
    MEDIDAS,
    MedidaAnuncio,
    ModeracaoConfig,
    NATUREZAS,
    Natureza,
    PENALIDADES,
    PenalidadeConta,
    PendenciasImovel,
    ProcedentesPorGravidade,
    correcaoPendente,
    denunciaAberta,
    duracaoMinutos,
    situacaoDenuncia
} from '@/app/core/models/models';
import { InputNumberModule } from 'primeng/inputnumber';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MembroSala, RealtimeService } from '@/app/core/services/realtime.service';
import { AuthService } from '@/app/core/services/auth.service';
import { PresencaSala } from '@/app/shared/components/presenca-sala';
import { EditorTexto, htmlVazio } from '@/app/shared/components/editor-texto';
import { AnexosInput } from '@/app/shared/components/anexos-input';
import { DesfechoDenuncia } from '@/app/shared/components/desfecho-denuncia';
import { aplicarDenuncia } from '@/app/shared/pages/pendencias-sync';
import { AcaoImovel, ModeracaoService } from '@/app/core/services/moderacao.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { TelefonePipe, slug } from '@/app/core/pipes/formatos';
import { PageHeader } from '@/app/shared/components/page-header';
import { ImovelFoto } from '@/app/shared/components/imovel-foto';
import { StatusTag } from '@/app/shared/components/status-tag';
import { PrazoSlaComponent } from '@/app/shared/components/prazo-sla';
import { ConversaDenuncia } from '@/app/shared/components/conversa-denuncia';

interface Rascunho {
    texto: string;
    interna: boolean;
    anexos: string[];
}

const ACOES: Record<AcaoImovel, { titulo: string; botao: string; severity: 'warn' | 'success' | 'danger'; texto: string }> = {
    SUSPENDER: { titulo: 'Suspender o anúncio', botao: 'Suspender', severity: 'warn', texto: 'O anúncio sai da busca até ser reativado (ou até a solução ser aprovada, conforme as regras).' },
    REATIVAR: { titulo: 'Reativar o anúncio', botao: 'Reativar', severity: 'success', texto: 'O anúncio volta ao status que tinha antes da moderação. As pendências abertas continuam abertas.' },
    BANIR: { titulo: 'Banir o anúncio', botao: 'Banir', severity: 'danger', texto: 'O anúncio sai do site de forma definitiva e todas as pendências abertas são encerradas. O anunciante vê o anúncio como banido.' }
};

/** Moderação de um anúncio: anunciante, histórico, ações no anúncio e cada denúncia com a conversa. */
@Component({
    selector: 'app-admin-denuncias-imovel-page',
    imports: [
        RouterLink,
        DatePipe,
        FormsModule,
        TagModule,
        ButtonModule,
        TextareaModule,
        CheckboxModule,
        DialogModule,
        TooltipModule,
        InputNumberModule,
        RadioButtonModule,
        PageHeader,
        ImovelFoto,
        StatusTag,
        PrazoSlaComponent,
        ConversaDenuncia,
        TelefonePipe,
        PresencaSala,
        EditorTexto,
        AnexosInput,
        DesfechoDenuncia
    ],
    template: `
        <app-page-header titulo="Denúncias do anúncio">
            <a routerLink="/admin/denuncias" class="p-button p-button-text"><i class="pi pi-arrow-left mr-2" aria-hidden="true"></i>Voltar</a>
        </app-page-header>
        <div class="-mt-4 mb-4"><app-presenca-sala [conectado]="realtime.conectado()" [outros]="outros()" [descrever]="descreverOutros" /></div>

        @if (dados(); as p) {
            <div class="grid gap-4 lg:grid-cols-[1fr_20rem] mb-4">
                <div class="card !mb-0 flex flex-col sm:flex-row gap-4">
                    <app-imovel-foto class="w-full sm:w-40 h-32 rounded-border shrink-0" [src]="p.imovel.fotoCapa" [semente]="p.imovel.id" [alt]="p.imovel.titulo" [mostrarTexto]="false" />
                    <div class="flex-1 min-w-0">
                        <div class="flex flex-wrap items-center gap-2">
                            <h2 class="text-xl font-semibold m-0">{{ p.imovel.titulo }}</h2>
                            <app-status-tag [status]="p.imovel.status" />
                        </div>
                        <div class="text-sm text-muted-color mb-3">{{ p.imovel.codigo }} · {{ p.imovel.bairro }}, {{ p.imovel.cidade }}</div>
                        <div class="flex flex-wrap gap-2">
                            <a [routerLink]="['/admin/anuncios', p.imovel.id]" class="p-button p-button-sm p-button-outlined"><i class="pi pi-pencil mr-2" aria-hidden="true"></i>Abrir o anúncio</a>
                            <!-- fora do ar, a página do imóvel abre como prévia para a moderação -->
                            <a [href]="'/imovel/' + p.imovel.id + '/' + slug(p.imovel.titulo)" target="_blank" rel="noopener" class="p-button p-button-sm p-button-text"
                                >{{ p.imovel.status === 'ATIVO' ? 'Ver no site' : 'Ver prévia' }} <i class="pi pi-external-link ml-2" aria-hidden="true"></i><span class="sr-only"> (abre em nova aba)</span></a
                            >
                        </div>
                        <div class="flex flex-wrap gap-2 mt-4 pt-4 border-t border-surface">
                            @if (p.imovel.status !== 'SUSPENSO' && p.imovel.status !== 'BANIDO') {
                                <p-button label="Suspender" icon="pi pi-pause-circle" severity="warn" [outlined]="true" (onClick)="pedirAcao('SUSPENDER')" />
                            }
                            @if (p.imovel.status === 'SUSPENSO' || p.imovel.status === 'BANIDO') {
                                <p-button label="Reativar" icon="pi pi-play-circle" severity="success" [outlined]="true" (onClick)="pedirAcao('REATIVAR')" />
                            }
                            @if (p.imovel.status !== 'BANIDO') {
                                <p-button label="Banir" icon="pi pi-times-circle" severity="danger" [outlined]="true" (onClick)="pedirAcao('BANIR')" />
                            }
                        </div>
                    </div>
                </div>
                <aside class="card !mb-0" aria-label="Anunciante">
                    <div class="text-xs font-semibold uppercase tracking-wide text-muted-color mb-2">Anunciante</div>
                    @if (p.anunciante; as a) {
                        <div class="font-semibold">{{ a.nome }}</div>
                        <div class="text-sm">
                            <a [href]="'mailto:' + a.email" class="text-primary">{{ a.email }}</a>
                        </div>
                        @if (a.telefone) {
                            <div class="text-sm">{{ a.telefone | telefone }}</div>
                        }
                        <div class="text-sm text-muted-color">CRECI {{ a.creci || '—' }}</div>
                    }
                    @if (p.historico; as h) {
                        <div class="text-xs font-semibold uppercase tracking-wide text-muted-color mt-4 mb-2">Histórico de denúncias</div>
                        <dl class="grid grid-cols-2 gap-x-3 gap-y-1 text-sm m-0">
                            <dt class="text-muted-color">Total</dt>
                            <dd class="m-0 font-semibold">{{ h.total }}</dd>
                            <dt class="text-muted-color">Abertas</dt>
                            <dd class="m-0 font-semibold">{{ h.abertas }}</dd>
                            <dt class="text-muted-color">Resolvidas</dt>
                            <dd class="m-0 font-semibold">{{ h.resolvidas }}</dd>
                            <dt class="text-muted-color">Improcedentes</dt>
                            <dd class="m-0 font-semibold">{{ h.improcedentes }}</dd>
                            <dt class="text-muted-color">Procedentes</dt>
                            <dd class="m-0 font-semibold" [class.text-red-700]="h.procedentes > 0">{{ h.procedentes }}{{ h.procedentesMaFe ? ' (' + h.procedentesMaFe + ' má-fé)' : '' }}</dd>
                            <dt class="text-muted-color">Anúncios banidos</dt>
                            <dd class="m-0 font-semibold" [class.text-red-700]="h.banidas > 0">{{ h.banidas }}</dd>
                        </dl>
                        @if (h.contaBanida) {
                            <p-tag value="Conta banida" severity="danger" icon="pi pi-ban" styleClass="mt-3" />
                        }
                        @if (h.porGravidade.length) {
                            <div class="text-xs font-semibold uppercase tracking-wide text-muted-color mt-4 mb-2">Procedentes por gravidade</div>
                            <ul class="list-none m-0 p-0 flex flex-col gap-2 text-sm">
                                @for (x of h.porGravidade; track x.gravidade.id) {
                                    <li>
                                        <div class="flex items-center justify-between gap-2">
                                            <p-tag [value]="x.gravidade.nome" [severity]="x.gravidade.cor" />
                                            <span class="font-semibold">{{ x.total }}</span>
                                        </div>
                                        @if (x.banirContaAuto && x.banirApos) {
                                            <div class="text-xs text-muted-color mt-1">{{ x.naJanela }} de {{ x.banirApos }} strikes para o banimento automático{{ x.janelaMeses ? ' (últimos ' + x.janelaMeses + ' meses)' : '' }}</div>
                                            <div
                                                class="h-1.5 rounded-full bg-emphasis overflow-hidden mt-1"
                                                role="progressbar"
                                                [attr.aria-valuenow]="x.naJanela"
                                                aria-valuemin="0"
                                                [attr.aria-valuemax]="x.banirApos"
                                                [attr.aria-label]="'Procedentes ' + x.gravidade.nome + ' até o banimento'"
                                            >
                                                <span class="block h-full bg-red-600" [style.width.%]="progressoBanimento(x)"></span>
                                            </div>
                                        }
                                    </li>
                                }
                            </ul>
                        }
                    }
                </aside>
            </div>

            <div class="flex flex-col gap-4">
                @for (d of p.denuncias; track d.id) {
                    <article class="card !mb-0" [attr.aria-labelledby]="'den-' + d.id">
                        <header class="flex flex-col md:flex-row md:items-start gap-3 mb-3">
                            <div class="flex-1">
                                <div class="flex flex-wrap items-center gap-2">
                                    <h3 [id]="'den-' + d.id" class="text-lg font-semibold m-0">{{ d.tipo.nome }}</h3>
                                    <p-tag [value]="d.gravidade.nome" [severity]="d.gravidade.cor" />
                                    <p-tag [value]="situacao(d).label" [severity]="situacao(d).severity" />
                                </div>
                                <div class="text-sm text-muted-color mt-1">Por {{ d.denuncianteNome }} ({{ d.denuncianteEmail }}) em {{ d.criadoEm | date: 'dd/MM/yyyy HH:mm' }}</div>
                            </div>
                            <div class="flex flex-col gap-1 md:items-end">
                                <app-prazo-sla [prazo]="d.prazo" [status]="d.status" />
                                @if (d.status === 'EM_APURACAO') {
                                    <span class="text-sm"><i class="pi pi-search mr-1" aria-hidden="true"></i>Em apuração{{ d.apuracaoPrazoEm ? ' · prazo interno ' + (d.apuracaoPrazoEm | date: "dd/MM 'às' HH:mm") : '' }}</span>
                                }
                                @if (d.prazo.etapa > 0 && d.status === 'AGUARDANDO_ANUNCIANTE') {
                                    <span class="text-xs text-muted-color">{{ d.prazo.etapa === 1 ? 'Prazo extra (após a etapa 1)' : 'Automação encerrada' }}</span>
                                }
                            </div>
                        </header>

                        <div class="rounded-lg bg-emphasis p-3 mb-4">
                            <div class="text-xs font-semibold uppercase tracking-wide text-muted-color mb-1">Relato do denunciante</div>
                            <p class="m-0 whitespace-pre-line">{{ d.descricao }}</p>
                        </div>

                        <section class="julgamento" [attr.aria-labelledby]="'jul-' + d.id">
                            <h4 [id]="'jul-' + d.id" class="text-sm font-semibold uppercase tracking-wide text-muted-color m-0 mb-2">Julgamento</h4>
                            @if (aberta(d)) {
                                @if (d.natureza) {
                                    <app-desfecho-denuncia [denuncia]="d" [statusAnuncio]="p.imovel.status" visao="admin" />
                                } @else {
                                    <p class="text-sm text-muted-color m-0 mb-3">Ainda não julgada. Você pode julgar a qualquer momento, com ou sem resposta do anunciante.</p>
                                }
                                <div class="flex flex-wrap gap-2">
                                    <p-button
                                        [label]="d.natureza ? 'Alterar julgamento…' : 'Procedente…'"
                                        icon="pi pi-exclamation-circle"
                                        severity="danger"
                                        (onClick)="procedenteDialogo(d)"
                                        pTooltip="A denúncia se confirmou: escolha a natureza, a medida no anúncio (solicitar correção, manter, suspender ou remover do ar) e a penalidade na conta (strike, nenhuma ou banimento direto)."
                                        tooltipPosition="top"
                                        tooltipEvent="both"
                                        [showDelay]="100"
                                        tooltipStyleClass="!max-w-sm"
                                    />
                                    <p-button
                                        label="Improcedente…"
                                        icon="pi pi-times"
                                        severity="secondary"
                                        [outlined]="true"
                                        (onClick)="decisaoDialogo(d, 'improcedente')"
                                        [pTooltip]="dicaImprocedente()"
                                        tooltipPosition="top"
                                        tooltipEvent="both"
                                        [showDelay]="100"
                                        tooltipStyleClass="!max-w-sm"
                                    />
                                    <p-button
                                        [label]="correcao(d) ? 'Aceitar correção…' : 'Aprovar solução…'"
                                        icon="pi pi-check"
                                        severity="success"
                                        [outlined]="true"
                                        (onClick)="decisaoDialogo(d, 'aprovar')"
                                        [pTooltip]="correcao(d) ? dicaCorrecao : dicaAprovar()"
                                        tooltipPosition="top"
                                        tooltipEvent="both"
                                        [showDelay]="100"
                                        tooltipStyleClass="!max-w-sm"
                                    />
                                    @if (d.status !== 'EM_APURACAO') {
                                        <p-button
                                            label="Abrir apuração…"
                                            icon="pi pi-search"
                                            severity="contrast"
                                            [text]="true"
                                            (onClick)="abrirApuracaoDialogo(d)"
                                            pTooltip="A empresa vai verificar (ex.: visita ao imóvel). O prazo do anunciante fica parado; dá para julgar a qualquer momento durante a apuração."
                                            tooltipPosition="top"
                                            tooltipEvent="both"
                                            [showDelay]="100"
                                            tooltipStyleClass="!max-w-sm"
                                        />
                                    }
                                </div>
                            } @else {
                                <app-desfecho-denuncia [denuncia]="d" [statusAnuncio]="p.imovel.status" visao="admin" />
                                <div>
                                    <p-button
                                        label="Rever julgamento…"
                                        icon="pi pi-replay"
                                        severity="secondary"
                                        [outlined]="true"
                                        (onClick)="reabrirDialogo(d)"
                                        pTooltip="Reabre a denúncia para nova análise e novo julgamento. Um strike dado nela sai da contagem."
                                        tooltipPosition="top"
                                        tooltipEvent="both"
                                        [showDelay]="100"
                                        tooltipStyleClass="!max-w-sm"
                                    />
                                </div>
                            }
                        </section>

                        <h4 class="text-sm font-semibold uppercase tracking-wide text-muted-color m-0 mb-2">Conversa</h4>
                        <app-conversa-denuncia [mensagens]="d.mensagens" visao="admin" />

                        @let r = rascunho(d.id);
                        <div class="mt-4 pt-4 border-t border-surface">
                            <span class="font-semibold block mb-1">{{ aberta(d) ? 'Mensagem' : 'Nota interna' }}</span>
                            <app-editor-texto [(valor)]="r.texto" [rotulo]="aberta(d) ? 'Mensagem' : 'Nota interna'" [placeholder]="aberta(d) ? 'Escreva para o anunciante ou registre uma nota interna' : 'Só administradores veem'" />
                            <app-anexos-input class="block mt-1" [(anexos)]="r.anexos" />
                            @if (aberta(d)) {
                                <label class="flex items-center gap-2 cursor-pointer text-sm mt-2">
                                    <p-checkbox [binary]="true" [(ngModel)]="r.interna" [inputId]="'int-' + d.id" />
                                    Nota interna (o anunciante não vê e o prazo não muda)
                                </label>
                                @if (!r.interna && (d.status === 'EM_ANALISE' || d.status === 'EM_APURACAO')) {
                                    <p class="text-xs text-muted-color mt-2 mb-0"><i class="pi pi-info-circle" aria-hidden="true"></i> Ao enviar, o caso volta para o anunciante e o prazo dele retoma de onde parou.</p>
                                }
                                <div class="flex justify-end mt-3">
                                    <p-button
                                        [label]="r.interna ? 'Salvar nota interna' : 'Enviar mensagem'"
                                        [icon]="r.interna ? 'pi pi-lock' : 'pi pi-send'"
                                        [disabled]="vazio(r.texto)"
                                        [loading]="ocupado() === 'msg' + d.id"
                                        (onClick)="enviarMensagem(d)"
                                    />
                                </div>
                            } @else {
                                <div class="flex justify-end mt-2">
                                    <p-button label="Salvar nota interna" icon="pi pi-lock" [outlined]="true" [disabled]="vazio(r.texto)" [loading]="ocupado() === 'msg' + d.id" (onClick)="enviarMensagem(d, true)" />
                                </div>
                            }
                        </div>
                    </article>
                }
            </div>
        }

        <p-dialog [blockScroll]="true" [visible]="!!acao()" (visibleChange)="!$event && acao.set(null)" [modal]="true" [header]="acao() ? acoes[acao()!].titulo : ''" [style]="{ width: '32rem' }" [breakpoints]="{ '640px': '96vw' }">
            @if (acao(); as a) {
                <p class="mt-0">{{ acoes[a].texto }}</p>
                <span class="font-semibold block mb-1">Motivo (enviado ao anunciante)</span>
                <app-editor-texto [(valor)]="motivo" rotulo="Motivo" [max]="2000" altura="6rem" />
                <div class="flex justify-end gap-2 mt-3">
                    <p-button label="Cancelar" [text]="true" severity="secondary" (onClick)="acao.set(null)" />
                    <p-button [label]="acoes[a].botao" [severity]="acoes[a].severity" [loading]="ocupado() === 'acao'" (onClick)="confirmarAcao(a)" />
                </div>
            }
        </p-dialog>

        <p-dialog [blockScroll]="true" [visible]="!!apurando()" (visibleChange)="!$event && apurando.set(null)" [modal]="true" header="Abrir apuração" [style]="{ width: '34rem' }" [breakpoints]="{ '640px': '96vw' }">
            @if (apurando(); as d) {
                <p class="mt-0 text-sm text-muted-color">{{ d.tipo.nome }} · o prazo do anunciante fica parado enquanto a empresa verifica.</p>
                <label for="apu-texto" class="font-semibold block mb-1">O que vai ser feito</label>
                <app-editor-texto [(valor)]="apuTexto" rotulo="O que vai ser feito" placeholder="Ex.: visita presencial ao endereço agendada para 18/11" />
                <label class="flex items-center gap-2 cursor-pointer text-sm mt-2">
                    <p-checkbox [binary]="true" [(ngModel)]="apuInterna" inputId="apu-interna" />
                    Só para a moderação (o anunciante vê apenas que está em apuração)
                </label>
                <div class="flex flex-col gap-1 mt-4">
                    <label for="apu-prazo" class="font-semibold">Prazo interno (opcional, minutos úteis)</label>
                    <p-inputnumber inputId="apu-prazo" [(ngModel)]="apuPrazo" [min]="1" [max]="525600" [useGrouping]="false" placeholder="Sem prazo" />
                    <small class="text-muted-color">{{ apuPrazo ? '≈ ' + duracao(apuPrazo) + ' úteis. ' : '' }}Só avisa a moderação quando vencer; não muda nada para o anunciante.</small>
                </div>
                <div class="flex justify-end gap-2 mt-4">
                    <p-button label="Cancelar" [text]="true" severity="secondary" (onClick)="apurando.set(null)" />
                    <p-button label="Abrir apuração" icon="pi pi-search" [disabled]="vazio(apuTexto)" [loading]="ocupado() === 'apu'" (onClick)="confirmarApuracao(d)" />
                </div>
            }
        </p-dialog>

        <p-dialog [blockScroll]="true"
            [visible]="!!procedendo()"
            (visibleChange)="!$event && procedendo.set(null)"
            [modal]="true"
            [header]="procedendo()?.natureza ? 'Alterar julgamento' : 'Julgar procedente'"
            [style]="{ width: '38rem' }"
            [breakpoints]="{ '640px': '96vw' }"
        >
            @if (procedendo(); as d) {
                <p class="mt-0 text-sm text-muted-color">{{ d.tipo.nome }} · gravidade {{ d.gravidade.nome }}</p>
                <fieldset class="border-0 p-0 m-0 mb-4">
                    <legend class="font-semibold mb-2">Natureza</legend>
                    <div class="flex flex-col gap-2">
                        @for (n of naturezas; track n.value) {
                            <label class="flex items-start gap-2 cursor-pointer">
                                <p-radiobutton name="natureza" [value]="n.value" [(ngModel)]="procNatureza" [inputId]="'nat-' + n.value" />
                                <span
                                    ><span class="block">{{ n.label }}</span
                                    ><span class="block text-xs text-muted-color">{{ n.dica }}</span></span
                                >
                            </label>
                        }
                    </div>
                </fieldset>
                <fieldset class="border-0 p-0 m-0 mb-4">
                    <legend class="font-semibold mb-2">Medida no anúncio</legend>
                    <div class="flex flex-col gap-2">
                        @for (m of medidas; track m.value) {
                            <label class="flex items-start gap-2 cursor-pointer">
                                <p-radiobutton name="medida" [value]="m.value" [(ngModel)]="procMedida" (ngModelChange)="aoMudarMedida()" [inputId]="'med-' + m.value" />
                                <span
                                    ><span class="block">{{ m.label }}</span
                                    ><span class="block text-xs text-muted-color">{{ m.dica }}</span></span
                                >
                            </label>
                        }
                    </div>
                    @if (procMedida === 'CORRIGIR') {
                        <div class="flex flex-col gap-1 mt-3 ml-7">
                            <label for="proc-prazo" class="text-sm font-semibold">Prazo da correção (minutos úteis)</label>
                            <p-inputnumber inputId="proc-prazo" [(ngModel)]="procPrazo" [min]="1" [max]="525600" [useGrouping]="false" [placeholder]="'Padrão das regras: ' + duracao(ajusteSla())" />
                            <small class="text-muted-color">{{ procPrazo ? '≈ ' + duracao(procPrazo) + ' úteis.' : 'Vazio: usa o prazo de ajuste das regras (' + duracao(ajusteSla()) + ' úteis).' }}</small>
                            <label class="flex items-center gap-2 cursor-pointer text-sm mt-1">
                                <p-checkbox [binary]="true" [(ngModel)]="procSuspender" inputId="proc-suspender" />
                                Suspender o anúncio até a correção ser aceita
                            </label>
                        </div>
                    }
                </fieldset>
                <fieldset class="border-0 p-0 m-0 mb-4">
                    <legend class="font-semibold mb-2">Penalidade na conta</legend>
                    <div class="flex flex-col gap-2">
                        @for (x of penalidades; track x.value) {
                            <label class="flex items-start gap-2" [class.cursor-pointer]="!(x.value === 'BANIR_CONTA' && procMedida === 'CORRIGIR')" [class.opacity-60]="x.value === 'BANIR_CONTA' && procMedida === 'CORRIGIR'">
                                <p-radiobutton name="penalidade" [value]="x.value" [(ngModel)]="procPenalidade" [inputId]="'pen-' + x.value" [disabled]="x.value === 'BANIR_CONTA' && procMedida === 'CORRIGIR'" />
                                <span
                                    ><span class="block">{{ x.label }}</span
                                    ><span class="block text-xs text-muted-color">{{ x.dica }}{{ x.value === 'BANIR_CONTA' && procMedida === 'CORRIGIR' ? ' (indisponível com correção solicitada)' : '' }}</span></span
                                >
                            </label>
                        }
                    </div>
                </fieldset>
                <span class="font-semibold block mb-1">{{ procMedida === 'CORRIGIR' ? 'O que precisa ser corrigido (vai para o anunciante)' : 'Conclusão (vai para o anunciante)' }}</span>
                <app-editor-texto [(valor)]="procConclusao" rotulo="Conclusão" placeholder="Ex.: a visita confirmou que o imóvel não existe no endereço informado." />
                <span class="font-semibold block mb-1 mt-3">Nota interna (opcional)</span>
                <app-editor-texto [(valor)]="procNota" rotulo="Nota interna" altura="6rem" placeholder="Só a moderação vê. Ex.: relatório da visita." />
                @if (procPenalidade === 'STRIKE' && avisoBanimento(d); as aviso) {
                    <p class="text-sm text-red-700 mt-3 mb-0" role="note"><i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>{{ aviso }}</p>
                }
                <div class="flex justify-end gap-2 mt-4">
                    <p-button label="Cancelar" [text]="true" severity="secondary" (onClick)="procedendo.set(null)" />
                    <p-button label="Confirmar" icon="pi pi-check" severity="danger" [disabled]="!procNatureza || !procMedida || !procPenalidade || vazio(procConclusao)" [loading]="ocupado() === 'proc'" (onClick)="confirmarProcedente(d)" />
                </div>
            }
        </p-dialog>

        <p-dialog [blockScroll]="true" [visible]="!!decidindo()" (visibleChange)="!$event && decidindo.set(null)" [modal]="true" [header]="tituloDecisao()" [style]="{ width: '34rem' }" [breakpoints]="{ '640px': '96vw' }">
            @if (decidindo(); as x) {
                <p class="mt-0 text-sm text-muted-color">{{ x.d.tipo.nome }} · {{ x.tipo === 'improcedente' ? dicaImprocedente() : correcao(x.d) ? dicaCorrecao : dicaAprovar() }}</p>
                <span class="font-semibold block mb-1">Conclusão para o anunciante (opcional)</span>
                <app-editor-texto [(valor)]="decTexto" rotulo="Conclusão" altura="6rem" />
                <div class="flex justify-end gap-2 mt-4">
                    <p-button label="Cancelar" [text]="true" severity="secondary" (onClick)="decidindo.set(null)" />
                    <p-button
                        [label]="x.tipo === 'improcedente' ? 'Julgar improcedente' : correcao(x.d) ? 'Aceitar correção' : 'Aprovar solução'"
                        [severity]="x.tipo === 'improcedente' ? 'secondary' : 'success'"
                        icon="pi pi-check"
                        [loading]="ocupado() === 'dec'"
                        (onClick)="confirmarDecisao()"
                    />
                </div>
            }
        </p-dialog>

        <p-dialog [blockScroll]="true" [visible]="!!reabrindo()" (visibleChange)="!$event && reabrindo.set(null)" [modal]="true" header="Rever julgamento" [style]="{ width: '34rem' }" [breakpoints]="{ '640px': '96vw' }">
            @if (reabrindo(); as d) {
                <p class="mt-0 text-sm text-muted-color">{{ d.tipo.nome }} · a denúncia volta para análise, sem julgamento, e você julga de novo. Um strike dado nela sai da contagem.</p>
                <span class="font-semibold block mb-1">Motivo da revisão (nota interna)</span>
                <app-editor-texto [(valor)]="reaMotivo" rotulo="Motivo da revisão" altura="6rem" />
                @if (dados()?.historico?.contaBanida) {
                    <label class="flex items-center gap-2 cursor-pointer text-sm mt-3">
                        <p-checkbox [binary]="true" [(ngModel)]="reaConta" inputId="rea-conta" />
                        Reativar a conta do anunciante (e os anúncios suspensos pelo banimento)
                    </label>
                }
                @if (dados()?.imovel?.status === 'SUSPENSO' || dados()?.imovel?.status === 'BANIDO') {
                    <label class="flex items-center gap-2 cursor-pointer text-sm mt-3">
                        <p-checkbox [binary]="true" [(ngModel)]="reaAnuncio" inputId="rea-anuncio" />
                        Colocar o anúncio de volta no ar
                    </label>
                }
                <div class="flex justify-end gap-2 mt-4">
                    <p-button label="Cancelar" [text]="true" severity="secondary" (onClick)="reabrindo.set(null)" />
                    <p-button label="Reabrir para nova análise" icon="pi pi-replay" [disabled]="vazio(reaMotivo)" [loading]="ocupado() === 'rea'" (onClick)="confirmarReabertura(d)" />
                </div>
            }
        </p-dialog>
    `,
    styles: `
        .julgamento {
            border: 1px solid var(--p-content-border-color);
            border-radius: var(--p-content-border-radius, 8px);
            padding: 0.85rem 1rem;
            margin-bottom: 1.25rem;
        }
    `
})
export class AdminDenunciasImovelPage {
    private moderacao = inject(ModeracaoService);
    private msg = inject(MessageService);

    /** :imovelId da rota */
    imovelId = input.required<string>();

    realtime = inject(RealtimeService);
    private auth = inject(AuthService);
    dados = signal<PendenciasImovel | null>(null);
    private membros = signal<MembroSala[]>([]);
    outros = computed(() => this.membros().filter((m) => m.id !== this.auth.usuario()?.id));
    descreverOutros = (o: MembroSala[]) => {
        const anunciante = this.dados()?.anunciante?.id;
        const partes: string[] = [];
        if (o.some((m) => m.id === anunciante)) partes.push('o anunciante está nesta página');
        const admins = o.filter((m) => m.id !== anunciante && m.perfil === 'ADMIN').map((m) => m.nome.split(' ')[0]);
        if (admins.length) partes.push('também moderando: ' + admins.join(', '));
        return partes.join(' · ') || null;
    };
    private sala: Subscription | null = null;
    ocupado = signal<string | null>(null);
    acao = signal<AcaoImovel | null>(null);
    motivo = '';
    acoes = ACOES;
    slug = slug;

    /** Regras da moderação (para explicar o efeito dos botões e o prazo padrão da correção). */
    private config = signal<ModeracaoConfig | null>(null);
    private reativa = computed(() => this.config()?.aprovarReativaAnuncio ?? null);
    ajusteSla = computed(() => this.config()?.ajusteSlaMinutos ?? 0);
    dicaCorrecao = 'Aceita a correção feita pelo anunciante e encerra a denúncia como procedente (o julgamento e a penalidade continuam valendo). Se o anúncio foi suspenso até a correção, ele volta ao ar.';
    private efeitoNoAnuncio = computed(() => (this.reativa() === false ? ' O status do anúncio não muda (a reativação automática está desligada nas regras).' : ' Se o anúncio estiver suspenso e não restar outra pendência aberta, ele volta ao ar.'));
    dicaAprovar = computed(() => 'Encerra esta denúncia como resolvida: o anunciante corrigiu ou explicou. Anunciante e denunciante são avisados; o texto escrito acima (se houver) vai como conclusão.' + this.efeitoNoAnuncio());
    dicaImprocedente = computed(() => 'Arquiva esta denúncia por não ter fundamento, sem penalizar o anunciante. Anunciante e denunciante são avisados (para o denunciante aparece como resolvida).' + this.efeitoNoAnuncio());
    private rascunhos = new Map<number, Rascunho>();

    constructor() {
        inject(ConfigService).definirTitulo('Denúncias do anúncio');
        this.moderacao.config().subscribe({ next: (c) => this.config.set(c), error: () => undefined });
        effect(() => {
            this.imovelId();
            const id = Number(this.imovelId());
            untracked(() => {
                this.carregar();
                this.ouvirSala(id);
            });
        });
        const t = setInterval(() => this.carregar(), 60_000);
        inject(DestroyRef).onDestroy(() => {
            clearInterval(t);
            this.sala?.unsubscribe();
        });
    }

    /**
     * Dados completos (com notas internas) pelo canal da moderação; presença pela sala do anúncio,
     * a mesma em que o anunciante está.
     */
    private ouvirSala(imovelId: number) {
        this.sala?.unsubscribe();
        const dados = `private-admin.denuncias.imovel.${imovelId}`;
        this.sala = merge(
            this.realtime.ouvir<Denuncia>(dados, 'denuncia.atualizada').pipe(tap((d) => this.dados.update((p) => aplicarDenuncia(p, d)))),
            this.realtime.ouvir<ImovelInfo>(dados, 'imovel.atualizado').pipe(tap((i) => this.dados.update((p) => (p ? { ...p, imovel: i } : p)))),
            this.realtime.presenca(`presence-denuncias.imovel.${imovelId}`).pipe(tap((m) => this.membros.set(m)))
        ).subscribe();
    }

    carregar() {
        this.moderacao.pendenciasAdmin(Number(this.imovelId())).subscribe({
            next: (p) => this.dados.set(p),
            error: (e) => this.msg.add({ severity: 'error', summary: 'Denúncias', detail: mensagemErro(e) })
        });
    }

    rascunho(id: number): Rascunho {
        let r = this.rascunhos.get(id);
        if (!r) {
            r = { texto: '', interna: false, anexos: [] };
            this.rascunhos.set(id, r);
        }
        return r;
    }

    aberta = denunciaAberta;
    correcao = correcaoPendente;
    situacao = situacaoDenuncia;
    penalidades = PENALIDADES;

    naturezas = NATUREZAS;
    medidas = MEDIDAS;
    duracao = duracaoMinutos;

    // apuração
    apurando = signal<Denuncia | null>(null);
    apuTexto = '';
    apuInterna = true;
    apuPrazo: number | null = null;

    // procedente
    procedendo = signal<Denuncia | null>(null);
    procNatureza: Natureza | null = null;
    procMedida: MedidaAnuncio | null = null;
    procPenalidade: PenalidadeConta | null = null;
    procPrazo: number | null = null;
    procSuspender = false;

    // aprovar / improcedente
    decidindo = signal<{ d: Denuncia; tipo: 'aprovar' | 'improcedente' } | null>(null);
    decTexto = '';

    // rever julgamento
    reabrindo = signal<Denuncia | null>(null);
    reaMotivo = '';
    reaConta = false;
    reaAnuncio = false;
    procConclusao = '';
    procNota = '';

    vazio = htmlVazio;

    aoMudarMedida() {
        if (this.procMedida === 'CORRIGIR' && this.procPenalidade === 'BANIR_CONTA') this.procPenalidade = null;
    }

    tituloDecisao() {
        const x = this.decidindo();
        if (!x) return '';
        return x.tipo === 'improcedente' ? 'Julgar improcedente' : correcaoPendente(x.d) ? 'Aceitar correção' : 'Aprovar solução';
    }

    progressoBanimento(x: ProcedentesPorGravidade) {
        return x.banirApos ? Math.min(100, Math.round((x.naJanela / x.banirApos) * 100)) : 0;
    }

    /** Se esta procedente vai completar a regra de banimento automático da conta. */
    avisoBanimento(d: Denuncia): string | null {
        const x = this.dados()?.historico?.porGravidade.find((g) => g.gravidade.id === d.gravidade.id);
        if (!x?.banirContaAuto || !x.banirApos || this.dados()?.historico?.contaBanida) return null;
        return x.naJanela + 1 >= x.banirApos ? `Este será o ${x.naJanela + 1}º strike "${d.gravidade.nome}" do anunciante: a conta dele será banida automaticamente e os anúncios sairão do ar.` : null;
    }

    abrirApuracaoDialogo(d: Denuncia) {
        this.apuTexto = this.rascunho(d.id).texto;
        this.apuInterna = true;
        this.apuPrazo = null;
        this.apurando.set(d);
    }

    confirmarApuracao(d: Denuncia) {
        this.ocupado.set('apu');
        this.moderacao.abrirApuracao(d.id, this.apuTexto, this.apuInterna, this.apuPrazo).subscribe({
            next: () => {
                this.apurando.set(null);
                this.concluir(d.id, 'Apuração aberta; o prazo do anunciante está parado');
            },
            error: (e) => this.falhar(e)
        });
    }

    procedenteDialogo(d: Denuncia) {
        // alterar julgamento: começa do julgamento atual
        this.procNatureza = d.natureza;
        this.procMedida = d.medida;
        this.procPenalidade = d.penalidade ?? (d.natureza ? null : 'STRIKE');
        this.procPrazo = null;
        this.procSuspender = false;
        this.procConclusao = this.rascunho(d.id).texto;
        this.procNota = '';
        this.procedendo.set(d);
    }

    confirmarProcedente(d: Denuncia) {
        if (!this.procNatureza || !this.procMedida || !this.procPenalidade) return;
        this.ocupado.set('proc');
        const corrigir = this.procMedida === 'CORRIGIR';
        this.moderacao
            .procedente(d.id, {
                natureza: this.procNatureza,
                medida: this.procMedida,
                penalidade: this.procPenalidade,
                prazoMinutos: corrigir ? this.procPrazo : null,
                suspenderAteCorrigir: corrigir && this.procSuspender,
                conclusao: this.procConclusao,
                notaInterna: htmlVazio(this.procNota) ? null : this.procNota
            })
            .subscribe({
                next: () => {
                    this.procedendo.set(null);
                    this.concluir(d.id, corrigir ? 'Procedente: correção solicitada ao anunciante' : 'Denúncia procedente; medida aplicada');
                },
                error: (e) => this.falhar(e)
            });
    }

    enviarMensagem(d: Denuncia, forcarInterna = false) {
        const r = this.rascunho(d.id);
        if (htmlVazio(r.texto)) return;
        const interna = forcarInterna || r.interna;
        this.ocupado.set('msg' + d.id);
        const devolve = !interna && (d.status === 'EM_ANALISE' || d.status === 'EM_APURACAO');
        this.moderacao.mensagemAdmin(d.id, r.texto, interna, r.anexos).subscribe({
            next: () => this.concluir(d.id, interna ? 'Nota interna salva' : devolve ? 'Mensagem enviada; o prazo do anunciante voltou a contar' : 'Mensagem enviada'),
            error: (e) => this.falhar(e)
        });
    }

    decisaoDialogo(d: Denuncia, tipo: 'aprovar' | 'improcedente') {
        this.decTexto = this.rascunho(d.id).texto;
        this.decidindo.set({ d, tipo });
    }

    confirmarDecisao() {
        const x = this.decidindo();
        if (!x) return;
        const { d, tipo } = x;
        const correcao = correcaoPendente(d);
        this.ocupado.set('dec');
        const texto = htmlVazio(this.decTexto) ? null : this.decTexto;
        (tipo === 'aprovar' ? this.moderacao.aprovar(d.id, texto) : this.moderacao.improcedente(d.id, texto)).subscribe({
            next: () => {
                this.decidindo.set(null);
                this.concluir(d.id, tipo === 'improcedente' ? 'Denúncia julgada improcedente' : correcao ? 'Correção aceita; denúncia encerrada como procedente' : 'Solução aprovada');
            },
            error: (e) => this.falhar(e)
        });
    }

    reabrirDialogo(d: Denuncia) {
        this.reaMotivo = '';
        this.reaConta = false;
        this.reaAnuncio = false;
        this.reabrindo.set(d);
    }

    confirmarReabertura(d: Denuncia) {
        this.ocupado.set('rea');
        this.moderacao.reabrir(d.id, { motivo: this.reaMotivo, reativarConta: this.reaConta, reativarAnuncio: this.reaAnuncio }).subscribe({
            next: () => {
                this.reabrindo.set(null);
                this.concluir(d.id, 'Denúncia reaberta para nova análise');
            },
            error: (e) => this.falhar(e)
        });
    }

    pedirAcao(a: AcaoImovel) {
        this.motivo = '';
        this.acao.set(a);
    }

    confirmarAcao(a: AcaoImovel) {
        this.ocupado.set('acao');
        this.moderacao.acaoNoImovel(Number(this.imovelId()), a, htmlVazio(this.motivo) ? null : this.motivo).subscribe({
            next: (p) => {
                this.dados.set(p);
                this.ocupado.set(null);
                this.acao.set(null);
                this.msg.add({ severity: 'success', summary: ACOES[a].titulo, detail: 'Feito.' });
            },
            error: (e) => this.falhar(e)
        });
    }

    private concluir(id: number, texto: string) {
        this.ocupado.set(null);
        this.rascunhos.delete(id);
        this.msg.add({ severity: 'success', summary: 'Moderação', detail: texto });
        this.carregar();
    }

    private falhar(e: unknown) {
        this.ocupado.set(null);
        this.msg.add({ severity: 'error', summary: 'Não foi possível concluir', detail: mensagemErro(e) });
    }
}
