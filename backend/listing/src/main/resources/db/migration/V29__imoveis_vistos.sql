-- Imóveis abertos por cada usuário logado ("vistos recentemente" e recomendações do painel do cliente).
create table imovel_vistos (
    usuario_id bigint not null references usuarios (id) on delete cascade,
    imovel_id  bigint not null references imoveis (id) on delete cascade,
    visto_em   timestamp with time zone not null default now(),
    primary key (usuario_id, imovel_id)
);

create index idx_imovel_vistos_usuario on imovel_vistos (usuario_id, visto_em desc);
