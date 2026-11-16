// Depois do build do Angular: cria uma cópia do index.html em cada rota pública
// (dist/venda/index.html, dist/conta/login/index.html...) e um 404.html.
// Assim o site funciona em qualquer servidor de arquivos estáticos, mesmo sem
// regra de "fallback" para SPA. Em produção com o backend, use a regra de fallback
// do seu servidor (nginx/Apache) ou sirva o front pelo WAR.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const index = join(dist, 'index.html');
if (!existsSync(index)) {
    console.error('dist/index.html não encontrado. Rode o build do frontend antes.');
    process.exit(1);
}

const rotas = [
    'venda',
    'aluguel',
    'imovel-novo',
    'temporada',
    'imoveis',
    'mapa',
    'imobiliarias',
    'anunciar',
    'acesso-negado',
    'nao-encontrado',
    'conta',
    'conta/login',
    'conta/cadastro',
    'conta/perfil',
    'conta/favoritos',
    'conta/api',
    'conta/anuncios',
    'conta/anuncios/novo',
    'conta/contatos',
    'admin',
    'admin/login',
    'admin/anuncios',
    'admin/anuncios/novo',
    'admin/contatos',
    'admin/usuarios',
    'admin/configuracoes',
    'admin/api',
    'admin/perfil'
];

for (const r of rotas) {
    const pasta = join(dist, r);
    mkdirSync(pasta, { recursive: true });
    copyFileSync(index, join(pasta, 'index.html'));
}
copyFileSync(index, join(dist, '404.html'));
console.log(`Rotas estáticas criadas: ${rotas.length} + 404.html`);
