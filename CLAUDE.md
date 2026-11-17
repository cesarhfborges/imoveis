# Imóveis — portal de anúncios (monorepo)

Contexto global. Regras específicas ficam em:

- `backend/CLAUDE.md` — Spring Boot / Java / Maven / Flyway (aberto no **IntelliJ**)
- `frontend/CLAUDE.md` — Angular / PrimeNG / Tailwind (aberto no **WebStorm**)

Esses arquivos são carregados sob demanda quando o trabalho toca arquivos da pasta. Ao mudar algo que atravessa as duas
partes (contrato de API, autenticação, perfis), leia os dois.

## Idioma

- Responda e escreva comentários, mensagens de commit e documentação em **português do Brasil**, com acentuação correta.
- O domínio do código é em português (`Imovel`, `Anuncio`, `Denuncia`, `carregar()`, `perfil`); mantenha esse padrão
  em nomes novos. Termos técnicos consagrados (`service`, `repository`, `dto`, `guard`) ficam em inglês.

## Estrutura

```
app/
├── .mcp.json      # servidores MCP do projeto (angular-cli, primeng, postgres) — único, na raiz
├── backend/       # Spring Boot 4.1.2 · Java 17 · Maven multi-módulo · WAR · PostgreSQL · Flyway
├── frontend/      # Angular 21 · PrimeNG 21 · Tailwind 4 · base Sakai NG · zoneless
├── docs/          # prints de referência (docs/referencias) e usuários de teste
├── infra/         # docker-compose.dev.yml (Soketi — WebSocket/Pusher para tempo real)
└── scripts/       # rotas-estaticas.mjs (gera uma página por rota pública no build)
```

## Três áreas do produto

1. **Site público** (sem login): início, busca (`/venda`, `/aluguel`, `/imovel-novo`, `/temporada`), página do imóvel,
   mapa (OpenStreetMap/Leaflet) e `/anunciar`.
2. **Conta** (`/conta`, login em `/conta/login` para cliente e corretor): favoritos, meus dados, tokens da API e, para
   corretor, anúncios e contatos recebidos.
3. **Administração** (`/admin`, login em `/admin/login`): painel, moderação de anúncios e denúncias, usuários,
   configurações do site (identidade, SEO, tema, regras de moderação).

## Contrato entre front e back (não quebrar sem ajustar os dois lados)

- **`/app/**`** — API do site, só para o front: cookie de sessão `IMOVEIS_SESSION` + CSRF
  (`XSRF-TOKEN` → `X-XSRF-TOKEN`) + trava de origem (`FrontendOnlyFilter`).
- **`/api/v1/**`** — API aberta com `Authorization: Bearer imv_…` (só corretor/admin têm token).
- Perfis: `CLIENTE` < `CORRETOR` < `ADMIN`. A sessão carrega **apenas o perfil escolhido** no login; admin só entra
  por `/admin/login` (`area: "admin"`).
- Em dev, o front (porta 4200) faz proxy de `/app` e `/api` para o back (porta 8080) — `frontend/proxy.conf.json`.
- Sem backend, o front entra em **modo demonstração** (`core/demo` + `demo.interceptor`). Rota/DTO novo no back
  precisa de equivalente no demo para o front continuar funcionando sozinho.
- Detalhes completos de rotas e segurança: `backend/_docs/README.md`.

## Comandos

```bash
# backend (8080, hot reload com devtools)
cd backend && mvn -pl core-api -am spring-boot:run

# frontend (4200, com proxy)
cd frontend && npm start

# tempo real (opcional em dev)
docker compose -f infra/docker-compose.dev.yml up -d soketi

# build / testes a partir da raiz
npm run build            # front em ./dist + páginas estáticas por rota
npm run build:backend    # backend/core-api/target/imoveis.war
npm run test:backend
```

Usuários de teste (perfil dev / modo demonstração): ver `docs/usuarios-de-teste.md`.

## Ferramentas MCP

- `angular-cli` e `primeng` — usar para trabalho no frontend (ver `frontend/CLAUDE.md`).
- `postgres` — consultas **somente leitura** no banco local de dev (`imoveis`). Nunca altere schema por ele: mudanças
  de schema são sempre migrations Flyway (ver `backend/CLAUDE.md`).
- `idea` (IntelliJ) e `webstorm` — ferramentas das IDEs; prefira `idea` para o backend e `webstorm` para o frontend
  (problemas do arquivo, rename refactoring, busca de símbolos).

## Regras gerais

- Não versionar segredos. Valores de produção vêm de variáveis de ambiente (`DB_URL`, `DB_USER`, `DB_PASSWORD`, …).
- Não commitar `dist/`, `target/`, `node_modules/`, `.angular/`, `backend/**/.data`.
- Mudanças pequenas e focadas; não reformatar arquivos inteiros sem pedido.
