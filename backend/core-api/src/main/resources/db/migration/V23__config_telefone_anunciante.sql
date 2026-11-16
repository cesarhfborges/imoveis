-- Exibição do telefone do anunciante no site: MOSTRAR (padrão), OCULTAR ou MOSTRAR_APENAS_LOGADO.
alter table configuracoes add column telefone_anunciante varchar(30) not null default 'MOSTRAR'
    check (telefone_anunciante in ('MOSTRAR', 'OCULTAR', 'MOSTRAR_APENAS_LOGADO'));
