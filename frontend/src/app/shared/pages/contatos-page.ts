import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { Contato, ImovelDetalhe, PageResponse } from '@/app/core/models/models';
import { AreaGestao, GestaoAnunciosService } from '@/app/core/services/imovel.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { AuthService } from '@/app/core/services/auth.service';
import { slug } from '@/app/core/pipes/formatos';
import { PageHeader } from '@/app/shared/components/page-header';
import { DadosResposta, respostaEmail, respostaWhatsapp } from './contato-resposta';

/**
 * Mensagens recebidas pelos anúncios (corretor: as suas; admin: todas).
 * A tabela mostra um resumo; clicar na linha (ou em "Ver detalhes") abre uma modal com
 * o contato completo, atalhos para responder (e-mail, telefone, WhatsApp) e navegação
 * entre os contatos da página. Abrir um contato não lido marca-o como lido.
 */
@Component({
    selector: 'app-contatos-page',
    imports: [RouterLink, DatePipe, TableModule, ButtonModule, TagModule, DialogModule, TooltipModule, PageHeader],
    template: `
        <app-page-header titulo="Contatos recebidos" subtitulo="Pessoas interessadas que escreveram pelo site." />
        <div class="card">
            <p-table
                [value]="pagina().content"
                [lazy]="true"
                [paginator]="true"
                [rows]="20"
                [totalRecords]="pagina().totalElements"
                [loading]="carregando()"
                (onLazyLoad)="carregar($event)"
                dataKey="id"
                [rowHover]="true"
                [tableStyle]="{ 'min-width': '50rem' }"
            >
                <ng-template #header>
                    <tr>
                        <th scope="col" class="w-8"><span class="sr-only">Situação</span></th>
                        <th scope="col">Quando</th>
                        <th scope="col">Interessado</th>
                        <th scope="col">Imóvel</th>
                        <th scope="col">Mensagem</th>
                        <th scope="col"><span class="sr-only">Ações</span></th>
                    </tr>
                </ng-template>
                <ng-template #body let-c>
                    <tr class="cursor-pointer" [class.font-semibold]="!c.lido" (click)="abrir(c)">
                        <td>
                            @if (!c.lido) {
                                <span class="block w-2.5 h-2.5 rounded-full bg-primary" title="Não lido"></span>
                                <span class="sr-only">Não lido</span>
                            }
                        </td>
                        <td class="whitespace-nowrap">{{ c.criadoEm | date: 'dd/MM/yy HH:mm' }}</td>
                        <td>
                            <div>{{ c.nome }}</div>
                            <div class="text-sm font-normal text-muted-color">{{ c.email }}</div>
                        </td>
                        <td>
                            <div class="line-clamp-1">{{ c.imovelTitulo }}</div>
                            <div class="text-xs text-muted-color font-normal">{{ c.imovelCodigo }}</div>
                        </td>
                        <td class="font-normal max-w-[28rem]">
                            <span class="line-clamp-2 text-muted-color">{{ c.mensagem }}</span>
                        </td>
                        <td class="text-right whitespace-nowrap" (click)="$event.stopPropagation()">
                            <p-button icon="pi pi-eye" [text]="true" [rounded]="true" (onClick)="abrir(c)" ariaLabel="Ver detalhes" pTooltip="Ver detalhes" tooltipPosition="top" />
                            <p-button
                                [icon]="c.lido ? 'pi pi-envelope' : 'pi pi-check'"
                                [text]="true"
                                [rounded]="true"
                                severity="secondary"
                                (onClick)="alternar(c)"
                                [ariaLabel]="c.lido ? 'Marcar como não lido' : 'Marcar como lido'"
                                [pTooltip]="c.lido ? 'Marcar como não lido' : 'Marcar como lido'"
                                tooltipPosition="top"
                            />
                        </td>
                    </tr>
                </ng-template>
                <ng-template #emptymessage>
                    <tr>
                        <td colspan="6" class="text-center py-8 text-muted-color">Nenhum contato recebido ainda.</td>
                    </tr>
                </ng-template>
            </p-table>
        </div>

        <p-dialog [visible]="!!selecionado()" (visibleChange)="!$event && fechar()" [modal]="true" [dismissableMask]="true" [draggable]="false" [style]="{ width: '40rem' }" [breakpoints]="{ '640px': '96vw' }">
            <ng-template #header>
                @if (selecionado(); as c) {
                    <div class="flex items-center gap-3 min-w-0">
                        <span class="inline-flex items-center justify-center w-11 h-11 rounded-full bg-primary text-primary-contrast font-bold shrink-0" aria-hidden="true">{{ iniciais(c.nome) }}</span>
                        <div class="min-w-0">
                            <div class="font-semibold text-lg truncate">{{ c.nome }}</div>
                            <div class="text-sm text-muted-color">Recebido em {{ c.criadoEm | date: "dd/MM/yyyy 'às' HH:mm" }}</div>
                        </div>
                    </div>
                }
            </ng-template>

            @if (selecionado(); as c) {
                <div class="flex flex-col gap-5">
                    <section aria-label="Dados do interessado" class="grid gap-2 sm:grid-cols-2">
                        <a [href]="'mailto:' + c.email" class="flex items-center gap-3 p-3 rounded-lg border border-surface hover:bg-emphasis transition-colors min-w-0">
                            <i class="pi pi-envelope text-primary" aria-hidden="true"></i>
                            <span class="min-w-0">
                                <span class="block text-xs text-muted-color">E-mail</span>
                                <span class="block truncate">{{ c.email }}</span>
                            </span>
                        </a>
                        @if (c.telefone) {
                            <a [href]="'tel:' + digitos(c.telefone)" class="flex items-center gap-3 p-3 rounded-lg border border-surface hover:bg-emphasis transition-colors">
                                <i class="pi pi-phone text-primary" aria-hidden="true"></i>
                                <span>
                                    <span class="block text-xs text-muted-color">Telefone</span>
                                    <span class="block">{{ c.telefone }}</span>
                                </span>
                            </a>
                        } @else {
                            <div class="flex items-center gap-3 p-3 rounded-lg border border-dashed border-surface text-muted-color">
                                <i class="pi pi-phone" aria-hidden="true"></i>
                                <span class="text-sm">Telefone não informado</span>
                            </div>
                        }
                    </section>

                    <section aria-label="Imóvel">
                        <div class="text-xs font-semibold uppercase tracking-wide text-muted-color mb-2">Imóvel de interesse</div>
                        <div class="flex items-center gap-3 p-3 rounded-lg bg-emphasis">
                            <i class="pi pi-building text-xl text-primary" aria-hidden="true"></i>
                            <div class="min-w-0 flex-1">
                                <div class="font-medium truncate">{{ c.imovelTitulo }}</div>
                                <div class="text-sm text-muted-color">Código {{ c.imovelCodigo }}</div>
                            </div>
                            <a [routerLink]="['/imovel', c.imovelId, slugImovel(c)]" target="_blank" class="text-primary text-sm font-medium whitespace-nowrap hover:underline">
                                Ver anúncio <i class="pi pi-external-link text-xs" aria-hidden="true"></i>
                            </a>
                        </div>
                    </section>

                    <section aria-label="Mensagem">
                        <div class="text-xs font-semibold uppercase tracking-wide text-muted-color mb-2">Mensagem</div>
                        <p class="m-0 p-4 rounded-lg border border-surface whitespace-pre-line leading-relaxed">{{ c.mensagem }}</p>
                    </section>

                    <section aria-label="Responder" class="flex flex-wrap gap-2">
                        <p-button label="Responder por e-mail" icon="pi pi-reply" [loading]="carregandoImovel()" (onClick)="responderEmail(c)" />
                        @if (numeroWhatsapp(c)) {
                            <p-button label="WhatsApp" icon="pi pi-whatsapp" severity="success" [outlined]="true" [loading]="carregandoImovel()" (onClick)="responderWhatsapp(c)" />
                        }
                        <p-button label="Copiar dados" icon="pi pi-copy" [outlined]="true" severity="secondary" (onClick)="copiar(c)" />
                    </section>
                </div>
            }

            <ng-template #footer>
                @if (selecionado(); as c) {
                    <div class="flex flex-wrap items-center gap-2 w-full">
                        <p-button [label]="c.lido ? 'Marcar como não lido' : 'Marcar como lido'" [icon]="c.lido ? 'pi pi-envelope' : 'pi pi-check'" [text]="true" severity="secondary" (onClick)="alternar(c)" />
                        <span class="flex-1"></span>
                        <span class="text-sm text-muted-color">{{ posicao() + 1 }} de {{ pagina().content.length }}</span>
                        <p-button icon="pi pi-chevron-left" [text]="true" [rounded]="true" severity="secondary" [disabled]="posicao() <= 0" (onClick)="navegar(-1)" ariaLabel="Contato anterior" />
                        <p-button icon="pi pi-chevron-right" [text]="true" [rounded]="true" severity="secondary" [disabled]="posicao() >= pagina().content.length - 1" (onClick)="navegar(1)" ariaLabel="Próximo contato" />
                    </div>
                }
            </ng-template>
        </p-dialog>
    `
})
export class ContatosPage {
    private route = inject(ActivatedRoute);
    private gestao = inject(GestaoAnunciosService);
    private msg = inject(MessageService);
    private config = inject(ConfigService);
    private auth = inject(AuthService);

