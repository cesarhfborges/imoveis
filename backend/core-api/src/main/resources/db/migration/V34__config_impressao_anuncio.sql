-- Regra do site (aba Regras em /admin/configuracoes):
--  impressao_anuncio: mostra o botão "Imprimir ficha" na página do imóvel e libera a página /imovel/{id}/imprimir.
alter table configuracoes add column impressao_anuncio boolean not null default true;
