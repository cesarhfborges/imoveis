import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { AdminService } from '@/app/core/services/conta.service';
import { ConfigService } from '@/app/core/services/config.service';
import { Dashboard } from '@/app/core/models/models';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';

/** Painel geral do sistema (somente administradores, em /admin). */
@Component({
    selector: 'app-admin-dashboard-page',
    imports: [RouterLink, ButtonModule, ChartModule, PageHeader, StatCard],
    template: `
        <app-page-header titulo="Painel administrativo" subtitulo="Visão geral de anúncios, usuários e contatos.">
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
                <div class="col-span-12 xl:col-span-6 card m-0">
                    <h2 class="text-lg font-semibold mt-0">Anúncios por situação</h2>
                    <p-chart type="doughnut" [data]="graficoStatus()" [options]="opcoes" height="260px" ariaLabel="Gráfico de anúncios por situação" />
                </div>
                <div class="col-span-12 xl:col-span-6 card m-0">
                    <h2 class="text-lg font-semibold mt-0">Perfis de usuário</h2>
                    <p-chart type="bar" [data]="graficoUsuarios()" [options]="opcoes" height="260px" ariaLabel="Gráfico de perfis de usuário" />
                </div>
            </div>
        }
    `
})
export class AdminDashboardPage {
    private admin = inject(AdminService);
    d = signal<Dashboard | null>(null);
    opcoes = { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };

    graficoStatus = computed(() => {
        const a = this.d()?.anuncios;
        const outros = a ? Math.max(a.total - a.ativos - a.pendentes - a.pausados, 0) : 0;
        return {
            labels: ['Ativos', 'Pendentes', 'Pausados', 'Outros'],
            datasets: [{ data: a ? [a.ativos, a.pendentes, a.pausados, outros] : [], backgroundColor: ['#22c55e', '#f97316', '#94a3b8', '#3b82f6'] }]
        };
    });

    graficoUsuarios = computed(() => {
        const d = this.d();
        return {
            labels: ['Clientes', 'Corretores', 'Administradores'],
            datasets: [{ label: 'Usuários', data: d ? [d.clientes, d.corretores, d.administradores] : [], backgroundColor: ['#38bdf8', '#1c3c6d', '#ef4444'] }]
        };
    });

    constructor() {
        inject(ConfigService).definirTitulo('Painel administrativo');
        this.admin.dashboard().subscribe({ next: (d) => this.d.set(d), error: () => undefined });
    }
}
