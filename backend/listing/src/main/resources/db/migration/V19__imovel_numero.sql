-- Número do endereço em campo próprio: o título público do anúncio é composto por logradouro, número, bairro e cidade.
alter table imoveis add column numero varchar(20);
