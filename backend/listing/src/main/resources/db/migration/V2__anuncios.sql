-- Módulo listing: anúncios, fotos, características, contatos e favoritos

create table imoveis (
    id                   bigserial primary key,
    titulo               varchar(160)   not null,
    descricao            text,
    finalidade           varchar(20)    not null,
    tipo                 varchar(30)    not null,
    status               varchar(20)    not null default 'ATIVO',
    preco                numeric(15, 2) not null,
    condominio           numeric(15, 2),
    iptu                 numeric(15, 2),
    area_util            numeric(10, 2),
    area_total           numeric(10, 2),
    quartos              integer,
    suites               integer,
    banheiros            integer,
    vagas                integer,
    uf                   varchar(2)     not null,
    cidade               varchar(80)    not null,
    bairro               varchar(80)    not null,
    endereco             varchar(200),
    cep                  varchar(9),
    latitude             numeric(10, 7),
    longitude            numeric(10, 7),
    lancamento           boolean        not null default false,
    destaque             boolean        not null default false,
    aceita_financiamento boolean        not null default false,
    anunciante_id        bigint         not null references usuarios (id),
    visualizacoes        bigint         not null default 0,
    criado_em            timestamp with time zone not null default now(),
    atualizado_em        timestamp with time zone not null default now()
);

create index idx_imoveis_busca on imoveis (status, finalidade, tipo);
create index idx_imoveis_local on imoveis (uf, lower(cidade), lower(bairro));
create index idx_imoveis_preco on imoveis (preco);
create index idx_imoveis_anunciante on imoveis (anunciante_id);

create table imovel_fotos (
    imovel_id bigint       not null references imoveis (id) on delete cascade,
    ordem     integer      not null,
    url       varchar(500) not null,
    primary key (imovel_id, ordem)
);

create table imovel_caracteristicas (
    imovel_id bigint      not null references imoveis (id) on delete cascade,
    nome      varchar(60) not null,
    primary key (imovel_id, nome)
);

create table contatos (
    id            bigserial primary key,
    imovel_id     bigint       not null references imoveis (id) on delete cascade,
    nome          varchar(120) not null,
    email         varchar(160) not null,
    telefone      varchar(30),
    mensagem      text         not null,
    usuario_id    bigint references usuarios (id) on delete set null,
    lido          boolean      not null default false,
    criado_em     timestamp with time zone not null default now(),
    atualizado_em timestamp with time zone not null default now()
);

create index idx_contatos_imovel on contatos (imovel_id);

create table favoritos (
    id            bigserial primary key,
    usuario_id    bigint not null references usuarios (id) on delete cascade,
    imovel_id     bigint not null references imoveis (id) on delete cascade,
    criado_em     timestamp with time zone not null default now(),
    atualizado_em timestamp with time zone not null default now(),
    constraint uk_favorito unique (usuario_id, imovel_id)
);
