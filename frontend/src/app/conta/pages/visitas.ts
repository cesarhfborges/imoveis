import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { Observable } from 'rxjs';
import { STATUS_VISITA, Visita } from '@/app/core/models/models';
import { VisitaService } from '@/app/core/services/visita.service';
import { AuthService } from '@/app/core/services/auth.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { TelefonePipe, digitos, slug } from '@/app/core/pipes/formatos';
import { PageHeader } from '@/app/shared/components/page-header';
import { EmptyState } from '@/app/shared/components/empty-state';
import { SeletorHorario } from '@/app/shared/components/seletor-horario';

type Lado = 'cliente' | 'anunciante';
type Acao = 'recusar' | 'cancelar' | 'propor';

/**
 * Visitas agendadas, conforme o perfil da sessão: o cliente vê as que pediu; o corretor, as pedidas aos anúncios
 * dele (para pedir visitas, ele entra como cliente). Cada lado responde pelo que lhe cabe (o anunciante confirma, recusa ou propõe outro horário; o cliente aceita o novo horário ou
 * cancela).
 */
@Component({
    selector: 'app-visitas-page',
    imports: [DatePipe, NgTemplateOutlet, FormsModule, RouterLink, ButtonModule, DialogModule, TagModule, TextareaModule, SkeletonModule, TelefonePipe, PageHeader, EmptyState, SeletorHorario],
    template: `
        <app-page-header [titulo]="corretor() ? 'Visitas aos meus anúncios' : 'Minhas visitas'" [subtitulo]="corretor() ? 'Pedidos de visita dos interessados: confirme, recuse ou proponha outro horário.' : 'Visitas que você pediu pelo site e a resposta de cada anunciante.'" />

        <ng-template #lista let-itens let-lado="lado">
            @if (carregando()) {
                <div class="flex flex-col gap-3">
                    <p-skeleton height="7rem" />
                    <p-skeleton height="7rem" />
                </div>
            } @else if (!itens.length) {
                <div class="card">
                    @if (lado === 'cliente') {
                        <app-empty-state titulo="Nenhuma visita agendada" texto='Na página de um imóvel, use "Agendar visita" para escolher um horário.' icone="pi-calendar">
                            <a routerLink="/venda" class="p-button">Buscar imóveis</a>
                        </app-empty-state>
                    } @else {
                        <app-empty-state titulo="Nenhum pedido de visita" texto="Os pedidos de visita aos seus anúncios aparecem aqui." icone="pi-calendar" />
                    }
                </div>
            } @else {
                <ul class="list-none p-0 m-0 flex flex-col gap-3">
                    @for (v of itens; track v.id) {
                        <li class="card m-0 flex flex-col sm:flex-row gap-4" [class.opacity-70]="encerrada(v)">
                            <div class="sm:w-36 shrink-0 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-1">
                                <div class="text-center sm:text-left">
                                    <div class="text-xs uppercase text-muted-color">{{ v.inicio | date: 'EEE' }}</div>
                                    <div class="text-2xl font-bold leading-tight">{{ v.inicio | date: 'dd/MM' }}</div>
                                    <div class="font-semibold">{{ v.inicio | date: 'HH:mm' }}–{{ v.fim | date: 'HH:mm' }}</div>
                                </div>
                                <p-tag [value]="status(v).label" [severity]="status(v).severity" />
                            </div>
                            <div class="flex-1 min-w-0 flex flex-col gap-2">
                                <a [routerLink]="['/imovel', v.imovelId, slug(v.imovelTitulo)]" class="font-semibold text-primary hover:underline truncate">{{ v.imovelTitulo }}</a>
                                <div class="text-sm text-muted-color">{{ v.imovelCodigo }} · {{ v.bairro }}, {{ v.cidade }}</div>
                                @if (v.pessoa; as p) {
                                    <div class="text-sm flex flex-wrap gap-x-4 gap-y-1">
                                        <span
                                            ><i class="pi pi-user mr-1 text-muted-color" aria-hidden="true"></i>{{ lado === 'anunciante' ? 'Cliente' : 'Anunciante' }}: <strong>{{ p.nome }}</strong></span
                                        >
                                        @if (p.telefone) {
                                            <a [href]="'tel:' + digitos(p.telefone)" class="text-primary hover:underline"><i class="pi pi-phone mr-1" aria-hidden="true"></i>{{ p.telefone | telefone }}</a>
                                        }
                                        @if (lado === 'anunciante') {
                                            <a [href]="'mailto:' + p.email" class="text-primary hover:underline"><i class="pi pi-envelope mr-1" aria-hidden="true"></i>{{ p.email }}</a>
                                        }
                                    </div>
                                }
                                @if (v.mensagem) {
                                    <p class="m-0 text-sm"><span class="text-muted-color">Recado do cliente:</span> {{ v.mensagem }}</p>
                                }
                                @if (v.status === 'NOVO_HORARIO' && v.propostoInicio) {
                                    <p class="m-0 text-sm p-2 rounded-border bg-emphasis">
                                        <i class="pi pi-calendar-clock mr-1" aria-hidden="true"></i>Novo horário proposto: <strong>{{ v.propostoInicio | date: "EEEE, dd/MM 'às' HH:mm" }}</strong>
                                    </p>
                                }
                                @if (v.resposta) {
                                    <p class="m-0 text-sm"><span class="text-muted-color">Recado do anunciante:</span> {{ v.resposta }}</p>
                                }
                                <div class="flex flex-wrap gap-2 mt-1">
                                    @if (lado === 'anunciante') {
                                        @if (v.status === 'SOLICITADA') {
                                            <p-button label="Confirmar" icon="pi pi-check" size="small" [loading]="processando() === v.id" (onClick)="executar(v, visitas.confirmar(v.id), 'Visita confirmada')" />
                                        }
                                        @if (v.status === 'SOLICITADA' || v.status === 'CONFIRMADA') {
                                            <p-button label="Propor outro horário" icon="pi pi-calendar-clock" size="small" severity="secondary" [outlined]="true" (onClick)="abrir(v, lado, 'propor')" />
                                        }
                                        @if (v.status === 'SOLICITADA') {
                                            <p-button label="Recusar" icon="pi pi-times" size="small" severity="danger" [text]="true" (onClick)="abrir(v, lado, 'recusar')" />
                                        }
                                        @if (v.status === 'CONFIRMADA' || v.status === 'NOVO_HORARIO') {
                                            <p-button label="Cancelar visita" icon="pi pi-calendar-times" size="small" severity="danger" [text]="true" (onClick)="abrir(v, lado, 'cancelar')" />
                                        }
                                    } @else {
                                        @if (v.status === 'NOVO_HORARIO') {
                                            <p-button label="Aceitar novo horário" icon="pi pi-check" size="small" [loading]="processando() === v.id" (onClick)="executar(v, visitas.aceitar(v.id), 'Visita confirmada no novo horário')" />
                                        }
                                        @if (!encerrada(v)) {
                                            <p-button
                                                [label]="v.status === 'NOVO_HORARIO' ? 'Não posso nesse horário' : 'Cancelar visita'"
                                                icon="pi pi-calendar-times"
                                                size="small"
                                                severity="danger"
                                                [text]="true"
                                                (onClick)="abrir(v, lado, 'cancelar')"
                                            />
                                        }
                                    }
                                </div>
                            </div>
                        </li>
                    }
                </ul>
            }
        </ng-template>

        <!-- um lado por perfil: o corretor atende as visitas aos anúncios; o cliente acompanha as que pediu -->
        <ng-container *ngTemplateOutlet="lista; context: { $implicit: corretor() ? doAnunciante() : minhas(), lado: corretor() ? 'anunciante' : 'cliente' }" />

        <p-dialog [blockScroll]="true" [visible]="!!acao()" (visibleChange)="!$event && fecharAcao()" [modal]="true" [header]="tituloAcao()" [style]="{ width: '36rem' }" [breakpoints]="{ '640px': '96vw' }">
            @if (acao(); as a) {
                <div class="flex flex-col gap-4">
                    <p class="m-0 text-sm">{{ a.visita.imovelTitulo }} · {{ a.visita.inicio | date: "dd/MM 'às' HH:mm" }}</p>
                    @if (a.tipo === 'propor') {
                        <app-seletor-horario [imovelId]="a.visita.imovelId" rotuloId="propor" [(selecionado)]="novoHorario" />
                    }
                    <div class="flex flex-col gap-2">
                        <label for="visita-recado" class="font-medium">{{ a.tipo === 'propor' ? 'Recado' : 'Motivo' }} <span class="text-muted-color font-normal">(opcional)</span></label>
                        <textarea pTextarea id="visita-recado" rows="2" maxlength="1000" [(ngModel)]="recado"></textarea>
                    </div>
                </div>
            }
            <ng-template #footer>
                <p-button label="Voltar" severity="secondary" [text]="true" (onClick)="fecharAcao()" />
                <p-button [label]="botaoAcao()" [severity]="acao()?.tipo === 'propor' ? 'primary' : 'danger'" [disabled]="acao()?.tipo === 'propor' && !novoHorario()" [loading]="!!processando()" (onClick)="confirmarAcao()" />
            </ng-template>
        </p-dialog>
    `
})
export class VisitasPage {
    visitas = inject(VisitaService);
    private auth = inject(AuthService);
    private msg = inject(MessageService);

