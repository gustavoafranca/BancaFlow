# Module Slice Workflow — exemplo ponta a ponta

Exemplo genérico de como implementar um fluxo completo dentro de um módulo existente, usando um módulo fictício `premios` e uma feature "listar prêmios ativos". Adaptar os nomes ao módulo real.

## 1. Contrato/tipos

Espelhar o DTO retornado pelo backend (nunca inventar campos que a API não devolve):

```ts
// modules/premios/types.ts
export interface PremioDto {
  id: string
  nome: string
  valorCentavos: number
  ativo: boolean
}
```

Se o pacote de domínio (`modules/premios` no backend/shared) já expõe esse tipo, reaproveitar por import em vez de redeclarar — só duplicar se o pacote de domínio não for consumível do Web (ex.: depende de Prisma).

## 2. Schema/mapper

```ts
// modules/premios/data/premio.schema.ts
import { v } from '@bancaflow/shared'

export const premioFilterSchema = v.defineObject({
  busca: { vo: v.string, optional: true },
})
export type PremioFilterData = v.infer<typeof premioFilterSchema>
```

```ts
// modules/premios/data/premio.mapper.ts
import type { PremioDto } from '../types'

export interface PremioViewModel {
  id: string
  nome: string
  valorFormatado: string
  status: 'Ativo' | 'Inativo'
}

export function toPremioViewModel(dto: PremioDto): PremioViewModel {
  return {
    id: dto.id,
    nome: dto.nome,
    valorFormatado: formatCentavos(dto.valorCentavos),
    status: dto.ativo ? 'Ativo' : 'Inativo',
  }
}
```

O mapeamento de DTO → view model vive no módulo — nunca em `shared`, mesmo que use um util genérico de `shared/lib/format.util.ts` internamente.

## 3. Cliente HTTP/hook

**Dois caminhos possíveis — nunca misturar.** `fetchWithRefresh` (`shared/session/refresh-on-expire.ts`) é **client-side apenas**: usa URL relativa, depende do browser para enviar os cookies HttpOnly (`credentials: 'include'` num `fetch` do servidor não encaminha os cookies da requisição recebida), faz silent refresh via um `inFlight` global pensado para um único browser, e redireciona com `window.location`. **Nunca importar `fetchWithRefresh` (ou qualquer cliente que dependa dela) dentro de um Server Component** — isso quebra em produção mesmo que compile.

### Caminho A — Client Component (é o padrão hoje usado no projeto)

Todo módulo hoje existente (`pessoas`, `cambistas`, `acerto`, `lancamentos`, `premios`, `perfil`) busca dados assim: cliente HTTP client-side + hook + página `'use client'`. Seguir esse padrão real, espelhando `shared/session/use-current-user.ts`:

```ts
// modules/premios/data/premios.client.ts
import { fetchWithRefresh } from '@/shared/session/refresh-on-expire'
import type { PremioDto } from '../types'

const BASE = '/api/premios'

export type ListPremiosResult =
  | { status: 'success'; data: PremioDto[] }
  | { status: 'error' }

export async function listPremios(): Promise<ListPremiosResult> {
  let res: Response
  try {
    res = await fetchWithRefresh(BASE, { method: 'GET' })
  } catch {
    return { status: 'error' }
  }
  if (!res.ok) return { status: 'error' }
  const body = await safeJson<PremioDto[]>(res)
  if (!body) return { status: 'error' }
  return { status: 'success', data: body }
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}
```

```ts
// modules/premios/data/use-premios.ts
'use client'

import { useEffect, useState } from 'react'
import { listPremios } from './premios.client'
import { toPremioViewModel, type PremioViewModel } from './premio.mapper'

export type PremiosState =
  | { status: 'loading' }
  | { status: 'success'; data: PremioViewModel[] }
  | { status: 'error' }

export function usePremios(): PremiosState {
  const [state, setState] = useState<PremiosState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    listPremios().then((result) => {
      if (cancelled) return
      setState(
        result.status === 'success'
          ? { status: 'success', data: result.data.map(toPremioViewModel) }
          : { status: 'error' },
      )
    })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
```

Seguir o padrão já usado em `shared/api/auth.client.ts`/`shared/session/use-current-user.ts`: resultado tipado por união de status, nunca lançar exceção para o chamador tratar com `try/catch` genérico, nunca fabricar dado enquanto carrega ou em erro.

### Caminho B — Server Component (fetch inicial no servidor)

