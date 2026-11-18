import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { Menu, MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { debounceTime } from 'rxjs';
import { ImovelResumo, PageResponse, STATUS, STATUS_MODERACAO, StatusAnuncio } from '@/app/core/models/models';
import { AreaGestao, GestaoAnunciosService } from '@/app/core/services/imovel.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { PrecoPipe, slug } from '@/app/core/pipes/formatos';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatusTag } from '@/app/shared/components/status-tag';
import { ImovelFoto } from '@/app/shared/components/imovel-foto';
import { TabelaResponsiva } from '@/app/shared/directives/tabela-responsiva';

/**
 * Lista de anúncios para gestão.
 *  - área "corretor" (/conta/anuncios): só os anúncios do próprio corretor;
 *  - área "admin" (/admin/anuncios): anúncios de todos, com aprovação, bloqueio e destaque.
 */
@Component({
    selector: 'app-anuncios-lista-page',
    imports: [RouterLink, ReactiveFormsModule, TableModule, TabelaResponsiva, ButtonModule, InputTextModule, SelectModule, IconFieldModule, InputIconModule, MenuModule, TooltipModule, PrecoPipe, PageHeader, StatusTag, ImovelFoto],
    template: `
        <app-page-header [titulo]="admin ? 'Anúncios de todos os anunciantes' : 'Meus anúncios'" [subtitulo]="admin ? 'Aprove, bloqueie, destaque ou edite qualquer anúncio.' : 'Publique, pause e edite seus imóveis.'">
            <p-button label="Novo anúncio" icon="pi pi-plus" [routerLink]="base + '/novo'" />
        </app-page-header>

        <div class="card">
            <div class="flex flex-col sm:flex-row gap-3 mb-4">
                <p-iconfield class="flex-1">
                    <p-inputicon class="pi pi-search" />
                    <input pInputText [formControl]="busca" placeholder="Buscar por título, bairro ou código" class="w-full" aria-label="Buscar anúncios" />
                </p-iconfield>
                <p-select [options]="statusOpcoes" optionLabel="label" optionValue="value" [formControl]="status" placeholder="Todos os status" [showClear]="true" styleClass="sm:w-56" ariaLabel="Filtrar por status" />
            </div>

            <p-table
                appTabelaResponsiva
                [value]="pagina().content"
                [lazy]="true"
                [paginator]="true"
                [rows]="10"
                [totalRecords]="pagina().totalElements"
                [loading]="carregando()"
                (onLazyLoad)="carregar($event)"
                dataKey="id"
                [tableStyle]="{ 'min-width': '52rem' }"
                currentPageReportTemplate="{first} a {last} de {totalRecords}"
                [showCurrentPageReport]="true"
            >
                <ng-template #header>
                    <tr>
                        <th scope="col">Imóvel</th>
                        <th scope="col">Preço</th>
                        @if (admin) {
                            <th scope="col">Anunciante</th>
                        }
                        <th scope="col">Status</th>
                        <th scope="col">Visitas</th>
                        <th scope="col"><span class="sr-only">Ações</span></th>
                    </tr>
                </ng-template>
                <ng-template #body let-i>
                    <tr>
                        <td>
                            <div class="flex items-center gap-3">
                                <app-imovel-foto class="w-16 h-12 rounded-border shrink-0" [src]="i.fotoCapa" [tipo]="i.tipo" [semente]="i.id" [alt]="i.titulo" [mostrarTexto]="false" />
                                <div class="min-w-0">
                                    <a [routerLink]="base + '/' + i.id" class="font-semibold hover:underline block truncate max-w-[22rem]">{{ i.titulo }}</a>
                                    <div class="text-xs text-muted-color">{{ i.codigo }} · {{ i.tipoDescricao }} · {{ i.bairro }}, {{ i.cidade }}</div>
                                </div>
                                @if (i.destaque) {
                                    <i class="pi pi-star-fill text-yellow-500" pTooltip="Em destaque" aria-label="Em destaque"></i>
                                }
                            </div>
                        </td>
                        <td class="whitespace-nowrap">{{ i.preco | preco: i.finalidade }}</td>
                        @if (admin) {
                            <td>{{ i.anuncianteNome }}</td>
                        }
                        <td><app-status-tag [status]="i.status" /></td>
                        <td>{{ i.visualizacoes }}</td>
                        <td class="text-right whitespace-nowrap">
                            @if (relatorioLigado()) {
                                <p-button icon="pi pi-chart-line" [text]="true" [rounded]="true" [routerLink]="base + '/' + i.id + '/relatorio'" [ariaLabel]="'Relatório de ' + i.titulo" pTooltip="Relatório: visitas, contatos e favoritos" />
                            }
                            <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" [routerLink]="base + '/' + i.id" [ariaLabel]="'Editar ' + i.titulo" pTooltip="Editar" />
                            <p-button icon="pi pi-ellipsis-v" [text]="true" [rounded]="true" (onClick)="abrirMenu($event, i)" [ariaLabel]="'Mais ações para ' + i.titulo" />
                        </td>
                    </tr>
                </ng-template>
                <ng-template #emptymessage>
                    <tr>
                        <td [attr.colspan]="admin ? 6 : 5" class="text-center py-8 text-muted-color">Nenhum anúncio encontrado.</td>
                    </tr>
                </ng-template>
            </p-table>
        </div>
        <p-menu #menu [model]="acoes()" [popup]="true" appendTo="body" />
    `
})
export class AnunciosListaPage {
    private route = inject(ActivatedRoute);
    private gestao = inject(GestaoAnunciosService);
    private msg = inject(MessageService);
    private confirm = inject(ConfirmationService);

    area: AreaGestao = this.route.snapshot.data['area'];
    admin = this.area === 'admin';
    base = this.admin ? '/admin/anuncios' : '/conta/anuncios';
    private config = inject(ConfigService);
    /** Regra "Relatório do anúncio": o administrador sempre vê. */
    relatorioLigado = computed(() => this.admin || this.config.config().relatorioAnuncio !== false);

    statusOpcoes = STATUS;
    busca = new FormControl('');
    status = new FormControl<StatusAnuncio | null>(null);

    pagina = signal<PageResponse<ImovelResumo>>({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
    carregando = signal(false);
    selecionado = signal<ImovelResumo | null>(null);
    menu = viewChild.required<Menu>('menu');
    private ultimo: TableLazyLoadEvent = { first: 0, rows: 10 };

    acoes = computed<MenuItem[]>(() => {
        const i = this.selecionado();
        if (!i) return [];
        const itens: MenuItem[] = [{ label: 'Ver no site', icon: 'pi pi-external-link', disabled: i.status !== 'ATIVO', url: `/imovel/${i.id}/${slug(i.titulo)}`, target: '_blank' }];
        if (this.admin) {
            if (i.status !== 'ATIVO') itens.push({ label: i.status === 'PENDENTE' ? 'Aprovar' : 'Ativar', icon: 'pi pi-check', command: () => this.mudarStatus(i, 'ATIVO') });
            if (i.status !== 'BLOQUEADO') itens.push({ label: 'Bloquear', icon: 'pi pi-ban', command: () => this.mudarStatus(i, 'BLOQUEADO') });
            if (!STATUS_MODERACAO.includes(i.status)) itens.push({ label: 'Suspender (moderação)', icon: 'pi pi-pause-circle', command: () => this.mudarStatus(i, 'SUSPENSO') });
            if (i.status !== 'BANIDO') itens.push({ label: 'Banir', icon: 'pi pi-times-circle', command: () => this.mudarStatus(i, 'BANIDO') });
            itens.push({ label: 'Denúncias deste anúncio', icon: 'pi pi-flag', routerLink: ['/admin/denuncias', i.id] });
            itens.push({ label: i.destaque ? 'Tirar do destaque' : 'Destacar', icon: 'pi pi-star', command: () => this.mudarStatus(i, i.status, !i.destaque) });
        } else if (STATUS_MODERACAO.includes(i.status)) {
            itens.push({ label: 'Ver pendências da moderação', icon: 'pi pi-flag', routerLink: ['/conta/pendencias', i.id] });
        } else if (i.status !== 'PENDENTE' && i.status !== 'BLOQUEADO') {
            if (i.status === 'ATIVO') itens.push({ label: 'Pausar', icon: 'pi pi-pause', command: () => this.mudarStatus(i, 'PAUSADO') });
            else itens.push({ label: 'Reativar', icon: 'pi pi-play', command: () => this.mudarStatus(i, 'ATIVO') });
            if (i.status !== 'CONCLUIDO') itens.push({ label: 'Marcar como vendido/alugado', icon: 'pi pi-flag', command: () => this.mudarStatus(i, 'CONCLUIDO') });
        }
        if (this.admin || i.status !== 'BANIDO') {
            itens.push({ separator: true }, { label: 'Excluir', icon: 'pi pi-trash', command: () => this.excluir(i) });
        }
        return itens;
    });

    constructor() {
        inject(ConfigService).definirTitulo(this.admin ? 'Anúncios' : 'Meus anúncios');
        this.busca.valueChanges.pipe(debounceTime(350)).subscribe(() => this.carregar({ ...this.ultimo, first: 0 }));
        this.status.valueChanges.subscribe(() => this.carregar({ ...this.ultimo, first: 0 }));
    }

    carregar(e: TableLazyLoadEvent) {
        this.ultimo = e;
        const rows = e.rows ?? 10;
        this.carregando.set(true);
        this.gestao.listar(this.area, { q: this.busca.value || null, status: this.status.value, ordem: 'recentes', page: Math.floor((e.first ?? 0) / rows), size: rows }).subscribe({
            next: (p) => {
                this.pagina.set(p);
                this.carregando.set(false);
            },
            error: (err) => {
                this.carregando.set(false);
                this.msg.add({ severity: 'error', summary: 'Erro', detail: mensagemErro(err) });
            }
        });
    }

    abrirMenu(ev: Event, i: ImovelResumo) {
        this.selecionado.set(i);
        this.menu().toggle(ev);
    }

    mudarStatus(i: ImovelResumo, status: StatusAnuncio, destaque?: boolean) {
        this.gestao.status(this.area, i.id, status, destaque).subscribe({
            next: () => {
                this.msg.add({ severity: 'success', summary: 'Anúncio atualizado' });
                this.carregar(this.ultimo);
            },
            error: (e) => this.msg.add({ severity: 'error', summary: 'Não foi possível', detail: mensagemErro(e) })
        });
    }

    excluir(i: ImovelResumo) {
        this.confirm.confirm({
            header: 'Excluir anúncio',
            message: `Excluir "${i.titulo}"? Os contatos recebidos para ele também serão apagados.`,
            icon: 'pi pi-exclamation-triangle',
            acceptButtonProps: { label: 'Excluir', severity: 'danger' },
            rejectButtonProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
            accept: () =>
                this.gestao.excluir(this.area, i.id).subscribe({
                    next: () => {
                        this.msg.add({ severity: 'success', summary: 'Anúncio excluído' });
                        this.carregar(this.ultimo);
                    },
                    error: (e) => this.msg.add({ severity: 'error', summary: 'Erro', detail: mensagemErro(e) })
                })
        });
    }
}
