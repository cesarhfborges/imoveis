-- Histórico de alterações de preço dos anúncios (alerta de queda de preço nos favoritos do cliente).
create table imovel_precos (
    id             bigserial primary key,
    imovel_id      bigint         not null references imoveis (id) on delete cascade,
    preco_anterior numeric(15, 2) not null,
    preco_novo     numeric(15, 2) not null,
    alterado_em    timestamp with time zone not null default now()
);

create index idx_imovel_precos_imovel on imovel_precos (imovel_id, alterado_em);
