-- Visitas por dia de cada anúncio, para os gráficos dos painéis (administração e corretor).
-- O total acumulado continua em imoveis.visualizacoes; o histórico diário começa a contar a partir desta versão.
create table imovel_visitas_diarias (
    imovel_id bigint not null references imoveis (id) on delete cascade,
    dia       date   not null,
    total     bigint not null default 0,
    primary key (imovel_id, dia)
);

create index idx_visitas_diarias_dia on imovel_visitas_diarias (dia);
