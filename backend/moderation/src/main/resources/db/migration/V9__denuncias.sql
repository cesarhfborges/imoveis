-- Módulo moderation: denúncias de anúncios, conversa com o anunciante, prazos (SLA) e automações

-- Tipos de denúncia (cadastráveis): cada um com o seu prazo de resposta do anunciante, em minutos úteis
create table denuncia_tipos (
    id                 bigserial primary key,
    nome               varchar(80)  not null,
    descricao          varchar(300),
    gravidade          varchar(10)  not null check (gravidade in ('LEVE', 'MEDIA', 'GRAVE')),
    sla_minutos        integer      not null check (sla_minutos > 0),
    suspender_ao_abrir boolean      not null default false,
    ativo              boolean      not null default true,
    ordem              integer      not null default 0,
    criado_em          timestamp with time zone not null default now(),
    atualizado_em      timestamp with time zone not null default now()
);

-- 600 min úteis = 1 dia de expediente (08:00 às 18:00)
insert into denuncia_tipos (nome, descricao, gravidade, sla_minutos, suspender_ao_abrir, ordem) values
    ('Informação incorreta', 'Preço, área, quartos, endereço ou outro dado diferente da realidade', 'LEVE', 1200, false, 10),
    ('Imóvel indisponível', 'O imóvel já foi vendido ou alugado e o anúncio continua no ar', 'LEVE', 1200, false, 20),
    ('Anúncio duplicado', 'O mesmo imóvel anunciado mais de uma vez', 'LEVE', 1200, false, 30),
    ('Fotos não correspondem ao imóvel', 'Fotos de outro imóvel, de banco de imagens ou que não mostram o anunciado', 'MEDIA', 600, false, 40),
    ('Foto editada com IA sem aviso', 'Imagem criada ou alterada com inteligência artificial sem a indicação no anúncio', 'MEDIA', 600, false, 50),
    ('Preço enganoso', 'Valor irreal usado só para atrair contatos', 'MEDIA', 600, false, 60),
    ('Anúncio de captação', 'Imóvel inexistente ou sem autorização do proprietário, usado para captar clientes', 'GRAVE', 480, false, 70),
    ('Anúncio falso ou golpe', 'Pedido de sinal ou depósito antecipado, dados bancários, ofertas fraudulentas', 'GRAVE', 240, true, 80),
    ('Conteúdo ou foto ilegal/imprópria', 'Nudez, menores, pessoas identificáveis sem consentimento, documentos expostos', 'GRAVE', 240, true, 90),
    ('Anunciante sem CRECI ou irregular', 'Exercício irregular da profissão de corretor', 'GRAVE', 480, false, 100),
    ('Conteúdo discriminatório', 'Texto que discrimina por raça, religião, gênero, orientação, deficiência etc.', 'GRAVE', 480, false, 110),
    ('Conduta inadequada do anunciante', 'O anunciante não responde ou agiu de forma inadequada no atendimento', 'LEVE', 1200, false, 120),
    ('Outro', 'Algo que não se encaixa nos tipos acima', 'LEVE', 1200, false, 999);

-- Regras gerais da moderação (linha única)
create table moderacao_config (
    id                       smallint primary key default 1 check (id = 1),
    -- liga/desliga as ações automáticas quando um prazo vence (o prazo continua sendo contado)
    automacao_ativa          boolean     not null default true,
    -- ao aprovar a solução (ou julgar improcedente), o anúncio suspenso volta ao status de antes
    -- se não restar outra pendência aberta nele
    aprovar_reativa_anuncio  boolean     not null default true,
    -- novo prazo do anunciante quando o administrador pede ajuste/resposta
    ajuste_sla_minutos       integer     not null default 600 check (ajuste_sla_minutos > 0),
    -- etapa 1: ao vencer o primeiro prazo
    etapa1_acao              varchar(20) not null default 'SUSPENDER' check (etapa1_acao in ('NENHUMA', 'SUSPENDER', 'BANIR')),
    -- prazo extra depois da etapa 1 (até a etapa 2)
    etapa1_prazo_minutos     integer     not null default 1200 check (etapa1_prazo_minutos > 0),
    -- etapa 2: ao vencer o prazo extra
    etapa2_acao              varchar(20) not null default 'BANIR' check (etapa2_acao in ('NENHUMA', 'SUSPENDER', 'BANIR')),
    -- aviso ao anunciante quando faltar este tanto de minutos úteis (0 = sem aviso)
    aviso_minutos            integer     not null default 60 check (aviso_minutos >= 0),
    atualizado_em            timestamp with time zone not null default now()
);

insert into moderacao_config (id) values (1);

create table denuncias (
    id                bigserial primary key,
    imovel_id         bigint       not null references imoveis (id),
    denunciante_id    bigint       not null references usuarios (id),
    tipo_id           bigint       not null references denuncia_tipos (id),
    descricao         text         not null,
    status            varchar(30)  not null check (status in ('AGUARDANDO_ANUNCIANTE', 'EM_ANALISE', 'RESOLVIDA', 'IMPROCEDENTE', 'ANUNCIO_BANIDO')),
    -- etapa da automação: 0 = prazo inicial, 1 = prazo extra após a etapa 1, 2 = sem mais automação
    etapa             smallint     not null default 0,
    -- prazo atual do anunciante (nulo = não está correndo)
    sla_inicio        timestamp with time zone,
    sla_minutos       integer,
    prazo_em          timestamp with time zone,
    minutos_restantes integer,
    aviso_enviado     boolean      not null default false,
    resolvido_por     bigint references usuarios (id) on delete set null,
    resolvido_em      timestamp with time zone,
    conclusao         text,
    criado_em         timestamp with time zone not null default now(),
    atualizado_em     timestamp with time zone not null default now()
);

create index idx_denuncias_imovel on denuncias (imovel_id);
create index idx_denuncias_status on denuncias (status);
create index idx_denuncias_prazo on denuncias (prazo_em) where prazo_em is not null;
create index idx_denuncias_denunciante on denuncias (denunciante_id);
-- um usuário não abre duas denúncias do mesmo tipo para o mesmo anúncio enquanto a primeira estiver aberta
create unique index uk_denuncias_aberta on denuncias (imovel_id, denunciante_id, tipo_id)
    where status in ('AGUARDANDO_ANUNCIANTE', 'EM_ANALISE');

create table denuncia_mensagens (
    id            bigserial primary key,
    denuncia_id   bigint      not null references denuncias (id) on delete cascade,
    autor_id      bigint references usuarios (id) on delete set null,
    papel         varchar(12) not null check (papel in ('ANUNCIANTE', 'ADMIN', 'SISTEMA')),
    texto         text        not null,
    anexos        text,
    -- nota interna: só administradores veem
    interna       boolean     not null default false,
    criado_em     timestamp with time zone not null default now(),
    atualizado_em timestamp with time zone not null default now()
);

create index idx_denuncia_mensagens on denuncia_mensagens (denuncia_id, criado_em);
