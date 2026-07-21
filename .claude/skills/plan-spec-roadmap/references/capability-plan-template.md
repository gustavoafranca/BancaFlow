# Guia do plano de capacidade

## Como preencher

- Usar uma capacidade que expresse resultado de negócio ou operacional.
- Decompor a capacidade em increments verticais; módulo, change e capability spec não são sinônimos.
- Manter domínio, Backend e Web aplicáveis na mesma change, evitando divisão por camada técnica.
- Separar fatos confirmados de hipóteses e pendências.
- Escrever invariantes testáveis e falhas observáveis.
- Modelar somente elementos úteis; declarar `Não aplicável — <motivo>` nos demais.
- Evitar agregado gigante e entidades anêmicas.
- Usar VO para valor, validação, normalização e igualdade conceitual.
- Usar serviço de domínio somente quando a regra não pertencer a entidade ou VO.
- Fazer o caso de uso orquestrar; não colocar decisão de negócio em controller ou página.
- Definir portas a partir da necessidade do núcleo, não como espelho de implementação concreta.
- Registrar a área/trilha estável do plano ou `root`; ler `artifact-organization.md` ao introduzir subpastas.
- Calcular links relativos a partir do caminho final e substituir todos os placeholders do asset antes de validar.
- Mapear skills por fase e finalidade. Skill de implementação informa restrições do plano, mas só é executada na aplicação explicitamente autorizada.
- Verificar se cada skill citada existe, se os recursos obrigatórios referenciados estão presentes e se sua validação passa; registrar skill em construção como dependência condicional.

## Registro de decisão

Usar uma linha por decisão:

```text
DEC-001 | CRITICAL | OPEN | pergunta/decisão | opções | evidência/decisor | impacto
```

Registrar alternativas rejeitadas relevantes e o motivo. Não apagar decisões substituídas.

## Escopo técnico proporcional

- Backend: contratos, autenticação/autorização, validação, erros, observabilidade e compatibilidade.
- Web: jornadas, estados vazios/carregamento/erro, acessibilidade e permissões.
- Persistência: modelo conceitual, integridade, concorrência, migração e rollback.
- Multi-tenant: isolamento, identificação do tenant, autorização cruzada e operações administrativas.
- Single-tenant: declarar explicitamente que tenancy não se aplica.
- DDD: aplicar linguagem, contexts e agregados apenas quando trouxerem clareza.

## Atualização por conflito

Quando spec ou código contradisser o plano, registrar: fonte da descoberta, regra afetada, impacto, decisão necessária, artefatos que precisam mudar e estado de retorno. Não adaptar o plano retroativamente como se sempre tivesse dito a nova regra.
