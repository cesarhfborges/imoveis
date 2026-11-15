-- Banimento da conta (manual ou automático pela moderação): a conta fica inativa e guarda quando e por quê.
alter table usuarios add column banido_em timestamp with time zone;
alter table usuarios add column banido_motivo varchar(300);
