import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { Subscription, merge, tap } from 'rxjs';
import { Denuncia, ImovelInfo, PendenciasImovel, correcaoPendente, denunciaAberta, situacaoDenuncia } from '@/app/core/models/models';
import { MembroSala, RealtimeService } from '@/app/core/services/realtime.service';
import { AuthService } from '@/app/core/services/auth.service';
import { PresencaSala } from '@/app/shared/components/presenca-sala';
import { aplicarDenuncia } from './pendencias-sync';
import { ModeracaoService } from '@/app/core/services/moderacao.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { PageHeader } from '@/app/shared/components/page-header';
import { ImovelFoto } from '@/app/shared/components/imovel-foto';
import { StatusTag } from '@/app/shared/components/status-tag';
import { PrazoSlaComponent } from '@/app/shared/components/prazo-sla';
import { ConversaDenuncia } from '@/app/shared/components/conversa-denuncia';
import { EditorTexto, htmlVazio } from '@/app/shared/components/editor-texto';
import { AnexosInput } from '@/app/shared/components/anexos-input';
import { DesfechoDenuncia } from '@/app/shared/components/desfecho-denuncia';
import { slug } from '@/app/core/pipes/formatos';

/**
 * Pendências de um anúncio (visão do anunciante): cada denúncia com o relato, o prazo e a conversa com a
 * moderação. O anunciante responde uma a uma ou várias de uma vez (ex.: "corrigi as fotos e o preço").
 */
