-- Regras do site (aba Regras em /admin/configuracoes):
--  simulacao_financiamento: mostra o botão "Simular financiamento" nos anúncios e o resumo no painel do cliente;
--  alerta_queda_preco: mostra o aviso de favoritos que baixaram de preço (painel e página de favoritos).
-- O cadastro de financeiras e o histórico de preços continuam funcionando com as regras desligadas.
alter table configuracoes add column simulacao_financiamento boolean not null default true;
alter table configuracoes add column alerta_queda_preco boolean not null default true;
