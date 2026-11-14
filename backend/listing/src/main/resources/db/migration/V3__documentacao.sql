-- Documentação e condições de negócio do anúncio
alter table imoveis add column aceita_fgts          boolean not null default false;
alter table imoveis add column aceita_permuta       boolean not null default false;
alter table imoveis add column escritura_registrada boolean not null default false;
alter table imoveis add column quitado              boolean not null default false;
