// src/core/services/iota-defi.ts
/**
 * IOTA DeFi Module
 *
 * This module provides functionality for interacting with DeFi protocols on IOTA networks,
 * including liquidity pools, lending markets, staking, and token analytics.
 */

import {
  type Address,
  type Hash,
  parseAbi,
  getContract,
  formatUnits,
  formatEther,
  encodeAbiParameters,
  parseAbiParameters,
} from "viem";
import { getPublicClient } from "./clients.js";
import { resolveAddress } from "./ens.js";
import { isIOTANetwork } from "./iota.js";
import { readContract } from "./contracts.js";

// ====================
// === TYPE DEFINITIONS
// ====================

/**
 * Liquidity Pool information
 */

export interface LiquidityPool {
  pairAddress: Address;
  token0: {
    address: Address;
    symbol: string;
    name: string;
  };
  token1: {
    address: Address;
    symbol: string;
    name: string;
  };
  reserves: {
    reserve0: string;
    reserve1: string;
    reserveUSD: string;
  };
  apr: string;
  volume24h: string;
  fee: string;
}

/**
 * Response for liquidity pools query
 */
export interface LiquidityPoolsResponse {
  network: string;
  dexName: string;
  pools: LiquidityPool[];
}

/**
 * Lending market information
 */
export interface LendingMarket {
  tokenAddress: Address;
  tokenSymbol: string;
  tokenName: string;
  marketAddress: Address;
  supplyApy: string;
  borrowApy: string;
  totalSupplied: string;
  totalBorrowed: string;
  liquidity: string;
  collateralFactor: string;
}

/**
 * Response for lending markets query
 */
export interface LendingMarketsResponse {
  network: string;
  protocol: string;
  markets: LendingMarket[];
}

/**
 * Staking pool information
 */
export interface StakingPool {
  poolName: string;
  poolAddress: Address;
  tokenAddress: Address;
  tokenSymbol: string;
  apr: string;
  totalStaked: string;
  rewardTokens: Array<{
    symbol: string;
    address: Address;
  }>;
}

/**
 * Response for staking opportunities
 */
export interface StakingOpportunitiesResponse {
  network: string;
  stakingPools: StakingPool[];
}

/**
 * Token information
 */
export interface TokenInfo {
  address: Address;
  symbol: string;
  name: string;
  price: string;
  priceChange24h: string;
  volume24h: string;
  marketCap: string;
  holders: string;
}

/**
 * Response for top tokens
 */
export interface TopTokensResponse {
  network: string;
  tokens: TokenInfo[];
}

// ====================
// === ABIS & CONSTANTS
// ====================

// DEX Contract ABIs - partial interfaces for common functions
const uniswapV2PairAbi = parseAbi([
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function factory() view returns (address)",
]);

const uniswapV2FactoryAbi = parseAbi([
  "function getPair(address tokenA, address tokenB) view returns (address pair)",
  "function allPairsLength() view returns (uint256)",
  "function allPairs(uint256) view returns (address)",
]);

const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function totalSupply() view returns (uint256)",
]);

// Known IOTA DEXes and DEX factories by network
// These are placeholder addresses that should be updated when real DEXes launch on IOTA networks
const iotaDexes: Record<
  string,
  { name: string; factory: Address; router: Address }[]
> = {
  iota: [
    {
      name: "TangleSwap",
      factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f" as Address, // Placeholder - Uniswap V2 Factory address
      router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D" as Address, // Placeholder - Uniswap V2 Router address
    },
  ],
  shimmer: [
    {
      name: "ShimmerSea",
      factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f" as Address, // Placeholder - Uniswap V2 Factory address
      router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D" as Address, // Placeholder - Uniswap V2 Router address
    },
  ],
  "iota-testnet": [
    {
      name: "TangleSwap Testnet",
      factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f" as Address, // Placeholder - Uniswap V2 Factory address
      router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D" as Address, // Placeholder - Uniswap V2 Router address
    },
  ],
};

// Known lending protocols on IOTA
// These are placeholder addresses that should be updated when real lending protocols launch
const iotaLendingProtocols: Record<
  string,
  { name: string; comptroller: Address; markets: Address[] }[]
> = {
  iota: [
    {
      name: "IOTA Lend",
      comptroller: "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B" as Address, // Placeholder
      markets: [
        "0x4CaE2cD5EcD7A4C42A468a9cE2d8cE7aEdf58886" as Address, // IOTA (placeholder)
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address, // USDC (placeholder)
        "0xdAC17F958D2ee523a2206206994597C13D831ec7" as Address, // USDT (placeholder)
      ],
    },
  ],
  shimmer: [
    {
      name: "Shimmer Lend",
      comptroller: "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B" as Address, // Placeholder
      markets: [
        "0x1074012F5E00Db5eB0D38a4e2C9EcB0C8a959511" as Address, // SMR (placeholder)
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address, // USDC (placeholder)
      ],
    },
  ],
  "iota-testnet": [],
};

