-- Etapas dos contatos recebidos (CRM simples do anunciante): em que pé está cada interessado e anotações.
-- Contatos já lidos começam em "Em atendimento"; os não lidos, em "Novo".
alter table contatos
    add column etapa     varchar(20) not null default 'NOVO'
        check (etapa in ('NOVO', 'EM_ATENDIMENTO', 'VISITA_MARCADA', 'PROPOSTA', 'FECHADO', 'PERDIDO')),
    add column etapa_em  timestamp with time zone,
    add column anotacoes text;

update contatos set etapa = 'EM_ATENDIMENTO', etapa_em = atualizado_em where lido;

create index idx_contatos_imovel_etapa on contatos (imovel_id, etapa);
