-- Texto colado de Word/Docs/chat chegou com todo espaço como &nbsp; (espaço não separável): os parágrafos não
-- quebravam linha e vazavam da página. A partir de agora o backend normaliza ao salvar; aqui corrige o que já
-- foi gravado (só espaços: o texto de cada versão aceita não muda).
update documentos set conteudo = replace(replace(conteudo, '&nbsp;', ' '), chr(160), ' ')
where conteudo like '%&nbsp;%' or position(chr(160) in conteudo) > 0;

update documento_versoes set conteudo = replace(replace(conteudo, '&nbsp;', ' '), chr(160), ' ')
where conteudo like '%&nbsp;%' or position(chr(160) in conteudo) > 0;
