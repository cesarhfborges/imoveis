import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@/app/core/services/auth.service';
import { ContaService } from '@/app/core/services/conta.service';
import { GestaoAnunciosService } from '@/app/core/services/imovel.service';
import { ConfigService } from '@/app/core/services/config.service';
import { EstatisticasAnuncios, perfilLabel } from '@/app/core/models/models';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';

/** Início da conta: atalhos de cliente e, para corretores, os números dos anúncios. */
@Component({
    selector: 'app-painel-conta-page',
    imports: [RouterLink, ButtonModule, PageHeader, StatCard],
    template: `
        <app-page-header [titulo]="'Olá, ' + primeiroNome() + '!'" [subtitulo]="'Você está como ' + perfil() + '.'">
            @if (auth.isCorretor()) {
                <p-button label="Novo anúncio" icon="pi pi-plus" routerLink="/conta/anuncios/novo" />
            } @else {
                <p-button label="Buscar imóveis" icon="pi pi-search" routerLink="/venda" />
            }
        </app-page-header>

        <div class="grid grid-cols-12 gap-6">
            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <app-stat-card titulo="Favoritos" [valor]="conta.favoritos().size" icone="pi-heart" cor="bg-pink-100 dark:bg-pink-400/10 text-pink-500" detalhe="Ver favoritos" link="/conta/favoritos" />
            </div>
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

        <div class="card mt-6">
            <h2 class="text-lg font-semibold mt-0">Seus perfis de acesso</h2>
            <p class="text-muted-color">Com esta conta você pode entrar como: <strong>{{ perfisTexto() }}</strong>. Use o menu do usuário, no topo, para trocar entre cliente e corretor.</p>
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
        }
    }
}
