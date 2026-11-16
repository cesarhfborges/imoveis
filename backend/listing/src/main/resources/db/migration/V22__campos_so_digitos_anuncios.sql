-- CEP e telefones passam a ser gravados só com dígitos (o front formata ao exibir).
update imoveis  set cep      = nullif(regexp_replace(cep,      '\D', '', 'g'), '') where cep      is not null;
update contatos set telefone = nullif(regexp_replace(telefone, '\D', '', 'g'), '') where telefone is not null;
