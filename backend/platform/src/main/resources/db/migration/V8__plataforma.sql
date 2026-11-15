-- Módulo platform: notificações dos usuários e calendário geral (expediente semanal e feriados)

create table notificacoes (
    id            bigserial primary key,
    usuario_id    bigint       not null references usuarios (id) on delete cascade,
    tipo          varchar(40)  not null,
    titulo        varchar(160) not null,
    mensagem      varchar(500),
    icone         varchar(40),
    link          varchar(300),
    -- referência ao registro que gerou o aviso (sem chave estrangeira: apagar um não afeta o outro)
    origem_tipo   varchar(40),
    origem_id     bigint,
    lida_em       timestamp with time zone,
    criado_em     timestamp with time zone not null default now(),
    atualizado_em timestamp with time zone not null default now()
);

create index idx_notificacoes_usuario on notificacoes (usuario_id, criado_em desc);
create index idx_notificacoes_nao_lidas on notificacoes (usuario_id) where lida_em is null;

-- Expediente semanal (dia_semana ISO: 1 = segunda ... 7 = domingo).
-- Horários em minutos desde 00:00 (0 a 1440; 1440 = 24:00), sem conversão de fuso pelo banco/driver.
create table calendario_expediente (
    dia_semana    smallint primary key check (dia_semana between 1 and 7),
    ativo         boolean  not null default true,
    inicio_minuto smallint not null default 480 check (inicio_minuto between 0 and 1440),
    fim_minuto    smallint not null default 1080 check (fim_minuto between 0 and 1440),
    constraint ck_calendario_expediente_horario check (fim_minuto > inicio_minuto)
);

insert into calendario_expediente (dia_semana, ativo, inicio_minuto, fim_minuto) values
    (1, true, 480, 1080),
    (2, true, 480, 1080),
    (3, true, 480, 1080),
    (4, true, 480, 1080),
    (5, true, 480, 1080),
    (6, false, 480, 720),
    (7, false, 480, 720);

-- Feriados e paradas: intervalo de data/hora local no fuso do calendário (ex.: véspera de Natal a partir das 13h).
-- Guardado como texto ISO "aaaa-mm-ddThh:mm" (ordena certo e não sofre conversão de fuso).
create table calendario_feriados (
    id            bigserial primary key,
    titulo        varchar(120) not null,
    inicio        varchar(16)  not null check (inicio ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$'),
    fim           varchar(16)  not null check (fim ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$'),
    recorrente    boolean      not null default false,
    criado_em     timestamp with time zone not null default now(),
    atualizado_em timestamp with time zone not null default now(),
    constraint ck_calendario_feriados_intervalo check (fim > inicio)
);

create table calendario_config (
    id   smallint primary key default 1 check (id = 1),
    fuso varchar(60) not null default 'America/Sao_Paulo'
);

insert into calendario_config (id, fuso) values (1, 'America/Sao_Paulo');
