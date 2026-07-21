---
name: import-cloud-design-next
description: Importa layouts criados no Claude Design / Cloud Code Design (arquivos `.dc.html`) para dentro de um projeto Next.js, separando telas (frames), componentes reutilizáveis e assets automaticamente. Trabalha em dois modos — por link compartilhado ou por export manual do `.dc.html` em `design-import/input/`. Detecta o app Next (raiz ou `apps/`), o router (`app`/`pages`, com/sem `src/`), Tailwind, aliases do `tsconfig` e o design system existente; extrai e normaliza assets para `public/design-imports/{screen}/`; reaproveita componentes já existentes e gera a página + esqueletos TSX colocados. Nunca sobrescreve sem `--force` e suporta `--dry-run`.
tools: Read, Glob, Grep, Bash, Write, Edit
---

# import-cloud-design-next

Importa uma tela desenhada no **Claude Design / Cloud Code Design** para um projeto
**Next.js**, quebrando o layout em **telas (frames)**, **componentes reutilizáveis** e
**assets**, e escrevendo tudo em **TypeScript/TSX** no padrão do projeto de destino.

A estrutura e as convenções desta skill seguem a `config-shared-frontend` (detecção
flexível do app, respeito ao alias `@/`, componentes em `shared/` ou `components/`,
nada de perguntas desnecessárias, confirmação antes de sobrescrever).

## Quando usar

- Você tem um layout pronto no Claude Design (ex.: uma tela de **login**) e quer
  materializá-lo como página + componentes no seu projeto Next.js.
- Você quer que os **assets** (logos, ilustrações, backgrounds, ícones, SVGs, imagens
  base64) sejam extraídos e copiados para `public/`, sem depender de URLs remotas.
- Você quer **reaproveitar** componentes que já existem (`Button`, `Input`, etc.) em vez
  de duplicá-los.

## Como funciona (divisão de responsabilidades)

O script `scripts/apply.mjs` faz **todo o trabalho mecânico e seguro**: detecção do
ambiente, carregamento do design, extração de frames/CSS/assets, normalização e cópia dos
assets, varredura de componentes existentes, geração da página e dos **esqueletos** de
componentes, e o relatório.

Os componentes gerados são **esqueletos** (estrutura + composição + TODOs). O refino
visual/semântico fiel ao layout é feito **por você (ou pela IA)** a partir do HTML
extraído em `design-import/extracted/{screen}.html`. **Não há integração "mágica"** que
traduz pixel-perfeito o `.dc.html` em TSX — e o script nunca inventa conteúdo.

---

## Comando oficial

Execute a partir da raiz do repositório:

```bash
# Por link compartilhado (tenta acessar; se falhar, orienta o export manual)
node .claude/skills/import-cloud-design-next/scripts/apply.mjs --app=web --url="<link>" --screen=login

# Por arquivo exportado manualmente
node .claude/skills/import-cloud-design-next/scripts/apply.mjs --app=web --input="design-import/input/BancaFlow Login.dc.html" --screen=login

# Simular sem gravar nada
node .claude/skills/import-cloud-design-next/scripts/apply.mjs --screen=login --dry-run
```

### Flags

| Flag              | Descrição                                                                             |
| ----------------- | ------------------------------------------------------------------------------------- |
| `--app=<nome>`    | App de destino em `apps/`. Autodetecta se houver só um; ou rode dentro do app.        |
| `--url="<link>"`  | Link compartilhado do Claude Design.                                                  |
| `--input=<path>`  | Arquivo `.dc.html`/`.html`/`.json` local. Se ausente, procura em `design-import/input/`. |
| `--screen=<nome>` | **Obrigatório.** Nome da tela desejada (ex.: `login`).                                 |
| `--frame=<nome>`  | Nome exato do frame quando houver ambiguidade entre telas.                            |
| `--dry-run`       | Simula tudo sem gravar nada.                                                          |
| `--force`         | Permite sobrescrever arquivos existentes (por padrão, só cria os que faltam).         |

---

## Modo 1 — Link compartilhado

Passe `--url="https://claude.ai/design/p/...?file=...&via=share"`. O script tenta acessar
o conteúdo e extrair HTML/CSS/frames/assets.

> **Limitação conhecida.** Os links compartilhados do Claude Design costumam servir uma
> aplicação SPA (o layout é montado por JavaScript no navegador), então o HTML "cru"
> baixado por automação frequentemente **não** contém o design. Nesses casos o script
> detecta o "casulo" da SPA e cai para o **modo export manual**, exibindo:
>
> ```txt
> Não foi possível acessar o link compartilhado automaticamente.
> Baixe/exporte o arquivo .dc.html e coloque em design-import/input/.
> Se houver assets exportados, coloque-os em design-import/input/assets/.
> Depois execute novamente.
> ```

## Modo 2 — Export manual