O projeto **ainda não tem** um cliente HTTP server-side estabelecido (nenhuma page hoje faz fetch no servidor com repasse de cookies/tenant para o backend — todas usam o Caminho A). Se a tarefa realmente exigir fetch inicial no servidor (ex.: SEO, first paint sem loading state), **não inventar um cliente novo por conta própria**: inspecionar se já existe um padrão server-side real no momento da tarefa e, se não existir, registrar explicitamente no relatório da Fase 8 que esse padrão precisa ser especificado/aprovado antes de implementá-lo — não improvisar. Um cliente server-side, quando existir, precisa no mínimo: usar um destino absoluto e confiável (nunca uma URL relativa), ler os cookies da requisição recebida (API de servidor do Next instalado, ex. `cookies()` de `next/headers`, como já faz `apps/web/src/app/(private)/layout.tsx`), encaminhá-los explicitamente para o backend, preservar host/subdomínio ou `X-Forwarded-Host` (mesma fronteira de confiança de `apps/web/src/proxy.ts`), e nunca compartilhar o silent refresh do browser.

## 4. Composição de componentes `shared` existentes

Antes de criar qualquer componente novo, verificar `shared/components/ui/` por uma primitive equivalente (`Table`/`TableBody`/`TableRow`/`TableCell`, `Badge`, `Button`, `Input`) e conferir a API real do arquivo (exports, props, variantes) antes de usá-la — não assumir uma API por analogia com outro design system.

## 5. Componentes de módulo/rota

```tsx
// modules/premios/components/premios-table.tsx
import { Table, TableBody, TableRow, TableCell } from '@/shared/components/ui/table'
import { Badge } from '@/shared/components/ui/badge'
import type { PremioViewModel } from '../data/premio.mapper'

export function PremiosTable({ premios }: { premios: PremioViewModel[] }) {
  return (
    <Table>
      <TableBody>
        {premios.map((premio) => (
          <TableRow key={premio.id}>
            <TableCell>{premio.nome}</TableCell>
            <TableCell>{premio.valorFormatado}</TableCell>
            <TableCell>
              <Badge variant={premio.status === 'Ativo' ? 'success' : 'neutral'}>{premio.status}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

`Badge` só aceita as variantes reais de `shared/components/ui/badge.tsx` (`neutral`, `success`, `warning`, `info`, `purple`, `danger`) — nunca inventar uma variante (`muted` não existe). `Table` não expõe `Table.Row`/`Table.Cell`; os exports reais são nomeados (`TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`). Se a listagem precisar de cabeçalho, adicionar também `TableHeader`/`TableHead`. **Antes de compor qualquer primitive de `shared`, abrir o arquivo real e confirmar os exports/props — este exemplo é ilustrativo e o design system pode evoluir.**

`PremiosTable` é Server Component por padrão (sem `'use client'`) — só recebe dados prontos via props. A busca de dados (Caminho A acima) fica no componente-página, marcado `'use client'`, nunca dentro da tabela.

```tsx
// modules/premios/pages/premios.page.tsx
'use client'

import { usePremios } from '../data/use-premios'
import { PremiosTable } from '../components/premios-table'

export function PremiosPage() {
  const state = usePremios()
  if (state.status === 'loading') return <div>Carregando...</div>
  if (state.status === 'error') return <div>Não foi possível carregar os prêmios.</div>
  return <PremiosTable premios={state.data} />
}
```

## 6. Page e navegação

```tsx
// app/(private)/premios/page.tsx
import { PremiosPage } from '@/modules/premios'

export default function Page() {
  return <PremiosPage />
}
```

Se a rota for nova (ainda não existia), adicionar o item de menu correspondente no local real de navegação do projeto (ver a navegação atual em `app/(private)/_shell`) e revisar `proxy.ts`/matcher conforme [next-app-router.md](next-app-router.md).

## 7. Estados de carregamento/erro/vazio

- Erro de rede/HTTP: mensagem genérica de erro (como no exemplo acima), nunca vazar detalhe técnico da resposta.
- Vazio: usar o componente genérico de empty state de `shared` (ex.: `EmptyDashboardState`) quando aplicável, ou um estado local simples se for muito específico do módulo.
- Carregamento: no Caminho A (client-side, o padrão hoje), o próprio hook expõe `status: 'loading'` e a página renderiza o estado local — como no exemplo acima. `app/**/loading.tsx` (Suspense automático) só se aplica a um fetch feito no servidor (Caminho B); não citar os dois como intercambiáveis.

## 8. Testes do slice

Antes de considerar o slice pronto, cobrir (ver [testing-checklist.md](testing-checklist.md) para a matriz completa):

- Unit do mapper (`premio.mapper.spec.ts`): DTO → view model, casos de borda (`ativo: false`, valor zero).
- Component da tabela/página com dados mockados.
- Se a rota for nova: teste de proxy/matcher e atualização do teste de navegação/menu, se existir.
