import { Email, Id, PersonName } from '@bancaflow/shared';
import { UserAccount, UserAccountProps } from '../src/user-account/user-account.entity';
import { AccountRole } from '../src/user-account/vo/account-role.vo';
import { AccountStatus } from '../src/user-account/vo/account-status.vo';
import { Username } from '../src/user-account/vo/username.vo';

const BASE = new Date('2026-07-15T12:00:00.000Z');

function buildAccount(overrides: Partial<UserAccountProps> = {}): UserAccount {
  return UserAccount.create({
    id: Id.createUUID(),
    bancaId: Id.createUUID(),
    username: 'joao',
    name: 'Joao Silva',
    email: null,
    role: AccountRole.USER,
    status: AccountStatus.ACTIVE,
    credential: {
      passwordHash: 'hashed-password',
      passwordChangedAt: BASE,
      mustChangePassword: false,
    },
    failedLoginAttempts: 0,
    failedLoginWindowStartedAt: null,
    lockedUntil: null,
    ...overrides,
  });
}

describe('UserAccount — criação e VOs', () => {
  it('cria conta válida e normaliza username', () => {
    const account = buildAccount({ username: 'JoAo' });
    expect(account.username.normalized).toBe('joao');
    expect(account.username.raw).toBe('JoAo');
    expect(account.role.value).toBe('USER');
    expect(account.status.value).toBe('ACTIVE');
    expect(account.name).toBe('Joao Silva');
  });

  it('rejeita username inválido', () => {
    const result = UserAccount.tryCreate({
      id: Id.createUUID(),
      bancaId: Id.createUUID(),
      username: 'a',
      name: 'Joao Silva',
      role: AccountRole.USER,
      status: AccountStatus.ACTIVE,
      credential: { passwordHash: 'h', passwordChangedAt: BASE, mustChangePassword: false },
      failedLoginAttempts: 0,
    });
    expect(result.isFailure).toBe(true);
  });

  it('rejeita nome sem sobrenome (attrs.isFailure)', () => {
    const result = UserAccount.tryCreate({
      id: Id.createUUID(),
      bancaId: Id.createUUID(),
      username: 'joao',
      name: 'Joao',
      role: AccountRole.USER,
      status: AccountStatus.ACTIVE,
      credential: { passwordHash: 'h', passwordChangedAt: BASE, mustChangePassword: false },
      failedLoginAttempts: 0,
    });
    expect(result.isFailure).toBe(true);
  });

  it('rejeita role inválido', () => {
    const result = UserAccount.tryCreate({
      id: Id.createUUID(),
      bancaId: Id.createUUID(),
      username: 'joao',
      name: 'Joao Silva',
      role: 'SUPERADMIN' as never,
      status: AccountStatus.ACTIVE,
      credential: { passwordHash: 'h', passwordChangedAt: BASE, mustChangePassword: false },
      failedLoginAttempts: 0,
    });
    expect(result.isFailure).toBe(true);
  });

  it('rejeita status inválido', () => {
    const result = UserAccount.tryCreate({
      id: Id.createUUID(),
      bancaId: Id.createUUID(),
      username: 'joao',
      name: 'Joao Silva',
      role: AccountRole.USER,
      status: 'ARCHIVED' as never,
      credential: { passwordHash: 'h', passwordChangedAt: BASE, mustChangePassword: false },
      failedLoginAttempts: 0,
    });
    expect(result.isFailure).toBe(true);
  });

  it('rejeita credential inválida (hash vazio)', () => {
    const result = UserAccount.tryCreate({
      id: Id.createUUID(),
      bancaId: Id.createUUID(),
      username: 'joao',
      name: 'Joao Silva',
      role: AccountRole.USER,
      status: AccountStatus.ACTIVE,
      credential: { passwordHash: '', passwordChangedAt: BASE, mustChangePassword: false },
      failedLoginAttempts: 0,
    });
    expect(result.isFailure).toBe(true);
  });

  it('aplica default 0 para failedLoginAttempts quando omitido', () => {
    const result = UserAccount.tryCreate({
      id: Id.createUUID(),
      bancaId: Id.createUUID(),
      username: 'joao',
      name: 'Joao Silva',
      role: AccountRole.USER,
      status: AccountStatus.ACTIVE,
      credential: { passwordHash: 'h', passwordChangedAt: BASE, mustChangePassword: false },
    } as never);
    expect(result.isOk).toBe(true);
    expect(result.instance.failedLoginAttempts).toBe(0);
  });

  it('aceita e expõe e-mail válido', () => {
    const account = buildAccount({ email: 'joao@example.com' });
    expect(account.email).toBe('joao@example.com');
  });

  it('email ausente resulta em null', () => {
    const account = buildAccount({ email: null });
    expect(account.email).toBeNull();
  });

  it('rejeita e-mail em formato inválido', () => {
    const result = UserAccount.tryCreate({
      id: Id.createUUID(),
      bancaId: Id.createUUID(),
      username: 'joao',
      name: 'Joao Silva',
      email: 'nao-e-email',
      role: AccountRole.USER,
      status: AccountStatus.ACTIVE,
      credential: { passwordHash: 'h', passwordChangedAt: BASE, mustChangePassword: false },
      failedLoginAttempts: 0,
    });
    expect(result.isFailure).toBe(true);
  });
});

