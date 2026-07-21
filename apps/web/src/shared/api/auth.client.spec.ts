/**
 * @jest-environment node
 *
 * Precisamos de `Response` real (Web Fetch API) para simular a resposta HTTP
 * — ausente no ambiente `jsdom` padrão do projeto (mesma razão documentada em
 * `refresh-on-expire.spec.ts`). Este teste não usa DOM/`window`.
 */
import { getCurrentUser, updateOwnProfile, changePassword, listSessions, revokeSession } from './auth.client'
import { fetchWithRefresh } from '@/shared/session/refresh-on-expire'

jest.mock('@/shared/session/refresh-on-expire', () => ({
  fetchWithRefresh: jest.fn(),
}))

const mockedFetchWithRefresh = fetchWithRefresh as jest.MockedFunction<typeof fetchWithRefresh>

const CONTEXT = {
  userId: 'user-1',
  username: 'owner',
  name: 'Owner Silva',
  email: 'owner@banca.com',
  role: 'OWNER' as const,
  version: 1,
  banca: { bancaId: 'banca-1', codigoBanca: 'farizeu', name: 'Banca São Jorge' },
}

describe('getCurrentUser', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('em sucesso, faz GET /api/auth/me e retorna o contexto do usuário', async () => {
    mockedFetchWithRefresh.mockResolvedValue(new Response(JSON.stringify(CONTEXT), { status: 200 }))

    const result = await getCurrentUser()

    expect(mockedFetchWithRefresh).toHaveBeenCalledWith('/api/auth/me', { method: 'GET' })
    expect(result).toEqual({ status: 'success', data: CONTEXT })
  })

  it('em falha HTTP (401/500), retorna status "error" sem fabricar dados', async () => {
    mockedFetchWithRefresh.mockResolvedValue(new Response(null, { status: 401 }))
    const result = await getCurrentUser()
    expect(result).toEqual({ status: 'error' })
  })

  it('em falha de rede, retorna status "error"', async () => {
    mockedFetchWithRefresh.mockRejectedValue(new Error('network down'))
    const result = await getCurrentUser()
    expect(result).toEqual({ status: 'error' })
  })
})

describe('updateOwnProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('em sucesso, faz PATCH /api/auth/me com o corpo enviado e retorna status "success"', async () => {
    mockedFetchWithRefresh.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))

    const result = await updateOwnProfile({ name: 'Nome Novo', email: 'novo@example.com', version: 1 })

    expect(mockedFetchWithRefresh).toHaveBeenCalledWith('/api/auth/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Nome Novo', email: 'novo@example.com', version: 1 }),
    })
    expect(result).toEqual({ status: 'success' })
  })

  it('em 400/422, retorna status "invalid"', async () => {
    mockedFetchWithRefresh.mockResolvedValue(new Response(null, { status: 400 }))
    const result = await updateOwnProfile({ name: 'X', version: 1 })
    expect(result).toEqual({ status: 'invalid' })
  })

  it('em 401, retorna status "unauthenticated"', async () => {
    mockedFetchWithRefresh.mockResolvedValue(new Response(null, { status: 401 }))
    const result = await updateOwnProfile({ name: 'Nome Novo', version: 1 })
    expect(result).toEqual({ status: 'unauthenticated' })
  })

  it('em 409, retorna status "conflict"', async () => {
    mockedFetchWithRefresh.mockResolvedValue(new Response(null, { status: 409 }))
    const result = await updateOwnProfile({ name: 'Nome Novo', version: 1 })
    expect(result).toEqual({ status: 'conflict' })
  })

  it('em falha de rede, retorna status "error"', async () => {
    mockedFetchWithRefresh.mockRejectedValue(new Error('network down'))
    const result = await updateOwnProfile({ name: 'Nome Novo', version: 1 })
    expect(result).toEqual({ status: 'error' })
  })
})

