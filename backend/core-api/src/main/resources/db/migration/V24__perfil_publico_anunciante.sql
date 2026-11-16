-- Perfil público de corretores e imobiliárias (/anunciante/{id}) e posição do endereço no mapa.
alter table usuarios add column latitude       numeric(10, 7);
alter table usuarios add column longitude      numeric(10, 7);
alter table usuarios add column perfil_publico boolean not null default false;
