import { PERMISSION_CATALOG, PERMISSION_CATALOG_ENTRIES } from '../src/permission-catalog';
import { PERMISSION_KEYS } from '../src/permission-key';
import { ROLE_PERMISSION_MAP } from '../src/role-permission-map';

describe('catalog integrity (catalog × keys × role map)', () => {
  it('has no duplicate keys in the catalog', () => {
    const keys = PERMISSION_CATALOG_ENTRIES.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('PERMISSION_KEYS matches exactly the keys present in the catalog (derived, not a parallel list)', () => {
    const fromCatalog = PERMISSION_CATALOG_ENTRIES.map((entry) => entry.key).sort();
    expect([...PERMISSION_KEYS].sort()).toEqual(fromCatalog);
  });

  it('every key in ROLE_PERMISSION_MAP exists in the catalog (no stray keys)', () => {
    const catalogKeys = new Set(PERMISSION_KEYS);
    for (const role of Object.keys(ROLE_PERMISSION_MAP) as (keyof typeof ROLE_PERMISSION_MAP)[]) {
      for (const key of ROLE_PERMISSION_MAP[role]) {
        expect(catalogKeys.has(key)).toBe(true);
      }
    }
  });

  it('every catalog key is authorized for at least one role (no orphaned permission)', () => {
    const authorizedSomewhere = new Set([
      ...ROLE_PERMISSION_MAP.OWNER,
      ...ROLE_PERMISSION_MAP.ADMIN,
      ...ROLE_PERMISSION_MAP.USER,
    ]);
    for (const key of PERMISSION_KEYS) {
      expect(authorizedSomewhere.has(key)).toBe(true);
    }
  });

  it('OWNER and ADMIN role lists have no duplicate entries', () => {
    expect(new Set(ROLE_PERMISSION_MAP.OWNER).size).toBe(ROLE_PERMISSION_MAP.OWNER.length);
    expect(new Set(ROLE_PERMISSION_MAP.ADMIN).size).toBe(ROLE_PERMISSION_MAP.ADMIN.length);
  });

  it('every capability and permission has a non-empty label/description/order', () => {
    for (const capability of PERMISSION_CATALOG) {
      expect(capability.label.length).toBeGreaterThan(0);
      expect(capability.order).toBeGreaterThan(0);
      for (const permission of capability.permissions) {
        expect(permission.label.length).toBeGreaterThan(0);
        expect(permission.description.length).toBeGreaterThan(0);
        expect(permission.order).toBeGreaterThan(0);
      }
    }
  });

  // Definition of Done (decisão D7, `refine-tenant-user-administration-experience`):
  // toda capability/rota/endpoint protegido nesta change precisa declarar
  // `PermissionKey`, metadados de apresentação e presença automática na
  // matriz — os testes abaixo protegem essas invariantes estruturalmente,
  // não apenas por convenção de quem edita o catálogo.

  it('nenhuma capability tem nome, order ou lista de permissões duplicada/vazia', () => {
    const names = PERMISSION_CATALOG.map((c) => c.capability);
    expect(new Set(names).size).toBe(names.length);
    const orders = PERMISSION_CATALOG.map((c) => c.order);
    expect(new Set(orders).size).toBe(orders.length);
    for (const capability of PERMISSION_CATALOG) {
      expect(capability.capability.length).toBeGreaterThan(0);
      expect(capability.permissions.length).toBeGreaterThan(0);
    }
  });

  it('toda PermissionKey usa o prefixo `<capability>.` da capability que a declara (sem chave fora do grupo certo)', () => {
    for (const capability of PERMISSION_CATALOG) {
      for (const permission of capability.permissions) {
        expect(permission.key.startsWith(`${capability.capability}.`)).toBe(true);
      }
    }
  });

  it('nenhuma capability tem `order` duplicado entre suas próprias permissões (ordem de exibição não ambígua)', () => {
    for (const capability of PERMISSION_CATALOG) {
      const orders = capability.permissions.map((p) => p.order);
      expect(new Set(orders).size).toBe(orders.length);
    }
  });

  it('OWNER é sempre o catálogo inteiro — decisão explícita "tudo", não uma lista que pode divergir por edição manual', () => {
    expect([...ROLE_PERMISSION_MAP.OWNER].sort()).toEqual([...PERMISSION_KEYS].sort());
  });
});
