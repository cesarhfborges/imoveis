-- Agendamento de visitas: o cliente pede um horário (dentro do expediente do calendário do site), o anunciante
-- confirma, recusa ou propõe outro; qualquer um dos dois pode cancelar. Apagar o imóvel ou a conta do cliente
-- apaga as visitas (exclusão de conta / LGPD).
create table visitas (
    id              bigserial primary key,
    imovel_id       bigint      not null references imoveis (id) on delete cascade,
    cliente_id      bigint      not null references usuarios (id) on delete cascade,
    inicio          timestamp with time zone not null,
    fim             timestamp with time zone not null,
    status          varchar(20) not null default 'SOLICITADA'
        check (status in ('SOLICITADA', 'CONFIRMADA', 'NOVO_HORARIO', 'RECUSADA', 'CANCELADA')),
    mensagem        text,
    resposta        text,
    proposto_inicio timestamp with time zone,
    criado_em       timestamp with time zone not null default now(),
    atualizado_em   timestamp with time zone not null default now(),
    constraint ck_visitas_horario check (fim > inicio)
);

create index idx_visitas_imovel_inicio on visitas (imovel_id, inicio);
create index idx_visitas_cliente on visitas (cliente_id, inicio desc);

-- um horário só pode estar em andamento uma vez por imóvel
create unique index uk_visitas_horario_ativo on visitas (imovel_id, inicio)
    where status in ('SOLICITADA', 'CONFIRMADA', 'NOVO_HORARIO');
