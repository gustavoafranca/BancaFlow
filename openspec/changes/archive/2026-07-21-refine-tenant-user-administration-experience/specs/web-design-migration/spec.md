## ADDED Requirements

### Requirement: Overlay, select, drawer and destructive styles use canonical tokens
Novos overlays, selects, drawers e confirmações destrutivas SHALL usar primitives e tokens canônicos do design system, preservando as cores, espaçamentos, tipografia e responsividade aprovados. Módulos SHALL NOT duplicar tokens manualmente em cada modal/drawer.

#### Scenario: New admin overlay avoids local color patching
- **WHEN** um novo overlay administrativo é implementado
- **THEN** ele usa tokens compartilhados herdados pelo portal, não cores branco/preto/vermelho hardcoded locais
