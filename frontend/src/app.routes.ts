import { Routes } from '@angular/router';
import { SiteLayout } from './app/site/layout/site-layout';
import { AppLayout } from './app/layout/component/app.layout';
import { adminGuard, contaGuard, corretorGuard } from './app/core/guards/perfil.guard';

/**
 * Três partes:
 *  - site público (sem login): busca e páginas dos imóveis;
 *  - /conta: área do cliente e do corretor (login em /conta/login);
 *  - /admin: gestão completa do sistema (login próprio em /admin/login).
 */
export const appRoutes: Routes = [
    {
        path: '',
        component: SiteLayout,
        children: [
            { path: '', loadComponent: () => import('./app/site/pages/home').then((m) => m.HomePage) },
            { path: 'venda', loadComponent: () => import('./app/site/pages/busca').then((m) => m.BuscaPage), data: { finalidade: 'VENDA' } },
            { path: 'aluguel', loadComponent: () => import('./app/site/pages/busca').then((m) => m.BuscaPage), data: { finalidade: 'ALUGUEL' } },
            { path: 'imovel-novo', loadComponent: () => import('./app/site/pages/busca').then((m) => m.BuscaPage), data: { finalidade: 'VENDA', lancamento: true } },
            { path: 'temporada', loadComponent: () => import('./app/site/pages/busca').then((m) => m.BuscaPage), data: { finalidade: 'TEMPORADA' } },
            { path: 'imoveis', loadComponent: () => import('./app/site/pages/busca').then((m) => m.BuscaPage) },
            { path: 'imovel/:id', loadComponent: () => import('./app/site/pages/detalhe').then((m) => m.DetalhePage) },
            { path: 'imovel/:id/:slug', loadComponent: () => import('./app/site/pages/detalhe').then((m) => m.DetalhePage) },
            { path: 'mapa', loadComponent: () => import('./app/site/pages/mapa').then((m) => m.MapaPage) },
            { path: 'anunciar', loadComponent: () => import('./app/site/pages/anunciar').then((m) => m.AnunciarPage) },
            { path: 'acesso-negado', loadComponent: () => import('./app/site/pages/acesso-negado').then((m) => m.AcessoNegadoPage) },
            { path: 'nao-encontrado', loadComponent: () => import('./app/site/pages/nao-encontrado').then((m) => m.NaoEncontradoPage) }
        ]
    },

    // ---------------------------------------------------------------- conta
    { path: 'conta/login', loadComponent: () => import('./app/conta/pages/login').then((m) => m.ContaLoginPage) },
    { path: 'conta/cadastro', loadComponent: () => import('./app/conta/pages/cadastro').then((m) => m.CadastroPage) },
    {
        path: 'conta',
        component: AppLayout,
        canActivate: [contaGuard],
        data: { area: 'conta' },
        children: [
            { path: '', loadComponent: () => import('./app/conta/pages/painel').then((m) => m.PainelContaPage) },
            { path: 'perfil', loadComponent: () => import('./app/conta/pages/perfil').then((m) => m.PerfilPage) },
            { path: 'favoritos', loadComponent: () => import('./app/conta/pages/favoritos').then((m) => m.FavoritosPage) },
            { path: 'denuncias', loadComponent: () => import('./app/conta/pages/minhas-denuncias').then((m) => m.MinhasDenunciasPage) },
            { path: 'pendencias', canActivate: [corretorGuard], loadComponent: () => import('./app/shared/pages/pendencias-page').then((m) => m.PendenciasPage) },
            { path: 'pendencias/:imovelId', canActivate: [corretorGuard], loadComponent: () => import('./app/shared/pages/pendencias-imovel-page').then((m) => m.PendenciasImovelPage) },
            { path: 'api', canActivate: [corretorGuard], loadComponent: () => import('./app/shared/pages/api-tokens-page').then((m) => m.ApiTokensPage) },
            { path: 'anuncios', canActivate: [corretorGuard], loadComponent: () => import('./app/shared/pages/anuncios-lista-page').then((m) => m.AnunciosListaPage), data: { area: 'corretor' } },
            { path: 'anuncios/novo', canActivate: [corretorGuard], loadComponent: () => import('./app/shared/pages/anuncio-edicao-page').then((m) => m.AnuncioEdicaoPage), data: { area: 'corretor' } },
            { path: 'anuncios/:id', canActivate: [corretorGuard], loadComponent: () => import('./app/shared/pages/anuncio-edicao-page').then((m) => m.AnuncioEdicaoPage), data: { area: 'corretor' } },
            { path: 'contatos', canActivate: [corretorGuard], loadComponent: () => import('./app/shared/pages/contatos-page').then((m) => m.ContatosPage), data: { area: 'corretor' } }
        ]
    },

    // ---------------------------------------------------------------- admin
    { path: 'admin/login', loadComponent: () => import('./app/admin/pages/login').then((m) => m.AdminLoginPage) },
    {
        path: 'admin',
        component: AppLayout,
        canActivate: [adminGuard],
        data: { area: 'admin' },
        children: [
            { path: '', loadComponent: () => import('./app/admin/pages/dashboard').then((m) => m.AdminDashboardPage) },
            { path: 'anuncios', loadComponent: () => import('./app/shared/pages/anuncios-lista-page').then((m) => m.AnunciosListaPage), data: { area: 'admin' } },
            { path: 'anuncios/novo', loadComponent: () => import('./app/shared/pages/anuncio-edicao-page').then((m) => m.AnuncioEdicaoPage), data: { area: 'admin' } },
            { path: 'anuncios/:id', loadComponent: () => import('./app/shared/pages/anuncio-edicao-page').then((m) => m.AnuncioEdicaoPage), data: { area: 'admin' } },
            { path: 'contatos', loadComponent: () => import('./app/shared/pages/contatos-page').then((m) => m.ContatosPage), data: { area: 'admin' } },
            { path: 'denuncias', loadComponent: () => import('./app/admin/pages/denuncias').then((m) => m.AdminDenunciasPage) },
            { path: 'denuncias/:imovelId', loadComponent: () => import('./app/admin/pages/denuncias-imovel').then((m) => m.AdminDenunciasImovelPage) },
            { path: 'moderacao', loadComponent: () => import('./app/admin/pages/moderacao-regras').then((m) => m.ModeracaoRegrasPage) },
            { path: 'calendario', loadComponent: () => import('./app/admin/pages/calendario').then((m) => m.CalendarioPage) },
            { path: 'usuarios', loadComponent: () => import('./app/admin/pages/usuarios').then((m) => m.UsuariosPage) },
            { path: 'configuracoes', loadComponent: () => import('./app/admin/pages/configuracoes').then((m) => m.ConfiguracoesPage) },
            { path: 'api', loadComponent: () => import('./app/shared/pages/api-tokens-page').then((m) => m.ApiTokensPage) },
            { path: 'perfil', loadComponent: () => import('./app/conta/pages/perfil').then((m) => m.PerfilPage) }
        ]
    },

    { path: '**', redirectTo: '/nao-encontrado' }
];
