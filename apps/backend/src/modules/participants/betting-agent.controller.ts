import type {
  CreateBettingAgentUseCase,
  GetBettingAgentUseCase,
  ListBettingAgentsUseCase,
  SetBettingAgentStatusUseCase,
  UpdateBettingAgentPolicyUseCase,
  UpdateBettingAgentProfileUseCase,
} from '@bancaflow/participants';
import { PARTICIPANTS_ERRORS } from '@bancaflow/participants';
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentBancaId,
  CurrentUser,
} from '../../shared/decorators/current-user.decorator';
import type { AuthContext } from '../../shared/types/jwt-payload.type';
import { JwtCookieAuthGuard } from '../identity/guards/jwt-cookie-auth.guard';
import { CreateBettingAgentDto } from './dto/create-betting-agent.dto';
import { ListBettingAgentsDto } from './dto/list-betting-agents.dto';
import {
  SetBettingAgentStatusDto,
  UpdateBettingAgentDto,
} from './dto/update-betting-agent.dto';
import { UpdateBettingAgentPolicyDto } from './dto/update-betting-agent-policy.dto';
import { unwrapParticipantsResult } from './participants-http.util';
import {
  CREATE_BETTING_AGENT_USE_CASE,
  GET_BETTING_AGENT_USE_CASE,
  LIST_BETTING_AGENTS_USE_CASE,
  SET_BETTING_AGENT_STATUS_USE_CASE,
  UPDATE_BETTING_AGENT_POLICY_USE_CASE,
  UPDATE_BETTING_AGENT_PROFILE_USE_CASE,
} from './participants.tokens';

/**
 * Catálogo de Cambistas: cadastro, consulta e manutenção (INC-01 + INC-02).
 * `bancaId` e `actorRole`/`actorUserId` vêm sempre do `AuthContext` (token),
 * nunca do body. A autorização é server-side dentro de cada caso de uso via
 * `hasPermission` (sem checagem de papel bruto aqui). O `Result` é traduzido
 * para HTTP por `unwrapParticipantsResult`; o alerta de possível duplicidade
 * vira `409` com os candidatos mínimos no corpo.
 */
@Controller('participants/betting-agents')
@UseGuards(JwtCookieAuthGuard)
export class BettingAgentController {
  constructor(
    @Inject(CREATE_BETTING_AGENT_USE_CASE)
    private readonly createBettingAgentUseCase: CreateBettingAgentUseCase,
    @Inject(LIST_BETTING_AGENTS_USE_CASE)
    private readonly listBettingAgentsUseCase: ListBettingAgentsUseCase,
    @Inject(GET_BETTING_AGENT_USE_CASE)
    private readonly getBettingAgentUseCase: GetBettingAgentUseCase,
    @Inject(UPDATE_BETTING_AGENT_PROFILE_USE_CASE)
    private readonly updateBettingAgentProfileUseCase: UpdateBettingAgentProfileUseCase,
    @Inject(SET_BETTING_AGENT_STATUS_USE_CASE)
    private readonly setBettingAgentStatusUseCase: SetBettingAgentStatusUseCase,
    @Inject(UPDATE_BETTING_AGENT_POLICY_USE_CASE)
    private readonly updateBettingAgentPolicyUseCase: UpdateBettingAgentPolicyUseCase,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: AuthContext,
    @CurrentBancaId() bancaId: string,
    @Body() body: CreateBettingAgentDto,
  ) {
    const output = unwrapParticipantsResult(
      await this.createBettingAgentUseCase.execute({
        bancaId,
        actorRole: user.role,
        actorUserId: user.userId,
        code: body.code,
        policy: body.policy,
        name: body.name ?? null,
        nickname: body.nickname ?? null,
        phones: body.phones,
        address: body.address ?? null,
        confirmPossibleDuplicate: body.confirmPossibleDuplicate ?? false,
      }),
    );

    if (output.outcome === 'POSSIBLE_DUPLICATE') {
      throw new HttpException(
        {
          statusCode: HttpStatus.CONFLICT,
          error: 'Participants Error',
          code: PARTICIPANTS_ERRORS.POSSIBLE_DUPLICATE,
          message: [PARTICIPANTS_ERRORS.POSSIBLE_DUPLICATE],
          // Carregado adiante pelo ApiExceptionFilter como `details`.
          details: output.candidates,
        },
        HttpStatus.CONFLICT,
      );
    }

    return {
      bettingAgentId: output.bettingAgentId,
      partyId: output.partyId,
      code: output.code,
    };
  }

  @Get()
  async list(
    @CurrentUser() user: AuthContext,
    @CurrentBancaId() bancaId: string,
    @Query() query: ListBettingAgentsDto,
  ) {
    return unwrapParticipantsResult(
      await this.listBettingAgentsUseCase.execute({
        bancaId,
        actorRole: user.role,
        search: query.search,
        page: query.page,
        pageSize: query.pageSize,
      }),
    );
  }

  @Get(':id')
  async detail(
    @CurrentUser() user: AuthContext,
    @CurrentBancaId() bancaId: string,
    @Param('id') id: string,
  ) {
    return unwrapParticipantsResult(
      await this.getBettingAgentUseCase.execute({
        id,
        bancaId,
        actorRole: user.role,
      }),
    );
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthContext,
    @CurrentBancaId() bancaId: string,
    @Param('id') id: string,
    @Body() body: UpdateBettingAgentDto,
  ) {
    const output = unwrapParticipantsResult(
      await this.updateBettingAgentProfileUseCase.execute({
        id,
        bancaId,
        actorRole: user.role,
        name: body.name,
        nickname: body.nickname,
        phones: body.phones,
        address: body.address,
      }),
    );
    return { bettingAgentId: output.bettingAgentId, partyId: output.partyId };
  }

  @Patch(':id/status')
  async setStatus(
    @CurrentUser() user: AuthContext,
    @CurrentBancaId() bancaId: string,
    @Param('id') id: string,
    @Body() body: SetBettingAgentStatusDto,
  ) {
    const output = unwrapParticipantsResult(
      await this.setBettingAgentStatusUseCase.execute({
        id,
        bancaId,
        actorRole: user.role,
        status: body.status,
      }),
    );
    return { bettingAgentId: output.bettingAgentId, status: output.status };
  }

  @Patch(':id/policy')
  async updatePolicy(
    @CurrentUser() user: AuthContext,
    @CurrentBancaId() bancaId: string,
    @Param('id') id: string,
    @Body() body: UpdateBettingAgentPolicyDto,
  ) {
    const output = unwrapParticipantsResult(
      await this.updateBettingAgentPolicyUseCase.execute({
        id,
        bancaId,
        actorRole: user.role,
        policy: body.policy,
      }),
    );
    return { bettingAgentId: output.bettingAgentId, policy: output.policy };
  }
}
