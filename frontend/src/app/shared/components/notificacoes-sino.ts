import { Component, computed, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Popover, PopoverModule } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { Notificacao } from '@/app/core/models/models';
import { NotificacaoService } from '@/app/core/services/notificacao.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { TempoRelativoPipe } from '@/app/core/pipes/formatos';

/**
 * Sino de notificações (menu superior do painel e cabeçalho do site, para quem está logado).
 * Clicar numa notificação marca como lida e abre o link; apagar remove só a notificação.
 */
@Component({
    selector: 'app-notificacoes-sino',
    imports: [PopoverModule, ButtonModule, TempoRelativoPipe],
    template: `
        <button type="button" [class]="'relative ' + botaoClasse()" (click)="alternar($event)" [attr.aria-label]="rotulo()" aria-haspopup="dialog" [attr.aria-expanded]="aberto()">
            <i class="pi pi-bell" [class.sino-tocando]="tocando()" aria-hidden="true"></i>
            @if (servico.naoLidas() > 0) {
                <span
                    class="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-red-700 text-white text-[0.68rem] font-bold leading-none ring-2 ring-[var(--p-content-background)]"
                    aria-hidden="true"
                >
                    {{ servico.naoLidas() > 99 ? '99+' : servico.naoLidas() }}
                </span>
            }
        </button>

        <p-popover #painel (onShow)="aoAbrir()" (onHide)="aberto.set(false)" appendTo="body" [style]="{ width: '24rem', maxWidth: 'calc(100vw - 1.5rem)' }">
            <div role="dialog" aria-label="Notificações" class="flex flex-col -m-1">
                <div class="flex items-center justify-between gap-2 px-1 pb-2">
                    <h2 class="m-0 text-base font-semibold">Notificações</h2>
                    <div class="flex items-center gap-1">
                        <p-button label="Ler todas" icon="pi pi-check" [text]="true" size="small" [disabled]="!servico.naoLidas()" (onClick)="lerTodas()" />
                        <p-button icon="pi pi-trash" [text]="true" size="small" severity="secondary" ariaLabel="Apagar as notificações lidas" (onClick)="limparLidas()" [disabled]="!temLidas()" />
                    </div>
                </div>
                <div class="flex gap-1 px-1 pb-2" role="group" aria-label="Filtro">
                    <button type="button" class="text-sm px-3 py-1 rounded-full border border-surface" [class.bg-primary]="!soNaoLidas()" [class.text-primary-contrast]="!soNaoLidas()" [attr.aria-pressed]="!soNaoLidas()" (click)="filtrar(false)">
                        Todas
                    </button>
                    <button type="button" class="text-sm px-3 py-1 rounded-full border border-surface" [class.bg-primary]="soNaoLidas()" [class.text-primary-contrast]="soNaoLidas()" [attr.aria-pressed]="soNaoLidas()" (click)="filtrar(true)">
                        Não lidas{{ servico.naoLidas() ? ' (' + servico.naoLidas() + ')' : '' }}
                    </button>
                </div>

                <ul class="list-none m-0 p-0 max-h-[26rem] overflow-y-auto border-t border-surface" aria-live="polite">
                    @for (n of itens(); track n.id) {
                        <li class="flex items-start gap-1 border-b border-surface">
                            <button type="button" class="flex-1 min-w-0 flex items-start gap-3 text-left p-3 hover:bg-emphasis rounded-md cursor-pointer" (click)="abrirItem(n)">
                                <span class="inline-flex items-center justify-center w-9 h-9 rounded-full shrink-0" [class.bg-primary]="!n.lida" [class.text-primary-contrast]="!n.lida" [class.bg-emphasis]="n.lida" aria-hidden="true">
                                    <i class="pi {{ n.icone || 'pi-bell' }}"></i>
                                </span>
                                <span class="min-w-0 flex-1">
                                    <span class="block text-sm" [class.font-semibold]="!n.lida">{{ n.titulo }}</span>
                                    @if (n.mensagem) {
                                        <span class="block text-sm text-muted-color line-clamp-2">{{ n.mensagem }}</span>
                                    }
                                    <span class="block text-xs text-muted-color mt-1">{{ n.criadoEm | tempoRelativo }}{{ n.lida ? '' : ' · não lida' }}</span>
                                </span>
                            </button>
                            <p-button icon="pi pi-times" [text]="true" [rounded]="true" size="small" severity="secondary" styleClass="mt-2" [ariaLabel]="'Apagar a notificação: ' + n.titulo" (onClick)="apagar(n)" />
                        </li>
                    } @empty {
                        <li class="text-center text-muted-color text-sm py-8">
                            @if (carregando()) {
                                Carregando...
                            } @else {
                                <i class="pi pi-bell-slash block text-2xl mb-2" aria-hidden="true"></i>
                                {{ soNaoLidas() ? 'Nenhuma notificação não lida.' : 'Nenhuma notificação por aqui.' }}
                            }
                        </li>
                    }
                </ul>
                @if (temMais()) {
                    <p-button label="Carregar mais" [text]="true" size="small" styleClass="w-full mt-1" [loading]="carregando()" (onClick)="carregar(pagina() + 1)" />
                }
            </div>
        </p-popover>
    `,
    styles: `
        .sino-tocando {
            display: inline-block;
            animation: sino-tocar 0.9s ease-in-out;
            transform-origin: 50% 0;
        }
        @keyframes sino-tocar {
            0%,
            100% {
                transform: rotate(0);
            }
            15% {
                transform: rotate(16deg);
            }
            30% {
                transform: rotate(-14deg);
            }
            45% {
                transform: rotate(10deg);
            }
            60% {
                transform: rotate(-6deg);
            }
            75% {
                transform: rotate(3deg);
            }
        }
        @media (prefers-reduced-motion: reduce) {
            .sino-tocando {
                animation: none;
            }
        }
    `
})
export class NotificacoesSino {
    servico = inject(NotificacaoService);
    private router = inject(Router);
    private msg = inject(MessageService);

