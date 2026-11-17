-- Exclusão de conta (LGPD): as denúncias que a pessoa fez continuam no histórico de moderação
-- (são a origem de penalidades aplicadas a terceiros), mas sem o vínculo com ela.
alter table denuncias alter column denunciante_id drop not null;

alter table denuncias drop constraint denuncias_denunciante_id_fkey;
alter table denuncias add constraint denuncias_denunciante_id_fkey
    foreign key (denunciante_id) references usuarios (id) on delete set null;
