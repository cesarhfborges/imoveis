import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ImovelDetalhe, ImovelForm, statusInfo, tituloAnuncio } from '@/app/core/models/models';
import { AreaGestao, GestaoAnunciosService } from '@/app/core/services/imovel.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { slug } from '@/app/core/pipes/formatos';
import { StatusTag } from '@/app/shared/components/status-tag';
import { ImovelFoto } from '@/app/shared/components/imovel-foto';
import { ImovelFormComponent } from '@/app/shared/components/imovel-form';

/** Criar/editar anúncio (corretor: os próprios; admin: qualquer um). */
@Component({
    selector: 'app-anuncio-edicao-page',
    imports: [DatePipe, DecimalPipe, RouterLink, ButtonModule, MessageModule, TooltipModule, StatusTag, ImovelFoto, ImovelFormComponent],
    template: `
        <nav aria-label="Caminho" class="text-sm text-muted-color mb-3 flex items-center gap-2">
            <a [routerLink]="base" class="hover:text-primary hover:underline">{{ area === 'admin' ? 'Todos os anúncios' : 'Meus anúncios' }}</a>
            <i class="pi pi-angle-right text-xs" aria-hidden="true"></i>
            <span aria-current="page">{{ novo() ? 'Novo anúncio' : 'Editar anúncio' }}</span>
        </nav>

        <!-- cabeçalho do anúncio -->
        <header class="card mb-6 p-4! md:p-5!">
            <div class="flex flex-col md:flex-row gap-4 md:items-center">
                @if (atual(); as a) {
                    <div class="w-full md:w-36 aspect-[4/3] rounded-border overflow-hidden shrink-0 bg-surface-100 dark:bg-surface-800">
                        <app-imovel-foto class="w-full h-full" [src]="a.fotos[0]?.url ?? null" [tipo]="a.tipo" [semente]="a.id" [alt]="'Capa do anúncio ' + a.codigo" [mostrarTexto]="false" />
                    </div>
                } @else {
                    <div class="hidden md:flex w-16 h-16 rounded-border items-center justify-center bg-primary-50 dark:bg-primary-400/10 text-primary shrink-0">
                        <i class="pi pi-plus text-2xl!" aria-hidden="true"></i>
                    </div>
                }
                <div class="min-w-0 grow flex flex-col gap-2">
                    <h1 class="text-2xl font-semibold m-0 leading-tight">{{ titulo() }}</h1>
                    @if (atual(); as a) {
                        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                            <app-status-tag [status]="a.status" />
                            <span class="inline-flex items-center gap-1 font-mono text-muted-color">
                                <i class="pi pi-hashtag text-xs" aria-hidden="true"></i>{{ a.codigo }}
                                <button type="button" class="text-muted-color hover:text-primary cursor-pointer bg-transparent border-0 p-1 rounded-border focus-visible:outline-2 focus-visible:outline-primary" (click)="copiarCodigo(a.codigo)" [attr.aria-label]="'Copiar código ' + a.codigo" pTooltip="Copiar código">
                                    <i class="pi pi-copy text-xs" aria-hidden="true"></i>
                                </button>
                            </span>
                            <span class="inline-flex items-center gap-1 text-muted-color"><i class="pi pi-eye text-xs" aria-hidden="true"></i> {{ a.visualizacoes | number }} visualizações</span>
                            <span class="inline-flex items-center gap-1 text-muted-color"><i class="pi pi-calendar text-xs" aria-hidden="true"></i> Criado em {{ a.criadoEm | date: 'dd/MM/yyyy' }}</span>
                            <span class="inline-flex items-center gap-1 text-muted-color"><i class="pi pi-history text-xs" aria-hidden="true"></i> Atualizado em {{ a.atualizadoEm | date: "dd/MM/yyyy 'às' HH:mm" }}</span>
                        </div>
                        <p class="text-sm text-muted-color m-0">{{ descricaoStatus() }}</p>
                    } @else {
                        <p class="text-muted-color m-0">Preencha os dados abaixo. O painel ao lado mostra como o anúncio vai aparecer e o que falta para ele ficar completo.</p>
                    }
                </div>
                <div class="flex flex-wrap gap-2 md:flex-col md:items-stretch shrink-0">
                    @if (atual(); as a) {
                        @if (a.status === 'ATIVO') {
                            <a [href]="linkSite()" target="_blank" rel="noopener" class="p-button p-button-outlined justify-center gap-2"><i class="pi pi-external-link" aria-hidden="true"></i> Ver no site</a>
                        }
                    }
                    <p-button label="Voltar" icon="pi pi-arrow-left" severity="secondary" [text]="true" [routerLink]="base" />
                </div>
            </div>
        </header>

        @if (atual()?.status === 'PENDENTE') {
            <p-message severity="warn" icon="pi pi-clock" styleClass="mb-6" text="Este anúncio aguarda aprovação da administração antes de aparecer no site." />
        }
        @if (novo() || atual()) {
            <app-imovel-form [valor]="atual()" [salvando]="salvando()" [rotuloSalvar]="novo() ? 'Publicar anúncio' : 'Salvar alterações'" (salvar)="salvar($event)">
                <p-button label="Cancelar" severity="secondary" [text]="true" [routerLink]="base" />
            </app-imovel-form>
        }
    `
})
export class AnuncioEdicaoPage {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private gestao = inject(GestaoAnunciosService);
    private msg = inject(MessageService);