describe('UserAccount — janela de falhas de login', () => {
  it('abre a janela na primeira falha', () => {
    const account = buildAccount();
    const result = account.recordLoginFailure(BASE);
    expect(result.isOk).toBe(true);
    expect(result.instance.failedLoginAttempts).toBe(1);
    expect(result.instance.failedLoginWindowStartedAt?.getTime()).toBe(BASE.getTime());
    expect(result.instance.isLocked(BASE)).toBe(false);
  });

  it('bloqueia na quinta falha dentro da janela', () => {
    let account = buildAccount();
    let now = BASE;
    for (let i = 0; i < 5; i++) {
      now = new Date(BASE.getTime() + i * 60_000); // uma por minuto (dentro dos 15 min)
      account = account.recordLoginFailure(now).instance;
    }
    expect(account.failedLoginAttempts).toBe(5);
    expect(account.lockedUntil).not.toBeNull();
    expect(account.isLocked(now)).toBe(true);
    // Bloqueio expira em 15 min.
    const afterLock = new Date(account.lockedUntil!.getTime() + 1);
    expect(account.isLocked(afterLock)).toBe(false);
  });

  it('reinicia a janela quando a falha ocorre após 15 minutos', () => {
    let account = buildAccount();
    account = account.recordLoginFailure(BASE).instance;
    expect(account.failedLoginAttempts).toBe(1);
    const after = new Date(BASE.getTime() + 16 * 60_000);
    account = account.recordLoginFailure(after).instance;
    expect(account.failedLoginAttempts).toBe(1);
    expect(account.failedLoginWindowStartedAt?.getTime()).toBe(after.getTime());
  });

  it('resetLoginFailures limpa os três campos', () => {
    let account = buildAccount();
    account = account.recordLoginFailure(BASE).instance;
    const reset = account.resetLoginFailures();
    expect(reset.instance.failedLoginAttempts).toBe(0);
    expect(reset.instance.failedLoginWindowStartedAt).toBeNull();
    expect(reset.instance.lockedUntil).toBeNull();
  });
});

describe('UserAccount — imutabilidade e troca de senha', () => {
  it('recordLoginFailure não muta a instância original', () => {
    const account = buildAccount();
    account.recordLoginFailure(BASE);
    expect(account.failedLoginAttempts).toBe(0);
  });

  it('changePassword gera nova credencial', () => {
    const account = buildAccount();
    const changed = account.changePassword('new-hash', true, BASE);
    expect(changed.isOk).toBe(true);
    expect(changed.instance.credential.passwordHash).toBe('new-hash');
    expect(changed.instance.mustChangePassword).toBe(true);
    // original inalterada
    expect(account.credential.passwordHash).toBe('hashed-password');
  });
});

describe('UserAccount — invariantes de status e proteção de OWNER', () => {
  it('desativa e bloqueia contas não-OWNER', () => {
    const account = buildAccount({ role: AccountRole.USER });
    expect(account.deactivate().instance.status.value).toBe('INACTIVE');
    expect(account.block().instance.status.value).toBe('BLOCKED');
  });

  it('impede desativar/bloquear OWNER', () => {
    const owner = buildAccount({ role: AccountRole.OWNER });
    expect(owner.deactivate().isFailure).toBe(true);
    expect(owner.block().isFailure).toBe(true);
  });

  it('unblock reativa e zera falhas', () => {
    const blocked = buildAccount({ role: AccountRole.USER, status: AccountStatus.BLOCKED, failedLoginAttempts: 3 });
    const result = blocked.unblock();
    expect(result.instance.status.value).toBe('ACTIVE');
    expect(result.instance.failedLoginAttempts).toBe(0);
  });

  it('activate reativa uma conta inativa e zera falhas', () => {
    const inactive = buildAccount({
      role: AccountRole.USER,
      status: AccountStatus.INACTIVE,
      failedLoginAttempts: 2,
      failedLoginWindowStartedAt: BASE,
      lockedUntil: new Date(BASE.getTime() + 1000),
    });
    const result = inactive.activate();
    expect(result.isOk).toBe(true);
    expect(result.instance.status.value).toBe('ACTIVE');
    expect(result.instance.failedLoginAttempts).toBe(0);
    expect(result.instance.failedLoginWindowStartedAt).toBeNull();
    expect(result.instance.lockedUntil).toBeNull();
  });

  it('changePassword falha quando o novo hash é vazio', () => {
    const account = buildAccount();
    const result = account.changePassword('', true, BASE);
    expect(result.isFailure).toBe(true);
  });
});

