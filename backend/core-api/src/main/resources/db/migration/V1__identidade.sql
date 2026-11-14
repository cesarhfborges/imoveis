-- Módulo core-api: usuários, papéis, tokens de API e configuração global

create table usuarios (
    id            bigserial primary key,
    nome          varchar(120) not null,
    email         varchar(160) not null,
    senha_hash    varchar(100) not null,
    telefone      varchar(30),
    creci         varchar(30),
    documento     varchar(20),
    tipo_anunciante varchar(20),
    foto_url      varchar(500),
    ativo         boolean      not null default true,
    ultimo_acesso timestamp with time zone,
    criado_em     timestamp with time zone not null default now(),
    atualizado_em timestamp with time zone not null default now()
);

create unique index uk_usuarios_email on usuarios (lower(email));

create table usuario_papeis (
    usuario_id bigint      not null references usuarios (id) on delete cascade,
    papel      varchar(20) not null,
    primary key (usuario_id, papel)
);

create table api_tokens (
    id            bigserial primary key,
    usuario_id    bigint      not null references usuarios (id) on delete cascade,
    nome          varchar(80) not null,
    prefixo       varchar(16) not null,
    token_hash    varchar(64) not null unique,
    perfil        varchar(20) not null,
    expira_em     timestamp with time zone,
    ultimo_uso    timestamp with time zone,
    revogado      boolean     not null default false,
    criado_em     timestamp with time zone not null default now(),
    atualizado_em timestamp with time zone not null default now()
);

create table configuracoes (
    id                         bigserial primary key,
    nome_app                   varchar(80) not null,
    slogan                     varchar(160),
    logo_url                   varchar(500),
    logo_escuro_url            varchar(500),
    favicon_url                varchar(500),
    seo_titulo                 varchar(120),
    seo_descricao              varchar(300),
    seo_palavras_chave         varchar(300),
    seo_imagem_url             varchar(500),
    email_contato              varchar(160),
    telefone_contato           varchar(30),
    whatsapp                   varchar(30),
    endereco                   varchar(200),
    instagram                  varchar(200),
    facebook                   varchar(200),
    texto_rodape               varchar(300),
    tema_preset                varchar(20) not null default 'Aura',
    tema_primaria              varchar(20) not null default 'blue',
    tema_surface               varchar(20),
    tema_modo                  varchar(10) not null default 'auto',
    moderar_anuncios           boolean     not null default false,
    permitir_cadastro_corretor boolean     not null default true,
    criado_em                  timestamp with time zone not null default now(),
    atualizado_em              timestamp with time zone not null default now()
);

insert into configuracoes (nome_app, slogan, seo_titulo, seo_descricao, seo_palavras_chave)
values ('Imóveis', 'Encontre o imóvel ideal para você',
        'Imóveis - compra, venda e aluguel',
        'Portal de imóveis para comprar, vender e alugar casas, apartamentos, lotes e salas comerciais.',
        'imóveis, apartamentos, casas, aluguel, venda, lançamentos');
