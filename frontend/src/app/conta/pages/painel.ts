import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EMPTY, catchError, of, switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@/app/core/services/auth.service';
import { ContaService } from '@/app/core/services/conta.service';
import { GestaoAnunciosService } from '@/app/core/services/imovel.service';
import { ConfigService } from '@/app/core/services/config.service';
import { ClientePainel, EstatisticasAnuncios, ImovelResumo, PeriodoPainel, Usuario, perfilLabel } from '@/app/core/models/models';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { PainelGraficos } from '@/app/shared/components/painel/painel-graficos';
import { PeriodoSelect } from '@/app/shared/components/painel/periodo-select';
import { PainelCliente } from '@/app/conta/components/painel-cliente';

/** Início da conta: atalhos de cliente e, para corretores, os números dos anúncios. */
@Component({
    selector: 'app-painel-conta-page',
    imports: [RouterLink, ButtonModule, PageHeader, StatCard, PainelGraficos, PeriodoSelect, PainelCliente],
    template: `
        <app-page-header [titulo]="'Olá, ' + primeiroNome() + '!'" [subtitulo]="'Você está como ' + perfil() + '.'">
            @if (auth.isCorretor()) {
                <app-periodo-select [(periodo)]="periodo" />
                <p-button label="Novo anúncio" icon="pi pi-plus" routerLink="/conta/anuncios/novo" />
            } @else {
                <p-button label="Buscar imóveis" icon="pi pi-search" routerLink="/venda" />
            }
        </app-page-header>

        <div class="grid grid-cols-12 gap-6">
            <!-- no perfil cliente, o card de favoritos fica junto dos cards do painel do cliente -->
            @if (auth.perfil() !== 'CLIENTE') {
                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                    <app-stat-card titulo="Favoritos" [valor]="conta.favoritos().size" icone="pi-heart" cor="bg-pink-100 dark:bg-pink-400/10 text-pink-500" detalhe="Ver favoritos" link="/conta/favoritos" />
                </div>
            }
            @if (est(); as e) {
                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                    <app-stat-card titulo="Anúncios ativos" [valor]="e.ativos + ' de ' + e.total" icone="pi-building" detalhe="Gerenciar anúncios" link="/conta/anuncios" />
                </div>
                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                    <app-stat-card titulo="Visualizações" [valor]="e.visualizacoes" icone="pi-eye" cor="bg-cyan-100 dark:bg-cyan-400/10 text-cyan-500" />
                </div>
                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                    <app-stat-card titulo="Contatos não lidos" [valor]="e.contatosNaoLidos" icone="pi-inbox" cor="bg-orange-100 dark:bg-orange-400/10 text-orange-500" detalhe="Abrir contatos" link="/conta/contatos" />
                </div>
            }
        </div>

        @if (painelCliente(); as pc) {
            <div>
                <app-painel-cliente [painel]="pc" [usuario]="usuario()" [favoritos]="favoritosLista()" />
            </div>
        }

        @if (painel(); as p) {
            <h2 class="text-xl font-semibold mt-8 mb-4">Desempenho dos seus anúncios</h2>
            <app-painel-graficos [painel]="p" area="corretor" />
        }

        <div class="card mt-6">
            <h2 class="text-lg font-semibold mt-0">Seus perfis de acesso</h2>
            <p class="text-muted-color">
                Com esta conta você pode entrar como: <strong>{{ perfisTexto() }}</strong>. Use o menu do usuário, no topo, para trocar entre cliente e corretor.
            </p>
            @if (!auth.sessao().perfisDisponiveis.includes('CORRETOR')) {
                <p class="mb-0">É corretor ou imobiliária? <a routerLink="/anunciar" class="text-primary font-semibold hover:underline">Saiba como anunciar</a>.</p>
            }
        </div>
    `
})
export class PainelContaPage {
    auth = inject(AuthService);
    conta = inject(ContaService);
    private gestao = inject(GestaoAnunciosService);

    est = signal<EstatisticasAnuncios | null>(null);
    periodo = signal<PeriodoPainel>(30);
    /** Gráficos do painel (só para corretor); recarrega ao trocar o período. */
    painel = toSignal(
        toObservable(this.periodo).pipe(switchMap((dias) => (this.auth.isCorretor() ? this.gestao.painel('corretor', dias).pipe(catchError(() => of(null))) : EMPTY))),
        { initialValue: null }
    );
    /** Painel do perfil cliente (atividade, recomendações, preços e financiamento). */
    painelCliente = signal<ClientePainel | null>(null);
    usuario = signal<Usuario | null>(null);
    favoritosLista = signal<ImovelResumo[]>([]);
    primeiroNome = computed(() => (this.auth.usuario()?.nome ?? '').split(' ')[0]);
    perfil = computed(() => perfilLabel(this.auth.perfil()).toLowerCase());
    perfisTexto = computed(() =>
        this.auth
            .sessao()
            .perfisDisponiveis.map((p) => perfilLabel(p).toLowerCase())
            .join(', ')
    );

    constructor() {
        inject(ConfigService).definirTitulo('Minha conta');
        this.conta.carregarFavoritos();
        if (this.auth.isCorretor()) {
            this.gestao.estatisticas('corretor').subscribe({ next: (e) => this.est.set(e), error: () => undefined });
        } else if (this.auth.perfil() === 'CLIENTE') {
            this.conta.painelCliente().subscribe({ next: (p) => this.painelCliente.set(p), error: () => undefined });
            this.conta.perfil().subscribe({ next: (u) => this.usuario.set(u), error: () => undefined });
            this.conta.listarFavoritos().subscribe({ next: (l) => this.favoritosLista.set(l), error: () => undefined });
        }
    }
}
