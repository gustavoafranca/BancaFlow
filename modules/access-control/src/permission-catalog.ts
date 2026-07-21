export interface PermissionCatalogEntry {
  key: string;
  label: string;
  description: string;
  order: number;
}

export interface PermissionCapability {
  capability: string;
  label: string;
  order: number;
  permissions: readonly PermissionCatalogEntry[];
}

/**
 * Catálogo de permissões — fonte primária única. `PermissionKey` e
 * `PERMISSION_KEYS` (ver `permission-key.ts`) são derivados deste literal
 * `as const`, não mantidos como listas paralelas: uma chave só existe se
 * estiver aqui, eliminando a possibilidade de divergência entre o tipo, a
 * lista de chaves e o catálogo de apresentação.
 *
 * Não é um agregado DDD — é uma constante de configuração imutável, com
 * metadados de apresentação para os DTOs de leitura.
 */
export const PERMISSION_CATALOG = [
  {
    capability: 'identity',
    label: 'Identidade e conta',
    order: 1,
    permissions: [
      {
        key: 'identity.profile.read-own',
        label: 'Consultar o próprio perfil',
        description: 'Ver nome, e-mail e papel da própria conta',
        order: 1,
      },
      {
        key: 'identity.profile.update-own',
        label: 'Atualizar o próprio perfil',
        description: 'Alterar nome e/ou e-mail da própria conta',
        order: 2,
      },
      {
        key: 'identity.password.change-own',
        label: 'Alterar a própria senha',
        description: 'Trocar a senha da própria conta autenticado',
        order: 3,
      },
      {
        key: 'identity.accounts.toggle-status',
        label: 'Ativar/desativar/bloquear conta',
        description: 'Alterar o status de uma conta de terceiro da mesma Banca',
        order: 4,
      },
      {
        key: 'identity.accounts.reset-password',
        label: 'Redefinir senha de terceiro',
        description: 'Gerar senha temporária para uma conta de terceiro da mesma Banca',
        order: 5,
      },
      {
        key: 'identity.accounts.list',
        label: 'Listar contas',
        description: 'Pesquisar e paginar as contas de usuário da própria Banca',
        order: 6,
      },
      {
        key: 'identity.accounts.read',
        label: 'Consultar conta',
        description: 'Ver o detalhe de uma conta de terceiro da própria Banca',
        order: 7,
      },
      {
        key: 'identity.accounts.create',
        label: 'Criar conta',
        description: 'Cadastrar uma nova conta ADMIN ou USER na própria Banca',
        order: 8,
      },
      {
        key: 'identity.accounts.update',
        label: 'Atualizar conta',
        description: 'Alterar username, nome e/ou e-mail de uma conta de terceiro',
        order: 9,
      },
      {
        key: 'identity.accounts.change-role',
        label: 'Trocar papel da conta',
        description: 'Alternar uma conta de terceiro entre os papéis ADMIN e USER',
        order: 10,
      },
      {
        key: 'identity.accounts.sessions.read',
        label: 'Consultar sessões de terceiro',
        description: 'Ver as sessões ativas de uma conta de terceiro da própria Banca',
        order: 11,
      },
      {
        key: 'identity.accounts.sessions.revoke',
        label: 'Revogar sessões de terceiro',
        description: 'Encerrar uma sessão específica de uma conta de terceiro',
        order: 12,
      },
    ],
  },
  {
    capability: 'participants',
    label: 'Cambistas',
    order: 2,
    permissions: [
      {
        key: 'participants.betting-agents.create',
        label: 'Cadastrar Cambista',
        description: 'Criar um novo Cambista na própria Banca',
        order: 1,
      },
      {
        key: 'participants.betting-agents.list',
        label: 'Listar Cambistas',
        description: 'Pesquisar e paginar Cambistas da própria Banca',
        order: 2,
      },
      {
        key: 'participants.betting-agents.read',
        label: 'Consultar Cambista',
        description: 'Ver o detalhe de um Cambista da própria Banca',
        order: 3,
      },
    ],
  },
  {
    capability: 'access-control',
    label: 'Controle de acesso',
    order: 3,
    permissions: [
      {
        key: 'access-control.role-permissions.read',
        label: 'Consultar matriz de permissões',
        description: 'Ver a matriz completa papel × permissão de todos os papéis',
        order: 1,
      },
    ],
  },
] as const;

type CatalogPermissionEntry = (typeof PERMISSION_CATALOG)[number]['permissions'][number];

// `flatMap` sobre uma tupla `as const` heterogênea não infere corretamente o
// tipo de retorno (limitação conhecida do TypeScript) — homogeneizamos a
// visão da tupla (sem alterar o valor em runtime) antes de concatenar, para
// que cada `capability.permissions` seja vista com o mesmo tipo em toda
// iteração. Preserva os literais de `key` (mesma fonte de `PermissionKey` em
// `permission-key.ts`); uma anotação `PermissionCatalogEntry[]` alargaria
// `key` para `string` e quebraria essa inferência.
export const PERMISSION_CATALOG_ENTRIES: readonly CatalogPermissionEntry[] = (
  PERMISSION_CATALOG as readonly { permissions: readonly CatalogPermissionEntry[] }[]
).flatMap((capability) => capability.permissions);
