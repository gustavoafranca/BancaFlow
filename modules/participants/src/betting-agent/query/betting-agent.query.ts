import { PaginatedInputDTO, PaginatedResultDTO, Result } from '@bancaflow/shared';
import type {
  BettingAgentDetailDTO,
  BettingAgentListItemDTO,
} from '../../shared/dto/betting-agent.dto';

/**
 * Filtros de listagem de Cambistas. `search` casa parcialmente contra código,
 * nome e apelido. Sempre aplicado junto ao `bancaId` do contexto (tenant-scoped).
 */
export interface BettingAgentListFilters {
  search?: string;
}

/**
 * Porta de leitura (CQRS). Retorna projeções/DTOs, nunca entidades ou modelos
 * Prisma. Toda leitura é tenant-scoped por `bancaId`; `getDetail` retorna `null`
 * (não encontrado) para id inexistente ou de outra Banca, sem revelar existência.
 */
export interface BettingAgentQuery {
  list(
    bancaId: string,
    filters: BettingAgentListFilters,
    pagination: PaginatedInputDTO,
  ): Promise<Result<PaginatedResultDTO<BettingAgentListItemDTO>>>;

  getDetail(id: string, bancaId: string): Promise<Result<BettingAgentDetailDTO | null>>;
}
