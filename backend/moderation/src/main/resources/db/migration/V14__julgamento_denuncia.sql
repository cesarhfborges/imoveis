-- Julgamento da denúncia separado do encerramento:
--  * medida CORRIGIR: procedente com correção solicitada (a denúncia segue aberta, aguardando o anunciante);
--  * penalidade na conta: NENHUMA, STRIKE (conta para o banimento automático) ou BANIR_CONTA (banimento direto);
--  * julgado_em: quando foi julgada procedente (a janela do banimento automático conta a partir daqui).
alter table denuncias drop constraint if exists denuncias_medida_check;
alter table denuncias add constraint ck_denuncias_medida check (medida in ('MANTER', 'CORRIGIR', 'SUSPENDER', 'BANIR'));

alter table denuncias add column penalidade varchar(12) check (penalidade in ('NENHUMA', 'STRIKE', 'BANIR_CONTA'));
alter table denuncias add column julgado_em timestamp with time zone;

-- procedentes antigas: todas contavam para o banimento automático
update denuncias set penalidade = 'STRIKE', julgado_em = coalesce(resolvido_em, atualizado_em) where status = 'PROCEDENTE';

drop index if exists idx_denuncias_procedentes;
create index idx_denuncias_julgadas on denuncias (gravidade_id, julgado_em) where natureza is not null;
