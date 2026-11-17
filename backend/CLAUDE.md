# Backend — regras do Spring Boot

Spring Boot **4.1.2** · Java **17** · Maven multi-módulo · empacotado como **WAR** · PostgreSQL · Flyway.
Referência completa de rotas, segurança e perfis: `_docs/README.md`.

## Módulos e dependências

`groupId` `br.com.chfb` · pacote base `br.com.chfb.imoveis.<modulo>`

| Módulo | Responsabilidade | Depende de |
|---|---|---|
| `shared-kernel` | perfis, `AuthUser`, exceções, `PageResponse`, `ApiError`, `BaseEntity`, eventos e **portas** (`AnuncianteProvider`, `ModeracaoPolicy`) | — |
| `listing` | anúncios (`Imovel`, `Contato`, `Favorito`), busca, controllers públicos/corretor/admin | shared-kernel |
| `platform` | avisos, calendário, notificações, texto (jsoup), tempo real (Pusher/Soketi) | shared-kernel |
| `moderation` | denúncias, julgamento, gravidades | shared-kernel, listing, platform |
| `core-api` (WAR) | `ImoveisApplication`, segurança, usuários, login, tokens, configuração do site, uploads, seed | todos |

- **Respeite a direção das dependências.** `listing` e `platform` não conhecem `moderation` nem `core-api`.
  Quando um módulo de baixo precisa de algo de cima, crie uma **porta** em `shared-kernel` e implemente no módulo de
  cima, ou publique um **evento** (`sharedkernel.event`).
- Organização interna de cada módulo: `config`, `controller`, `dto`, `entity`, `exception`, `repository`,
  `security`, `service` (crie só os pacotes necessários).

## Convenções de código

- Injeção por construtor (campos `final`); nada de `@Autowired` em campo. O projeto **não usa Lombok**.
- Controllers finos: validação com Bean Validation (`@Valid`) nos DTOs, regra de negócio no `service`.
- Nunca expor entidades JPA na API — sempre DTO (preferir `record`).
- Listagens paginadas retornam `PageResponse`; erros saem como `ApiError` via exceções do `shared-kernel`.
- `@Transactional` no service; leitura com `@Transactional(readOnly = true)`.
- Cuidado com N+1: use `JOIN FETCH`/`@EntityGraph` ou projeções em buscas de listagem.
- Campos de documento/telefone são armazenados **só com dígitos** (ver migrations `*_so_digitos_*`).
- Texto rico vindo do usuário passa pela sanitização do módulo `platform` (jsoup) antes de salvar.

## Segurança (resumo — não afrouxar)

- `/app/**`: sessão por cookie + CSRF + `FrontendOnlyFilter`. Não desligue CSRF nem amplie CORS para resolver bug.
- `/api/v1/**`: Bearer `imv_…`, só o hash SHA-256 fica no banco.
- `/app/corretor/**` e `/api/v1/corretor/**` → `ROLE_CORRETOR`, **somente os próprios anúncios** (sempre filtrar pelo
  usuário autenticado no service, não só no controller).
- `/app/admin/**` e `/api/v1/admin/**` → `ROLE_ADMIN`.
- Rota nova: declare a autorização explicitamente na configuração de segurança do `core-api`.

## Banco e migrations (Flyway)

- Cada módulo tem suas migrations em `src/main/resources/db/migration`, mas **a numeração é global** entre todos os
  módulos. Antes de criar uma, verifique a maior versão existente:
  `ls backend/*/src/main/resources/db/migration` (hoje a última é **V30**; a próxima é V31).
- Nunca edite uma migration já aplicada; crie outra.
- Nome: `V<n>__descricao_em_snake_case.sql`, colocada no módulo dono da tabela.
- Banco de dev: `jdbc:postgresql://localhost:5432/imoveis`, usuário `admin` / `secretpassword`
  (`core-api/src/main/resources/application-dev.yml`). O MCP `postgres` serve para consultar, não para alterar schema.

## Perfis de configuração

- `application.yml` (completo = produção, segredos por env; sempre carregado) → `application-dev.yml` (estende a
  base; só com o perfil `dev`, que o `spring-boot:run` ativa por padrão via perfil Maven `dev`).
- Configuração nova: valor de produção em `application.yml` com `${VAR:padrão}`; em `application-dev.yml` só o que
  muda em dev.

## Comandos

```bash
mvn -pl core-api -am spring-boot:run      # rodar em dev (8080, devtools)
mvn test                                  # todos os testes
mvn -pl listing test                      # testes de um módulo
mvn -pl listing -Dtest=InicioTelefoneTest test
mvn -Pprod package                        # core-api/target/imoveis.war
```

## Testes

- JUnit 5 (`spring-boot-starter-test`), no mesmo pacote da classe testada.
- Prefira testes unitários de regra (ex.: `PerfilHierarquiaTest`, `GravidadeTest`); use `@WebMvcTest` para controller
  e segurança.
- Ao corrigir bug, adicione um teste que reproduz o caso.

## Ferramentas

- Prefira o MCP `idea` (IntelliJ) para checar problemas do arquivo, buscar símbolos e fazer rename refactoring.
- Mudou DTO ou rota usada pelo front? Atualize também `frontend/src/app/core/models/models.ts`, o service
  correspondente e o modo demonstração (`frontend/src/app/core/demo`).
