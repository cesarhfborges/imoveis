-- Remoção de conta pelo próprio usuário (LGPD): o pedido fica agendado e a tarefa das 03:00 apaga a conta
-- depois do prazo de espera. Até lá o usuário pode desistir (cancelada_em = exclusão lógica do pedido).

-- Regras do site (aba Regras em /admin/configuracoes):
--  auto_exclusao_conta: mostra "Remover conta" em Meus dados (cliente, corretor e imobiliária).
--  dias_espera_exclusao: dias entre o pedido e a remoção definitiva.
alter table configuracoes
    add column auto_exclusao_conta  boolean not null default true,
    add column dias_espera_exclusao integer not null default 7 check (dias_espera_exclusao between 1 and 90);

-- Sem chave estrangeira para usuarios: o registro do pedido (só o id, sem dados pessoais) continua depois que a
-- conta é apagada, como prova de que o pedido foi atendido e quando.
create table solicitacoes_exclusao_conta (
    id            bigserial primary key,
    usuario_id    bigint                   not null,
    remover_em    timestamp with time zone not null,
    cancelada_em  timestamp with time zone,
    executada_em  timestamp with time zone,
    criado_em     timestamp with time zone not null default now(),
    atualizado_em timestamp with time zone not null default now()
);

-- no máximo um pedido em andamento por usuário
create unique index uk_solicitacao_exclusao_pendente on solicitacoes_exclusao_conta (usuario_id)
    where cancelada_em is null and executada_em is null;
create index idx_solicitacao_exclusao_vencimento on solicitacoes_exclusao_conta (remover_em)
    where cancelada_em is null and executada_em is null;
