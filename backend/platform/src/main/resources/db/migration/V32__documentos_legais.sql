-- Documentos do site (termos de uso, política de privacidade/LGPD, código de conduta…), editados pela
-- administração (Configurações › Documentos) e lidos em /documentos.
--
--  * ativo                 : fora do site e sem exigir aceite quando falso (os aceites já dados são mantidos);
--  * publico               : aparece na central /documentos e no rodapé (inativo nunca aparece);
--  * aceite_cadastro       : caixa obrigatória "Li e aceito" ao criar conta;
--  * aceite_contas         : quem já tem conta precisa aceitar a versão atual ao entrar (bloqueia até aceitar);
--  * aceite_perfil         : para quem vale o aceite (TODOS, CLIENTE ou CORRETOR);
--  * versao                : sobe quando o administrador publica uma nova versão; cada aceite guarda a versão aceita;
--  * excluido_em           : exclusão lógica (some do painel, pode ser restaurado; versões e aceites ficam guardados).
create table documentos (
    id               bigserial primary key,
    tipo             varchar(20)  not null
                     check (tipo in ('TERMOS_USO', 'PRIVACIDADE', 'CODIGO_CONDUTA', 'COOKIES', 'CONTRATO', 'OUTRO')),
    titulo           varchar(120) not null,
    slug             varchar(80)  not null,
    resumo           varchar(300),
    conteudo         text         not null default '',
    versao           integer      not null default 1,
    versao_em        timestamp with time zone not null default now(),
    ativo            boolean      not null default false,
    publico          boolean      not null default true,
    aceite_cadastro  boolean      not null default false,
    aceite_contas    boolean      not null default false,
    aceite_perfil    varchar(10)  not null default 'TODOS' check (aceite_perfil in ('TODOS', 'CLIENTE', 'CORRETOR')),
    ordem            integer      not null default 0,
    excluido_em      timestamp with time zone,
    criado_em        timestamp with time zone not null default now(),
    atualizado_em    timestamp with time zone not null default now()
);

create unique index uk_documentos_slug on documentos (slug) where excluido_em is null;

-- histórico: o texto de cada versão publicada (o que exatamente cada pessoa aceitou)
create table documento_versoes (
    id             bigserial primary key,
    documento_id   bigint       not null references documentos (id) on delete cascade,
    versao         integer      not null,
    titulo         varchar(120) not null,
    conteudo       text         not null,
    nota           varchar(300),
    publicado_por  bigint references usuarios (id) on delete set null,
    publicado_em   timestamp with time zone not null default now(),
    constraint uk_documento_versao unique (documento_id, versao)
);

-- comprovação do aceite (LGPD): quem, qual versão, quando, de onde
create table documento_aceites (
    id           bigserial primary key,
    documento_id bigint      not null references documentos (id) on delete cascade,
    usuario_id   bigint      not null references usuarios (id) on delete cascade,
    versao       integer     not null,
    origem       varchar(10) not null check (origem in ('CADASTRO', 'CONTA')),
    ip           varchar(45),
    aceito_em    timestamp with time zone not null default now(),
    constraint uk_documento_aceite unique (documento_id, usuario_id, versao)
);

create index idx_documento_aceites_usuario on documento_aceites (usuario_id);

-- modelos iniciais, desativados: a administração revisa o texto antes de publicar
insert into documentos (tipo, titulo, slug, resumo, conteudo, ordem, aceite_cadastro) values
('TERMOS_USO', 'Termos de uso', 'termos-de-uso', 'Regras para usar o portal, criar conta e anunciar imóveis.',
 '<h1>Termos de uso</h1><p><em>Modelo inicial: revise e complete antes de ativar.</em></p><h2>1. Aceitação</h2><p>Ao criar uma conta ou usar o portal, você concorda com estes termos.</p><h2>2. Cadastro e conta</h2><p>[Descreva as regras de cadastro, responsabilidade pela senha e veracidade dos dados.]</p><h2>3. Anúncios</h2><p>[Regras para publicar anúncios, conteúdo proibido e moderação.]</p><h2>4. Responsabilidades</h2><p>[Limites de responsabilidade do portal e dos anunciantes.]</p><h2>5. Alterações destes termos</h2><p>[Como as mudanças serão comunicadas.]</p>',
 1, true),
('PRIVACIDADE', 'Política de privacidade (LGPD)', 'politica-de-privacidade', 'Como coletamos, usamos e protegemos os seus dados pessoais, conforme a LGPD.',
 '<h1>Política de privacidade</h1><p><em>Modelo inicial: revise e complete antes de ativar.</em></p><h2>1. Quem somos</h2><p>[Identificação do controlador dos dados e do encarregado (DPO).]</p><h2>2. Dados que coletamos</h2><p>[Dados de cadastro, de navegação, de contato com anunciantes.]</p><h2>3. Para que usamos</h2><p>[Finalidades e bases legais (Lei nº 13.709/2018, art. 7º).]</p><h2>4. Compartilhamento</h2><p>[Com quem os dados são compartilhados.]</p><h2>5. Seus direitos</h2><p>[Acesso, correção, exclusão, portabilidade e revogação do consentimento (art. 18).]</p><h2>6. Retenção e segurança</h2><p>[Por quanto tempo os dados ficam guardados e como são protegidos.]</p><h2>7. Contato</h2><p>[Canal para exercer os direitos.]</p>',
 2, true),
('CODIGO_CONDUTA', 'Código de conduta', 'codigo-de-conduta', 'O comportamento esperado de anunciantes e usuários no portal.',
 '<h1>Código de conduta</h1><p><em>Modelo inicial: revise e complete antes de ativar.</em></p><h2>1. Respeito</h2><p>[Comunicação respeitosa entre clientes e anunciantes.]</p><h2>2. Anúncios verdadeiros</h2><p>[Fotos, preços e descrições fiéis ao imóvel.]</p><h2>3. Condutas proibidas</h2><ul><li>[Discriminação]</li><li>[Anúncios falsos ou duplicados]</li><li>[Uso indevido de dados de contato]</li></ul><h2>4. Denúncias e penalidades</h2><p>[Como denunciar e o que acontece.]</p>',
 3, false);

update documentos set aceite_perfil = 'CORRETOR' where slug = 'codigo-de-conduta';

-- versão 1 dos modelos no histórico
insert into documento_versoes (documento_id, versao, titulo, conteudo, nota)
select id, 1, titulo, conteudo, 'Modelo inicial' from documentos;
