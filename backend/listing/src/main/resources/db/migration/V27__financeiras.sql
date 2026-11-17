-- Financeiras (bancos) cadastradas pela administração, com as regras usadas na simulação de financiamento,
-- e quais delas cada anúncio aceita (todas ou uma seleção).
create table financeiras (
    id                               bigserial primary key,
    nome                             varchar(80)    not null,
    descricao                        varchar(500),
    logo_url                         varchar(500),
    ativo                            boolean        not null default true,
    sistema_amortizacao              varchar(10)    not null default 'AMBOS',
    taxa_juros_anual                 numeric(6, 3)  not null,
    prazo_maximo_meses               integer        not null,
    entrada_minima_percentual        numeric(5, 2)  not null,
    comprometimento_renda_percentual numeric(5, 2)  not null default 30,
    idade_maxima_quitacao            integer,
    valor_minimo_imovel              numeric(15, 2),
    valor_maximo_imovel              numeric(15, 2),
    seguro_mensal_percentual         numeric(7, 4)  not null default 0,
    taxa_administracao_mensal        numeric(10, 2) not null default 0,
    aceita_fgts                      boolean        not null default true,
    observacoes                      varchar(1000),
    criado_em                        timestamp with time zone not null default now(),
    atualizado_em                    timestamp with time zone not null default now(),
    constraint ck_financeira_sistema check (sistema_amortizacao in ('SAC', 'PRICE', 'AMBOS'))
);

alter table imoveis add column financeiras_todas boolean not null default false;

create table imovel_financeiras (
    imovel_id     bigint not null references imoveis (id) on delete cascade,
    financeira_id bigint not null references financeiras (id) on delete cascade,
    primary key (imovel_id, financeira_id)
);

-- anúncios que já aceitavam financiamento passam a aceitar todas as financeiras cadastradas
update imoveis set financeiras_todas = true where aceita_financiamento = true;