describe('UserAccount — rename e updateEmail', () => {
  it('rename atualiza o nome preservando id, bancaId, credential, datas e version', () => {
    const account = buildAccount({
      failedLoginWindowStartedAt: BASE,
      lockedUntil: new Date(BASE.getTime() + 1000),
      version: 3,
    });
    const result = account.rename(PersonName.create('Maria Souza'));
    expect(result.isOk).toBe(true);
    const renamed = result.instance;
    expect(renamed.name).toBe('Maria Souza');
    expect(renamed.id).toBe(account.id);
    expect(renamed.bancaId).toBe(account.bancaId);
    expect(renamed.credential.passwordHash).toBe(account.credential.passwordHash);
    expect(renamed.failedLoginWindowStartedAt?.getTime()).toBe(account.failedLoginWindowStartedAt?.getTime());
    expect(renamed.lockedUntil?.getTime()).toBe(account.lockedUntil?.getTime());
    expect(renamed.version).toBe(3);
    // imutabilidade: original não é alterada
    expect(account.name).toBe('Joao Silva');
  });

  it('updateEmail atualiza o e-mail preservando o restante do estado', () => {
    const account = buildAccount({ email: 'old@example.com', version: 2 });
    const result = account.updateEmail(Email.create('new@example.com'));
    expect(result.isOk).toBe(true);
    expect(result.instance.email).toBe('new@example.com');
    expect(result.instance.version).toBe(2);
    expect(account.email).toBe('old@example.com');
  });

  it('updateEmail aceita null para limpar o e-mail opcional', () => {
    const account = buildAccount({ email: 'old@example.com' });
    const result = account.updateEmail(null);
    expect(result.isOk).toBe(true);
    expect(result.instance.email).toBeNull();
  });
});

describe('UserAccount — changeRole', () => {
  it('promove USER para ADMIN preservando o restante do estado', () => {
    const account = buildAccount({ role: AccountRole.USER, version: 4 });
    const result = account.changeRole(AccountRole.create(AccountRole.ADMIN));
    expect(result.isOk).toBe(true);
    expect(result.instance.role.value).toBe('ADMIN');
    expect(result.instance.id).toBe(account.id);
    expect(result.instance.version).toBe(4);
    // imutabilidade: original não é alterada
    expect(account.role.value).toBe('USER');
  });

  it('rebaixa ADMIN para USER', () => {
    const account = buildAccount({ role: AccountRole.ADMIN });
    const result = account.changeRole(AccountRole.create(AccountRole.USER));
    expect(result.isOk).toBe(true);
    expect(result.instance.role.value).toBe('USER');
  });

  it('rejeita quando o papel atual é OWNER', () => {
    const owner = buildAccount({ role: AccountRole.OWNER });
    const result = owner.changeRole(AccountRole.create(AccountRole.USER));
    expect(result.isFailure).toBe(true);
  });

  it('rejeita quando o novo papel é OWNER', () => {
    const account = buildAccount({ role: AccountRole.USER });
    const result = account.changeRole(AccountRole.create(AccountRole.OWNER));
    expect(result.isFailure).toBe(true);
  });
});

describe('UserAccount — renameUsername', () => {
  it('troca o username preservando id, bancaId, credential, datas e version', () => {
    const account = buildAccount({
      failedLoginWindowStartedAt: BASE,
      lockedUntil: new Date(BASE.getTime() + 1000),
      version: 5,
    });
    const result = account.renameUsername(Username.create('maria.souza'));
    expect(result.isOk).toBe(true);
    const renamed = result.instance;
    expect(renamed.username.raw).toBe('maria.souza');
    expect(renamed.id).toBe(account.id);
    expect(renamed.bancaId).toBe(account.bancaId);
    expect(renamed.credential.passwordHash).toBe(account.credential.passwordHash);
    expect(renamed.failedLoginWindowStartedAt?.getTime()).toBe(account.failedLoginWindowStartedAt?.getTime());
    expect(renamed.lockedUntil?.getTime()).toBe(account.lockedUntil?.getTime());
    expect(renamed.version).toBe(5);
    // imutabilidade: original não é alterada
    expect(account.username.raw).toBe('joao');
  });

  it('renameUsername preserva raw e normaliza o novo username', () => {
    const account = buildAccount();
    const result = account.renameUsername(Username.create('MariaSouza'));
    expect(result.isOk).toBe(true);
    expect(result.instance.username.raw).toBe('MariaSouza');
    expect(result.instance.username.normalized).toBe('mariasouza');
  });
});
