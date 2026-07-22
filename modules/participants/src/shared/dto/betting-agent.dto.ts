import type { BettingAgentStatusType } from '../../betting-agent/vo/betting-agent-status.vo';
import type { CompensationPolicyType } from '../../betting-agent/vo/compensation-policy.vo';

/**
 * Projeções de leitura (CQRS). São contratos de consumo da API/front: não
 * carregam regra de domínio nem acoplamento a ORM. Datas trafegam como ISO
 * string; dinheiro como inteiro em centavos; percentual como número.
 */
export interface BettingAgentListItemDTO {
  id: string;
  code: string;
  status: BettingAgentStatusType;
  name: string | null;
  nickname: string | null;
  createdAt: string;
}

export interface CompensationPolicyDTO {
  type: CompensationPolicyType;
  percentage: number | null;
  weeklyFixedAmountCents: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface PartyContactDTO {
  phone: string;
  label: string | null;
}

export interface PartyAddressDTO {
  street: string | null;
  number: string | null;
  neighborhood: string;
  city: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface BettingAgentDetailDTO {
  id: string;
  code: string;
  status: BettingAgentStatusType;
  party: {
    id: string;
    name: string | null;
    nickname: string | null;
    contacts: PartyContactDTO[];
    address: PartyAddressDTO | null;
  };
  policy: CompensationPolicyDTO;
  createdAt: string;
}

/**
 * Candidato mínimo de possível duplicidade, sempre da própria Banca. Expõe
 * apenas identificação mínima — nunca telefone/endereço completos.
 */
export interface DuplicateCandidateDTO {
  bettingAgentId: string;
  code: string;
  displayName: string | null;
}
