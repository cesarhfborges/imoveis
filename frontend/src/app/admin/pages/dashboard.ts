import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { AdminService } from '@/app/core/services/conta.service';
import { ConfigService } from '@/app/core/services/config.service';
import { GestaoAnunciosService } from '@/app/core/services/imovel.service';
import { PeriodoPainel } from '@/app/core/models/models';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { CoresGraficoService } from '@/app/shared/components/painel/cores-grafico.service';
import { GraficoCard } from '@/app/shared/components/painel/grafico-card';
import { PainelGraficos } from '@/app/shared/components/painel/painel-graficos';
import { PeriodoSelect } from '@/app/shared/components/painel/periodo-select';
import { dadosBarrasDia, dadosPizza, dadosRanking, numero, opcoesBarra, opcoesPizza, semDados, totalSerie } from '@/app/shared/components/painel/graficos';

/** Painel geral do sistema (somente administradores, em /admin). */
@Component({
    selector: 'app-admin-dashboard-page',
    imports: [RouterLink, ButtonModule, PageHeader, StatCard, GraficoCard, PainelGraficos, PeriodoSelect],
    template: `
        <app-page-header titulo="Painel administrativo" subtitulo="Visão geral de anúncios, usuários, visitas e contatos do portal.">
            <app-periodo-select [(periodo)]="periodo" />
            <p-button label="Configurações do site" icon="pi pi-cog" [outlined]="true" routerLink="/admin/configuracoes" />
        </app-page-header>
        @if (d(); as d) {
            <div class="grid grid-cols-12 gap-6">
                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                    <app-stat-card titulo="Anúncios ativos" [valor]="d.anuncios.ativos + ' de ' + d.anuncios.total" icone="pi-building" detalhe="Gerenciar anúncios" link="/admin/anuncios" />
                </div>
                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                    <app-stat-card titulo="Aguardando aprovação" [valor]="d.anuncios.pendentes" icone="pi-clock" cor="bg-orange-100 dark:bg-orange-400/10 text-orange-500" detalhe="Ver pendentes" link="/admin/anuncios" />
                </div>
                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                    <app-stat-card titulo="Usuários" [valor]="d.usuarios" icone="pi-users" cor="bg-purple-100 dark:bg-purple-400/10 text-purple-500" [detalhe]="d.corretores + ' corretores · ' + d.administradores + ' admins'" link="/admin/usuarios" />
                </div>
                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                    <app-stat-card titulo="Contatos não lidos" [valor]="d.anuncios.contatosNaoLidos" icone="pi-inbox" cor="bg-cyan-100 dark:bg-cyan-400/10 text-cyan-500" detalhe="Abrir contatos" link="/admin/contatos" />
                </div>
            </div>
        }

        @if (painel(); as p) {
            <div class="mt-6">
                <app-painel-graficos [painel]="p" area="admin" />
            </div>
        }

        @if (d(); as d) {
            <div class="grid grid-cols-12 gap-6 mt-6">
                <app-grafico-card class="col-span-12 xl:col-span-6" titulo="Crescimento do portal" [subtitulo]="fmt(cadastros()) + ' cadastros e ' + fmt(anunciosNovos()) + ' anúncios novos nos últimos ' + periodo() + ' dias'" tipo="bar" [dados]="graficoCrescimento()" [opcoes]="opcoesCrescimento()" [vazio]="semCrescimento()" mensagemVazio="Nenhum cadastro ou anúncio novo no período." />
                <app-grafico-card class="col-span-12 md:col-span-6 xl:col-span-3" titulo="Anúncios por situação" tipo="doughnut" [dados]="graficoStatus()" [opcoes]="opcoesPizza()" />
                <app-grafico-card class="col-span-12 md:col-span-6 xl:col-span-3" titulo="Perfis de usuário" tipo="bar" [dados]="graficoUsuarios()" [opcoes]="opcoesBarra()" />
            </div>
        }
    `
})
export class AdminDashboardPage {
    private admin = inject(AdminService);
    private gestao = inject(GestaoAnunciosService);
    private cores = inject(CoresGraficoService).cores;

    periodo = signal<PeriodoPainel>(30);
    private periodo$ = toObservable(this.periodo);

    d = toSignal(this.periodo$.pipe(switchMap((dias) => this.admin.dashboard(dias).pipe(catchError(() => of(null))))), { initialValue: null });
    painel = toSignal(this.periodo$.pipe(switchMap((dias) => this.gestao.painel('admin', dias).pipe(catchError(() => of(null))))), { initialValue: null });

    readonly fmt = numero;
    opcoesPizza = computed(() => opcoesPizza(this.cores()));
    opcoesBarra = computed(() => opcoesBarra(this.cores()));
    opcoesCrescimento = computed(() => opcoesBarra(this.cores(), false, true));

    cadastros = computed(() => totalSerie(this.d()?.cadastrosPorDia ?? []));
    anunciosNovos = computed(() => totalSerie(this.painel()?.anunciosNovosPorDia ?? []));
    semCrescimento = computed(() => semDados(this.d()?.cadastrosPorDia ?? []) && semDados(this.painel()?.anunciosNovosPorDia ?? []));

    graficoCrescimento = computed(() =>
        dadosBarrasDia(this.cores(), [
            { rotulo: 'Cadastros', pontos: this.d()?.cadastrosPorDia ?? [] },
            { rotulo: 'Anúncios', pontos: this.painel()?.anunciosNovosPorDia ?? [] }
        ])
    );

    graficoStatus = computed(() => {
        const a = this.d()?.anuncios;
        const outros = a ? Math.max(a.total - a.ativos - a.pendentes - a.pausados, 0) : 0;
        const fatias = a
            ? [
                  { rotulo: 'Ativos', total: a.ativos },
                  { rotulo: 'Pendentes', total: a.pendentes },
                  { rotulo: 'Pausados', total: a.pausados },
                  { rotulo: 'Outros', total: outros }
              ]
            : [];
        return dadosPizza(this.cores(), fatias);
    });

    graficoUsuarios = computed(() => {
        const d = this.d();
        const fatias = d
            ? [
                  { rotulo: 'Clientes', total: d.clientes },
                  { rotulo: 'Corretores', total: d.corretores },
                  { rotulo: 'Administradores', total: d.administradores }
              ]
            : [];
        return dadosRanking(this.cores(), fatias, 'Usuários', this.cores().serie[4]);
    });

    constructor() {
        inject(ConfigService).definirTitulo('Painel administrativo');
    }
}
