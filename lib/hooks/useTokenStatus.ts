"use client";

import {
  useAccount,
  useChainId,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { erc20Abi, maxUint256, parseUnits, type Address } from "viem";

import { ERC20_ABI, MOCK_ERC20_ABI } from "@/lib/abi";
import { PERMIT2_ADDRESS } from "@/lib/contracts";
import type { Token } from "@/lib/tokens";

/**
 * Per-token reads + writes for the Permit2 panel:
 *   - balance (wallet)
 *   - allowance (wallet → Permit2)
 *   - approve()  (wallet → Permit2, MaxUint256)
 *   - mint()    (testnet faucet only)
 *
 * Returns disabled handlers when the wallet is not connected, or when the
 * token has no deployed address on the connected chain.
 */
export function useTokenStatus(token: Token) {
  const { address: account, isConnected } = useAccount();
  const chainId = useChainId();
  const tokenAddress = token.addresses[chainId];
  const queryEnabled = Boolean(isConnected && account && tokenAddress);

  const balance = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: { enabled: queryEnabled },
  });

  const allowance = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: account ? [account, PERMIT2_ADDRESS] : undefined,
    query: { enabled: queryEnabled },
  });

  // -------- approve(MaxUint256) --------
  const approveTx = useWriteContract();
  const approveReceipt = useWaitForTransactionReceipt({
    hash: approveTx.data,
    query: { enabled: Boolean(approveTx.data) },
  });

  const approve = () => {
    if (!tokenAddress) return;
    approveTx.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [PERMIT2_ADDRESS, maxUint256],
    });
  };

  // -------- mint(account, amount) on testnet MockERC20 --------
  const mintTx = useWriteContract();
  const mintReceipt = useWaitForTransactionReceipt({
    hash: mintTx.data,
    query: { enabled: Boolean(mintTx.data) },
  });

  /** Mints a default round number to the connected wallet. Sepolia only. */
  const mintDefault = () => {
    if (!tokenAddress || !account) return;
    // 1,000 of the unit (1000 SCENT, 1000 JPYC, 1000 USDT)
    const amount = parseUnits("1000", token.decimals);
    mintTx.writeContract({
      address: tokenAddress,
      abi: MOCK_ERC20_ABI,
      functionName: "mint",
      args: [account, amount],
    });
  };

  // Refetch on confirmed approval / mint
  const isApproveConfirmed = approveReceipt.isSuccess;
  const isMintConfirmed = mintReceipt.isSuccess;

  return {
    tokenAddress: tokenAddress as Address | undefined,
    isConnected,
    chainId,

    balance: balance.data ?? 0n,
    balanceLoading: balance.isLoading,
    refetchBalance: balance.refetch,

    allowance: allowance.data ?? 0n,
    allowanceLoading: allowance.isLoading,
    refetchAllowance: allowance.refetch,

    approve,
    isApproving: approveTx.isPending || approveReceipt.isLoading,
    isApproveConfirmed,
    approveError: approveTx.error,

    mintDefault,
    isMinting: mintTx.isPending || mintReceipt.isLoading,
    isMintConfirmed,
    mintError: mintTx.error,
  };
}
