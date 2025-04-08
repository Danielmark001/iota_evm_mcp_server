// src/core/services/iota.ts
import {
  type Address,
  type Hash,
  type Hex,
  formatUnits,
  getContract,
} from "viem";
import { getPublicClient } from "./clients.js";
import { resolveAddress } from "./ens.js";

/**
 * IOTA-specific constants and configurations
 */
export const IOTA_MAINNET_ID = 1074; // IOTA EVM Chain ID
export const IOTA_TESTNET_ID = 1075; // IOTA Testnet EVM Chain ID
export const IOTA_SHIMMER_ID = 148; // Shimmer EVM Chain ID

// IOTA Native Token ABI (minimal for reading)
const iotaTokenAbi = [
  {
    inputs: [],
    name: "name",
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Common IOTA tokens by address
export const IOTA_TOKENS = {
  IOTA: "0x4CaE2cD5EcD7A4C42A468a9cE2d8cE7aEdf58886",
  MIOTA: "0x4CaE2cD5EcD7A4C42A468a9cE2d8cE7aEdf58886", // Same as IOTA
  SMR: "0x1074012F5E00Db5eB0D38a4e2C9EcB0C8a959511", // Shimmer token
};

/**
 * Check if the network is an IOTA network
 * @param networkOrChainId Network name or chain ID
 * @returns Boolean indicating if this is an IOTA network
 */
export function isIOTANetwork(networkOrChainId: string | number): boolean {
  // Convert to numeric chain ID if a string is provided
  const chainId =
    typeof networkOrChainId === "string"
      ? parseInt(networkOrChainId) || 0
      : networkOrChainId;

  return (
    chainId === IOTA_MAINNET_ID ||
    chainId === IOTA_TESTNET_ID ||
    chainId === IOTA_SHIMMER_ID ||
    String(networkOrChainId).toLowerCase() === "iota" ||
    String(networkOrChainId).toLowerCase() === "shimmer"
  );
}

/**
 * Get IOTA network token information
 * @param network IOTA network to query
 * @returns Token information including name, symbol, decimals, and total supply
 */
export async function getIOTATokenInfo(network = "iota"): Promise<{
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  formattedTotalSupply: string;
}> {
  // Determine the token address based on the network
  let tokenAddress: Address;

  if (
    network.toLowerCase() === "shimmer" ||
    String(network) === String(IOTA_SHIMMER_ID)
  ) {
    tokenAddress = IOTA_TOKENS.SMR as Address;
  } else {
    tokenAddress = IOTA_TOKENS.IOTA as Address;
  }

  const publicClient = getPublicClient(network);

  const contract = getContract({
    address: tokenAddress,
    abi: iotaTokenAbi,
    client: publicClient,
  });

  try {
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      contract.read.name(),
      contract.read.symbol(),
      contract.read.decimals(),
      contract.read.totalSupply(),
    ]);

    return {
      name,
      symbol,
      decimals,
      totalSupply,
      formattedTotalSupply: formatUnits(totalSupply, decimals),
    };
  } catch (error) {
    // Fallback to default values if contract call fails
    console.error("Error fetching IOTA token info:", error);

    return {
      name: network.toLowerCase() === "shimmer" ? "Shimmer" : "IOTA",
      symbol: network.toLowerCase() === "shimmer" ? "SMR" : "MIOTA",
      decimals: 6,
      totalSupply: BigInt(0),
      formattedTotalSupply: "0",
    };
  }
}

/**
 * Get IOTA token balance for an address
 * @param ownerAddressOrEns Owner address or ENS name
 * @param network IOTA network to query
 * @returns Token balance with formatting information
 */
export async function getIOTABalance(
  ownerAddressOrEns: string,
  network = "iota"
): Promise<{
  raw: bigint;
  formatted: string;
  token: {
    symbol: string;
    decimals: number;
  };
}> {
  // Determine if this is a native token balance query or smart contract token
  const isNativeBalance = true; // For IOTA we'll use the native token

  if (isNativeBalance) {
    // Use the ETH balance function for native IOTA balance
    const ownerAddress = await resolveAddress(ownerAddressOrEns, network);
    const ethBalance = await getPublicClient(network).getBalance({
      address: ownerAddress,
    });

    // Get token decimals and symbol
    let symbol = "MIOTA";
    let decimals = 6;

    if (
      network.toLowerCase() === "shimmer" ||
      String(network) === String(IOTA_SHIMMER_ID)
    ) {
      symbol = "SMR";
    }

    return {
      raw: ethBalance,
      formatted: formatUnits(ethBalance, decimals),
      token: {
        symbol,
        decimals,
      },
    };
  } else {
    // If needed, implement ERC20 token balance for IOTA native tokens wrapped as ERC20
    throw new Error("Non-native IOTA token balance not implemented");
  }
}

/**
 * Get staking information for IOTA tokens
 * @param address Address to check staking information for
 * @param network IOTA network to query
 * @returns Staking information including amount, rewards, and lock period
 */
export async function getIOTAStakingInfo(
  address: Address,
  network = "iota"
): Promise<{
  stakedAmount: string;
  rewards: string;
  lockPeriod: string;
  canUnstake: boolean;
}> {
  // This is a placeholder for actual staking contract integration
  // In a real implementation, this would query IOTA staking contracts

  try {
    const publicClient = getPublicClient(network);
    // Here we would interact with staking contracts

    // Placeholder return
    return {
      stakedAmount: "0",
      rewards: "0",
      lockPeriod: "0",
      canUnstake: false,
    };
  } catch (error) {
    console.error("Error fetching IOTA staking info:", error);
    throw error;
  }
}
