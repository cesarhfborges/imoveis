-- Regra do site (aba Regras em /admin/configuracoes):
--  relatorio_anuncio: relatório de cada anúncio (visitas, contatos, favoritos, comparação e preço) para o anunciante.
alter table configuracoes add column relatorio_anuncio boolean not null default true;
