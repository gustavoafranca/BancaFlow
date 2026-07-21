import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ChangePasswordDto,
  LoginDto,
  MandatoryPasswordChangeDto,
  ToggleAccountStatusDto,
  UpdateOwnProfileDto,
} from './index';

/**
 * Valida os DTOs com `class-validator` isoladamente do Nest (sem HTTP) — o
 * `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`) é o mesmo
 * mecanismo exercitado nos testes e2e; aqui cobrimos o contrato do próprio
 * DTO em isolamento.
 */
describe('LoginDto', () => {
  it('é válido com username e password não vazios', async () => {
    const dto = plainToInstance(LoginDto, { username: 'owner', password: 'x' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejeita username ausente', async () => {
    const dto = plainToInstance(LoginDto, { password: 'x' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'username')).toBe(true);
  });

  it('rejeita username null (não string)', async () => {
    const dto = plainToInstance(LoginDto, { username: null, password: 'x' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'username')).toBe(true);
  });
});

describe('ChangePasswordDto', () => {
  it('é válido com currentPassword e newPassword', async () => {
    const dto = plainToInstance(ChangePasswordDto, {
      currentPassword: 'old',
      newPassword: 'NovaSenhaForte@123',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejeita newPassword vazio', async () => {
    const dto = plainToInstance(ChangePasswordDto, {
      currentPassword: 'old',
      newPassword: '',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'newPassword')).toBe(true);
  });
});

describe('MandatoryPasswordChangeDto', () => {
  it('não exige currentPassword — apenas newPassword', async () => {
    const dto = plainToInstance(MandatoryPasswordChangeDto, {
      newPassword: 'NovaSenhaForte@123',
    });
    expect(await validate(dto)).toHaveLength(0);
  });
});

describe('ToggleAccountStatusDto', () => {
  it('aceita apenas as ações conhecidas', async () => {
    for (const action of ['activate', 'deactivate', 'block', 'unblock']) {
      const dto = plainToInstance(ToggleAccountStatusDto, { action });
      expect(await validate(dto)).toHaveLength(0);
    }
  });

  it('rejeita uma ação desconhecida', async () => {
    const dto = plainToInstance(ToggleAccountStatusDto, { action: 'delete' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'action')).toBe(true);
  });
});

describe('UpdateOwnProfileDto', () => {
  it('é válido apenas com name e version', async () => {
    const dto = plainToInstance(UpdateOwnProfileDto, {
      name: 'Maria Souza',
      version: 1,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('é válido apenas com email e version', async () => {
    const dto = plainToInstance(UpdateOwnProfileDto, {
      email: 'maria@example.com',
      version: 1,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('é válido com email: null (limpeza do e-mail opcional) e version', async () => {
    const dto = plainToInstance(UpdateOwnProfileDto, {
      email: null,
      version: 1,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('é válido com name e email juntos', async () => {
    const dto = plainToInstance(UpdateOwnProfileDto, {
      name: 'Maria Souza',
      email: 'maria@example.com',
      version: 1,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejeita um corpo contendo somente version (nem name nem email)', async () => {
    const dto = plainToInstance(UpdateOwnProfileDto, { version: 1 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'version')).toBe(true);
  });

  it('rejeita version ausente', async () => {
    const dto = plainToInstance(UpdateOwnProfileDto, { name: 'Maria Souza' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'version')).toBe(true);
  });

  it('rejeita version não inteiro', async () => {
    const dto = plainToInstance(UpdateOwnProfileDto, {
      name: 'Maria Souza',
      version: 'x',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'version')).toBe(true);
  });

  it('rejeita name vazio', async () => {
    const dto = plainToInstance(UpdateOwnProfileDto, { name: '', version: 1 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });
});
