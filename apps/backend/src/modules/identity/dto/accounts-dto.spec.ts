import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ChangeAccountRoleDto,
  CreateUserAccountDto,
  ListUserAccountsDto,
  UpdateUserAccountDto,
} from './index';

describe('ListUserAccountsDto', () => {
  it('aplica defaults de page/pageSize quando ausentes', async () => {
    const dto = plainToInstance(ListUserAccountsDto, {});
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.pageSize).toBe(20);
  });

  it('converte page/pageSize vindos como string da query string', async () => {
    const dto = plainToInstance(ListUserAccountsDto, {
      page: '2',
      pageSize: '10',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.pageSize).toBe(10);
  });

  it('aceita search, role e status válidos', async () => {
    const dto = plainToInstance(ListUserAccountsDto, {
      search: 'joao',
      role: 'ADMIN',
      status: 'BLOCKED',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejeita role fora do conjunto administrável (nunca aceita OWNER)', async () => {
    const dto = plainToInstance(ListUserAccountsDto, { role: 'OWNER' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  it('rejeita status desconhecido', async () => {
    const dto = plainToInstance(ListUserAccountsDto, { status: 'DELETED' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });

  it('aceita pageSize no teto (100)', async () => {
    const dto = plainToInstance(ListUserAccountsDto, { pageSize: '100' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.pageSize).toBe(100);
  });

  it('rejeita pageSize acima do teto (101), protegendo o endpoint de páginas arbitrariamente grandes', async () => {
    const dto = plainToInstance(ListUserAccountsDto, { pageSize: '101' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'pageSize')).toBe(true);
  });
});

describe('CreateUserAccountDto', () => {
  it('é válido com username, name e role ADMIN|USER', async () => {
    for (const role of ['ADMIN', 'USER']) {
      const dto = plainToInstance(CreateUserAccountDto, {
        username: 'novo.usuario',
        name: 'Novo Usuario Silva',
        role,
      });
      expect(await validate(dto)).toHaveLength(0);
    }
  });

  it('aceita e-mail opcional válido', async () => {
    const dto = plainToInstance(CreateUserAccountDto, {
      username: 'novo.usuario',
      name: 'Novo Usuario Silva',
      email: 'novo@example.com',
      role: 'USER',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejeita e-mail em formato inválido', async () => {
    const dto = plainToInstance(CreateUserAccountDto, {
      username: 'novo.usuario',
      name: 'Novo Usuario Silva',
      email: 'nao-e-email',
      role: 'USER',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('rejeita role OWNER — só ADMIN|USER são aceitos na criação administrativa', async () => {
    const dto = plainToInstance(CreateUserAccountDto, {
      username: 'tentativa.owner',
      name: 'Tentativa Owner Silva',
      role: 'OWNER',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  it('rejeita username/name ausentes', async () => {
    const dto = plainToInstance(CreateUserAccountDto, { role: 'USER' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'username')).toBe(true);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });
});

describe('UpdateUserAccountDto', () => {
  it('é válido informando apenas username e version', async () => {
    const dto = plainToInstance(UpdateUserAccountDto, {
      username: 'novo.username',
      version: 1,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('é válido informando apenas name e version', async () => {
    const dto = plainToInstance(UpdateUserAccountDto, {
      name: 'Novo Nome Silva',
      version: 1,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('é válido com email: null (limpeza do e-mail opcional) e version', async () => {
    const dto = plainToInstance(UpdateUserAccountDto, {
      email: null,
      version: 1,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejeita corpo contendo somente version (nenhum campo além dela)', async () => {
    const dto = plainToInstance(UpdateUserAccountDto, { version: 1 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'version')).toBe(true);
  });

  it('rejeita version ausente', async () => {
    const dto = plainToInstance(UpdateUserAccountDto, {
      name: 'Novo Nome Silva',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'version')).toBe(true);
  });
});

describe('ChangeAccountRoleDto', () => {
  it('aceita ADMIN e USER', async () => {
    for (const role of ['ADMIN', 'USER']) {
      const dto = plainToInstance(ChangeAccountRoleDto, { role });
      expect(await validate(dto)).toHaveLength(0);
    }
  });

  it('rejeita OWNER e valores desconhecidos', async () => {
    for (const role of ['OWNER', 'SUPERADMIN']) {
      const dto = plainToInstance(ChangeAccountRoleDto, { role });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'role')).toBe(true);
    }
  });
});
