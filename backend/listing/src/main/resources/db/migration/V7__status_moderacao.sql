-- Status da moderação (SUSPENSO e BANIDO) e o status de antes deles, para reativar o anúncio como estava.
alter table imoveis add column status_anterior varchar(20);
