# Frontend — regras do Angular

Você é especialista em TypeScript, Angular e aplicações web escaláveis. Escreva código funcional, de fácil
manutenção, performático e acessível, seguindo as boas práticas de Angular e TypeScript.

Stack: **Angular 21** (zoneless, standalone) · **PrimeNG 21** (tema Aura via `@primeuix/themes`) · Tailwind 4 +
`tailwindcss-primeui` · base Sakai NG · Leaflet (mapa) · pusher-js (tempo real) · Quill (editor) · date-fns.

## Estrutura

```
src/
├── app.config.ts / app.routes.ts   # providers globais e rotas (lazy com loadComponent)
├── environments/                   # apiUrl, demoFallback
└── app/
    ├── site/      # área pública
    ├── conta/     # área logada (cliente/corretor)
    ├── admin/     # administração
    ├── layout/    # shell, topo, menu, tema (Sakai)
    ├── shared/    # componentes, diretivas e páginas reutilizáveis
    └── core/
        ├── services/      # um service por domínio (imovel, auth, conta, moderacao…) sobre ApiService
        ├── models/        # models.ts — tipos espelhando os DTOs do backend
        ├── guards/        # perfil.guard.ts
        ├── interceptors/  # demo.interceptor.ts
        ├── demo/          # backend falso do modo demonstração
        └── pipes/
```

- Imports com alias `@/` (ex.: `@/app/core/services/api.service`).
- Chamadas HTTP sempre via `ApiService` (já usa `environment.apiUrl` e `withCredentials`). CSRF é tratado pelo
  `withXsrfConfiguration` — não envie o token manualmente.
- Endpoint novo: atualize `core/models/models.ts`, o service do domínio **e** `core/demo` (o modo demonstração precisa
  responder a ele).
- Textos da interface em português do Brasil; `LOCALE_ID` é `pt-BR`.

## TypeScript

- Tipagem estrita; prefira inferência quando o tipo for óbvio.
- Evite `any`; use `unknown` quando o tipo for incerto.

## Angular (versão 21 — não usar APIs exclusivas da v22+)

- Componentes standalone; **não** escreva `standalone: true` (já é o padrão).
- A aplicação é **zoneless** (`provideZonelessChangeDetection`): estado de tela em signals; nada de depender de
  zone.js/`setTimeout` para atualizar a view.
- Rotas de feature com lazy loading (`loadComponent`/`loadChildren`).
- Não use `@HostBinding`/`@HostListener`; use o objeto `host` do decorator.
- Use `NgOptimizedImage` para imagens estáticas (não funciona com base64 inline).
- Services singleton com `@Injectable({ providedIn: 'root' })` e `inject()` — o decorator `@Service` é da v22, não
  existe aqui.

### Componentes

- Pequenos e com responsabilidade única.
- `input()`, `output()` e `model()` em vez de decorators.
- `computed()` para estado derivado; `linkedSignal()` para estado derivado de várias fontes que precisa ser editável.
- Templates inline para componentes pequenos; caminhos relativos para template/estilo externos.
- Formulários: **Reactive Forms** (Signal Forms ainda é experimental na v21 — só usar se pedido).
- Não use `ngClass`/`ngStyle`; use bindings `[class]`/`[style]`.
- Não importe `CommonModule`; importe só as diretivas e pipes usados.

### Estado

- Signals para estado local; transformações puras e previsíveis.
- Use `set`/`update`, nunca `mutate`.

### Templates

- Simples, sem lógica complexa.
- Controle de fluxo nativo (`@if`, `@for` com `track`, `@switch`).
- `async` pipe para observables (ou `toSignal`).
- Não presuma globais como `new Date()` disponíveis no template.

## PrimeNG 21

- Use o MCP `primeng` (`get_component`, `get_example`, `validate_usage`) antes de usar um componente que ainda não
  aparece no projeto, e siga estritamente as APIs, estilos e padrões da **v21**.
- Overlays são anexados ao `body` (`overlayAppendTo: 'body'` em `app.config.ts`) — não sobrescreva por componente sem
  motivo.
- Modo escuro usa a classe `.app-dark`; cores via tokens do tema/Tailwind (`primary`, `surface-*`), nunca hex fixo,
  porque o administrador e o visitante podem trocar cor primária, surface e preset.
- Traduções globais do PrimeNG ficam em `app.config.ts`.

## Acessibilidade

- DEVE passar em todas as verificações do AXE.
- DEVE seguir os mínimos WCAG AA: foco, contraste de cor e atributos ARIA.

## Ferramentas e comandos

- MCP `angular-cli`: `get_best_practices`, `search_documentation` e `run_target` para build/lint.
- MCP `webstorm`: problemas do arquivo, lint e rename refactoring.
- Comandos: `npm start` (4200, proxy para 8080), `npm run build`, `npm run format` (Prettier), `npx eslint src`.
