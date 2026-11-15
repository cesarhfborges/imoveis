-- Gravidades cadastráveis (com a regra de banimento automático da conta de cada uma),
-- apuração pela empresa e o desfecho "procedente" com a medida aplicada.

create table gravidades (
    id                bigserial primary key,
    nome              varchar(40)  not null,
    -- chave de unicidade: minúsculas, sem acentos e com espaços simples ("Gráve " = "grave")
    nome_normalizado  varchar(40)  not null,
    -- cor da etiqueta na tela (severidades do PrimeNG)
    cor               varchar(12)  not null default 'info'
                      check (cor in ('success', 'info', 'warn', 'danger', 'secondary', 'contrast')),
    ordem             integer      not null default 0,
    ativo             boolean      not null default true,
    -- banimento automático da conta do anunciante após "banir_apos" denúncias procedentes desta gravidade
    -- (contadas nos últimos "janela_meses" meses; nulo = todo o histórico)
    banir_conta_auto  boolean      not null default false,
    banir_apos        integer      check (banir_apos is null or banir_apos > 0),
    janela_meses      integer      check (janela_meses is null or janela_meses > 0),
    criado_em         timestamp with time zone not null default now(),
    atualizado_em     timestamp with time zone not null default now(),
    constraint ck_gravidades_nome_sem_bordas check (nome = btrim(nome) and nome <> ''),
    constraint ck_gravidades_regra check (not banir_conta_auto or banir_apos is not null)
);

create unique index uk_gravidades_nome on gravidades (nome_normalizado);

insert into gravidades (nome, nome_normalizado, cor, ordem, banir_conta_auto, banir_apos, janela_meses) values
    ('Leve', 'leve', 'info', 10, false, null, null),
    ('Média', 'media', 'warn', 20, false, null, null),
    ('Grave', 'grave', 'danger', 30, false, 3, 12);

-- tipos passam a apontar para a gravidade cadastrada
alter table denuncia_tipos add column gravidade_id bigint references gravidades (id);
update denuncia_tipos t set gravidade_id = g.id
  from gravidades g
 where g.nome_normalizado = case t.gravidade when 'LEVE' then 'leve' when 'MEDIA' then 'media' else 'grave' end;
alter table denuncia_tipos alter column gravidade_id set not null;
alter table denuncia_tipos drop column gravidade;

-- status novos: EM_APURACAO (a empresa está verificando) e PROCEDENTE (confirmada, com medida)
alter table denuncias drop constraint if exists denuncias_status_check;
alter table denuncias add constraint ck_denuncias_status check (status in
    ('AGUARDANDO_ANUNCIANTE', 'EM_ANALISE', 'EM_APURACAO', 'RESOLVIDA', 'IMPROCEDENTE', 'PROCEDENTE', 'ANUNCIO_BANIDO'));

drop index if exists uk_denuncias_aberta;
create unique index uk_denuncias_aberta on denuncias (imovel_id, denunciante_id, tipo_id)
    where status in ('AGUARDANDO_ANUNCIANTE', 'EM_ANALISE', 'EM_APURACAO');

-- gravidade "congelada" na abertura (a contagem para banimento não muda se o tipo for reclassificado depois)
alter table denuncias add column gravidade_id bigint references gravidades (id);
update denuncias d set gravidade_id = t.gravidade_id from denuncia_tipos t where t.id = d.tipo_id;
alter table denuncias alter column gravidade_id set not null;

alter table denuncias add column natureza varchar(10) check (natureza in ('ERRO', 'MA_FE'));
alter table denuncias add column medida varchar(12) check (medida in ('MANTER', 'SUSPENDER', 'BANIR'));
-- prazo interno (só alerta para a moderação) da apuração
alter table denuncias add column apuracao_prazo_em timestamp with time zone;
alter table denuncias add column apuracao_aviso_enviado boolean not null default false;

create index idx_denuncias_procedentes on denuncias (gravidade_id, resolvido_em) where status = 'PROCEDENTE';
