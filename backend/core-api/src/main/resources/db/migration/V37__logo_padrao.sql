-- Logotipo "Imóveis Brasil" como logo em uso (arquivos em frontend/public/marca).
-- Continua editável em /admin/configuracoes: removendo o logo, o site volta a mostrar o nome.
update configuracoes
   set logo_url        = '/marca/logo.png',
       logo_escuro_url = '/marca/logo-branco.png';