    /** :id da rota (ausente em "novo"). */
    id = input<string | undefined>(undefined);

    area: AreaGestao = this.route.snapshot.data['area'];
    base = this.area === 'admin' ? '/admin/anuncios' : '/conta/anuncios';
    novo = computed(() => !this.id());
    atual = signal<ImovelDetalhe | null>(null);
    salvando = signal(false);

    titulo = computed(() => {
        const a = this.atual();
        if (!a) return 'Novo anúncio';
        return tituloAnuncio(a) || a.titulo;
    });
    descricaoStatus = computed(() => {
        const s = this.atual()?.status;
        if (!s) return '';
        const textos: Partial<Record<string, string>> = {
            ATIVO: 'No ar: aparece na busca e pode receber contatos.',
            PENDENTE: 'Aguardando aprovação: ainda não aparece no site.',
            PAUSADO: 'Pausado: fora do site até você reativar.',
            CONCLUIDO: 'Concluído: o negócio foi fechado e o anúncio saiu do site.'
        };
        return textos[s] ?? statusInfo(s).label;
    });
    linkSite = computed(() => {
        const a = this.atual();
        return a ? `/imovel/${a.id}/${slug(a.titulo)}` : '';
    });

    constructor() {
        inject(ConfigService).definirTitulo('Anúncio');
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.gestao.obter(this.area, Number(id)).subscribe({
                next: (i) => this.atual.set(i),
                error: (e) => {
                    this.msg.add({ severity: 'error', summary: 'Anúncio', detail: mensagemErro(e) });
                    this.router.navigateByUrl(this.base);
                }
            });
        }
    }

    copiarCodigo(codigo: string) {
        navigator.clipboard?.writeText(codigo).then(() => this.msg.add({ severity: 'success', summary: 'Código copiado', detail: codigo }));
    }

    salvar(form: ImovelForm) {
        this.salvando.set(true);
        const a = this.atual();
        const req = a ? this.gestao.atualizar(this.area, a.id, form) : this.gestao.criar(this.area, form);
        req.subscribe({
            next: (i) => {
                this.salvando.set(false);
                this.msg.add({
                    severity: 'success',
                    summary: a ? 'Anúncio salvo' : 'Anúncio publicado',
                    detail: i.status === 'PENDENTE' ? 'Ele aparecerá no site após a aprovação.' : undefined
                });
                if (a) {
                    this.atual.set(i);
                } else {
                    // segue para a edição do anúncio criado (evita publicar de novo e duplicar)
                    this.router.navigate([this.base, i.id], { replaceUrl: true });
                }
            },
            error: (e) => {
                this.salvando.set(false);
                this.msg.add({ severity: 'error', summary: 'Não foi possível salvar', detail: mensagemErro(e) });
            }
        });
    }
}