1. No Claude Design, **baixe/exporte** o arquivo `.dc.html` da tela.
2. Coloque-o em:

   ```txt
   design-import/input/
   ```

3. Se houver assets exportados à parte (imagens, SVGs), coloque-os em:

   ```txt
   design-import/input/assets/
   ```

4. Rode novamente com `--input=` (ou deixe o script achar o arquivo automaticamente).

Arquivos aceitos em `design-import/input/`: `.dc.html`, `.html`, `.json`, `.css`.
A prioridade é `.dc.html` → `.html` → `.json`.

---

## Escolha da tela / frame

Cada **frame** do design é tratado como uma **tela**. O script identifica frames por
(em ordem de confiança): atributos `data-frame`/`data-screen`/`data-name`; depois
`<section>/<article>/<main>` de alto nível com `id`/`class`; por fim, o documento inteiro.

- `--screen=login` seleciona o frame cujo nome casa com `login`.
- Se houver **ambiguidade** (vários frames e nenhum casa), o script lista os nomes e pede
  para você informar `--frame="<nome exato>"`.

O HTML da tela selecionada é salvo em `design-import/extracted/{screen}.html` (e o CSS em
`{screen}.css`) como **referência para o refino** dos componentes.

---

## Assets

O script extrai e copia automaticamente para:

```txt
{app}/public/design-imports/{screen}/
```

Fontes suportadas: imagens `<img>` (com `alt` usado como nome semântico), `background-image:
url(...)`, imagens **base64** (convertidas para arquivo real), **SVG inline**, imagens
locais exportadas e URLs externas (baixadas quando possível).

Regras aplicadas:

- Nomes **limpos**: sem espaços, acentos ou caracteres especiais; evita genéricos como
  `image1.png` (usa o `alt` quando existe).
- Mantém a extensão correta; deduplica nomes em colisão.
- **Base64 → arquivo real.** **URL externa → download** (só tipos de imagem/CSS
  permitidos, por segurança).
- Se um asset não puder ser baixado/encontrado, vira **pendência** no relatório — o
  componente **nunca** fica dependendo de URL remota do Claude Design.
- Use `next/image` para PNG/JPG/JPEG/WEBP; SVG como arquivo em `public/` (ou componente
  React, conforme o padrão do projeto).

Exemplo no componente:

```tsx
import Image from "next/image";

<Image src="/design-imports/login/logo.svg" alt="Logo" width={140} height={48} />
```

---

## O que o script gera

Para `--screen=login`, o resultado fica parecido com:

```txt
{app}/public/design-imports/login/
  logo.svg
  login-background.png
  auth-illustration.svg

{app}/src/app/(public)/login/          # ou src/app/login, conforme o projeto
  page.tsx
  _components/
    LoginLayout.tsx
    LoginCard.tsx
    LoginForm.tsx
    BrandHeader.tsx
    AuthIllustration.tsx

{app}/src/shared/components/ui/         # ou src/components/ui
  Button.tsx
  Input.tsx
```

A página fica **limpa**, apenas compondo:

```tsx
import { LoginLayout } from "./_components/LoginLayout";

export default function LoginPage() {
  return <LoginLayout />;
}
```

### Regras de componentes

- **Globais** (`Button`, `Input`, `ThemeToggle`, `WindowControls`) → design system:
  `src/shared/components/ui/` (se o projeto usa `shared/`) ou `src/components/ui/`.
- **Específicos da tela** → `_components/` colocado junto da página.
- **Reuso primeiro.** Antes de criar, o script varre `shared/components/`, `components/` e
  `app/` por nome parecido. Se encontra, **reutiliza** (não sobrescreve) e registra no
  relatório. Se não, cria um esqueleto novo.
- **Componentes opcionais** (`AuthIllustration`, `ThemeToggle`, `WindowControls`) só entram
  se detectados no HTML do frame (ex.: `WindowControls` só se houver layout Electron).

### Alinhamento com `config-shared-frontend`

Quando você roda a `config-shared-frontend` **antes**, o `src/shared/` já existe com o kit
de UI (`button.tsx`, `input.tsx`, …) e o barrel `@/shared`. A import se adapta a isso:

- **Convenção de nome de arquivo** é detectada a partir dos componentes existentes. Se o
  projeto usa **kebab-case** (`button.tsx`, `sidebar-menu.component.tsx`), os novos arquivos
  também nascem kebab (`login-layout.tsx`, `login-form.tsx`); o **símbolo exportado**
  continua PascalCase (`export function LoginLayout`).
- **Imports de componentes reutilizados** apontam para o **arquivo real** (casing correto).
  Se houver `src/shared/index.ts` (barrel), usa o idioma do projeto:
  `import { Input, Button } from '@/shared'` — em vez de caminho profundo.
- **Não duplica** `Button`/`Input` que já existam no `shared/` — apenas os reutiliza.