@Component({
    selector: 'app-pendencias-imovel-page',
    imports: [
        RouterLink,
        DatePipe,
        FormsModule,
        TagModule,
        ButtonModule,
        TextareaModule,
        CheckboxModule,
        MessageModule,
        PageHeader,
        ImovelFoto,
        StatusTag,
        PrazoSlaComponent,
        ConversaDenuncia,
        PresencaSala,
        EditorTexto,
        AnexosInput,
        DesfechoDenuncia
    ],
    template: `
        <app-page-header titulo="Pendências do anúncio" subtitulo="Leia cada denúncia, corrija o anúncio se for o caso e envie a sua resposta para a moderação."> </app-page-header>
        <div class="-mt-4 mb-4"><app-presenca-sala [conectado]="realtime.conectado()" [outros]="outros()" [descrever]="descreverOutros" /></div>

        @if (dados(); as p) {
            <div class="card !mb-4 flex flex-col sm:flex-row gap-4 sm:items-center">
                <app-imovel-foto class="w-full sm:w-36 h-28 rounded-border shrink-0" [src]="p.imovel.fotoCapa" [semente]="p.imovel.id" [alt]="p.imovel.titulo" [mostrarTexto]="false" />
                <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                        <h2 class="text-xl font-semibold m-0">{{ p.imovel.titulo }}</h2>
                        <app-status-tag [status]="p.imovel.status" />
                    </div>
                    <div class="text-sm text-muted-color">{{ p.imovel.codigo }} · {{ p.imovel.bairro }}, {{ p.imovel.cidade }}</div>
                </div>
                <div class="flex flex-wrap gap-2 sm:justify-end">
                    @if (p.imovel.status === 'ATIVO') {
                        <a [routerLink]="['/imovel', p.imovel.id, slug(p.imovel.titulo)]" target="_blank" rel="noopener" class="p-button p-button-text">
                            <i class="pi pi-external-link mr-2" aria-hidden="true"></i>Ver no site<span class="sr-only"> (abre em nova aba)</span>
                        </a>
                    } @else {
                        <span class="text-sm text-muted-color self-center"
                            ><i class="pi pi-eye-slash mr-1" aria-hidden="true"></i>Fora do site enquanto {{ p.imovel.status === 'BANIDO' ? 'banido' : p.imovel.status === 'SUSPENSO' ? 'suspenso' : 'não estiver ativo' }}</span
                        >
                        <a [routerLink]="['/imovel', p.imovel.id, slug(p.imovel.titulo)]" target="_blank" rel="noopener" class="p-button p-button-text">
                            <i class="pi pi-eye mr-2" aria-hidden="true"></i>Ver prévia<span class="sr-only"> (abre em nova aba)</span>
                        </a>
                    }
                    @if (p.imovel.status !== 'BANIDO') {
                        <a [routerLink]="['/conta/anuncios', p.imovel.id]" class="p-button p-button-outlined"><i class="pi pi-pencil mr-2" aria-hidden="true"></i>Corrigir o anúncio</a>
                    }
                </div>
            </div>

            @if (p.imovel.status === 'SUSPENSO') {
                <p-message severity="warn" styleClass="mb-4 w-full">O anúncio está suspenso e fora da busca até a moderação aprovar a solução. Corrija o que foi apontado e responda às pendências.</p-message>
            } @else if (p.imovel.status === 'BANIDO') {
                <p-message severity="error" styleClass="mb-4 w-full">Este anúncio foi banido pela moderação e não aparece mais no site.</p-message>
            }

            @if (aguardando().length > 1) {
                <section class="card !mb-4" aria-labelledby="resp-varias">
                    <h3 id="resp-varias" class="text-base font-semibold mt-0 mb-2">Responder a várias de uma vez</h3>
                    <p class="text-sm text-muted-color mt-0">Útil quando uma única correção resolve mais de uma denúncia.</p>
                    <div class="flex flex-col gap-2 mb-3">
                        @for (d of aguardando(); track d.id) {
                            <label class="flex items-center gap-2 cursor-pointer">
                                <p-checkbox [binary]="true" [ngModel]="selecionadas().has(d.id)" (ngModelChange)="alternarSelecao(d.id, $event)" [inputId]="'sel-' + d.id" />
                                <span>{{ d.tipo.nome }}</span>
                            </label>
                        }
                    </div>
                    <app-editor-texto [(valor)]="textoGeral" rotulo="Resposta para as pendências selecionadas" placeholder="Explique o que foi feito ou por que a denúncia não procede" />
                    <app-anexos-input class="block mt-1" [(anexos)]="anexosGeral" />
                    <div class="flex justify-end mt-2">
                        <p-button label="Enviar para as selecionadas" icon="pi pi-send" [disabled]="vazio(textoGeral) || !selecionadas().size" [loading]="enviando() === -1" (onClick)="responder([...selecionadas()], textoGeral, -1)" />
                    </div>
                </section>
            }

            <div class="flex flex-col gap-4">
                @for (d of p.denuncias; track d.id) {
                    <article class="card !mb-0" [attr.aria-labelledby]="'den-' + d.id">
                        <header class="flex flex-col md:flex-row md:items-start gap-3 mb-3">
                            <div class="flex-1">
                                <div class="flex flex-wrap items-center gap-2">
                                    <h3 [id]="'den-' + d.id" class="text-lg font-semibold mb-0!">{{ d.tipo.nome }}</h3>
                                    <p-tag [value]="situacao(d).label" [severity]="situacao(d).severity" />
                                </div>
                                <div class="text-xs text-muted-color mt-1">Recebida em {{ d.criadoEm | date: 'dd/MM/yyyy HH:mm' }}</div>
                            </div>
                            <app-prazo-sla [prazo]="d.prazo" [status]="d.status" />
                        </header>

                        <div class="rounded-lg bg-emphasis p-3 mb-4">
                            <div class="text-xs font-semibold uppercase tracking-wide text-muted-color mb-1">O que foi relatado</div>
                            <p class="m-0 whitespace-pre-line">{{ d.descricao }}</p>
                        </div>

                        <!-- desfecho em destaque: encerrada ou procedente com correção solicitada -->
                        <app-desfecho-denuncia [denuncia]="d" [statusAnuncio]="p.imovel.status" visao="anunciante" />

                        <app-conversa-denuncia [mensagens]="d.mensagens" visao="anunciante" />

                        @if (aberta(d)) {
                            <div class="mt-4">
                                <span class="font-semibold block mb-1">{{ rotuloResposta(d) }}</span>
                                <app-editor-texto [(valor)]="textos[d.id]" [rotulo]="rotuloResposta(d)" [placeholder]="correcao(d) ? 'Conte o que foi corrigido no anúncio' : 'Explique o que foi corrigido ou por que a denúncia não procede'" />
                                <app-anexos-input class="block mt-1" [(anexos)]="anexos[d.id]" />
                                <div class="flex justify-between mt-2">
                                    <a routerLink="/conta/pendencias" class="p-button"><i class="pi pi-arrow-left mr-2" aria-hidden="true"></i>Voltar</a>
                                    <p-button label="Enviar resposta" icon="pi pi-send" [disabled]="vazio(textos[d.id])" [loading]="enviando() === d.id" (onClick)="responder([d.id], textos[d.id], d.id)" />
                                </div>
                            </div>
                        }
                    </article>
                }
            </div>
        }
    `
})
export class PendenciasImovelPage {
    private moderacao = inject(ModeracaoService);
    private msg = inject(MessageService);

