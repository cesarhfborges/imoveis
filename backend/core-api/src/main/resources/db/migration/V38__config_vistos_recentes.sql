-- Regra do site (aba Regras em /admin/configuracoes):
--  vistos_recentes: registra os imóveis que o usuário logado abre e mostra o histórico
--  (painel, página "Vistos recentemente" e faixa "Continue de onde parou" na página inicial).
alter table configuracoes add column vistos_recentes boolean not null default true;
