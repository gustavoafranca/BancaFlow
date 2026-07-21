import { renderHook, waitFor, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useCurrentUser } from './use-current-user'
import { CurrentUserProvider } from './current-user-provider'
import { getCurrentUser } from '@/shared/api/auth.client'

jest.mock('@/shared/api/auth.client', () => ({
  getCurrentUser: jest.fn(),
}))

const mockedGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>

const CONTEXT = {
  userId: 'user-1',
  username: 'owner',
  name: 'Owner Silva',
  email: 'owner@banca.com',
  role: 'OWNER' as const,
  version: 1,
  banca: { bancaId: 'banca-1', codigoBanca: 'farizeu', name: 'Banca São Jorge' },
}

function wrapper({ children }: { children: ReactNode }) {
  return <CurrentUserProvider>{children}</CurrentUserProvider>
}

describe('useCurrentUser', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('inicia em loading e resolve para success com os dados do endpoint', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })

    const { result } = renderHook(() => useCurrentUser(), { wrapper })
    expect(result.current.status).toBe('loading')

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.status === 'success' && result.current.data).toEqual(CONTEXT)
    expect(typeof result.current.refreshCurrentUser).toBe('function')
  })

  it('resolve para error sem fabricar dados quando o endpoint falha', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'error' })

    const { result } = renderHook(() => useCurrentUser(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('error'))
  })

  it('refreshCurrentUser() refaz GET /api/auth/me e atualiza o estado compartilhado', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })
    const { result } = renderHook(() => useCurrentUser(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('success'))

    const updated = { ...CONTEXT, name: 'Nome Atualizado', version: 2 }
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: updated })

    await act(async () => {
      await result.current.refreshCurrentUser()
    })

    expect(mockedGetCurrentUser).toHaveBeenCalledTimes(2)
    expect(result.current.status === 'success' && result.current.data).toEqual(updated)
  })
})
