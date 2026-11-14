-- Origem de cada foto em três estados: REAL (foto real sem alterações), IA (criada/alterada com IA)
-- ou NAO_INFORMADO (o anunciante não informou).
-- O campo anterior era um booleano em que "false" era apenas o valor padrão do formulário, e não uma
-- declaração do anunciante de que a foto é real; por isso só "true" é aproveitado (vira IA).
alter table imovel_fotos add column origem varchar(20) not null default 'NAO_INFORMADO';
update imovel_fotos set origem = 'IA' where editada_ia;
alter table imovel_fotos drop column editada_ia;
alter table imovel_fotos add constraint ck_imovel_fotos_origem check (origem in ('REAL', 'IA', 'NAO_INFORMADO'));
