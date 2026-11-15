import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { CorTag, GrupoPendencias, PageResponse, STATUS_DENUNCIA } from '@/app/core/models/models';
import { FiltroDenuncias, ModeracaoService } from '@/app/core/services/moderacao.service';
import { RealtimeService } from '@/app/core/services/realtime.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfigService } from '@/app/core/services/config.service';
import { PageHeader } from '@/app/shared/components/page-header';
import { EmptyState } from '@/app/shared/components/empty-state';
import { ImovelFoto } from '@/app/shared/components/imovel-foto';
import { StatusTag } from '@/app/shared/components/status-tag';
import { PrazoSlaComponent } from '@/app/shared/components/prazo-sla';

/** Moderação: denúncias agrupadas por anúncio (cada uma com o seu prazo). */
@Component({
    selector: 'app-admin-denuncias-page',
    imports: [RouterLink, FormsModule, DatePipe, SelectModule, TagModule, PaginatorModule, PageHeader, EmptyState, ImovelFoto, StatusTag, PrazoSlaComponent],
    template: `
        <app-page-header titulo="Denúncias" subtitulo="Pendências dos anúncios. O prazo corre só do lado do anunciante; enquanto aguarda a moderação, fica parado.">
            <a routerLink="/admin/moderacao" class="p-button p-button-outlined"><i class="pi pi-sliders-h mr-2" aria-hidden="true"></i>Regras e automações</a>
        </app-page-header>

        <div class="card !mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <label for="filtro-den" class="font-medium">Mostrar</label>
            <p-select inputId="filtro-den" [options]="filtros" [(ngModel)]="filtro" (onChange)="carregar(0)" optionLabel="label" optionValue="value" styleClass="sm:w-72" />
            <span class="text-sm text-muted-color sm:ml-auto">{{ pagina().totalElements }} anúncio(s)</span>
        </div>

        @if (!carregando() && pagina().content.length === 0) {
            <div class="card"><app-empty-state titulo="Nada por aqui" texto="Nenhum anúncio com denúncias neste filtro." icone="pi-check-circle" /></div>
        }

        <div class="flex flex-col gap-3">
            @for (g of pagina().content; track g.imovel.id) {
                <a [routerLink]="['/admin/denuncias', g.imovel.id]" class="card !mb-0 !p-4 block hover:shadow-md transition-shadow text-color no-underline" [attr.aria-label]="'Abrir as denúncias do anúncio ' + g.imovel.codigo">
                    <div class="flex flex-col md:flex-row gap-4">
                        <app-imovel-foto class="w-full md:w-28 h-24 md:h-20 rounded-border shrink-0" [src]="g.imovel.fotoCapa" [semente]="g.imovel.id" [alt]="g.imovel.titulo" [mostrarTexto]="false" />
                        <div class="flex-1 min-w-0">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="font-semibold truncate">{{ g.imovel.titulo }}</span>
                                <app-status-tag [status]="g.imovel.status" />
                                @if (g.algumVencido) {
                                    <p-tag value="Prazo vencido" severity="danger" icon="pi pi-exclamation-triangle" />
                                }
                            </div>
                            <div class="text-sm text-muted-color">{{ g.imovel.codigo }} · {{ g.anuncianteNome }} · última denúncia {{ g.ultimaDenuncia | date: 'dd/MM HH:mm' }}</div>
                            <div class="flex flex-wrap gap-2 mt-2">
                                @for (d of g.denuncias; track d.id) {
                                    <span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-surface">
                                        <span class="w-2 h-2 rounded-full" [class]="corGravidade(d.gravidade.cor)" [title]="'Gravidade ' + d.gravidade.nome" aria-hidden="true"></span>
                                        {{ d.tipo }} · {{ statusDenuncia[d.status].label.toLowerCase() }}
                                    </span>
                                }
                            </div>
                        </div>
                        <div class="flex flex-col md:items-end gap-1 text-sm md:w-72 shrink-0">
                            @if (g.emAnalise) {
                                <span class="font-semibold text-primary"><i class="pi pi-inbox" aria-hidden="true"></i> {{ g.emAnalise }} aguardando você</span>
                            }
                            @if (g.emApuracao) {
                                <span class="font-semibold"><i class="pi pi-search" aria-hidden="true"></i> {{ g.emApuracao }} em apuração</span>
                            }
                            @if (g.aguardandoAnunciante) {
                                <span class="text-muted-color">{{ g.aguardandoAnunciante }} aguardando o anunciante</span>
                            }
                            @if (proximo(g); as d) {
                                <app-prazo-sla [prazo]="d.prazo" [status]="d.status" [compacto]="true" />
                            }
                        </div>
                    </div>
                </a>
            }
        </div>

        @if (pagina().totalPages > 1) {
            <p-paginator [first]="pagina().page * pagina().size" [rows]="pagina().size" [totalRecords]="pagina().totalElements" (onPageChange)="mudarPagina($event)" styleClass="mt-4" />
        }
    `
})
export class AdminDenunciasPage {
    private moderacao = inject(ModeracaoService);

    filtros: { label: string; value: FiltroDenuncias }[] = [
        { label: 'Abertas', value: 'ABERTAS' },
        { label: 'Aguardando a moderação', value: 'EM_ANALISE' },
        { label: 'Em apuração', value: 'EM_APURACAO' },
        { label: 'Aguardando o anunciante', value: 'AGUARDANDO_ANUNCIANTE' },
        { label: 'Encerradas', value: 'ENCERRADAS' },
        { label: 'Todas', value: 'TODAS' }
    ];
    filtro: FiltroDenuncias = 'ABERTAS';
    pagina = signal<PageResponse<GrupoPendencias>>({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    carregando = signal(true);
    statusDenuncia = STATUS_DENUNCIA;

    constructor() {
        inject(ConfigService).definirTitulo('Denúncias');
        this.carregar(0);
        const t = setInterval(() => this.carregar(this.pagina().page), 60_000);
        inject(DestroyRef).onDestroy(() => clearInterval(t));
        // qualquer mudança nas denúncias muda o contador: recarrega a lista na hora
        inject(RealtimeService)
            .ouvir('private-admin.moderacao', 'contador')
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.carregar(this.pagina().page));
    }

    carregar(page: number) {
        this.moderacao.grupos(this.filtro, page).subscribe({
            next: (p) => {
                this.pagina.set(p);
                this.carregando.set(false);
            },
            error: () => this.carregando.set(false)
        });
        this.moderacao.atualizarContadorAdmin();
    }

    mudarPagina(e: PaginatorState) {
        this.carregar(e.page ?? 0);
    }

    /** Denúncia com o prazo mais apertado do grupo. */
    proximo(g: GrupoPendencias) {
        return g.denuncias.filter((d) => d.status === 'AGUARDANDO_ANUNCIANTE').sort((a, b) => (a.prazo.minutosRestantes ?? 1e9) - (b.prazo.minutosRestantes ?? 1e9))[0] ?? null;
    }

    /** Cor do ponto da gravidade (mesma cor da etiqueta dela). */
    corGravidade(cor: CorTag) {
        return { danger: 'bg-red-600', warn: 'bg-orange-500', success: 'bg-green-600', info: 'bg-sky-500', secondary: 'bg-surface-400', contrast: 'bg-surface-900' }[cor] ?? 'bg-sky-500';
    }
}
