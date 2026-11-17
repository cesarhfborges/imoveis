-- Regra do site (aba Regras em /admin/configuracoes):
--  agendamento_visita: botão "Agendar visita" na página do imóvel e página "Visitas" na conta.
alter table configuracoes add column agendamento_visita boolean not null default true;
