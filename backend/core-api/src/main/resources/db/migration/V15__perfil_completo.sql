-- Perfil mais completo: contato, atuação profissional (anunciantes) e endereço.
alter table usuarios add column razao_social     varchar(160);
alter table usuarios add column whatsapp         varchar(30);
alter table usuarios add column email_contato    varchar(160);
alter table usuarios add column site             varchar(200);
alter table usuarios add column instagram        varchar(100);
alter table usuarios add column facebook         varchar(200);
alter table usuarios add column sobre            varchar(2000);
alter table usuarios add column creci_uf         varchar(2);
alter table usuarios add column regioes_atuacao  varchar(500);
alter table usuarios add column atuando_desde    smallint check (atuando_desde is null or atuando_desde between 1900 and 2100);
alter table usuarios add column cep              varchar(9);
alter table usuarios add column logradouro       varchar(160);
alter table usuarios add column numero           varchar(20);
alter table usuarios add column complemento      varchar(80);
alter table usuarios add column bairro           varchar(80);
alter table usuarios add column cidade           varchar(80);
alter table usuarios add column uf               varchar(2);