describe('changePassword', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('em sucesso, faz PATCH /api/auth/password e retorna status "success"', async () => {
    mockedFetchWithRefresh.mockResolvedValue(new Response(null, { status: 200 }))
    const result = await changePassword({ currentPassword: 'old', newPassword: 'NovaSenhaForte@123' })
    expect(mockedFetchWithRefresh).toHaveBeenCalledWith('/api/auth/password', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'old', newPassword: 'NovaSenhaForte@123' }),
    })
    expect(result).toEqual({ status: 'success' })
  })

  it('em 400 IDENTITY.CURRENT_PASSWORD_INCORRECT, retorna status "wrong_current_password" (distinto de "invalid")', async () => {
    // Formato real do `ApiExceptionFilter` global do Backend: não existe um
    // `code` solto no corpo — o código de domínio vem em `message[0]`.
    mockedFetchWithRefresh.mockResolvedValue(
      new Response(JSON.stringify({ message: ['IDENTITY.CURRENT_PASSWORD_INCORRECT'] }), { status: 400 }),
    )
    const result = await changePassword({ currentPassword: 'wrong', newPassword: 'NovaSenhaForte@123' })
    expect(result).toEqual({ status: 'wrong_current_password' })
  })

  it('em 400 IDENTITY.PASSWORD_TOO_WEAK, retorna status "invalid"', async () => {
    mockedFetchWithRefresh.mockResolvedValue(
      new Response(JSON.stringify({ message: ['IDENTITY.PASSWORD_TOO_WEAK'] }), { status: 422 }),
    )
    const result = await changePassword({ currentPassword: 'old', newPassword: 'weak' })
    expect(result).toEqual({ status: 'invalid' })
  })

  it('em falha de rede, retorna status "error"', async () => {
    mockedFetchWithRefresh.mockRejectedValue(new Error('network down'))
    const result = await changePassword({ currentPassword: 'old', newPassword: 'NovaSenhaForte@123' })
    expect(result).toEqual({ status: 'error' })
  })
})

describe('listSessions', () => {
  const SESSIONS = [
    { sessionId: 's1', createdAt: '2026-07-19T00:00:00.000Z', expiresAt: '2026-07-26T00:00:00.000Z', isCurrent: true },
    {
      sessionId: 's2',
      createdAt: '2026-07-18T00:00:00.000Z',
      expiresAt: '2026-07-25T00:00:00.000Z',
      isCurrent: false,
      deviceInfo: 'Mozilla/5.0',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('em sucesso, faz GET /api/auth/sessions e retorna a lista', async () => {
    mockedFetchWithRefresh.mockResolvedValue(new Response(JSON.stringify(SESSIONS), { status: 200 }))
    const result = await listSessions()
    expect(mockedFetchWithRefresh).toHaveBeenCalledWith('/api/auth/sessions', { method: 'GET' })
    expect(result).toEqual({ status: 'success', data: SESSIONS })
  })

  it('em 401, retorna status "unauthenticated"', async () => {
    mockedFetchWithRefresh.mockResolvedValue(new Response(null, { status: 401 }))
    const result = await listSessions()
    expect(result).toEqual({ status: 'unauthenticated' })
  })

  it('em falha de rede, retorna status "error"', async () => {
    mockedFetchWithRefresh.mockRejectedValue(new Error('network down'))
    const result = await listSessions()
    expect(result).toEqual({ status: 'error' })
  })
})

describe('revokeSession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('em sucesso, faz DELETE /api/auth/sessions/:sessionId e retorna status "success"', async () => {
    mockedFetchWithRefresh.mockResolvedValue(new Response(null, { status: 200 }))
    const result = await revokeSession('s2')
    expect(mockedFetchWithRefresh).toHaveBeenCalledWith('/api/auth/sessions/s2', { method: 'DELETE' })
    expect(result).toEqual({ status: 'success' })
  })

  it('codifica o sessionId na URL', async () => {
    mockedFetchWithRefresh.mockResolvedValue(new Response(null, { status: 200 }))
    await revokeSession('id/com espaço')
    expect(mockedFetchWithRefresh).toHaveBeenCalledWith(
      `/api/auth/sessions/${encodeURIComponent('id/com espaço')}`,
      { method: 'DELETE' },
    )
  })

  it('em 404 IDENTITY.TARGET_SESSION_NOT_FOUND, retorna status "not_found" (distinto de 401)', async () => {
    mockedFetchWithRefresh.mockResolvedValue(
      new Response(JSON.stringify({ code: 'IDENTITY.TARGET_SESSION_NOT_FOUND' }), { status: 404 }),
    )
    const result = await revokeSession('other-users-session')
    expect(result).toEqual({ status: 'not_found' })
  })

  it('em 401, retorna status "unauthenticated" (nunca confundido com sessão-alvo ausente)', async () => {
    mockedFetchWithRefresh.mockResolvedValue(
      new Response(JSON.stringify({ code: 'IDENTITY.INVALID_CREDENTIALS' }), { status: 401 }),
    )
    const result = await revokeSession('s2')
    expect(result).toEqual({ status: 'unauthenticated' })
  })

  it('em falha de rede, retorna status "error"', async () => {
    mockedFetchWithRefresh.mockRejectedValue(new Error('network down'))
    const result = await revokeSession('s2')
    expect(result).toEqual({ status: 'error' })
  })
})
