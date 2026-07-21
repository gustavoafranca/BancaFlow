import { getRolePermissions } from './access-control.client'

const originalFetch = global.fetch

describe('access-control.client', () => {
  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it('retorna success com a matriz vazia quando o backend responde 200', async () => {
    const matrix = { capabilities: [] }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => matrix,
    }) as unknown as typeof fetch

    const result = await getRolePermissions()
    expect(result).toEqual({ status: 'success', data: matrix })
  })

  it('retorna success com uma matriz completa bem formada', async () => {
    const matrix = {
      capabilities: [
        {
          capability: 'identity',
          label: 'Identidade e conta',
          order: 1,
          permissions: [
            {
              key: 'identity.accounts.toggle-status',
              label: 'Ativar/desativar/bloquear conta',
              description: 'Alterar o status de uma conta de terceiro da mesma Banca',
              order: 1,
              roles: ['OWNER', 'ADMIN'],
            },
          ],
        },
      ],
    }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => matrix,
    }) as unknown as typeof fetch

    const result = await getRolePermissions()
    expect(result).toEqual({ status: 'success', data: matrix })
  })

  it('retorna error quando o payload 200 está malformado (sem capabilities, sem roles válidas, etc.)', async () => {
    const malformedPayloads = [
      {},
      { capabilities: 'not-an-array' },
      { capabilities: [{ capability: 'identity' }] },
      {
        capabilities: [
          {
            capability: 'identity',
            label: 'Identidade e conta',
            order: 1,
            permissions: [{ key: 'x', label: 'X', description: 'Y', order: 1, roles: ['NOT_A_ROLE'] }],
          },
        ],
      },
    ]

    for (const payload of malformedPayloads) {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => payload,
      }) as unknown as typeof fetch

      const result = await getRolePermissions()
      expect(result).toEqual({ status: 'error' })
    }
  })

  it('retorna forbidden quando o backend responde 403 (USER negado por hasPermission)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({}),
    }) as unknown as typeof fetch

    const result = await getRolePermissions()
    expect(result).toEqual({ status: 'forbidden' })
  })

  it('retorna error em falha de rede', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch
    const result = await getRolePermissions()
    expect(result).toEqual({ status: 'error' })
  })

  it('retorna error para status inesperado', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as unknown as typeof fetch

    const result = await getRolePermissions()
    expect(result).toEqual({ status: 'error' })
  })
})
