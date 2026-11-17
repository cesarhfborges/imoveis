-- Regra do site (aba Regras em /admin/configuracoes):
--  sitemap_seo: /sitemap.xml para os buscadores e dados estruturados (schema.org) nas páginas do site.
alter table configuracoes add column sitemap_seo boolean not null default true;