    readonly slug = slug;
    readonly digitos = digitos;
    corretor = computed(() => this.auth.perfil() === 'CORRETOR');

    minhas = signal<Visita[]>([]);
    doAnunciante = signal<Visita[]>([]);
    carregando = signal(true);
    processando = signal<number | null>(null);

    acao = signal<{ visita: Visita; lado: Lado; tipo: Acao } | null>(null);
    novoHorario = signal<string | null>(null);
    recado = '';
    tituloAcao = computed(() => ({ recusar: 'Recusar pedido de visita', cancelar: 'Cancelar visita', propor: 'Propor outro horário' })[this.acao()?.tipo ?? 'cancelar']);
    botaoAcao = computed(() => ({ recusar: 'Recusar pedido', cancelar: 'Cancelar visita', propor: 'Enviar proposta' })[this.acao()?.tipo ?? 'cancelar']);

    constructor() {
        inject(ConfigService).definirTitulo(this.corretor() ? 'Visitas aos meus anúncios' : 'Minhas visitas');
        this.carregar();
    }

    /** Só o lado do perfil atual. */
    private carregar() {
        this.carregando.set(true);
        const corretor = this.corretor();
        (corretor ? this.visitas.doAnunciante() : this.visitas.minhas()).subscribe({
            next: (l) => {
                (corretor ? this.doAnunciante : this.minhas).set(VisitasPage.ordenar(l));
                this.carregando.set(false);
            },
            error: (e) => this.falhou(e)
        });
    }

