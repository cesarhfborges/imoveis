-- Cada foto informa se foi criada/alterada com IA (true) ou se é foto real sem alterações (false)
alter table imovel_fotos add column editada_ia boolean not null default false;
