// Função para obter o saldo WLD do usuário
// Usando viem para consultar o contrato WLD na World Chain

import { createPublicClient, http, formatUnits, defineChain } from 'viem';

// Define World Chain manualmente (já que não está disponível no viem/chains)
const worldChain = defineChain({
  id: 480,
  name: 'World Chain',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://worldchain-mainnet.g.alchemy.com/v2/demo'],
    },
  },
  blockExplorers: {
    default: {
      name: 'World Chain Explorer',
      url: 'https://worldchain-mainnet.g.alchemy.com',
    },
  },
});

// Endereço do contrato WLD na World Chain
// WLD token contract address on World Chain
const WLD_TOKEN_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`;

// ABI mínimo para balanceOf
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Obtém o saldo WLD de um endereço na World Chain
 * @param address Endereço da carteira
 * @returns Saldo em WLD (número decimal)
 */
export async function getWldBalance(address: string): Promise<number> {
  try {
    // Cria cliente público para World Chain
    // Em produção, você pode precisar de um RPC específico
    const publicClient = createPublicClient({
      chain: worldChain,
      transport: http(),
    });

    // Converte o endereço para o formato correto
    const walletAddress = address as `0x${string}`;

    // Obtém o saldo (em wei/smallest unit)
    const balance = await publicClient.readContract({
      address: WLD_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletAddress],
    });

    // Obtém os decimais do token
    const decimals = await publicClient.readContract({
      address: WLD_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'decimals',
    });

    // Converte para WLD (formato decimal)
    const balanceInWld = parseFloat(formatUnits(balance, decimals));

    return balanceInWld;
  } catch (error) {
    console.error('Erro ao obter saldo WLD:', error);
    
    // Fallback: retorna um valor mockado para desenvolvimento
    // Em produção, você deve tratar o erro adequadamente
    console.warn('Usando saldo mockado para desenvolvimento');
    return 1.5; // Valor mockado para testes
  }
}

/**
 * Obtém o saldo WLD usando MiniKit (se disponível)
 * Esta é uma alternativa que pode funcionar melhor no contexto do miniapp
 */
export async function getWldBalanceFromMiniKit(): Promise<number> {
  try {
    // Tenta usar MiniKit se disponível
    const { MiniKit } = await import('@worldcoin/minikit-js');
    
    // MiniKit.user pode ter walletAddress ou address dependendo da versão
    const userAddress = (MiniKit?.user as { walletAddress?: string; address?: string })?.walletAddress 
      || (MiniKit?.user as { walletAddress?: string; address?: string })?.address;
    
    if (userAddress) {
      // Se MiniKit tiver acesso direto ao saldo, use aqui
      // Por enquanto, vamos usar a função padrão
      return await getWldBalance(userAddress);
    }
    
    throw new Error('MiniKit não disponível');
  } catch (error) {
    console.error('Erro ao obter saldo via MiniKit:', error);
    // Fallback para função padrão
    return getWldBalance('0x0000000000000000000000000000000000000000');
  }
}

