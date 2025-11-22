// Serviço de geração de prova ZK usando Noir
// Baseado no web-prover do stark-VIP

// Tipos para os inputs da prova
export interface ProofInputs {
  threshold: number;      // u64 público - valor mínimo de saldo (em WLD)
  nonce: string;          // Field público - nonce para evitar replay attacks
  balance: number;        // u64 privado - saldo real do usuário (em WLD)
  secret_nonce: string;   // Field privado - nonce secreto (deve ser igual ao nonce público)
}

// Tipos para o resultado da prova
export interface ProofResult {
  proof: Uint8Array;      // Prova binária
  proofB64: string;       // Prova em base64 para envio
  publicInputs: number[]; // Inputs públicos para verificação
  verificationKey: Uint8Array; // Chave de verificação
  isValid: boolean;       // Se a prova é válida localmente
}

// Callback de progresso
export type ProgressCallback = (progress: number, text: string) => void;

// Função principal de geração de prova
export const generateProof = async (
  inputs: ProofInputs, 
  onProgress?: ProgressCallback
): Promise<ProofResult> => {
  try {
    onProgress?.(10, "Carregando dependências...");
    
    // Importar dependências dinamicamente
    const { UltraHonkBackend } = await import("@aztec/bb.js");
    const { Noir } = await import("@noir-lang/noir_js");
    
    onProgress?.(20, "Carregando circuito...");
    const res = await fetch("/zk_noir_circuit.json");
    if (!res.ok) {
      throw new Error(`Erro ao carregar circuito: ${res.statusText}`);
    }
    const circuit = await res.json();
    
    console.log('📦 Circuit loaded:', {
      noir_version: circuit.noir_version,
      hash: circuit.hash,
      hasBytecode: !!circuit.bytecode
    });
    
    onProgress?.(30, "Inicializando Noir...");
    const noir = new Noir(circuit);
    
    onProgress?.(40, "Inicializando backend...");
    const backend = new UltraHonkBackend(circuit.bytecode);
    console.log("✅ Backend inicializado com bytecode");

    onProgress?.(50, "Validando inputs...");
    validateInputs(inputs);

    onProgress?.(60, "Gerando witness...");
    const { witness } = await noir.execute({
      threshold: inputs.threshold,
      nonce: inputs.nonce,
      balance: inputs.balance,
      secret_nonce: inputs.secret_nonce,
    });
    console.log("✅ Witness generated");

    onProgress?.(70, "Gerando prova...");
    const { proof, publicInputs } = await backend.generateProof(witness);
    const vk = await backend.getVerificationKey();

    console.log("✅ Proof generated:", { 
      proofLength: proof.length, 
      publicInputs 
    });

    onProgress?.(80, "Verificando prova localmente...");
    const isValid = await backend.verifyProof({ proof, publicInputs });
    console.log("✅ Proof verified locally:", isValid);

    onProgress?.(90, "Finalizando...");
    const proofB64 = btoa(String.fromCharCode(...proof));

    onProgress?.(100, "Prova gerada com sucesso!");

    return {
      proof,
      proofB64,
      publicInputs: Array.isArray(publicInputs) 
        ? publicInputs.map(Number) 
        : [Number(publicInputs)],
      verificationKey: vk,
      isValid
    };
  } catch (err: unknown) {
    console.error("💔 Falha na geração de prova", err);
    const errorMessage = err instanceof Error ? err.message : "Falha na geração de prova";
    if (err instanceof Error && err.stack) {
      console.error("Stack trace:", err.stack);
    }
    throw new Error(errorMessage);
  }
};

// Valida os inputs da prova
function validateInputs(inputs: ProofInputs): void {
  if (inputs.threshold < 0) {
    throw new Error("Threshold deve ser um número positivo");
  }

  if (inputs.balance < 0) {
    throw new Error("Balance deve ser um número positivo");
  }

  if (!inputs.nonce || inputs.nonce.trim() === "") {
    throw new Error("Nonce não pode ser vazio");
  }

  if (!inputs.secret_nonce || inputs.secret_nonce.trim() === "") {
    throw new Error("Secret nonce não pode ser vazio");
  }

  if (inputs.nonce !== inputs.secret_nonce) {
    throw new Error("Nonce público e secreto devem ser iguais");
  }

  if (inputs.balance < inputs.threshold) {
    throw new Error("Balance deve ser maior ou igual ao threshold");
  }
}

// Gera um nonce aleatório válido
export function generateRandomNonce(): string {
  return BigInt("0x" + crypto.getRandomValues(new Uint8Array(16))
    .reduce((acc, b) => acc + b.toString(16).padStart(2, "0"), "")).toString();
}

// Converte uma prova base64 de volta para Uint8Array
export function proofB64ToUint8Array(proofB64: string): Uint8Array {
  try {
    const binaryString = atob(proofB64);
    return new Uint8Array(binaryString.length).map((_, i) => binaryString.charCodeAt(i));
  } catch (error) {
    throw new Error(`Falha ao converter prova base64: ${error instanceof Error ? error.message : String(error)}`);
  }
}

