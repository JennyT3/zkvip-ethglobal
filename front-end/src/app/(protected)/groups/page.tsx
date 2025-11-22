'use client';

import clsx from 'clsx';
import { Page } from '@/components/PageLayout';
import { Marble } from '@worldcoin/mini-apps-ui-kit-react';
import { Plus } from 'iconoir-react';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  addJoinedGroup,
  getAvailableGroupsExcludingJoined,
  initializeAvailableGroups,
  createAvailableGroup,
  removeAvailableGroup,
  type AvailableGroup,
} from '@/lib/groups';
import { showToast } from '@/components/Toast';
import { generateProof, generateRandomNonce, type ProofInputs } from '@/lib/zkProof';
import { getWldBalance } from '@/lib/wldBalance';

const filterOptions = [
  { key: 'all', label: 'Todos' },
  { key: 'low', label: '≤ 1 WLD' },
];

const proofSteps = [
  'Checando saldo WLD',
  'Gerando prova ZK',
  'Enviando prova',
  'Confirmando acesso',
];

type StepStatus = 'pending' | 'active' | 'done';

export default function Groups() {
  const session = useSession();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<AvailableGroup | null>(null);
  const [availableGroups, setAvailableGroups] = useState<AvailableGroup[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMinWld, setNewGroupMinWld] = useState('');
  const [error, setError] = useState('');
  const [proofState, setProofState] = useState<'idle' | 'running' | 'success'>(
    'idle',
  );
  const [stepsStatus, setStepsStatus] = useState<StepStatus[]>(
    proofSteps.map(() => 'pending'),
  );
  const [proofError, setProofError] = useState<string>('');
  const [wldBalance, setWldBalance] = useState<number | null>(null);

  // Carrega grupos disponíveis do localStorage (excluindo os que já entrou)
  useEffect(() => {
    // Inicializa grupos padrão se necessário
    initializeAvailableGroups();
    
    const loadGroups = () => {
      setAvailableGroups(getAvailableGroupsExcludingJoined());
    };
    
    loadGroups();
    
    // Listener para atualizações
    const handleUpdate = () => {
      loadGroups();
    };
    
    window.addEventListener('availableGroupsUpdated', handleUpdate);
    window.addEventListener('groupsUpdated', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    
    return () => {
      window.removeEventListener('availableGroupsUpdated', handleUpdate);
      window.removeEventListener('groupsUpdated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, []);

  const filteredGroups = useMemo(() => {
    if (activeFilter === 'low') {
      return availableGroups.filter((g) => g.minWld <= 1);
    }
    return availableGroups;
  }, [activeFilter, availableGroups]);

  const startProof = async () => {
    if (!selectedGroup || !session?.data?.user?.walletAddress) {
      showToast('Erro: usuário não autenticado', 'error');
      return;
    }
    
    setProofState('running');
    setProofError('');
      setStepsStatus(
      proofSteps.map((_, idx) => (idx === 0 ? 'active' : 'pending')),
    );
    
    try {
      showToast('Iniciando geração de prova ZK...', 'info');
      
      // Passo 1: Checar saldo WLD
      setStepsStatus((prev) => {
        const newStatus = [...prev];
        newStatus[0] = 'active';
        return newStatus;
      });
      
      const walletAddress = session.data.user.walletAddress;
      const balance = await getWldBalance(walletAddress);
      setWldBalance(balance);
      
      if (balance < selectedGroup.minWld) {
        throw new Error(
          `Saldo insuficiente. Você possui ${balance.toFixed(2)} WLD, mas precisa de ${selectedGroup.minWld} WLD.`
        );
      }
      
      setStepsStatus((prev) => {
        const newStatus = [...prev];
        newStatus[0] = 'done';
        newStatus[1] = 'active';
        return newStatus;
      });
      
      // Passo 2: Gerar prova ZK
      const nonce = generateRandomNonce();
      // O circuito espera valores em u64 (números inteiros)
      // Convertemos WLD para a menor unidade (assumindo 18 decimais como padrão ERC20)
      // Mas podemos usar valores diretos se o circuito aceitar decimais
      // Por enquanto, vamos usar valores inteiros multiplicados por 1e18 para precisão
      const thresholdScaled = Math.floor(selectedGroup.minWld * 1e18);
      const balanceScaled = Math.floor(balance * 1e18);
      
      const proofInputs: ProofInputs = {
        threshold: thresholdScaled,
        nonce: nonce,
        balance: balanceScaled,
        secret_nonce: nonce,
      };
      
      const onProgress = (progress: number, text: string) => {
        console.log(`Progresso: ${progress}% - ${text}`);
        // Atualiza o progresso visual
        if (progress >= 30 && progress < 60) {
          setStepsStatus((prev) => {
            const newStatus = [...prev];
            newStatus[1] = 'active';
            return newStatus;
          });
        } else if (progress >= 60 && progress < 90) {
          setStepsStatus((prev) => {
            const newStatus = [...prev];
            newStatus[1] = 'done';
            newStatus[2] = 'active';
            return newStatus;
          });
        }
      };
      
      const proofResult = await generateProof(proofInputs, onProgress);
      
      if (!proofResult.isValid) {
        throw new Error('A prova gerada não é válida');
      }
      
      setStepsStatus((prev) => {
        const newStatus = [...prev];
        newStatus[2] = 'done';
        newStatus[3] = 'active';
        return newStatus;
      });
      
      // Passo 3: Enviar prova (opcional - pode ser feito no backend)
      // Por enquanto, apenas simulamos
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      setStepsStatus((prev) => {
        const newStatus = [...prev];
        newStatus[3] = 'done';
        return newStatus;
      });
      
      // Passo 4: Confirmar acesso
      setProofState('success');
      showToast('Prova ZK gerada com sucesso!', 'success');
      
    } catch (error) {
      console.error('Erro ao gerar prova ZK:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erro desconhecido ao gerar prova ZK';
      setProofError(errorMessage);
      setProofState('idle');
      setStepsStatus(proofSteps.map(() => 'pending'));
      showToast(errorMessage, 'error');
    }
  };

  // Removido o useEffect antigo que simulava os passos
  // Agora os passos são controlados diretamente pela função startProof

  const closeSheet = () => {
    setSelectedGroup(null);
    setProofState('idle');
    setStepsStatus(proofSteps.map(() => 'pending'));
    setProofError('');
    setWldBalance(null);
  };

  const handleJoinGroup = () => {
    if (selectedGroup && proofState === 'success') {
      // Adiciona o grupo à lista de grupos do usuário
      addJoinedGroup(selectedGroup);
      
      // Remove o grupo dos grupos disponíveis
      removeAvailableGroup(selectedGroup.id);
      
      // Atualiza a lista de grupos disponíveis
      setAvailableGroups(getAvailableGroupsExcludingJoined());
      
      showToast(`Entrou no grupo ${selectedGroup.name}!`, 'success');
      
      // Fecha o modal
      closeSheet();
      
      // Navega para o chat do grupo
      router.push(`/chat/${selectedGroup.id}`);
    }
  };

  const handleCreate = () => {
    if (!newGroupName.trim()) {
      setError('Adicione um nome.');
      return;
    }
    const min = Number(newGroupMinWld);
    if (Number.isNaN(min) || min <= 0) {
      setError('Defina o mínimo de WLD.');
      return;
    }
    
    try {
      // Cores de avatar aleatórias
      const avatarColors = [
        'bg-gradient-to-br from-indigo-600 via-purple-500 to-pink-500',
        'bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500',
        'bg-gradient-to-br from-slate-700 via-slate-600 to-slate-500',
        'bg-gradient-to-br from-teal-500 via-emerald-500 to-lime-500',
        'bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500',
        'bg-gradient-to-br from-pink-500 via-rose-500 to-red-500',
      ];
      const randomAvatar =
        avatarColors[Math.floor(Math.random() * avatarColors.length)];
      
      // Cria o grupo disponível
      const newGroup = createAvailableGroup(
        newGroupName.trim(),
        `Grupo criado por ${session?.data?.user?.username || 'você'}`,
        min,
        randomAvatar,
      );
      
      // Adiciona automaticamente o criador ao grupo (sem precisar de prova ZK)
      addJoinedGroup(newGroup);
      
      setError('');
      setIsCreating(false);
      setNewGroupName('');
      setNewGroupMinWld('');
      
      // Recarrega os grupos disponíveis
      setAvailableGroups(getAvailableGroupsExcludingJoined());
      
      showToast(`Grupo "${newGroup.name}" criado com sucesso!`, 'success');
      
      // Navega para o chat do grupo criado
      router.push(`/chat/${newGroup.id}`);
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Erro ao criar grupo. Tente novamente.';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    }
  };

  return (
    <>
      <Page.Header className="p-0 bg-gradient-to-b from-white to-slate-50/50 border-b border-slate-100">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
              Groups
            </p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">
              Descubra e entre
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <p className="text-sm font-semibold capitalize leading-tight text-slate-900">
                {session?.data?.user?.username}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                <p className="text-[11px] text-slate-500 font-medium">online</p>
              </div>
            </div>
            <Marble
              src={session?.data?.user?.profilePictureUrl}
              className="w-11 h-11 shadow-md ring-2 ring-white"
            />
          </div>
        </div>
      </Page.Header>

      <Page.Main className="relative flex flex-col bg-gradient-to-b from-slate-50/50 to-white px-0 pb-28">
        {/* Filter Section */}
        <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-50/95 to-transparent backdrop-blur-sm px-6 pt-6 pb-4">
          <div className="flex gap-2.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {filterOptions.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={clsx(
                  'rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 whitespace-nowrap',
                activeFilter === filter.key
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm',
              )}
            >
              {filter.label}
            </button>
          ))}
          </div>
        </div>

        {/* Groups Grid */}
        <div className="px-6 space-y-3">
          {filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <p className="text-slate-500 font-medium">Nenhum grupo encontrado</p>
            </div>
          ) : (
            filteredGroups.map((group) => (
            <button
              key={group.name}
              onClick={() => setSelectedGroup(group)}
                className="w-full group"
            >
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 hover:-translate-y-0.5">
                  {/* Avatar */}
                  <div className="relative shrink-0">
              <div
                className={clsx(
                        'flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl text-base font-bold uppercase text-white shadow-lg ring-2 ring-white/50',
                  group.avatarBg,
                )}
              >
                {group.name
                  .split(' ')
                  .slice(0, 2)
                  .map((word) => word[0])
                  .join('')}
              </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-slate-700 transition-colors">
                    {group.name}
                      </h3>
                      <span className="shrink-0 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 text-white px-2.5 py-1 text-[11px] font-bold shadow-sm">
                        {group.minWld} WLD
                  </span>
                </div>

                    <p className="text-xs text-slate-500 mb-2.5 line-clamp-2 leading-relaxed">
                      {group.description}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span className="font-medium">{group.members} membros</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="shrink-0 pt-1">
                    <svg
                      className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                </div>
              </div>
            </button>
            ))
          )}
        </div>

        {/* Detail Sheet Modal */}
        {selectedGroup && (
          <div
            className="fixed inset-0 z-30 flex items-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={closeSheet}
          >
            <div
              className="w-full max-h-[90vh] overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white shadow-2xl animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sheet Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1 rounded-full bg-slate-300"></div>
              </div>

              {/* Header */}
              <div className="px-6 pt-4 pb-6 border-b border-slate-100">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className={clsx(
                        'flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-lg font-bold uppercase text-white shadow-xl ring-2 ring-slate-100',
                      selectedGroup.avatarBg,
                    )}
                  >
                    {selectedGroup.name
                      .split(' ')
                      .slice(0, 2)
                      .map((word) => word[0])
                      .join('')}
                  </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-2xl font-bold text-slate-900 mb-1">
                      {selectedGroup.name}
                      </h2>
                      <p className="text-sm text-slate-600 leading-relaxed">
                      {selectedGroup.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeSheet}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                </button>
              </div>

                {/* Info Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    {selectedGroup.members} membros
                </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-slate-900 to-slate-800 text-white px-3 py-1.5 text-xs font-bold shadow-sm">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Mínimo: {selectedGroup.minWld} WLD
                </span>
                </div>
              </div>

              {/* Proof Section */}
              <div className="px-6 py-6">
                <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-white p-6 shadow-lg relative overflow-hidden">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}></div>
                  </div>
                  
                  <div className="relative">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                              <svg
                                className="w-6 h-6 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                            </div>
                  <div>
                              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                Zero-Knowledge Proof
                                <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                  ZK-SNARK
                                </span>
                              </h3>
                              <p className="text-xs text-slate-500 font-mono">
                                Verificação criptográfica privada
                              </p>
                            </div>
                  </div>
                  <span
                    className={clsx(
                              'rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider shadow-sm',
                      proofState === 'success'
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                : proofState === 'running'
                                  ? 'bg-sky-100 text-sky-700 border border-sky-300 animate-pulse'
                                  : 'bg-slate-200 text-slate-700 border border-slate-300',
                            )}
                          >
                            {proofState === 'success'
                              ? '✓ Verificado'
                              : proofState === 'running'
                                ? '⚡ Processando'
                                : '○ Pendente'}
                  </span>
                        </div>
                        <div className="bg-slate-900/5 rounded-lg p-3 border border-slate-200/50 mb-4">
                          <p className="text-xs text-slate-700 leading-relaxed font-medium">
                            <span className="font-bold text-slate-900">Zero-Knowledge:</span> Prove que você possui{' '}
                            <span className="font-bold text-indigo-700">{selectedGroup.minWld} WLD</span> sem revelar
                            seu saldo completo ou endereço. A prova criptográfica garante privacidade total.
                          </p>
                          {wldBalance !== null && (
                            <p className="text-xs text-slate-600 mt-2">
                              Seu saldo: <span className="font-bold">{wldBalance.toFixed(2)} WLD</span>
                            </p>
                          )}
                        </div>
                        
                        {proofError && (
                          <div className="mb-4 rounded-xl bg-red-50 border-2 border-red-200 px-4 py-3">
                            <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                              </svg>
                              {proofError}
                            </p>
                          </div>
                        )}
                      </div>
                </div>

                    {/* Cryptographic Steps */}
                    <div className="space-y-3 mb-6">
                  {proofSteps.map((step, idx) => (
                    <div
                      key={step}
                          className={clsx(
                            'flex items-center gap-4 rounded-xl px-4 py-3.5 transition-all duration-300 border-2',
                            stepsStatus[idx] === 'active'
                              ? 'bg-gradient-to-r from-sky-50 to-indigo-50 border-sky-300 shadow-md ring-2 ring-sky-200/50'
                              : stepsStatus[idx] === 'done'
                                ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300 shadow-sm'
                                : 'bg-white border-slate-200',
                          )}
                        >
                          <div className="relative">
                      <span
                        className={clsx(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all duration-300',
                          stepsStatus[idx] === 'done' &&
                                  'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg',
                          stepsStatus[idx] === 'active' &&
                                  'bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg animate-pulse',
                          stepsStatus[idx] === 'pending' &&
                                  'bg-slate-200 text-slate-500',
                              )}
                            >
                              {stepsStatus[idx] === 'done' ? (
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              ) : stepsStatus[idx] === 'active' ? (
                                <svg
                                  className="w-5 h-5 animate-spin"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                  />
                                </svg>
                              ) : (
                                <span className="font-mono">{idx + 1}</span>
                              )}
                      </span>
                            {stepsStatus[idx] === 'active' && (
                              <div className="absolute -inset-1 bg-sky-400 rounded-lg blur opacity-30 animate-pulse"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-bold text-slate-900">
                          {step}
                        </p>
                              {stepsStatus[idx] === 'active' && (
                                <span className="text-[10px] font-mono bg-sky-100 text-sky-700 px-2 py-0.5 rounded">
                                  CRYPTO
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {stepsStatus[idx] === 'active' && (
                                <div className="flex gap-1">
                                  {[...Array(3)].map((_, i) => (
                                    <div
                                      key={i}
                                      className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse"
                                      style={{
                                        animationDelay: `${i * 0.2}s`,
                                      }}
                                    ></div>
                                  ))}
                                </div>
                              )}
                              <p className="text-xs text-slate-600 font-medium">
                          {stepsStatus[idx] === 'active'
                                  ? 'Gerando prova criptográfica...'
                            : stepsStatus[idx] === 'done'
                                    ? '✓ Verificado e assinado'
                                    : 'Aguardando início'}
                              </p>
                            </div>
                            {stepsStatus[idx] === 'active' && (
                              <div className="mt-2 font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                0x{Math.random().toString(16).substring(2, 10)}...
                              </div>
                            )}
                      </div>
                    </div>
                  ))}
                </div>

                    {/* Success Screen */}
                    {proofState === 'success' ? (
                      <div className="flex flex-col items-center justify-center py-8 px-4">
                        <div className="relative mb-6">
                          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-2xl animate-in zoom-in duration-500">
                            <svg
                              className="w-12 h-12 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                          <div className="absolute -inset-2 bg-emerald-200 rounded-full opacity-20 animate-ping"></div>
                          <div className="absolute -inset-1 bg-emerald-300 rounded-full opacity-30 animate-pulse"></div>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2 text-center">
                          Prova ZK Verificada!
                        </h3>
                        <p className="text-sm text-slate-600 text-center mb-6 max-w-xs">
                          Sua prova criptográfica foi gerada e validada com sucesso. Você pode entrar no grupo agora.
                        </p>
                        <button
                          onClick={handleJoinGroup}
                          className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4 text-base font-bold text-white shadow-xl transition-all duration-200 hover:shadow-2xl hover:-translate-y-1 active:translate-y-0"
                        >
                          <span className="flex items-center justify-center gap-2">
                            Entrar no grupo
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </span>
                        </button>
                      </div>
                    ) : (
                      /* Actions - Only show when not success */
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={startProof}
                          disabled={proofState === 'running'}
                          className={clsx(
                            'w-full rounded-xl px-4 py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-200 relative overflow-hidden group',
                            proofState === 'running'
                              ? 'bg-slate-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0',
                          )}
                        >
                          {proofState === 'running' ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span className="font-mono text-xs">Gerando ZK-SNARK...</span>
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                              Gerar Zero-Knowledge Proof
                            </span>
                          )}
                          {proofState !== 'running' && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Button */}
        <button
          onClick={() => setIsCreating(true)}
          className="fixed bottom-28 right-5 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-3.5 text-sm font-bold text-white shadow-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:scale-105 active:scale-100 z-10"
        >
          <Plus className="w-5 h-5" />
          <span>Criar grupo</span>
        </button>

        {/* Create Modal */}
        {isCreating && (
          <div
            className="fixed inset-0 z-30 flex items-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsCreating(false)}
          >
            <div
              className="w-full max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white shadow-2xl animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sheet Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1 rounded-full bg-slate-300"></div>
              </div>

              {/* Header */}
              <div className="px-6 pt-4 pb-6 border-b border-slate-100">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">
                      Criar grupo
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Configure o nome e o mínimo em WLD necessário para entrar.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors ml-4"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="px-6 py-6 space-y-5">
                <label className="block space-y-2">
                  <span className="text-sm font-bold text-slate-900">
                    Nome do grupo
                  </span>
                  <input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Ex.: Builders SP"
                    className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-900 outline-none ring-2 ring-transparent focus:bg-white focus:border-slate-300 focus:ring-slate-200 transition-all"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-bold text-slate-900">
                    Mínimo em WLD para entrar
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-3 text-xs font-bold shadow-sm">
                      WLD
                    </span>
                    <input
                      value={newGroupMinWld}
                      onChange={(e) => setNewGroupMinWld(e.target.value)}
                      inputMode="decimal"
                      placeholder="0.50"
                      className="flex-1 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-900 outline-none ring-2 ring-transparent focus:bg-white focus:border-slate-300 focus:ring-slate-200 transition-all"
                    />
                  </div>
                </label>

                {error && (
                  <div className="rounded-xl bg-amber-50 border-2 border-amber-200 px-4 py-3">
                    <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      {error}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={handleCreate}
                    className="w-full rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Criar grupo
                  </button>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Page.Main>
    </>
  );
}