    /** :imovelId da rota */
    imovelId = input.required<string>();

    realtime = inject(RealtimeService);
    private auth = inject(AuthService);
    dados = signal<PendenciasImovel | null>(null);
    private membros = signal<MembroSala[]>([]);
    outros = computed(() => this.membros().filter((m) => m.id !== this.auth.usuario()?.id));
    descreverOutros = (o: MembroSala[]) => (o.some((m) => m.perfil === 'ADMIN') ? 'a moderação está vendo esta página' : null);
    private sala: Subscription | null = null;
    enviando = signal<number | null>(null);
    selecionadas = signal<Set<number>>(new Set());
    textos: Record<number, string> = {};
    anexos: Record<number, string[]> = {};
    textoGeral = '';
    anexosGeral: string[] = [];
    vazio = htmlVazio;
    situacao = situacaoDenuncia;
    aberta = denunciaAberta;
    correcao = correcaoPendente;

    rotuloResposta(d: Denuncia) {
        if (d.status !== 'AGUARDANDO_ANUNCIANTE') return 'Complementar a resposta';
        return correcaoPendente(d) ? 'Informar a correção' : 'Sua resposta';
    }
    slug = slug;

    aguardando = computed<Denuncia[]>(() => (this.dados()?.denuncias ?? []).filter((d) => d.status === 'AGUARDANDO_ANUNCIANTE'));

    constructor() {
        inject(ConfigService).definirTitulo('Pendências do anúncio');
        effect(() => {
            this.imovelId();
            const id = Number(this.imovelId());
            untracked(() => {
                this.carregar();
                this.ouvirSala(id);
            });
        });
        const t = setInterval(() => this.carregar(), 60_000);
        inject(DestroyRef).onDestroy(() => {
            clearInterval(t);
            this.sala?.unsubscribe();
        });
    }

    /** Sala protegida do anúncio: denúncias e anúncio chegam prontos pelo socket, sem nova requisição. */
    private ouvirSala(imovelId: number) {
        this.sala?.unsubscribe();
        const canal = `presence-denuncias.imovel.${imovelId}`;
        this.sala = merge(
            this.realtime.ouvir<Denuncia>(canal, 'denuncia.atualizada').pipe(tap((d) => this.dados.update((p) => aplicarDenuncia(p, d)))),
            this.realtime.ouvir<ImovelInfo>(canal, 'imovel.atualizado').pipe(tap((i) => this.dados.update((p) => (p ? { ...p, imovel: i } : p)))),
            this.realtime.presenca(canal).pipe(tap((m) => this.membros.set(m)))
        ).subscribe();
    }

    carregar() {
        this.moderacao.pendenciasDoImovel(Number(this.imovelId())).subscribe({
            next: (p) => this.dados.set(p),
            error: (e) => this.msg.add({ severity: 'error', summary: 'Pendências', detail: mensagemErro(e) })
        });
    }

    alternarSelecao(id: number, marcado: boolean) {
        const s = new Set(this.selecionadas());
        marcado ? s.add(id) : s.delete(id);
        this.selecionadas.set(s);
    }

    responder(ids: number[], texto: string | undefined, chave: number) {
        if (htmlVazio(texto) || !ids.length) return;
        this.enviando.set(chave);
        const anexos = chave === -1 ? this.anexosGeral : (this.anexos[chave] ?? []);
        this.moderacao.responder(ids, texto!, anexos).subscribe({
            next: () => {
                this.enviando.set(null);
                ids.forEach((id) => {
                    delete this.textos[id];
                    delete this.anexos[id];
                });
                if (chave === -1) {
                    this.textoGeral = '';
                    this.anexosGeral = [];
                    this.selecionadas.set(new Set());
                }
                this.msg.add({ severity: 'success', summary: 'Resposta enviada', detail: 'A moderação vai analisar. O prazo fica parado enquanto isso.' });
                this.carregar();
            },
            error: (e) => {
                this.enviando.set(null);
                this.msg.add({ severity: 'error', summary: 'Não foi possível enviar', detail: mensagemErro(e) });
            }
        });
    }
}