// ==============================
// === LIQUIDITY POOLS FUNCTIONS
// ==============================

/**
 * Get DeFi liquidity pools on IOTA networks
 * @param network IOTA network to use (iota, iota-testnet, shimmer)
 * @param tokenAddressOrEns Optional token address to filter pools by
 * @returns Information about liquidity pools
 */
export async function getIOTALiquidityPools(
  network = "iota",
  tokenAddressOrEns?: string
): Promise<LiquidityPoolsResponse> {
  // Validate IOTA network
  if (!isIOTANetwork(network)) {
    throw new Error(
      `${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`
    );
  }

  // Resolve token address if provided
  let tokenAddress: Address | undefined;
  if (tokenAddressOrEns) {
    try {
      tokenAddress = (await resolveAddress(
        tokenAddressOrEns,
        network
      )) as Address;
    } catch (error) {
      console.error(`Error resolving token address: ${error}`);
      throw new Error(
        `Invalid token address or ENS name: ${tokenAddressOrEns}`
      );
    }
  }

  const client = getPublicClient(network);

  // Get DEXes for the selected network
  const dexes = iotaDexes[network] || [];
  if (dexes.length === 0) {
    return {
      network,
      dexName: "Unknown",
      pools: [],
    };
  }

  // For simplicity, we'll use the first DEX listed for the network
  const dex = dexes[0];

  // Try to get pool information
  const pools: LiquidityPool[] = [];

  try {
    // Connect to the factory contract
    const factoryContract = getContract({
      address: dex.factory,
      abi: uniswapV2FactoryAbi,
      client,
    });

    // Get the total number of pairs (limited to 5 for performance)
    let pairsToQuery = 5;
    try {
      const pairsLength = await factoryContract.read.allPairsLength();
      // If we have a valid response, adjust the number of pairs to query
      if (pairsLength !== undefined) {
        pairsToQuery = Math.min(5, Number(pairsLength));
      }
    } catch (error) {
      console.error("Error fetching pairs length:", error);
      // Continue with default pairsToQuery value
    }

    // Get pairs
    for (let i = 0; i < pairsToQuery; i++) {
      try {
        let pairAddress: Address | undefined;

        // If we're filtering by token, get the specific pair
        if (tokenAddress) {
          // Try to find a pair with IOTA or a stablecoin as the other token
          // Known stablecoins/base tokens
          const baseTokens = [
            "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC placeholder
            "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT placeholder
            "0x4CaE2cD5EcD7A4C42A468a9cE2d8cE7aEdf58886", // IOTA token
          ];

          // Try each base token to find a pair
          let foundPair = false;
          for (const baseToken of baseTokens) {
            try {
              const pair = await factoryContract.read.getPair([
                tokenAddress,
                baseToken as Address,
              ]);

              if (
                pair &&
                pair !== "0x0000000000000000000000000000000000000000"
              ) {
                pairAddress = pair;
                foundPair = true;
                break;
              }
            } catch (error) {
              // Continue to next base token
              console.error(
                `Error fetching pair with base token ${baseToken}:`,
                error
              );
            }
          }

          // If we didn't find a pair, skip
          if (!foundPair) {
            continue;
          }
        } else {
          // Get the pair at index i
          pairAddress = await factoryContract.read.allPairs([BigInt(i)]);
        }

        // Ensure pairAddress is defined before proceeding
        if (!pairAddress) {
          console.error(`Pair address is undefined for index ${i}`);
          continue;
        }

        // Connect to the pair contract
        const pairContract = getContract({
          address: pairAddress,
          abi: uniswapV2PairAbi,
          client,
        });

        // Get pair data
        const [reserves, token0Address, token1Address] = await Promise.all([
          pairContract.read.getReserves(),
          pairContract.read.token0(),
          pairContract.read.token1(),
        ]);

        // Get token details
        const token0Contract = getContract({
          address: token0Address,
          abi: erc20Abi,
          client,
        });

        const token1Contract = getContract({
          address: token1Address,
          abi: erc20Abi,
          client,
        });

        // Get token data with proper error handling
        const [
          token0Symbol,
          token0Name,
          token0Decimals,
          token1Symbol,
          token1Name,
          token1Decimals,
        ] = await Promise.all([
          token0Contract.read.symbol().catch(() => "Unknown"),
          token0Contract.read.name().catch(() => "Unknown"),
          token0Contract.read.decimals().catch(() => 18),
          token1Contract.read.symbol().catch(() => "Unknown"),
          token1Contract.read.name().catch(() => "Unknown"),
          token1Contract.read.decimals().catch(() => 18),
        ]);

        // Format reserves
        const reserve0 = formatUnits(reserves[0], Number(token0Decimals));
        const reserve1 = formatUnits(reserves[1], Number(token1Decimals));

        // For this simplified implementation, we'll use placeholder values for some metrics
        const estimatedApr = "5.2%"; // Placeholder
        const volume24h = "10,000"; // Placeholder
        const fee = "0.3%"; // Standard DEX fee

        // Add pool to results
        pools.push({
          pairAddress,
          token0: {
            address: token0Address,
            symbol: typeof token0Symbol === "string" ? token0Symbol : "Unknown",
            name: typeof token0Name === "string" ? token0Name : "Unknown",
          },
          token1: {
            address: token1Address,
            symbol: typeof token1Symbol === "string" ? token1Symbol : "Unknown",
            name: typeof token1Name === "string" ? token1Name : "Unknown",
          },
          reserves: {
            reserve0,
            reserve1,
            reserveUSD: "0", // Would need price oracle to calculate
          },
          apr: estimatedApr,
          volume24h,
          fee,
        });

        // If we're filtering by token and found a pair, we can break
        if (tokenAddress) {
          break;
        }
      } catch (error) {
        console.error(`Error fetching pair ${i}:`, error);
        // Continue to next pair
      }
    }
  } catch (error) {
    console.error("Error fetching liquidity pools:", error);
    // Return empty pools array instead of throwing
  }

  return {
    network,
    dexName: dex.name,
    pools,
  };
}

