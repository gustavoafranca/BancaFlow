import { AccountRole } from '../src/user-account/vo/account-role.vo';
import { AccountStatus } from '../src/user-account/vo/account-status.vo';
import { Credential } from '../src/user-account/vo/credential.vo';
import { Username } from '../src/user-account/vo/username.vo';

const BASE = new Date('2026-07-15T12:00:00.000Z');

describe('AccountRole', () => {
  it('cria cada papel válido e normaliza formato (trim + uppercase)', () => {
    expect(AccountRole.create('owner').value).toBe('OWNER');
    expect(AccountRole.create(' Admin ').value).toBe('ADMIN');
    expect(AccountRole.create('user').value).toBe('USER');
  });

  it('rejeita papel desconhecido', () => {
    expect(AccountRole.tryCreate('SUPERADMIN').isFailure).toBe(true);
  });

  it('rejeita valor vazio/indefinido', () => {
    expect(AccountRole.tryCreate('').isFailure).toBe(true);
    expect(AccountRole.tryCreate(undefined as unknown as string).isFailure).toBe(true);
  });

  it('expõe isOwner, isAdmin e canManageAccounts corretamente', () => {
    const owner = AccountRole.create(AccountRole.OWNER);
    expect(owner.isOwner).toBe(true);
    expect(owner.isAdmin).toBe(false);
    expect(owner.canManageAccounts).toBe(true);

    const admin = AccountRole.create(AccountRole.ADMIN);
    expect(admin.isOwner).toBe(false);
    expect(admin.isAdmin).toBe(true);
    expect(admin.canManageAccounts).toBe(true);

    const user = AccountRole.create(AccountRole.USER);
    expect(user.isOwner).toBe(false);
    expect(user.isAdmin).toBe(false);
    expect(user.canManageAccounts).toBe(false);
  });
});

describe('AccountStatus', () => {
  it('cria cada status válido e normaliza formato', () => {
    expect(AccountStatus.create('active').value).toBe('ACTIVE');
    expect(AccountStatus.create(' Inactive ').value).toBe('INACTIVE');
    expect(AccountStatus.create('blocked').value).toBe('BLOCKED');
  });

  it('rejeita status desconhecido', () => {
    expect(AccountStatus.tryCreate('ARCHIVED').isFailure).toBe(true);
  });

  it('rejeita valor vazio/indefinido', () => {
    expect(AccountStatus.tryCreate('').isFailure).toBe(true);
    expect(AccountStatus.tryCreate(undefined as unknown as string).isFailure).toBe(true);
  });

  it('isActive é true somente para ACTIVE', () => {
    expect(AccountStatus.create(AccountStatus.ACTIVE).isActive).toBe(true);
    expect(AccountStatus.create(AccountStatus.INACTIVE).isActive).toBe(false);
    expect(AccountStatus.create(AccountStatus.BLOCKED).isActive).toBe(false);
  });
});

describe('Credential', () => {
  it('cria com hash não vazio e aplica default de mustChangePassword', () => {
    const credential = Credential.create({ passwordHash: 'hash-1', passwordChangedAt: BASE, mustChangePassword: false });
    expect(credential.passwordHash).toBe('hash-1');
    // Cópia defensiva: mesmo valor, instância diferente da referência original.
    expect(credential.passwordChangedAt.getTime()).toBe(BASE.getTime());
    expect(credential.passwordChangedAt).not.toBe(BASE);
    expect(credential.mustChangePassword).toBe(false);
  });

  it('usa a data atual quando passwordChangedAt não é informado', () => {
    const result = Credential.tryCreate({
      passwordHash: 'hash-1',
      passwordChangedAt: undefined as unknown as Date,
      mustChangePassword: false,
    });
    expect(result.isOk).toBe(true);
    expect(result.instance.passwordChangedAt).toBeInstanceOf(Date);
  });

  it('rejeita hash vazio ou apenas espaços', () => {
    expect(Credential.tryCreate({ passwordHash: '', passwordChangedAt: BASE, mustChangePassword: false }).isFailure).toBe(
      true,
    );
    expect(
      Credential.tryCreate({ passwordHash: '   ', passwordChangedAt: BASE, mustChangePassword: false }).isFailure,
    ).toBe(true);
  });

  it('rejeita quando value é nulo/indefinido', () => {
    expect(Credential.tryCreate(undefined as unknown as never).isFailure).toBe(true);
  });

  it('aplica default de mustChangePassword quando omitido', () => {
    const result = Credential.tryCreate({
      passwordHash: 'hash-1',
      passwordChangedAt: BASE,
    } as never);
    expect(result.isOk).toBe(true);
    expect(result.instance.mustChangePassword).toBe(false);
  });

  it('withNewHash gera uma nova credencial imutável com o novo hash', () => {
    const original = Credential.create({ passwordHash: 'old', passwordChangedAt: BASE, mustChangePassword: false });
    const changedAt = new Date(BASE.getTime() + 1000);
    const updated = original.withNewHash('new', true, changedAt);

    expect(updated.passwordHash).toBe('new');
    expect(updated.mustChangePassword).toBe(true);
    // Cópia defensiva: mesmo valor, instância diferente da referência original.
    expect(updated.passwordChangedAt.getTime()).toBe(changedAt.getTime());
    expect(updated.passwordChangedAt).not.toBe(changedAt);
    expect(original.passwordHash).toBe('old'); // imutável
  });
});

describe('Username', () => {
  it('preserva o valor original e normaliza (trim + lowercase)', () => {
    const username = Username.create('  JoAo.Silva  ');
    expect(username.raw).toBe('JoAo.Silva');
    expect(username.normalized).toBe('joao.silva');
  });

  it('rejeita formato inválido: muito curto', () => {
    expect(Username.tryCreate('ab').isFailure).toBe(true);
  });

  it('rejeita formato inválido: caracteres não permitidos', () => {
    expect(Username.tryCreate('joão silva').isFailure).toBe(true);
  });

  it('rejeita valor vazio/indefinido', () => {
    expect(Username.tryCreate('').isFailure).toBe(true);
    expect(Username.tryCreate(undefined as unknown as string).isFailure).toBe(true);
  });
});
