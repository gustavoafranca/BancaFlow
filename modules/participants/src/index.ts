// Erros, portas e utilitários compartilhados
export * from './shared/errors/participants.errors';
export * from './shared/ports/clock.port';
export * from './shared/ports/permission-checker.port';
export * from './shared/dto/betting-agent.dto';
export * from './shared/utils/normalize-text.util';

// Party (agregado, entidades filhas, VOs, repositório e query)
export * from './party/party.entity';
export * from './party/party-contact.entity';
export * from './party/party-address.entity';
export * from './party/party.repository';
export * from './party/query/party-duplicate.query';
export * from './party/vo/party-type.vo';
export * from './party/vo/phone.vo';
export * from './party/vo/neighborhood.vo';
export * from './party/vo/city.vo';
export * from './party/vo/effective-period.vo';

// BettingAgent (agregado, VOs, repositório, query e casos de uso de leitura)
export * from './betting-agent/betting-agent.entity';
export * from './betting-agent/betting-agent.repository';
export * from './betting-agent/query/betting-agent.query';
export * from './betting-agent/vo/betting-agent-code.vo';
export * from './betting-agent/vo/betting-agent-status.vo';
export * from './betting-agent/vo/compensation-policy.vo';
export * from './betting-agent/use-case/list-betting-agents.use-case';
export * from './betting-agent/use-case/get-betting-agent.use-case';
export * from './betting-agent/use-case/set-betting-agent-status.use-case';
export * from './betting-agent/use-case/update-betting-agent-policy.use-case';

// Casos de uso multi-agregado
export * from './app/use-case/create-betting-agent.use-case';
export * from './app/use-case/update-betting-agent-profile.use-case';
