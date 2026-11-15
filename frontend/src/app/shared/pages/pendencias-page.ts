import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { GrupoPendencias, STATUS_DENUNCIA } from '@/app/core/models/models';
import { ModeracaoService } from '@/app/core/services/moderacao.service';
import { slug } from '@/app/core/pipes/formatos';
import { RealtimeService, canalDoUsuario } from '@/app/core/services/realtime.service';
import { AuthService } from '@/app/core/services/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfigService } from '@/app/core/services/config.service';
import { PageHeader } from '@/app/shared/components/page-header';
import { EmptyState } from '@/app/shared/components/empty-state';
import { ImovelFoto } from '@/app/shared/components/imovel-foto';
import { StatusTag } from '@/app/shared/components/status-tag';
import { PrazoSlaComponent } from '@/app/shared/components/prazo-sla';

/** Pendências do anunciante: denúncias dos seus anúncios, agrupadas por anúncio, cada uma com o seu prazo. */
@Component({
    selector: 'app-pendencias-page',
    imports: [RouterLink, TagModule, SelectButtonModule, FormsModule, PageHeader, EmptyState, ImovelFoto, StatusTag, PrazoSlaComponent],
    template: `
        <app-page-header titulo="Pendências" subtitulo="Denúncias recebidas nos seus anúncios. Responda ou corrija dentro do prazo para evitar a suspensão do anúncio.">
            <p-selectbutton [options]="filtros" [(ngModel)]="abertas" (onChange)="carregar()" optionLabel="label" optionValue="value" [allowEmpty]="false" ariaLabel="Mostrar pendências" />
        </app-page-header>

        @if (!carregando() && grupos().length === 0) {
            <div class="card">
                <app-empty-state [titulo]="abertas ? 'Nenhuma pendência aberta' : 'Nenhuma denúncia recebida'" texto="Quando alguém denunciar um anúncio seu, ele aparece aqui e você recebe uma notificação." icone="pi-check-circle" />
            </div>
        }

        <div class="flex flex-col gap-4">
            @for (g of grupos(); track g.imovel.id) {
                <section class="card !mb-0" [attr.aria-labelledby]="'pend-' + g.imovel.id">
                    <div class="flex flex-col sm:flex-row gap-4">
                        <app-imovel-foto class="w-full sm:w-32 h-28 sm:h-24 rounded-border shrink-0" [src]="g.imovel.fotoCapa" [semente]="g.imovel.id" [alt]="g.imovel.titulo" [mostrarTexto]="false" />
                        <div class="flex-1 min-w-0">
                            <div class="flex flex-wrap items-center gap-2">
                                <h2 [id]="'pend-' + g.imovel.id" class="text-lg font-semibold m-0 truncate">{{ g.imovel.titulo }}</h2>
                                <app-status-tag [status]="g.imovel.status" />
                            </div>
                            <div class="text-sm text-muted-color">{{ g.imovel.codigo }} · {{ g.imovel.bairro }}, {{ g.imovel.cidade }}</div>
                            <div class="flex flex-wrap gap-3 mt-2 text-sm">
                                @if (g.aguardandoAnunciante) {
                                    <span class="font-semibold text-orange-700 dark:text-orange-300"><i class="pi pi-exclamation-circle" aria-hidden="true"></i> {{ g.aguardandoAnunciante }} aguardando sua resposta</span>
                                }
                                @if (g.emAnalise) {
                                    <span class="text-muted-color"><i class="pi pi-hourglass" aria-hidden="true"></i> {{ g.emAnalise }} em análise pela moderação</span>
                                }
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-2 sm:self-center sm:justify-end">
                            @if (g.imovel.status === 'ATIVO') {
                                <a [routerLink]="['/imovel', g.imovel.id, slug(g.imovel.titulo)]" target="_blank" rel="noopener" class="p-button p-button-sm p-button-text">
                                    <i class="pi pi-external-link mr-2" aria-hidden="true"></i>Ver no site<span class="sr-only"> (abre em nova aba)</span>
                                </a>
                            }
                            <a [routerLink]="['/conta/pendencias', g.imovel.id]" class="p-button p-button-sm" [class.p-button-outlined]="!g.aguardandoAnunciante">
                                {{ g.aguardandoAnunciante ? 'Ver e responder' : 'Ver detalhes' }}
                            </a>
                        </div>
                    </div>
                    <ul class="list-none m-0 mt-4 p-0 border-t border-surface">
                        @for (d of g.denuncias; track d.id) {
                            <li class="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 py-3 border-b border-surface last:border-b-0">
                                <div class="flex-1 min-w-0">
                                    <span class="font-medium">{{ d.tipo }}</span>
                                    <span class="text-xs text-muted-color ml-2">gravidade {{ d.gravidade.nome.toLowerCase() }}</span>
                                </div>
                                <p-tag [value]="statusDenuncia[d.status].label" [severity]="statusDenuncia[d.status].severity" />
                                <app-prazo-sla [prazo]="d.prazo" [status]="d.status" [compacto]="true" />
                            </li>
                        }
                    </ul>
                </section>
            }
        </div>
    `
})
export class PendenciasPage {
    private moderacao = inject(ModeracaoService);

    filtros = [
        { label: 'Abertas', value: true },
        { label: 'Todas', value: false }
    ];
    abertas = true;
    grupos = signal<GrupoPendencias[]>([]);
    carregando = signal(true);
    statusDenuncia = STATUS_DENUNCIA;
    slug = slug;

    constructor() {
        inject(ConfigService).definirTitulo('Pendências');
        this.carregar();
        // prazos andam: atualiza a cada minuto
        const t = setInterval(() => this.carregar(), 60_000);
        inject(DestroyRef).onDestroy(() => clearInterval(t));
        const id = inject(AuthService).usuario()?.id;
        if (id) {
            inject(RealtimeService)
                .ouvir(canalDoUsuario(id), 'pendencias.contador')
                .pipe(takeUntilDestroyed())
                .subscribe(() => this.carregar());
        }
    }

    carregar() {
        this.moderacao.pendencias(this.abertas).subscribe({
            next: (g) => {
                this.grupos.set(g);
                this.carregando.set(false);
            },
            error: () => this.carregando.set(false)
        });
        this.moderacao.atualizarContadorAnunciante();
    }
}