    private falhou(e: unknown) {
        this.carregando.set(false);
        this.msg.add({ severity: 'error', summary: 'Visitas', detail: mensagemErro(e) });
    }

    /** As em andamento primeiro (da mais próxima para a mais distante), depois as encerradas (mais recentes antes). */
    private static ordenar(l: Visita[]): Visita[] {
        const andamento = (v: Visita) => ['SOLICITADA', 'CONFIRMADA', 'NOVO_HORARIO'].includes(v.status) && new Date(v.fim) > new Date();
        return [...l.filter(andamento).sort((a, b) => a.inicio.localeCompare(b.inicio)), ...l.filter((v) => !andamento(v)).sort((a, b) => b.inicio.localeCompare(a.inicio))];
    }

    status(v: Visita) {
        if (v.status === 'CONFIRMADA' && this.encerrada(v)) return { label: 'Realizada', severity: 'secondary' as const };
        return STATUS_VISITA[v.status];
    }

    /** Recusada, cancelada ou já passou. */
    encerrada(v: Visita) {
        return v.status === 'RECUSADA' || v.status === 'CANCELADA' || new Date(v.fim) <= new Date();
    }

    abrir(visita: Visita, lado: Lado, tipo: Acao) {
        this.recado = '';
        this.novoHorario.set(null);
        this.acao.set({ visita, lado, tipo });
    }

    fecharAcao() {
        if (!this.processando()) this.acao.set(null);
    }

    confirmarAcao() {
        const a = this.acao();
        if (!a) return;
        const recado = this.recado.trim() || null;
        const chamada =
            a.tipo === 'propor'
                ? this.visitas.propor(a.visita.id, this.novoHorario()!, recado)
                : a.tipo === 'recusar'
                  ? this.visitas.recusar(a.visita.id, recado)
                  : a.lado === 'anunciante'
                    ? this.visitas.cancelarComoAnunciante(a.visita.id, recado)
                    : this.visitas.cancelar(a.visita.id, recado);
        const texto = { propor: 'Novo horário enviado ao cliente', recusar: 'Pedido recusado', cancelar: 'Visita cancelada' }[a.tipo];
        this.executar(a.visita, chamada, texto, () => this.acao.set(null));
    }

    /** Chama a API e troca a visita na lista certa pela versão atualizada. */
    executar(v: Visita, chamada: Observable<Visita>, sucesso: string, depois?: () => void) {
        this.processando.set(v.id);
        chamada.subscribe({
            next: (atualizada) => {
                this.processando.set(null);
                const trocar = (l: Visita[]) => VisitasPage.ordenar(l.map((x) => (x.id === atualizada.id ? atualizada : x)));
                this.minhas.update(trocar);
                this.doAnunciante.update(trocar);
                this.msg.add({ severity: 'success', summary: sucesso });
                depois?.();
            },
            error: (e) => {
                this.processando.set(null);
                this.msg.add({ severity: 'error', summary: 'Não foi possível concluir', detail: mensagemErro(e) });
            }
        });
    }
}
