import { render, screen, waitFor } from '@testing-library/react'
import { CurrentUserProvider } from './current-user-provider'
import { useCurrentUser } from './use-current-user'
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

function Consumer({ label }: { label: string }) {
  const currentUser = useCurrentUser()
  return (
    <span data-testid={label}>
      {currentUser.status === 'success' ? currentUser.data.name : currentUser.status}
    </span>
  )
}

describe('CurrentUserProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('busca GET /api/auth/me uma vez ao montar e compartilha o mesmo estado entre múltiplos consumidores', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })

    render(
      <CurrentUserProvider>
        <Consumer label="a" />
        <Consumer label="b" />
      </CurrentUserProvider>,
    )

    expect(screen.getByTestId('a')).toHaveTextContent('loading')
    await waitFor(() => expect(screen.getByTestId('a')).toHaveTextContent('Owner Silva'))
    expect(screen.getByTestId('b')).toHaveTextContent('Owner Silva')
    expect(mockedGetCurrentUser).toHaveBeenCalledTimes(1)
  })

  it('reseta ao remontar o provider (logout/login): não retém o estado da sessão anterior', async () => {
    mockedGetCurrentUser.mockResolvedValueOnce({ status: 'success', data: CONTEXT })

    const { unmount } = render(
      <CurrentUserProvider>
        <Consumer label="a" />
      </CurrentUserProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('a')).toHaveTextContent('Owner Silva'))
    unmount()

    const OTHER_CONTEXT = { ...CONTEXT, userId: 'user-2', name: 'Outro Usuario' }
    mockedGetCurrentUser.mockResolvedValueOnce({ status: 'success', data: OTHER_CONTEXT })

    render(
      <CurrentUserProvider>
        <Consumer label="a" />
      </CurrentUserProvider>,
    )
    // Novo mount: começa em loading de novo, sem o nome da sessão anterior residual.
    expect(screen.getByTestId('a')).toHaveTextContent('loading')
    await waitFor(() => expect(screen.getByTestId('a')).toHaveTextContent('Outro Usuario'))
    expect(mockedGetCurrentUser).toHaveBeenCalledTimes(2)
  })
})
