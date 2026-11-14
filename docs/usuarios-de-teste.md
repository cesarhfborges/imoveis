# Usuários de teste

Criados automaticamente pelo backend no perfil **dev** (`app.seed.demo: true`), quando a tabela de anúncios está vazia,
e também pelo **modo demonstração** do front (quando a API não responde). Nunca são criados em produção.

| Perfil | E-mail | Senha | Onde entrar | Pode entrar como |
|---|---|---|---|---|
| Administrador | `admin@imoveis.local` | `admin12345` | `/admin/login` (admin) ou `/conta/login` (corretor/cliente) | Admin, Corretor, Cliente |
| Corretor | `corretor@imoveis.local` | `corretor123` | `/conta/login` | Corretor, Cliente |
| Imobiliária | `imobiliaria@imoveis.local` | `corretor123` | `/conta/login` | Corretor, Cliente |
| Cliente | `cliente@imoveis.local` | `cliente123` | `/conta/login` | Cliente |

Na tela de login (em `ng serve`/desenvolvimento e no modo demonstração) aparece o quadro **Usuários de teste**: um clique preenche e entra.

## Se os usuários não aparecerem no banco

O seed só roda quando a tabela `imoveis` está vazia. Para recriar tudo do zero em dev:

```sql
-- no banco "imoveis"
drop schema public cascade; create schema public;
```

Depois reinicie o backend (o Flyway recria as tabelas e o seed cria os usuários e 16 anúncios).

## Produção

Defina `APP_ADMIN_EMAIL` e `APP_ADMIN_SENHA` (e opcionalmente `APP_ADMIN_NOME`): o primeiro administrador é criado
na subida se ainda não existir nenhum.
