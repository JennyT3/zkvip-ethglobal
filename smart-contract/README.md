# GroupAccessControl - ZK Proof Verifier Smart Contract

Smart contract para validar provas Zero-Knowledge geradas pelo circuito Noir e controlar acesso a grupos baseado no saldo mínimo de WLD tokens.

## Visão Geral

Este contrato permite que usuários provem que possuem um saldo mínimo de WLD tokens sem revelar o saldo real, usando Zero-Knowledge proofs gerados pelo circuito Noir. O contrato:

- ✅ Valida provas ZK geradas pelo circuito Noir
- ✅ Controla acesso a grupos baseado em threshold mínimo de WLD
- ✅ Previne replay attacks usando nonces únicos
- ✅ Permite múltiplos grupos com diferentes thresholds
- ✅ Emite eventos para tracking de acesso

## Estrutura do Projeto

```
smart-contract/
├── src/
│   ├── GroupAccessControl.sol      # Contrato principal
│   ├── interfaces/
│   │   └── IZKVerifier.sol         # Interface do verifier
│   └── mocks/
│       └── MockZKVerifier.sol      # Mock verifier para testes
├── test/
│   └── GroupAccessControl.t.sol    # Testes completos
├── script/
│   └── Deploy.s.sol                # Scripts de deployment
└── foundry.toml                    # Configuração Foundry
```

## Instalação

### Pré-requisitos

