-- Como o site abre um anúncio ao clicar: na mesma janela (padrão) ou em uma nova.
alter table configuracoes add column abrir_anuncio_nova_janela boolean not null default false;