    area: AreaGestao = this.route.snapshot.data['area'];
    pagina = signal<PageResponse<Contato>>({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    carregando = signal(false);
    private ultimo: TableLazyLoadEvent = { first: 0, rows: 20 };

    /** id do contato aberto na modal; o objeto vem sempre da página atual (fica em dia ao marcar lido). */
    private selecionadoId = signal<number | null>(null);
    selecionado = computed(() => this.pagina().content.find((c) => c.id === this.selecionadoId()) ?? null);
    posicao = computed(() => this.pagina().content.findIndex((c) => c.id === this.selecionadoId()));

    /** Detalhes dos imóveis já buscados (para montar as respostas com preço, ficha e link). */
    private imoveis = signal<Record<number, ImovelDetalhe>>({});
    carregandoImovel = signal(false);

    constructor() {
        this.config.definirTitulo('Contatos');
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

    abrir(c: Contato) {
        this.selecionadoId.set(c.id);
        if (!c.lido) this.definirLido(c, true);
        this.buscarImovel(c.imovelId);
    }

    fechar() {
        this.selecionadoId.set(null);
    }

    navegar(passo: number) {
        const c = this.pagina().content[this.posicao() + passo];
        if (c) this.abrir(c);
    }

    alternar(c: Contato) {
        this.definirLido(c, !c.lido);
    }

    /** Atualiza na hora (otimista) e desfaz se a API recusar. */
    private definirLido(c: Contato, lido: boolean) {
        this.atualizarLocal(c.id, lido);
        this.gestao.marcarLido(this.area, c.id, lido).subscribe({
            error: (e) => {
                this.atualizarLocal(c.id, !lido);
                this.msg.add({ severity: 'error', summary: 'Erro', detail: mensagemErro(e) });
            }
        });
    }

    private atualizarLocal(id: number, lido: boolean) {
        this.pagina.update((p) => ({ ...p, content: p.content.map((x) => (x.id === id ? { ...x, lido } : x)) }));
    }

    iniciais(nome: string) {
        const partes = nome.trim().split(/\s+/).filter(Boolean);
        return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase() || '?';
    }

    digitos(tel: string) {
        return tel.replace(/\D/g, '');
    }

    private buscarImovel(id: number) {
        if (this.imoveis()[id]) return;
        this.carregandoImovel.set(true);
        this.gestao.obter(this.area, id).subscribe({
            next: (i) => {
                this.imoveis.update((m) => ({ ...m, [id]: i }));
                this.carregandoImovel.set(false);
            },
            // sem os detalhes a resposta sai só com título, código e link
            error: () => this.carregandoImovel.set(false)
        });
    }

    slugImovel(c: Contato) {
        return slug(this.imoveis()[c.imovelId]?.titulo ?? c.imovelTitulo);
    }

    private dadosResposta(c: Contato): DadosResposta {
        return {
            contato: c,
            imovel: this.imoveis()[c.imovelId] ?? null,
            link: `${window.location.origin}/imovel/${c.imovelId}/${this.slugImovel(c)}`,
            site: this.config.config().nomeApp,
            assinatura: this.auth.usuario()?.nome ?? ''
        };
    }

    /** Número no formato do wa.me (assume Brasil quando vem sem DDI). */
    numeroWhatsapp(c: Contato): string | null {
        if (!c.telefone) return null;
        const n = this.digitos(c.telefone);
        if (n.length < 10) return null;
        return n.length <= 11 ? '55' + n : n;
    }

    responderWhatsapp(c: Contato) {
        const n = this.numeroWhatsapp(c);
        if (!n) return;
        const texto = respostaWhatsapp(this.dadosResposta(c));
        window.open(`https://wa.me/${n}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    }

    responderEmail(c: Contato) {
        const { assunto, corpo } = respostaEmail(this.dadosResposta(c));
        window.location.href = `mailto:${c.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    }

    copiar(c: Contato) {
        const texto = [`Nome: ${c.nome}`, `E-mail: ${c.email}`, c.telefone ? `Telefone: ${c.telefone}` : null, `Imóvel: ${c.imovelTitulo} (${c.imovelCodigo})`, '', c.mensagem].filter((l) => l !== null).join('\n');
        navigator.clipboard.writeText(texto).then(
            () => this.msg.add({ severity: 'success', summary: 'Copiado', detail: 'Dados do contato copiados.' }),
            () => this.msg.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível copiar.' })
        );
    }
}