    /** Classes do botão (cada cabeçalho tem o seu estilo). */
    botaoClasse = input('');

    painel = viewChild.required<Popover>('painel');
    itens = signal<Notificacao[]>([]);
    pagina = signal(0);
    temMais = signal(false);
    carregando = signal(false);
    soNaoLidas = signal(false);
    aberto = signal(false);

    temLidas = computed(() => this.itens().some((n) => n.lida));
    tocando = signal(false);

    constructor() {
        // notificação nova pelo socket: entra no topo da lista (sem nova requisição), o sino balança e aparece um aviso
        this.servico.novas$.pipe(takeUntilDestroyed()).subscribe((n) => {
            this.itens.update((l) => [n, ...l.filter((x) => x.id !== n.id)].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)));
            this.tocando.set(false);
            setTimeout(() => this.tocando.set(true));
            setTimeout(() => this.tocando.set(false), 1000);
            if (!this.aberto()) {
                this.msg.add({ severity: 'info', summary: n.titulo, detail: n.mensagem ?? undefined, life: 5000 });
            }
        });
    }

    rotulo = computed(() => (this.servico.naoLidas() ? `Notificações: ${this.servico.naoLidas()} não lidas` : 'Notificações'));

    alternar(e: Event) {
        this.painel().toggle(e);
    }

    aoAbrir() {
        this.aberto.set(true);
        this.carregar(0);
        this.servico.atualizarContador();
    }

    filtrar(soNaoLidas: boolean) {
        this.soNaoLidas.set(soNaoLidas);
        this.carregar(0);
    }

    carregar(pagina: number) {
        this.carregando.set(true);
        this.servico.listar(pagina, 15, this.soNaoLidas()).subscribe({
            next: (p) => {
                this.itens.set(pagina === 0 ? p.content : [...this.itens(), ...p.content]);
                this.pagina.set(p.page);
                this.temMais.set(p.page + 1 < p.totalPages);
                this.carregando.set(false);
            },
            error: () => this.carregando.set(false)
        });
    }

    abrirItem(n: Notificacao) {
        this.servico.abrir(n.id).subscribe({
            next: () => {
                this.itens.update((l) => l.map((x) => (x.id === n.id ? { ...x, lida: true } : x)));
                if (n.link) {
                    this.painel().hide();
                    this.router.navigateByUrl(n.link);
                }
            },
            error: (e) => this.msg.add({ severity: 'error', summary: 'Notificações', detail: mensagemErro(e) })
        });
    }

    apagar(n: Notificacao) {
        this.servico.apagar(n.id).subscribe({
            next: () => this.itens.update((l) => l.filter((x) => x.id !== n.id)),
            error: (e) => this.msg.add({ severity: 'error', summary: 'Notificações', detail: mensagemErro(e) })
        });
    }

    lerTodas() {
        this.servico.marcarTodasLidas().subscribe(() => this.itens.update((l) => l.map((x) => ({ ...x, lida: true }))));
    }

    limparLidas() {
        this.servico.apagarLidas().subscribe(() => this.carregar(0));
    }
}
