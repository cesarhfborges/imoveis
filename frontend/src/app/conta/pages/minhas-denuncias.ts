import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { MinhaDenuncia } from '@/app/core/models/models';
import { ModeracaoService } from '@/app/core/services/moderacao.service';
import { ConfigService } from '@/app/core/services/config.service';
import { slug } from '@/app/core/pipes/formatos';
import { PageHeader } from '@/app/shared/components/page-header';
import { EmptyState } from '@/app/shared/components/empty-state';
import { ImovelFoto } from '@/app/shared/components/imovel-foto';

/** O denunciante só acompanha se está em análise ou resolvida (o desfecho não é informado). */
const SITUACOES: Record<MinhaDenuncia['situacao'], { label: string; severity: 'info' | 'success'; texto: string }> = {
    EM_ANALISE: { label: 'Em análise', severity: 'info', texto: 'A denúncia foi recebida e está sendo analisada pela moderação.' },
    RESOLVIDA: { label: 'Resolvida', severity: 'success', texto: 'A moderação analisou e encerrou a denúncia. Obrigado por ajudar.' }
};

/** Denúncias feitas pelo usuário: só a situação (em solução, resolvida ou anúncio banido). */
@Component({
    selector: 'app-minhas-denuncias-page',
    imports: [RouterLink, DatePipe, TagModule, PageHeader, EmptyState, ImovelFoto],
    template: `
        <app-page-header titulo="Minhas denúncias" subtitulo="Acompanhe as denúncias que você fez sobre anúncios." />
        @if (!carregando() && lista().length === 0) {
            <div class="card">
                <app-empty-state titulo="Nenhuma denúncia" texto="Viu um anúncio falso, com fotos de outro imóvel ou com informações erradas? Use o link “Denunciar anúncio” na página do imóvel." icone="pi-flag" />
            </div>
        } @else {
            <ul class="list-none m-0 p-0 flex flex-col gap-3">
                @for (d of lista(); track d.id) {
                    <li class="card !mb-0 !p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                        <app-imovel-foto class="w-full sm:w-28 h-24 sm:h-20 rounded-border shrink-0" [src]="d.imovel?.fotoCapa ?? null" [semente]="d.imovel?.id ?? 1" [alt]="d.imovel?.titulo ?? 'Anúncio'" [mostrarTexto]="false" />
                        <div class="flex-1 min-w-0">
                            <div class="flex flex-wrap items-center gap-2 mb-1">
                                <p-tag [value]="situacao(d).label" [severity]="situacao(d).severity" />
                                <span class="text-sm text-muted-color">{{ d.tipo }}</span>
                            </div>
                            @if (d.imovel; as i) {
                                @if (i.status === 'ATIVO') {
                                    <a [routerLink]="['/imovel', i.id, slug(i.titulo)]" class="font-semibold hover:underline block truncate">{{ i.titulo }}</a>
                                } @else {
                                    <span class="font-semibold block truncate">{{ i.titulo }}</span>
                                }
                                <div class="text-xs text-muted-color">{{ i.codigo }} · {{ i.bairro }}, {{ i.cidade }}</div>
                            }
                            <p class="text-sm text-muted-color mt-2 mb-0">{{ situacao(d).texto }}</p>
                        </div>
                        <div class="text-sm text-muted-color sm:text-right whitespace-nowrap">
                            <div>Enviada em {{ d.criadoEm | date: 'dd/MM/yyyy' }}</div>
                            @if (d.resolvidoEm) {
                                <div>Encerrada em {{ d.resolvidoEm | date: 'dd/MM/yyyy' }}</div>
                            }
                        </div>
                    </li>
                }
            </ul>
        }
    `
})
export class MinhasDenunciasPage {
    private moderacao = inject(ModeracaoService);
    lista = signal<MinhaDenuncia[]>([]);
    carregando = signal(true);
    slug = slug;

    constructor() {
        inject(ConfigService).definirTitulo('Minhas denúncias');
        this.moderacao.minhas().subscribe({
            next: (l) => {
                this.lista.set(l);
                this.carregando.set(false);
            },
            error: () => this.carregando.set(false)
        });
    }

    situacao(d: MinhaDenuncia) {
        return SITUACOES[d.situacao];
    }
}