- **Primitivos globais canônicos.** Se um primitivo global precisa ser **criado** e existe
  na pasta `assets/` da `config-shared-frontend` (ex.: `button.tsx`, `input.tsx`, `label.tsx`,
  `textarea.tsx`, `checkbox.tsx`, `radio-group.tsx`, …), o script **copia o arquivo canônico**
  (verbatim, com cva + `cn`) para `src/shared/components/ui/`, em vez de gerar um esqueleto
  simplificado. Também copia `src/shared/lib/class-name.util.ts` (dependência do `cn`) se faltar.
  Como esses arquivos usam `clsx`, `tailwind-merge`, `class-variance-authority` e
  `@radix-ui/react-slot`, o relatório avisa para **rodar a `config-shared-frontend`** (kit
  completo + instalação de deps) ou instalar as deps manualmente.

Assim o resultado da import fica praticamente na mesma configuração da
`config-shared-frontend`: mesmos componentes canônicos, mesma convenção de nome, mesmo
barrel `@/shared`. Primitivos que **não** existem no kit (ex.: `ThemeToggle`,
`WindowControls`) continuam sendo gerados como esqueletos para você refinar.

### Estilo e responsividade

- Usa **Tailwind** se o projeto já usa Tailwind (detectado automaticamente). Caso contrário,
  o script avisa e você deve adaptar para o padrão de estilo do projeto.
- Os esqueletos já nascem responsivos (mobile/tablet/desktop), com `min-h-screen`, layout
  de login centralizado e ilustração como painel lateral em `lg:`.
- Preserve tokens do design system existente (`bg-card`, `text-muted-foreground`, etc.) e o
  tema claro/escuro do projeto. Não crie paleta nova nem CSS global desnecessário.

---

## Passo de refino (você / IA)

Depois de rodar o script:

1. Abra `design-import/extracted/{screen}.html` (o HTML da tela) e o relatório.
2. Para cada componente com TODO em `_components/` e `ui/`, **preencha o JSX** fielmente ao
   layout, usando classes Tailwind/tokens do projeto.
3. Ajuste os `<Image>`/SVGs para apontar aos arquivos em `public/design-imports/{screen}/`.
4. Rode `npm run build` (ou `npx tsc --noEmit` no app) para validar tipos.

---

## Dry-run

`--dry-run` executa todo o pipeline (detecção, extração, plano) e imprime o resultado no
console **sem gravar nenhum arquivo** — nem componentes, nem assets, nem relatório. Use
para revisar o que **seria** feito antes de aplicar.

---

## Relatório

Ao final (fora do dry-run), é gravado:

```txt
design-import/report-{screen}.md
```

Contém: link usado, arquivo local usado, telas encontradas, tela importada, assets
encontrados/copiados/pendentes, componentes reutilizados, componentes novos, página
criada/alterada, lista de arquivos alterados, validações executadas e erros/pendências.

---

## Segurança

- **Nunca apaga** arquivos automaticamente.
- **Não sobrescreve** sem `--force`; por padrão só cria arquivos que faltam.
- Em `--dry-run`, **não grava nada**.
- Só baixa/copia arquivos de imagem/CSS permitidos (`.png .jpg .jpeg .webp .gif .avif .svg
  .ico .css`) — nada de scripts ou binários arbitrários.
- **Não executa** código vindo do HTML importado; apenas **parseia** o conteúdo.
- Componentes gerados **não** apontam para URLs remotas do Claude Design (validado no fim).

---

## Detecção automática (resumo)

| Detecção          | Como                                                                              |
| ----------------- | --------------------------------------------------------------------------------- |
| Workspace         | `apps/`, `workspaces`, `turbo.json`, `pnpm-workspace.yaml`.                        |
| App Next          | `--app` explícito → app único em `apps/` → raiz se for Next.                       |
| Router            | `src/app` / `app` (App Router) ou `src/pages` / `pages` (Pages Router).            |
| Tailwind          | deps, `tailwind.config.*` ou `postcss.config.*`.                                  |
| Alias             | `tsconfig.compilerOptions.paths` (procura `…/* → ./src/*`; default `@`).          |
| Design system     | `src/shared/components/ui` (convenção shared) ou `src/components/ui`.              |
| Barrel            | `src/shared/index.ts` → imports por `@/shared`.                                   |
| Nome de arquivo   | kebab vs Pascal, deduzido dos componentes existentes.                             |

---

## Limitações conhecidas do Claude Design compartilhado

- O link `?via=share` normalmente renderiza via SPA → o HTML cru pode não conter o layout.
  **Prefira o export manual do `.dc.html`** quando o modo link falhar.
- Assets podem estar embutidos como base64 ou referenciados por URL que exige sessão —
  nesses casos podem virar **pendência** e precisar de download manual para
  `design-import/input/assets/`.
- Os componentes gerados são **esqueletos**: a fidelidade final do layout depende do passo
  de refino a partir do HTML extraído.
```
