import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { Contato, PageResponse } from '@/app/core/models/models';
import { AreaGestao, GestaoAnunciosService } from '@/app/core/services/imovel.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { PageHeader } from '@/app/shared/components/page-header';

/** Mensagens recebidas pelos anúncios (corretor: as suas; admin: todas). */
@Component({
    selector: 'app-contatos-page',
    imports: [RouterLink, DatePipe, TableModule, ButtonModule, TagModule, PageHeader],
    template: `
        <app-page-header titulo="Contatos recebidos" subtitulo="Pessoas interessadas que escreveram pelo site." />
        <div class="card">
            <p-table [value]="pagina().content" [lazy]="true" [paginator]="true" [rows]="20" [totalRecords]="pagina().totalElements" [loading]="carregando()" (onLazyLoad)="carregar($event)" dataKey="id" [tableStyle]="{ 'min-width': '50rem' }">
                <ng-template #header>
                    <tr>
                        <th scope="col">Quando</th>
                        <th scope="col">Interessado</th>
                        <th scope="col">Imóvel</th>
                        <th scope="col">Mensagem</th>
                        <th scope="col"><span class="sr-only">Ações</span></th>
                    </tr>
                </ng-template>
                <ng-template #body let-c>
                    <tr [class.font-semibold]="!c.lido">
                        <td class="whitespace-nowrap">{{ c.criadoEm | date: 'dd/MM/yy HH:mm' }}</td>
                        <td>
                            {{ c.nome }}<br />
                            <a [href]="'mailto:' + c.email" class="text-primary text-sm font-normal">{{ c.email }}</a>
                            @if (c.telefone) {
                                <div class="text-sm font-normal">{{ c.telefone }}</div>
                            }
                        </td>
                        <td>
                            <a [routerLink]="['/imovel', c.imovelId]" class="hover:underline">{{ c.imovelTitulo }}</a>
                            <div class="text-xs text-muted-color font-normal">{{ c.imovelCodigo }}</div>
                        </td>
                        <td class="font-normal max-w-[28rem]">{{ c.mensagem }}</td>
                        <td class="text-right whitespace-nowrap">
                            @if (!c.lido) {
                                <p-tag value="Novo" severity="warn" class="mr-2" />
                            }
                            <p-button [icon]="c.lido ? 'pi pi-envelope' : 'pi pi-check'" [text]="true" [rounded]="true" (onClick)="alternar(c)" [ariaLabel]="c.lido ? 'Marcar como não lido' : 'Marcar como lido'" />
                        </td>
                    </tr>
                </ng-template>
                <ng-template #emptymessage>
                    <tr>
                        <td colspan="5" class="text-center py-8 text-muted-color">Nenhum contato recebido ainda.</td>
                    </tr>
                </ng-template>
            </p-table>
        </div>
    `
})
export class ContatosPage {
    private route = inject(ActivatedRoute);
    private gestao = inject(GestaoAnunciosService);
    private msg = inject(MessageService);

    area: AreaGestao = this.route.snapshot.data['area'];
    pagina = signal<PageResponse<Contato>>({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    carregando = signal(false);
    private ultimo: TableLazyLoadEvent = { first: 0, rows: 20 };

    constructor() {
        inject(ConfigService).definirTitulo('Contatos');
    }

    carregar(e: TableLazyLoadEvent) {
        this.ultimo = e;
        const rows = e.rows ?? 20;
        this.carregando.set(true);
        this.gestao.contatos(this.area, Math.floor((e.first ?? 0) / rows), rows).subscribe({
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

    alternar(c: Contato) {
        this.gestao.marcarLido(this.area, c.id, !c.lido).subscribe({
            next: () => this.carregar(this.ultimo),
            error: (e) => this.msg.add({ severity: 'error', summary: 'Erro', detail: mensagemErro(e) })
        });
    }
}
