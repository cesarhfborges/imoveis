-- Registro do sistema "anúncio editado": o que mudou, campo a campo (JSON: [{campo, antes, depois}]).
alter table denuncia_mensagens add column alteracoes text;
