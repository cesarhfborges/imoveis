-- CEP, CPF/CNPJ e telefones passam a ser gravados só com dígitos (o front formata ao exibir).
update usuarios set telefone  = nullif(regexp_replace(telefone,  '\D', '', 'g'), '') where telefone  is not null;
update usuarios set whatsapp  = nullif(regexp_replace(whatsapp,  '\D', '', 'g'), '') where whatsapp  is not null;
update usuarios set cep       = nullif(regexp_replace(cep,       '\D', '', 'g'), '') where cep       is not null;
update usuarios set documento = nullif(regexp_replace(documento, '\D', '', 'g'), '') where documento is not null;
update configuracoes set telefone_contato = nullif(regexp_replace(telefone_contato, '\D', '', 'g'), '') where telefone_contato is not null;
update configuracoes set whatsapp         = nullif(regexp_replace(whatsapp,         '\D', '', 'g'), '') where whatsapp         is not null;
