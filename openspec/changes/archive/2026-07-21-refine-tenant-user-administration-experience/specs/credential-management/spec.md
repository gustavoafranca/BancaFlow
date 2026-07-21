## ADDED Requirements

### Requirement: Administrative temporary password is human-readable and strong
A senha temporária gerada para criação administrativa e reset administrativo SHALL usar CSPRNG e formato humano memorizável com entropia documentada de pelo menos 64 bits, satisfazendo `StrongPassword` sem enfraquecer sua política. A senha SHALL usar palavras ASCII sem acentos, neutras, sem conteúdo ofensivo, separadores e sufixos não ambíguos, e nunca SHALL derivar de nome, username, e-mail, banca ou outro dado previsível.

#### Scenario: Generated human password satisfies StrongPassword
- **WHEN** o gerador concreto produz uma senha temporária
- **THEN** a senha possui maiúscula, minúscula, número, símbolo, tamanho mínimo e é aceita por `StrongPassword`

#### Scenario: Generated password is not logged or persisted in plain text
- **WHEN** criação ou reset administrativo conclui
- **THEN** apenas o hash é persistido, a senha em texto puro aparece somente na resposta autorizada e não é enviada a logs, telemetria ou erros

#### Scenario: Generator failure prevents persistence
- **WHEN** o gerador falha ou produz valor inválido
- **THEN** o use case retorna falha segura e nenhuma credencial é alterada
