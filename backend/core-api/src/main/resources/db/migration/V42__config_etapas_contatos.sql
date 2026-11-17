-- Regra do site (aba Regras em /admin/configuracoes):
--  etapas_contatos: etapas (novo, em atendimento, visita marcada, proposta, fechado, perdido) e anotações nos
--  contatos recebidos pelo anunciante.
alter table configuracoes add column etapas_contatos boolean not null default true;
