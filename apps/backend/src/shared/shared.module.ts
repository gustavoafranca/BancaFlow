import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './auth/jwt.strategy';
import { JwtGuard } from './auth/jwt.guard';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // SEM fallback inseguro: `validateSecuritySecrets` (main.ts) já falha
        // o startup (exit 1) se `JWT_SECRET` estiver ausente/fraco — nunca
        // chegamos aqui com um segredo fixo tipo `'secret'`.
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [JwtStrategy, JwtGuard],
  exports: [JwtModule, JwtGuard],
})
export class SharedModule {}
