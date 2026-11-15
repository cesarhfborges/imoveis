-- Anexos das pendências (imagens e PDF). Ficam fora da pasta pública: só quem tem acesso à denúncia baixa.
create table denuncia_anexos (
    nome       varchar(60)  primary key,
    usuario_id bigint       not null references usuarios (id) on delete cascade,
    tipo       varchar(40)  not null,
    tamanho    bigint       not null,
    original   varchar(200),
    criado_em  timestamp with time zone not null default now()
);
