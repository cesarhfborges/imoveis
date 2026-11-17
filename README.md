# Imóveis — portal de anúncios

Projeto inspirado em portais de classificados de imóveis (referências em `docs/referencias/`), sem copiar marca nem conteúdo.

```
/backend    Spring Boot 4.1.2 · Java 17 · Maven multi-módulo (shared-kernel, listing, core-api) · WAR · PostgreSQL
/frontend   Angular 21 · PrimeNG 21 · base Sakai NG (sem o histórico do repositório original, com os assets do submódulo)
/docs       prints de referência
```

## Três partes do front

1. **Site público** (sem login): início, busca (`/venda`, `/aluguel`, `/imovel-novo`, `/temporada`), página do imóvel, mapa (OpenStreetMap) e `/anunciar`.
2. **Conta** (`/conta`, login em `/conta/login` para cliente e corretor na mesma tela): favoritos, meus dados, tokens da API e, para corretor, anúncios e contatos recebidos.
3. **Administração** (`/admin`, login próprio em `/admin/login`): painel, anúncios de todos (aprovar, bloquear, destacar, editar), contatos, usuários e permissões, configurações do site (nome, slogan, logos claro/escuro, favicon, SEO, contato, tema: cor primária, surface, preset e modo claro/escuro/automático, regras de moderação).

Tema: cada visitante pode ajustar cor/surface/preset e o modo **claro / escuro / automático** pelo botão no topo; o padrão do site é definido pelo administrador.

## Desenvolvimento com hot reload

```bash
# 1) backend (porta 8080) — veja backend/_docs/README.md
cd backend && mvn -pl core-api -am spring-boot:run

# 2) frontend (porta 4200, com proxy /app e /api para o backend)
cd frontend && npm install && npm start
```

Sem o backend rodando, o front entra sozinho em **modo demonstração** (dados de exemplo salvos no navegador) — útil para ver o visual. Para desligar isso em produção: `frontend/src/environments/environment.ts` → `demoFallback: false`.

Logins de exemplo: `admin@imoveis.local / admin12345` (em `/admin/login`), `corretor@imoveis.local / corretor123`, `cliente@imoveis.local / cliente123`.

## Build

```bash
npm install && npm run build   # front em ./dist (com uma página por rota pública)
npm run build:backend          # backend/core-api/target/imoveis.war
```

## Ferramentas de IA do projeto

`.mcp.json` (na raiz) registra os servidores MCP do Angular CLI, do PrimeNG (`@primeng/mcp`) e do PostgreSQL de dev.
`CLAUDE.md` traz o contexto global do monorepo; `backend/CLAUDE.md` e `frontend/CLAUDE.md` trazem as regras de cada parte
(o Claude Code carrega cada um sob demanda ao trabalhar na pasta).
