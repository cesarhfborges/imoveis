-- Avisos do site (cookies, comunicados, FAQ...): cadastrados pela administração e exibidos como
-- mensagem (barra no topo/rodapé), drawer ou diálogo. Cada edição do conteúdo gera uma nova versão,
-- e quem já tinha aceito a anterior vê o aviso de novo.
create table avisos (
    id             bigserial primary key,
    nome           varchar(80)  not null,
    titulo         varchar(120),
    mensagem       text         not null,
    tipo           varchar(10)  not null check (tipo in ('MENSAGEM', 'DRAWER', 'DIALOG')),
    posicao        varchar(12)  not null,
    severidade     varchar(10)  not null default 'info'
                   check (severidade in ('info', 'success', 'warn', 'error', 'secondary', 'contrast')),
    icone          varchar(40),
    -- pode ser fechado sem aceitar (volta na próxima sessão do navegador)
    dispensavel    boolean      not null default true,
    -- dialog/drawer: escurece o fundo e bloqueia a página
    modal          boolean      not null default true,
    -- botão principal (nulo: sem botão); FECHAR só registra o aceite, LINK também abre o endereço
    texto_aceite   varchar(40),
    acao_aceite    varchar(6)   not null default 'FECHAR' check (acao_aceite in ('FECHAR', 'LINK')),
    link_aceite    varchar(500),
    nova_aba       boolean      not null default false,
    -- link secundário opcional (ex.: "Política de privacidade")
    texto_link     varchar(60),
    url_link       varchar(500),
    publico        varchar(10)  not null default 'TODOS' check (publico in ('TODOS', 'VISITANTES', 'LOGADOS')),
    -- onde aparece: SITE (público), CONTA (painel do usuário), ADMIN; separados por vírgula
    areas          varchar(40)  not null default 'SITE',
    ativo          boolean      not null default false,
    ordem          integer      not null default 0,
    inicio_em      timestamp with time zone,
    fim_em         timestamp with time zone,
    versao         integer      not null default 1,
    versao_em      timestamp with time zone not null default now(),
    criado_em      timestamp with time zone not null default now(),
    atualizado_em  timestamp with time zone not null default now(),
    constraint ck_avisos_link check (acao_aceite <> 'LINK' or link_aceite is not null),
    constraint ck_avisos_saida check (dispensavel or texto_aceite is not null),
    constraint ck_avisos_periodo check (inicio_em is null or fim_em is null or fim_em > inicio_em)
);

create index idx_avisos_ativos on avisos (ordem) where ativo;

-- aceite de usuários logados (visitantes guardam no navegador); só a versão mais recente aceita
create table aviso_aceites (
    id         bigserial primary key,
    aviso_id   bigint  not null references avisos (id) on delete cascade,
    usuario_id bigint  not null references usuarios (id) on delete cascade,
    versao     integer not null,
    aceito_em  timestamp with time zone not null default now(),
    constraint uk_aviso_aceites unique (aviso_id, usuario_id)
);

-- aviso de cookies (LGPD), já ativo; o texto e o link da política podem ser ajustados no painel
insert into avisos (nome, titulo, mensagem, tipo, posicao, severidade, icone, dispensavel, modal,
                    texto_aceite, acao_aceite, publico, areas, ativo, ordem)
values ('Uso de cookies', 'Este site usa cookies',
        '<p>Usamos cookies essenciais para o funcionamento do site e, com o seu consentimento, para lembrar suas preferências e melhorar a sua experiência. Ao continuar, você concorda com o uso de cookies.</p>',
        'MENSAGEM', 'bottom', 'secondary', 'pi-shield', false, false, 'Aceitar', 'FECHAR', 'TODOS',
        'SITE,CONTA,ADMIN', true, 0);