// ============================
// === LENDING MARKET FUNCTIONS
// ============================

/**
 * Get lending markets available on IOTA networks
 * @param network IOTA network to use (iota, iota-testnet, shimmer)
 * @returns Information about lending markets
 */
export async function getIOTALendingMarkets(
  network = "iota"
): Promise<LendingMarketsResponse> {
  // Validate IOTA network
  if (!isIOTANetwork(network)) {
    throw new Error(
      `${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`
    );
  }

  const client = getPublicClient(network);

  // Get lending protocols for the selected network
  const protocols = iotaLendingProtocols[network] || [];
  if (protocols.length === 0) {
    return {
      network,
      protocol: "Unknown",
      markets: [],
    };
  }

  // For simplicity, we'll use the first protocol listed for the network
  const protocol = protocols[0];

  // Try to get market information
  const markets: LendingMarket[] = [];

  try {
    // Get all markets - use predefined markets for now
    const marketAddresses = protocol.markets;

    // Process each market
    for (const marketAddress of marketAddresses) {
      try {
        // Get token details - since this is a placeholder implementation,
        // we'll create synthetic data rather than making real contract calls

        const tokenSymbol =
          marketAddress === protocol.markets[0]
            ? network === "shimmer"
              ? "SMR"
              : "MIOTA"
            : "USDC";

        const tokenName =
          marketAddress === protocol.markets[0]
            ? network === "shimmer"
              ? "Shimmer"
              : "IOTA"
            : "USD Coin";

        const tokenDecimals = marketAddress === protocol.markets[0] ? 6 : 6;

        // Create placeholder metrics
        const supplyApy = (Math.random() * 5 + 2).toFixed(2);
        const borrowApy = (Math.random() * 8 + 4).toFixed(2);
        const totalSupplied = (Math.random() * 1000000).toLocaleString(
          undefined,
          {
            maximumFractionDigits: 2,
          }
        );
        const totalBorrowed = (Math.random() * 500000).toLocaleString(
          undefined,
          {
            maximumFractionDigits: 2,
          }
        );
        const liquidity = (Math.random() * 500000).toLocaleString(undefined, {
          maximumFractionDigits: 2,
        });
        const collateralFactor = `${Math.floor(Math.random() * 25 + 70)}%`;

        // Add market to results
        markets.push({
          tokenAddress:
            marketAddress === protocol.markets[0]
              ? ((network === "shimmer"
                  ? "0x1074012F5E00Db5eB0D38a4e2C9EcB0C8a959511"
                  : "0x4CaE2cD5EcD7A4C42A468a9cE2d8cE7aEdf58886") as Address)
              : ("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address),
          tokenSymbol,
          tokenName,
          marketAddress,
          supplyApy: `${supplyApy}%`,
          borrowApy: `${borrowApy}%`,
          totalSupplied,
          totalBorrowed,
          liquidity,
          collateralFactor,
        });
      } catch (error) {
        console.error(`Error processing market ${marketAddress}:`, error);
        // Continue to next market
      }
    }
  } catch (error) {
    console.error("Error fetching lending markets:", error);
    // Return with empty markets rather than throwing
  }

  return {
    network,
    protocol: protocol.name,
    markets,
  };
}

// ============================
// === STAKING OPPORTUNITIES
// ============================

/**
 * Get staking opportunities on IOTA networks
 * @param network IOTA network to use (iota, iota-testnet, shimmer)
 * @returns Information about staking opportunities
 */
export async function getIOTAStakingOpportunities(
  network = "iota"
): Promise<StakingOpportunitiesResponse> {
  // Validate IOTA network
  if (!isIOTANetwork(network)) {
    throw new Error(
      `${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`
    );
  }

  // In a real implementation, you would query on-chain staking contracts
  // This is a placeholder implementation showing what the data would look like

  // Define sample staking pools for each network
  const stakingPools: Record<string, StakingPool[]> = {
    iota: [
      {
        poolName: "IOTA Staking Pool",
        poolAddress: "0x1111111111111111111111111111111111111111" as Address,
        tokenAddress: "0x4CaE2cD5EcD7A4C42A468a9cE2d8cE7aEdf58886" as Address,
        tokenSymbol: "MIOTA",
        apr: "8.5%",
        totalStaked: "2,500,000",
        rewardTokens: [
          {
            symbol: "MIOTA",
            address: "0x4CaE2cD5EcD7A4C42A468a9cE2d8cE7aEdf58886" as Address,
          },
        ],
      },
      {
        poolName: "IOTA/USDC LP Staking",
        poolAddress: "0x2222222222222222222222222222222222222222" as Address,
        tokenAddress: "0x3333333333333333333333333333333333333333" as Address,
        tokenSymbol: "MIOTA-USDC LP",
        apr: "25.2%",
        totalStaked: "1,200,000",
        rewardTokens: [
          {
            symbol: "MIOTA",
            address: "0x4CaE2cD5EcD7A4C42A468a9cE2d8cE7aEdf58886" as Address,
          },
          {
            symbol: "TangleSwap",
            address: "0x4444444444444444444444444444444444444444" as Address,
          },
        ],
      },
    ],
    shimmer: [
      {
        poolName: "Shimmer Staking Pool",
        poolAddress: "0x5555555555555555555555555555555555555555" as Address,
        tokenAddress: "0x1074012F5E00Db5eB0D38a4e2C9EcB0C8a959511" as Address,
        tokenSymbol: "SMR",
        apr: "12.0%",
        totalStaked: "5,000,000",
        rewardTokens: [
          {
            symbol: "SMR",
            address: "0x1074012F5E00Db5eB0D38a4e2C9EcB0C8a959511" as Address,
          },
        ],
      },
    ],
    "iota-testnet": [],
  };

  return {
    network,
    stakingPools: stakingPools[network] || [],
  };
}

// ============================
// === TOKEN ANALYTICS
// ============================

/**
 * Get top tokens by trading volume on IOTA networks
 * @param network IOTA network to use (iota, iota-testnet, shimmer)
 * @param limit Maximum number of tokens to return
 * @returns Information about top tokens
 */
export async function getIOTATopTokens(
  network = "iota",
  limit = 10
): Promise<TopTokensResponse> {
  // Validate IOTA network
  if (!isIOTANetwork(network)) {
    throw new Error(
      `${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`
    );
  }

  // In a real implementation, you would query an indexer or price oracle
  // This is a placeholder implementation showing what the data would look like

  // Define sample tokens for each network
  const tokens: Record<string, TokenInfo[]> = {
    iota: [
      {
        address: "0x4CaE2cD5EcD7A4C42A468a9cE2d8cE7aEdf58886" as Address,
        symbol: "MIOTA",
        name: "IOTA",
        price: "$0.20",
        priceChange24h: "+5.2%",
        volume24h: "$15,000,000",
        marketCap: "$550,000,000",
        holders: "120,000",
      },
      {
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address,
        symbol: "USDC",
        name: "USD Coin",
        price: "$1.00",
        priceChange24h: "0.0%",
        volume24h: "$8,500,000",
        marketCap: "$25,000,000",
        holders: "45,000",
      },
      {
        address: "0x4444444444444444444444444444444444444444" as Address,
        symbol: "TSP",
        name: "TangleSwap",
        price: "$0.05",
        priceChange24h: "+3.1%",
        volume24h: "$2,500,000",
        marketCap: "$15,000,000",
        holders: "18,000",
      },
    ],
    shimmer: [
      {
        address: "0x1074012F5E00Db5eB0D38a4e2C9EcB0C8a959511" as Address,
        symbol: "SMR",
        name: "Shimmer",
        price: "$0.05",
        priceChange24h: "+2.8%",
        volume24h: "$3,500,000",
        marketCap: "$150,000,000",
        holders: "85,000",
      },
      {
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address,
        symbol: "USDC",
        name: "USD Coin",
        price: "$1.00",
        priceChange24h: "0.0%",
        volume24h: "$1,200,000",
        marketCap: "$5,000,000",
        holders: "12,000",
      },
    ],
    "iota-testnet": [],
  };

  // Apply limit
  const result = tokens[network] || [];

  return {
    network,
    tokens: result.slice(0, limit),
  };
}
