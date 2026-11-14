# Backend — imoveis

Spring Boot 4.1.2 · Java 17 · Maven multi-módulo · empacotado como **WAR** · PostgreSQL · Flyway.

- **groupId** `br.com.chfb` · **artifactId** `imoveis` · **pacote base** `br.com.chfb.imoveis`

## Módulos

| Módulo | Pacote | O que tem |
|---|---|---|
| `shared-kernel` | `br.com.chfb.imoveis.sharedkernel` | Perfis (`Perfil`, hierarquia de login), `AuthUser`, exceções, `PageResponse`, `ApiError`, `BaseEntity` e portas (`AnuncianteProvider`, `ModeracaoPolicy`) |
| `listing` | `br.com.chfb.imoveis.listing` | Anúncios: entidades `Imovel`, `Contato`, `Favorito`; busca com filtros; controllers públicos, de gestão (corretor/admin) e de favoritos; migração `V2__anuncios.sql` |
| `core-api` (WAR) | `br.com.chfb.imoveis.coreapi` | `ImoveisApplication`, segurança, usuários, login, tokens de API, configuração do site, uploads, seed de dados; migração `V1__identidade.sql` |

Cada módulo segue a mesma organização: `config`, `controller`, `dto`, `entity`, `exception`, `repository`, `security`, `service`.

## Perfis de configuração (YAML)

- `application.yml` — base; o perfil ativo vem do **perfil Maven**.
- `application-prod.yml` — configuração completa de produção (valores sensíveis por variáveis de ambiente).
- `application-dev.yml` — **estende o prod**: é ativado como `prod,dev`, então o Spring carrega o prod e depois o dev, que só sobrescreve o necessário (banco local, cookie sem `secure`, hot reload, dados de exemplo).

| Comando | Perfis Spring |
|---|---|
| `mvn ...` (padrão, perfil Maven `dev`) | `prod,dev` |
| `mvn -Pprod ...` | `prod` |
| variável `SPRING_PROFILES_ACTIVE` | sobrescreve em tempo de execução |

## Rodar em desenvolvimento (hot reload)

```bash
# banco: crie um database "imoveis" no seu Postgres (dev usa admin/secretpassword em localhost:5432)
cd backend
mvn -pl core-api -am spring-boot:run
```

O `spring-boot-devtools` reinicia a aplicação quando as classes são recompiladas (na IDE: "Build Project"/salvar com compilação automática) e avisa o navegador via LiveReload. As pastas `target/classes` de `listing` e `shared-kernel` também são observadas.

Usuários criados automaticamente em dev: `admin@imoveis.local / admin12345`, `corretor@imoveis.local / corretor123`, `imobiliaria@imoveis.local / corretor123`, `cliente@imoveis.local / cliente123`.

## Gerar o WAR

```bash
mvn -Pprod package        # core-api/target/imoveis.war
java -jar core-api/target/imoveis.war   # também roda sozinho (Tomcat embutido)
```

Para Tomcat externo: copie `imoveis.war` para `webapps/`. O `META-INF/context.xml` define o cookie de sessão como `SameSite=Strict`.

Variáveis de produção: `DB_URL`, `DB_USER`, `DB_PASSWORD`, `APP_FRONTEND_ORIGINS` (origens do front, separadas por vírgula), `APP_API_CORS_ORIGINS`, `APP_UPLOADS_DIR`, `APP_ADMIN_EMAIL` + `APP_ADMIN_SENHA` (cria o primeiro administrador).

## Segurança

### API do site — `/app/**` (cookie de sessão, só para o front)
- Login: `POST /app/auth/login` `{email, senha, perfil, area}` → cookie `IMOVEIS_SESSION` (`HttpOnly`, `SameSite=Strict`, `Secure` em prod).
- CSRF obrigatório (cookie `XSRF-TOKEN` → cabeçalho `X-XSRF-TOKEN`; o Angular envia sozinho). `GET /app/auth/csrf` garante o cookie.
- Trava de origem (`FrontendOnlyFilter`): recusa chamadas de outros sites (`Sec-Fetch-Site: cross-site`), `Origin` desconhecida, e métodos de escrita sem `Origin`/`Referer` permitidos.
- CORS liberado só para `app.security.frontend-origins`.

### API aberta — `/api/v1/**` (token Bearer, sem sessão)
- **Só corretores e administradores** têm tokens (clientes não). Gerados em *Tokens da API* (front) ou `POST /app/conta/tokens`, com perfil CORRETOR ou ADMIN. Formato `imv_…`; só o hash SHA-256 fica no banco.
- `Authorization: Bearer imv_...`

### Perfis e hierarquia
| Papel do usuário | Pode entrar como |
|---|---|
| Cliente | Cliente |
| Corretor | Corretor, Cliente |
| Administrador | Administrador, Corretor, Cliente |

- `/conta/login` (front) aceita **Cliente** ou **Corretor**; o perfil **Administrador** só entra por `/admin/login` (`area: "admin"`).
- A sessão/token carrega **apenas o perfil escolhido** (`ROLE_CLIENTE`, `ROLE_CORRETOR` ou `ROLE_ADMIN`).
- `/app/corretor/**` e `/api/v1/corretor/**` → CORRETOR (somente os próprios anúncios).
- `/app/admin/**` e `/api/v1/admin/**` → ADMIN (anúncios de todos, usuários, configurações).

## Principais rotas

| Método e rota | Quem |
|---|---|
| `GET /app/public/imoveis` (+ `/api/v1/imoveis`) — busca com filtros `finalidade, tipo, uf, cidade, bairro, quartos, vagas, precoMin, precoMax, areaMin, q, ordem, page, size` | público / token |
| `GET /app/public/imoveis/{id}`, `/destaques`, `/opcoes`, `/contagem-tipos`, `/mapa`, `/{id}/similares` | público |
| `POST /app/public/imoveis/{id}/contato` | público |
| `GET/POST /app/corretor/imoveis`, `GET/PUT/DELETE /app/corretor/imoveis/{id}`, `PATCH .../status` | corretor |
| `GET /app/corretor/contatos`, `PATCH /app/corretor/contatos/{id}?lido=` | corretor |
| as mesmas rotas em `/app/admin/...` | admin (todos os anúncios) |
| `GET /app/admin/dashboard`, `GET/POST/PUT/DELETE /app/admin/usuarios` | admin |
| `GET /app/public/configuracao`, `PUT /app/admin/configuracao` | público / admin |
| `GET/PUT /app/conta/perfil`, `PUT /app/conta/senha`, `/app/conta/favoritos` | logado |
| `/app/conta/tokens` | corretor / admin (clientes não têm token) |
| `POST /app/uploads` (multipart `arquivo`) | corretor / admin |