- [Foundry](https://book.getfoundry.sh/getting-started/installation.html)
- [Noir](https://noir-lang.org/) (para gerar o verifier contract do circuito)

### Setup

```bash
# Navegar para o diretório do smart contract
cd smart-contract

# Instalar dependências (OpenZeppelin)
forge install openzeppelin/openzeppelin-contracts

# Compilar contratos
forge build

# Rodar testes
forge test

# Rodar testes com output verboso
forge test -vvv
```

## Como Funciona

### 1. Circuito ZK (Noir)

O circuito Noir (`zk-circuit/main.nr`) valida que:
- `balance >= threshold` (o usuário tem saldo suficiente)
- `nonce == secret_nonce` (validação de nonce)

O circuito retorna `threshold as Field` como public output.

### 2. Geração de Prova (Frontend)

O frontend gera a prova ZK usando:
- `threshold`: Threshold mínimo (escalado por 1e18)
- `nonce`: Nonce público
- `balance`: Saldo real do usuário (escalado por 1e18)
- `secret_nonce`: Nonce secreto (deve ser igual ao nonce)

### 3. Validação On-Chain

O smart contract:
1. Verifica que o nonce não foi usado antes
2. Valida que o threshold atende ao requisito do grupo
3. Verifica a prova ZK usando o verifier contract
4. Valida que os public inputs correspondem ao threshold
5. Concede acesso ao grupo

## Deploy

### Usando Mock Verifier (Para Testes)

```bash
# Deploy com mock verifier
forge script script/Deploy.s.sol:DeployGroupAccessControl --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
```

### Usando Verifier Real do Noir

1. **Gerar o Verifier Contract do Circuito:**

```bash
cd ../zk-circuit

# Compilar o circuito
nargo compile

# Gerar o verifier contract
nargo codegen-verifier

# O verifier será gerado em target/
```

2. **Deploy do Verifier:**

```bash
# Deploy do verifier contract gerado pelo Noir
forge script script/DeployVerifier.s.sol --rpc-url $RPC_URL --broadcast
```

3. **Deploy do GroupAccessControl:**

```bash
# Configurar o endereço do verifier
export ZK_VERIFIER_ADDRESS=0x...

# Deploy do GroupAccessControl
forge script script/Deploy.s.sol:DeployWithRealVerifier --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
```

## Uso

### 1. Configurar Grupos

```solidity
// Definir threshold mínimo para um grupo (em wei, 18 decimals)
bytes32 groupId = keccak256("VIP_BUILDERS");
uint256 threshold = 1e18; // 1 WLD

groupAccessControl.setGroupThreshold(groupId, threshold);
```

### 2. Verificar Prova e Conceder Acesso

```solidity
bytes32 groupId = keccak256("VIP_BUILDERS");
uint256 threshold = 1e18;
uint256 nonce = 12345;
bytes memory proof = ...; // Prova gerada pelo frontend
uint256[] memory publicInputs = new uint256[](1);
publicInputs[0] = threshold;

groupAccessControl.verifyProofAndGrantAccess(
    groupId,
    threshold,
    nonce,
    proof,
    publicInputs
);
```

### 3. Verificar Acesso

```solidity
bool hasAccess = groupAccessControl.hasAccess(userAddress, groupId);
```

## Funções Principais

### `setGroupThreshold(bytes32 groupId, uint256 threshold)`

Define o threshold mínimo de WLD para um grupo. Apenas o owner pode executar.

**Parâmetros:**
- `groupId`: Identificador do grupo
- `threshold`: Threshold mínimo em wei (18 decimals)

### `verifyProofAndGrantAccess(...)`

Verifica uma prova ZK e concede acesso ao grupo.

**Parâmetros:**
- `groupId`: Identificador do grupo
- `threshold`: Threshold sendo provado
- `nonce`: Nonce único para prevenir replay attacks
- `proof`: Prova ZK serializada
- `publicInputs`: Inputs públicos do circuito (deve conter threshold)

### `checkAccess(address user, bytes32 groupId)`

Verifica se um usuário tem acesso a um grupo.

**Retorna:**
- `bool`: Se o usuário tem acesso

### `revokeAccess(address user, bytes32 groupId)`

Revoga acesso de um usuário a um grupo. Apenas o owner pode executar.

## Eventos

### `AccessGranted(address indexed user, bytes32 indexed groupId, uint256 threshold, uint256 nonce)`

Emitido quando um usuário verifica com sucesso sua prova e ganha acesso.

### `GroupThresholdSet(bytes32 indexed groupId, uint256 threshold, address indexed setBy)`

Emitido quando um threshold de grupo é definido.

### `AccessRevoked(address indexed user, bytes32 indexed groupId, address indexed revokedBy)`

Emitido quando acesso é revogado.

## Testes

O projeto inclui testes completos cobrindo:

- ✅ Configuração de grupos e thresholds
- ✅ Verificação de provas e concessão de acesso
- ✅ Prevenção de replay attacks (nonce reuse)
- ✅ Validação de thresholds
- ✅ Múltiplos grupos e usuários
- ✅ Revogação de acesso
- ✅ Emissão de eventos

### Rodar Testes

```bash
# Todos os testes
forge test

# Testes com output verboso
forge test -vvv

# Testes específicos
forge test --match-test test_VerifyProofAndGrantAccess

# Com gas report
forge test --gas-report
```

## Integração com Frontend

O frontend gera a prova ZK e envia para o smart contract:

```typescript
// 1. Gerar prova no frontend
const proofResult = await generateProof({
  threshold: Math.floor(groupMinWld * 1e18),
  nonce: generateRandomNonce(),
  balance: Math.floor(wldBalance * 1e18),
  secret_nonce: nonce,
});

// 2. Converter prova para formato on-chain
const proofBytes = ethers.utils.arrayify(proofResult.proofB64);
const publicInputs = proofResult.publicInputs;

// 3. Chamar o smart contract
await groupAccessControl.verifyProofAndGrantAccess(
  groupId,
  threshold,
  nonce,
  proofBytes,
  publicInputs
);
```

## Segurança

- ✅ **Nonce System**: Previne replay attacks usando nonces únicos por usuário
- ✅ **Threshold Validation**: Valida que o threshold atende ao requisito do grupo
- ✅ **ZK Proof Verification**: Valida provas usando o verifier contract do Noir
- ✅ **Access Control**: Apenas owner pode configurar grupos e revogar acesso
- ✅ **Input Validation**: Valida todos os inputs antes de processar

## Notas Importantes

1. **Verifier Contract**: Em produção, você precisa gerar e deployar o verifier contract do circuito Noir. Use `nargo codegen-verifier` para gerar.

2. **Public Inputs**: O circuito retorna `threshold as Field` como public output. O smart contract valida que este valor corresponde ao threshold esperado.

3. **Threshold Scaling**: O frontend escala valores por 1e18 (18 decimals). O smart contract trabalha com valores em wei.

4. **Nonce Management**: Cada nonce só pode ser usado uma vez por usuário. O frontend deve gerar nonces únicos.

## Licença

MIT

## Suporte

Para questões ou problemas:
- [Foundry Documentation](https://book.getfoundry.sh/)
- [Noir Documentation](https://noir-lang.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

