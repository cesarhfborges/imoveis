import { Component, computed, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { ImovelDetalhe, ImovelForm } from '@/app/core/models/models';
import { AreaGestao, GestaoAnunciosService } from '@/app/core/services/imovel.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatusTag } from '@/app/shared/components/status-tag';
import { ImovelFormComponent } from '@/app/shared/components/imovel-form';

/** Criar/editar anúncio (corretor: os próprios; admin: qualquer um). */
@Component({
    selector: 'app-anuncio-edicao-page',
    imports: [RouterLink, ButtonModule, MessageModule, PageHeader, StatusTag, ImovelFormComponent],
    template: `
        <app-page-header [titulo]="novo() ? 'Novo anúncio' : 'Editar anúncio'" [subtitulo]="atual()?.codigo ?? null">
            @if (atual(); as a) {
                <app-status-tag [status]="a.status" />
            }
            <p-button label="Voltar" icon="pi pi-arrow-left" severity="secondary" [outlined]="true" [routerLink]="base" />
        </app-page-header>
        @if (atual()?.status === 'PENDENTE') {
            <p-message severity="warn" styleClass="mb-4" text="Este anúncio aguarda aprovação da administração antes de aparecer no site." />
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
            },
            error: (e) => {
                this.salvando.set(false);
                this.msg.add({ severity: 'error', summary: 'Não foi possível salvar', detail: mensagemErro(e) });
            }
        });
    }
}
