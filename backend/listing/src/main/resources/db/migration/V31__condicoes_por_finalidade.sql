-- Condições do anúncio específicas de cada finalidade (venda, aluguel, temporada).
-- Os itens de venda que já existiam (financiamento, FGTS, permuta, escritura, quitado) continuam como colunas,
-- porque alimentam a busca, a simulação de financiamento e o comparador. Os demais ficam nesta tabela.
create table imovel_condicoes (
    imovel_id bigint      not null references imoveis (id) on delete cascade,
    codigo    varchar(40) not null,
    primary key (imovel_id, codigo)
);

-- Aluguel
alter table imoveis add column contrato_minimo_meses integer;
-- Temporada
alter table imoveis add column noites_minimas integer;
alter table imoveis add column hospedes_maximo integer;
alter table imoveis add column taxa_limpeza numeric(15, 2);
alter table imoveis add column horario_checkin varchar(5);
alter table imoveis add column horario_checkout varchar(5);
