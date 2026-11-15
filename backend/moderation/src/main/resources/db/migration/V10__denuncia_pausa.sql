-- Quando o anunciante responde, o prazo para e guarda quanto faltava; quando a moderação devolve o caso,
-- o prazo retoma desse ponto (com um mínimo configurável em moderacao_config.ajuste_sla_minutos).
alter table denuncias add column minutos_na_pausa integer;

comment on column moderacao_config.ajuste_sla_minutos is
    'Prazo mínimo (min úteis) quando a moderação devolve o caso ao anunciante e faltava menos que isso';
