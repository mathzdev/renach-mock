# Deploy no Coolify

Este guia publica o mock RENACH no [Coolify](https://coolify.io) a partir do repositório Git, usando o `Dockerfile` da raiz.

> O ambiente continua **demonstrativo**: dados fictícios, estado só em memória e nenhuma chamada externa. Publicar numa URL
> não muda isso. Na tela, o selo "Ambiente Demonstrativo — Dados Fictícios" continua visível.

## Como a aplicação roda em produção

- **Um contêiner só.** O build compila o front (`web/dist`) e a API (`api/dist`); a API NestJS serve o front em `/` e as
  rotas em `/api` na **mesma porta (3000)**. Não precisa de dois serviços nem de proxy para `/api`.
- **Sem banco, sem volume.** As sessões ficam na memória do processo (TTL de 2 h, até 500 sessões). Cada redeploy ou
  reinício zera o estado. É o comportamento esperado.
- **Uma réplica só.** Como a sessão vive na memória de um processo, não escale horizontalmente (com 2+ réplicas o navegador
  cairia em réplicas diferentes e "perderia" o que fez).
- **Healthcheck:** `GET /api/saude` (não exige o cabeçalho `X-Demo-Session`). Já está declarado no `Dockerfile`.

### Variáveis de ambiente

| Variável | Padrão na imagem | Para que serve |
|---|---|---|
| `HOST` | `0.0.0.0` | Interface de escuta. **Precisa** ser `0.0.0.0` no contêiner; fora do Docker o padrão é `127.0.0.1`. |
| `PORT` | `3000` | Porta interna. Se mudar, ajuste também "Ports Exposes" no Coolify. |
| `TZ` | `America/Sao_Paulo` | Fuso usado para calcular "hoje" (validades, vencimento de CNH). |
| `DEMO_HOJE` | (vazio) | Opcional. Fixa a data "hoje" no formato `aaaa-mm-dd` (ex.: `2026-11-14`, a mesma dos testes) para que o roteiro de demonstração dê sempre o mesmo resultado. |

Nenhuma delas é segredo. Em geral não é preciso configurar nada além do que a imagem já traz.

## Pré-requisitos

1. Uma instância do Coolify (v4) com um servidor conectado e o proxy (Traefik ou Caddy) ativo.
2. O código num repositório Git que o Coolify alcance (GitHub, GitLab, Gitea… público ou privado). Confirme que o
   `Dockerfile` e o `.dockerignore` estão commitados e enviados:
   ```bash
   git add Dockerfile .dockerignore DEPLOY.md api/src/main.ts
   git commit -m "Deploy no Coolify via Dockerfile"
   git push
   ```
3. (Opcional) Um domínio ou subdomínio com registro DNS `A` apontando para o IP do servidor do Coolify, por exemplo
   `renach-mock.seudominio.com.br`.

## Passo a passo

### 1. Conectar o repositório

- **Repositório público:** pule para o passo 2 e use a opção *Public Repository*.
- **Repositório privado no GitHub:** em **Sources → + Add → GitHub App**, siga o assistente para instalar o GitHub App do
  Coolify na sua conta/organização e libere o acesso ao repositório `renach-mock`.
  (Alternativa: *Private Repository (with Deploy Key)*, colando a chave pública gerada pelo Coolify em
  *GitHub → Settings do repositório → Deploy keys*.)

### 2. Criar o recurso

1. Em **Projects**, abra (ou crie) um projeto e escolha o ambiente (ex.: `production`).
2. Clique em **+ New Resource**.
3. Escolha a origem: *Public Repository*, *Private Repository (with GitHub App)* ou *(with Deploy Key)*.
4. Selecione o servidor e o repositório; branch **`main`**.
5. Em **Build Pack**, escolha **Dockerfile** (não Nixpacks).
6. Base Directory: `/`. Dockerfile Location: `/Dockerfile`.
7. Em **Ports Exposes**, informe **`3000`**.
8. Clique em **Continue**/**Save**.

### 3. Configurar domínio e HTTPS

Na aba **Configuration → General** do recurso:

- **Domains:** coloque a URL com o esquema, por exemplo `https://renach-mock.seudominio.com.br`.
  O Coolify gera o certificado Let's Encrypt sozinho (o DNS precisa já estar apontando para o servidor).
- Sem domínio próprio, deixe o domínio gerado pelo Coolify (`http://<id>.<ip>.sslip.io`) para testar.
- Deixe **Ports Mappings** vazio: o proxy do Coolify encaminha para a porta 3000 do contêiner, e não é preciso publicar a
  porta no host.

### 4. Variáveis (opcional)

Em **Environment Variables**, só se quiser mudar o padrão:

```
DEMO_HOJE=2026-11-14
```

Marque como *Runtime only* (não é usada no build). Depois de alterar, faça **Redeploy**.

### 5. Healthcheck

O `Dockerfile` já tem `HEALTHCHECK` em `/api/saude`. Se preferir configurar pela interface, em **Healthcheck**:

| Campo | Valor |
|---|---|
| Path | `/api/saude` |
| Port | `3000` |
| Method | `GET` |
| Return code | `200` |

### 6. Deploy

Clique em **Deploy**. O primeiro build leva de 1 a 3 minutos (instala dependências e compila front e API). Acompanhe em
**Deployments → Logs**. O deploy terminou bem quando o log do contêiner mostra:

```
Nest application successfully started
API RENACH (demonstrativa) em http://0.0.0.0:3000/api — nenhuma transmissão externa.
```

### 7. Conferir

```bash
curl https://renach-mock.seudominio.com.br/api/saude
# {"ok":true,"ambiente":"Demonstrativo — dados fictícios","transmissao":"nenhuma"}
```

Abra a URL no navegador e siga o roteiro do README (ex.: "MARINA · 90011834250").

### 8. Deploy automático (opcional)

- **Com GitHub App:** em **Configuration → Advanced**, ative *Auto Deploy*. Todo push na `main` gera um deploy.
- **Com Deploy Key / repositório público:** em **Webhooks**, copie a URL do webhook do GitHub, cadastre-a em
  *GitHub → Settings → Webhooks* (content type `application/json`, com o segredo definido no Coolify) e ative *Auto Deploy*.

## Testar a imagem localmente antes

```bash
docker build -t renach-mock .
docker run --rm -p 3000:3000 renach-mock
# abra http://localhost:3000  ·  healthcheck: curl localhost:3000/api/saude
```

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| **502 Bad Gateway** / "no available server" | Porta errada ou app escutando só em `127.0.0.1` | Confirme **Ports Exposes = 3000** e que `HOST` não foi sobrescrito para `127.0.0.1`. |
| Build usa Nixpacks e falha | Build Pack errado | Troque para **Dockerfile** em *Configuration → General* e faça redeploy. |
| Certificado não é emitido | DNS ainda não aponta para o servidor, ou domínio sem `https://` | Verifique o registro `A` e escreva o domínio com `https://`. |
| Os dados "somem" | Redeploy/reinício ou mais de uma réplica | É esperado: o estado é só em memória. Mantenha uma réplica. "Reiniciar demonstração" restaura a massa. |
| Datas do roteiro diferentes do README | "Hoje" é a data real | Defina `DEMO_HOJE=2026-11-14` (data dos testes). |
| Contêiner `unhealthy` | API não subiu | Veja os logs do contêiner no Coolify; o healthcheck consulta `/api/saude` na porta `PORT`. |

## O que foi ajustado no projeto para o deploy

- `api/src/main.ts`: host de escuta configurável por `HOST` (padrão local continua `127.0.0.1`) e *shutdown hooks* para o
  contêiner encerrar limpo nos redeploys.
- `Dockerfile` (multi-stage, `node:22-alpine`): compila front e API, leva para a imagem final só as dependências de
  produção da API, roda como usuário `node`, com `HEALTHCHECK` e fuso `America/Sao_Paulo`.
- `.dockerignore`: deixa `node_modules`, `dist`, `.git`, testes e e2e fora do contexto de build.
