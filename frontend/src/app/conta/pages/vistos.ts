import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { VistoRecente } from '@/app/core/models/models';
import { ContaService } from '@/app/core/services/conta.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { TempoRelativoPipe } from '@/app/core/pipes/formatos';
import { PageHeader } from '@/app/shared/components/page-header';
import { ImovelCardMini } from '@/app/shared/components/imovel-card-mini';
import { EmptyState } from '@/app/shared/components/empty-state';

const POR_PAGINA = 24;

/** Histórico dos imóveis que o usuário abriu (só os que ainda estão no ar), do mais recente. */
@Component({
    selector: 'app-vistos-page',
    imports: [RouterLink, ButtonModule, SkeletonModule, TooltipModule, TempoRelativoPipe, PageHeader, ImovelCardMini, EmptyState],
    template: `
        <app-page-header titulo="Vistos recentemente" subtitulo="Imóveis que você abriu, do mais recente. Só aparecem os que ainda estão anunciados.">
            @if (lista().length) {
                <p-button label="Limpar histórico" icon="pi pi-trash" severity="secondary" [outlined]="true" (onClick)="limpar()" />
            }
        </app-page-header>

        @if (!regraLigada()) {
            <div class="card">
                <app-empty-state titulo="Histórico indisponível" texto="O histórico de imóveis vistos está desativado no site no momento." icone="pi-eye-slash" />
            </div>
        } @else if (carregando() && !lista().length) {
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                @for (i of [1, 2, 3, 4]; track i) {
                    <p-skeleton height="260px" />
                }
            </div>
        } @else if (!lista().length) {
            <div class="card">
                <app-empty-state titulo="Nenhum imóvel visto ainda" texto="Os imóveis que você abrir enquanto estiver logado aparecem aqui, para você voltar a eles depois." icone="pi-eye">
                    <a routerLink="/venda" class="p-button">Buscar imóveis</a>
                </app-empty-state>
            </div>
        } @else {
            <ul class="list-none p-0 m-0 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Imóveis vistos">
                @for (v of lista(); track v.imovel.id) {
                    <li class="flex flex-col gap-2 min-w-0">
                        <div class="flex items-center justify-between gap-2 text-sm text-muted-color">
                            <span><i class="pi pi-eye mr-1" aria-hidden="true"></i>Visto {{ v.vistoEm | tempoRelativo }}</span>
                            <p-button
                                icon="pi pi-times"
                                [text]="true"
                                [rounded]="true"
                                size="small"
                                severity="secondary"
                                (onClick)="remover(v)"
                                [ariaLabel]="'Tirar ' + v.imovel.titulo + ' do histórico'"
                                pTooltip="Tirar do histórico"
                                tooltipPosition="top"
                            />
                        </div>
                        <app-imovel-card-mini [imovel]="v.imovel" />
                    </li>
                }
            </ul>
            @if (temMais()) {
                <div class="flex justify-center mt-6">
                    <p-button label="Ver mais" icon="pi pi-angle-down" severity="secondary" [outlined]="true" [loading]="carregando()" (onClick)="carregar()" />
                </div>
            }
        }
    `
})
export class VistosPage {
    private conta = inject(ContaService);
    private msg = inject(MessageService);
    private confirm = inject(ConfirmationService);
    private config = inject(ConfigService);

    lista = signal<VistoRecente[]>([]);
    carregando = signal(true);
    private total = signal(0);
    private pagina = 0;
    temMais = computed(() => this.lista().length < this.total());
    regraLigada = computed(() => this.config.config().vistosRecentes !== false);

    constructor() {
        this.config.definirTitulo('Vistos recentemente');
        this.carregar();
    }

    carregar() {
        this.carregando.set(true);
        this.conta.vistos(this.pagina, POR_PAGINA).subscribe({
            next: (p) => {
                this.lista.update((l) => [...l, ...p.content.filter((v) => !l.some((x) => x.imovel.id === v.imovel.id))]);
                this.total.set(p.totalElements);
                this.pagina++;
                this.carregando.set(false);
            },
            error: (e) => {
                this.carregando.set(false);
                this.msg.add({ severity: 'error', summary: 'Vistos recentemente', detail: mensagemErro(e) });
            }
        });
    }

    remover(v: VistoRecente) {
        this.conta.removerVisto(v.imovel.id).subscribe({
            next: () => {
                this.lista.update((l) => l.filter((x) => x.imovel.id !== v.imovel.id));
                this.total.update((t) => Math.max(t - 1, 0));
            },
            error: (e) => this.msg.add({ severity: 'error', summary: 'Não foi possível tirar do histórico', detail: mensagemErro(e) })
        });
    }

    limpar() {
        this.confirm.confirm({
            header: 'Limpar histórico',
            message: 'Apagar todo o seu histórico de imóveis vistos? Seus favoritos não são afetados.',
            acceptButtonProps: { label: 'Limpar', severity: 'danger' },
            rejectButtonProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
            accept: () =>
                this.conta.limparVistos().subscribe({
                    next: () => {
                        this.lista.set([]);
                        this.total.set(0);
                        this.msg.add({ severity: 'success', summary: 'Histórico apagado' });
                    },
                    error: (e) => this.msg.add({ severity: 'error', summary: 'Não foi possível limpar', detail: mensagemErro(e) })
                })
        });
    }
}
