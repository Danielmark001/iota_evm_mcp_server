// src/core/services/iota-defi.ts
/**
 * IOTA DeFi Module
 *
 * This module provides functionality for interacting with DeFi protocols on IOTA networks,
 * including liquidity pools, lending markets, staking, and token analytics.
 *
 * The implementation uses the viem library for EVM interactions and is specifically
 * tailored for IOTA EVM, IOTA Testnet, and Shimmer networks.
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
 * Lending position information
 */
export interface LendingPosition {
  tokenSymbol: string;
  tokenAddress: Address;
  marketAddress: Address;
  isCollateral: boolean;
  supplied: string;
  borrowed: string;
  supplyApy: string;
  borrowApy: string;
  rewardApy: string;
}

/**
 * Response for user lending positions
 */
export interface UserLendingPositionsResponse {
  network: string;
  protocol: string;
  userAddress: Address;
  healthFactor: string;
  totalSuppliedUsd: string;
  totalBorrowedUsd: string;
  netApy: string;
  positions: LendingPosition[];
}

/**
 * Reward token information
 */
export interface RewardToken {
  symbol: string;
  address: Address;
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
  rewardTokens: RewardToken[];
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

// Lending protocol ABIs
const compoundComptrollerAbi = parseAbi([
  "function getAllMarkets() view returns (address[])",
  "function markets(address) view returns (bool isListed, uint256 collateralFactorMantissa, bool isComped)",
  "function getAccountLiquidity(address) view returns (uint256, uint256, uint256)",
  "function claimComp(address)",
  "function compAccrued(address) view returns (uint256)",
]);

const cTokenAbi = parseAbi([
  "function underlying() view returns (address)",
  "function supplyRatePerBlock() view returns (uint256)",
  "function borrowRatePerBlock() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function totalBorrows() view returns (uint256)",
  "function exchangeRateStored() view returns (uint256)",
  "function getCash() view returns (uint256)",
  "function borrowBalanceStored(address) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
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
      comptroller: "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B" as Address, // Placeholder - Compound Comptroller address
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
      comptroller: "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B" as Address, // Placeholder - Compound Comptroller address
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
    tokenAddress = (await resolveAddress(
      tokenAddressOrEns,
      network
    )) as Address;
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
    }

    // Get pairs
      for (let i = 0; i < pairsToQuery; i++) {
        let pairAddress: Address = await factoryContract.read.allPairs([
          BigInt(i),
        ]);
      try {
        

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

        // Get token data
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
        // In a real implementation, you would calculate these from on-chain data
        const estimatedApr = "5.2%"; // Placeholder
        const volume24h = "10,000"; // Placeholder
        const fee = "0.3%"; // Standard DEX fee
        

        // Add pool to results
        pools.push({
          pairAddress,
          token0: {
            address: token0Address,
            symbol: token0Symbol,
            name: token0Name,
          },
          token1: {
            address: token1Address,
            symbol: token1Symbol,
            name: token1Name,
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
      }
    }
  } catch (error) {
    console.error("Error fetching liquidity pools:", error);
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
    // Connect to the comptroller contract
    const comptrollerContract = getContract({
      address: protocol.comptroller,
      abi: compoundComptrollerAbi,
      client,
    });

    // Get all markets
    let marketAddresses: Address[] = [];
    try {
        const markets = await comptrollerContract.read.getAllMarkets();
        marketAddresses = [...markets];
    } catch (error) {
      // Fallback to predefined markets if getAllMarkets fails
      console.error(
        "Error fetching markets from comptroller, using predefined markets:",
        error
      );
      marketAddresses = protocol.markets;
    }

    // Process each market
    for (const marketAddress of marketAddresses) {
      try {
        // Connect to the cToken contract
        const cTokenContract = getContract({
          address: marketAddress,
          abi: cTokenAbi,
          client,
        });

        // Get underlying token address
        let underlyingTokenAddress: Address;
        try {
          underlyingTokenAddress = await cTokenContract.read.underlying();
        } catch (error) {
          // If this fails, it might be a cETH-like token without an underlying method
          console.error(
            "Error fetching underlying token, might be native token:",
            error
          );
          // Use a placeholder address for the native token
          underlyingTokenAddress =
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address;
        }

        // Connect to the underlying token contract
        let tokenSymbol = "Unknown";
        let tokenName = "Unknown";
        let tokenDecimals = 18;

        if (
          underlyingTokenAddress !==
          "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        ) {
          const tokenContract = getContract({
            address: underlyingTokenAddress,
            abi: erc20Abi,
            client,
          });

          // Get token details
          [tokenSymbol, tokenName, tokenDecimals] = await Promise.all([
            tokenContract.read.symbol().catch(() => "Unknown"),
            tokenContract.read.name().catch(() => "Unknown"),
            tokenContract.read.decimals().catch(() => 18),
          ]);
        } else {
          // Native token (IOTA/SMR)
          tokenSymbol = network === "shimmer" ? "SMR" : "MIOTA";
          tokenName = network === "shimmer" ? "Shimmer" : "IOTA";
          tokenDecimals = 6; // IOTA tokens typically use 6 decimals
        }

        // Get market data
        const [
          supplyRatePerBlock,
          borrowRatePerBlock,
          exchangeRate,
          totalSupply,
          totalBorrows,
          cash,
          marketInfo,
        ] = await Promise.all([
          cTokenContract.read.supplyRatePerBlock().catch(() => BigInt(0)),
          cTokenContract.read.borrowRatePerBlock().catch(() => BigInt(0)),
          cTokenContract.read.exchangeRateStored().catch(() => BigInt(0)),
          cTokenContract.read.totalSupply().catch(() => BigInt(0)),
          cTokenContract.read.totalBorrows().catch(() => BigInt(0)),
          cTokenContract.read.getCash().catch(() => BigInt(0)),
          comptrollerContract.read
            .markets([marketAddress])
            .catch(() => [false, BigInt(0), false]),
        ]);

        // Calculate APYs (assuming blocks are 2 seconds and 15,768,000 blocks per year on IOTA)
        // These numbers are approximate and would need adjusting for actual IOTA block times
        const blocksPerYear = BigInt(15768000);

        // Convert rate per block to APY
        // (1 + rate per block) ^ blocks per year - 1
        const supplyApy =
          (Math.pow(
            1 + Number(supplyRatePerBlock) / 1e18,
            Number(blocksPerYear)
          ) -
            1) *
          100;
        const borrowApy =
          (Math.pow(
            1 + Number(borrowRatePerBlock) / 1e18,
            Number(blocksPerYear)
          ) -
            1) *
          100;

        // Calculate total supplied in underlying tokens
        // totalSupply * exchangeRate / 1e18
        const scaledExchangeRate = Number(exchangeRate) / 1e18;
        const totalSuppliedUnderlying =
          (Number(totalSupply) * scaledExchangeRate) /
          Math.pow(10, 18 - tokenDecimals);

        // Format values
        const formattedSupplyApy = `${supplyApy.toFixed(2)}%`;
        const formattedBorrowApy = `${borrowApy.toFixed(2)}%`;
        const formattedTotalSupplied = totalSuppliedUnderlying.toLocaleString(
          undefined,
          {
            maximumFractionDigits: 2,
          }
        );
        const formattedTotalBorrowed = formatUnits(totalBorrows, tokenDecimals);
        const formattedLiquidity = formatUnits(cash, tokenDecimals);

        // Get collateral factor (as a percentage)
        const collateralFactorMantissa = marketInfo[1];
        const collateralFactor = `${(
          Number(collateralFactorMantissa) / 1e16
        ).toFixed(0)}%`;

        // Add market to results
        markets.push({
          tokenAddress: underlyingTokenAddress,
          tokenSymbol,
          tokenName,
          marketAddress,
          supplyApy: formattedSupplyApy,
          borrowApy: formattedBorrowApy,
          totalSupplied: formattedTotalSupplied,
          totalBorrowed: formattedTotalBorrowed,
          liquidity: formattedLiquidity,
          collateralFactor,
        });
      } catch (error) {
        console.error(`Error processing market ${marketAddress}:`, error);
      }
    }
  } catch (error) {
    console.error("Error fetching lending markets:", error);
  }

  return {
    network,
    protocol: protocol.name,
    markets,
  };
}

/**
 * Get user lending positions on IOTA networks
 * @param userAddressOrEns User address or ENS name
 * @param network IOTA network to use (iota, iota-testnet, shimmer)
 * @returns Information about user's lending positions
 */
export async function getIOTAUserLendingPositions(
  userAddressOrEns: string,
  network = "iota"
): Promise<UserLendingPositionsResponse> {
  // Validate IOTA network
  if (!isIOTANetwork(network)) {
    throw new Error(
      `${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`
    );
  }

  // Resolve user address
  const userAddress = await resolveAddress(userAddressOrEns, network);

  const client = getPublicClient(network);

  // Get lending protocols for the selected network
  const protocols = iotaLendingProtocols[network] || [];
  if (protocols.length === 0) {
    return {
      network,
      protocol: "Unknown",
      userAddress,
      healthFactor: "N/A",
      totalSuppliedUsd: "0",
      totalBorrowedUsd: "0",
      netApy: "0%",
      positions: [],
    };
  }

  // For simplicity, we'll use the first protocol listed for the network
  const protocol = protocols[0];

  // Try to get user positions
  const positions: LendingPosition[] = [];
  let healthFactor = "N/A";
  let totalSuppliedUsd = "0";
  let totalBorrowedUsd = "0";
  let netApy = "0%";

  try {
    // Connect to the comptroller contract
    const comptrollerContract = getContract({
      address: protocol.comptroller,
      abi: compoundComptrollerAbi,
      client,
    });

    // Get user's liquidity and shortfall
    const [error, liquidity, shortfall] =
      await comptrollerContract.read.getAccountLiquidity([userAddress]);

    // Calculate health factor
    if (shortfall > BigInt(0)) {
      healthFactor = "<1";
    } else if (liquidity > BigInt(0)) {
      // This is a simplification - actual health factor would need more data
      healthFactor = ">1";
    }

    // Get all markets
    let marketAddresses: Address[] = [];
    try {
        const markets = await comptrollerContract.read.getAllMarkets();
        marketAddresses = [...markets];
    } catch (error) {
      // Fallback to predefined markets if getAllMarkets fails
      console.error(
        "Error fetching markets from comptroller, using predefined markets:",
        error
      );
      marketAddresses = protocol.markets;
    }

    // Track totals for USD values and weighted APYs
    let totalSuppliedValue = 0;
    let totalBorrowedValue = 0;
    let weightedSupplyApy = 0;
    let weightedBorrowApy = 0;

    // Process each market
    for (const marketAddress of marketAddresses) {
      try {
        // Connect to the cToken contract
        const cTokenContract = getContract({
          address: marketAddress,
          abi: cTokenAbi,
          client,
        });

        // Check if user has a position in this market
        const [cTokenBalance, borrowBalance] = await Promise.all([
          cTokenContract.read.balanceOf([userAddress]).catch(() => BigInt(0)),
          cTokenContract.read
            .borrowBalanceStored([userAddress])
            .catch(() => BigInt(0)),
        ]);

        // Skip if user has no position
        if (cTokenBalance === BigInt(0) && borrowBalance === BigInt(0)) {
          continue;
        }

        // Get underlying token address
        let underlyingTokenAddress: Address;
        try {
          underlyingTokenAddress = await cTokenContract.read.underlying();
        } catch (error) {
          // If this fails, it might be a cETH-like token without an underlying method
          console.error(
            "Error fetching underlying token, might be native token:",
            error
          );
          // Use a placeholder address for the native token
          underlyingTokenAddress =
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address;
        }

        // Connect to the underlying token contract
        let tokenSymbol = "Unknown";
        let tokenDecimals = 18;

        if (
          underlyingTokenAddress !==
          "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        ) {
          const tokenContract = getContract({
            address: underlyingTokenAddress,
            abi: erc20Abi,
            client,
          });

          // Get token details
          [tokenSymbol, tokenDecimals] = await Promise.all([
            tokenContract.read.symbol().catch(() => "Unknown"),
            tokenContract.read
              .decimals()
              .catch(() => 18)
              .then((d) => Number(d)),
          ]);
        } else {
          // Native token (IOTA/SMR)
          tokenSymbol = network === "shimmer" ? "SMR" : "MIOTA";
          tokenDecimals = 6; // IOTA tokens typically use 6 decimals
        }

        // Get market data
        const [
          supplyRatePerBlock,
          borrowRatePerBlock,
          exchangeRate,
          marketInfo,
        ] = await Promise.all([
          cTokenContract.read.supplyRatePerBlock().catch(() => BigInt(0)),
          cTokenContract.read.borrowRatePerBlock().catch(() => BigInt(0)),
          cTokenContract.read.exchangeRateStored().catch(() => BigInt(0)),
          comptrollerContract.read
            .markets([marketAddress])
            .catch(() => [false, BigInt(0), false]),
        ]);

        // Calculate APYs (assuming blocks are 2 seconds and 15,768,000 blocks per year on IOTA)
        const blocksPerYear = BigInt(15768000);

        // Convert rate per block to APY
        const supplyApy =
          (Math.pow(
            1 + Number(supplyRatePerBlock) / 1e18,
            Number(blocksPerYear)
          ) -
            1) *
          100;
        const borrowApy =
          (Math.pow(
            1 + Number(borrowRatePerBlock) / 1e18,
            Number(blocksPerYear)
          ) -
            1) *
          100;

        // Get additional rewards APY (simplified - would need more data for accurate calculation)
        const rewardApy = 2.0; // Placeholder value

        // Calculate supplied value in underlying tokens
        const scaledExchangeRate = Number(exchangeRate) / 1e18;
        const suppliedAmount =
          (Number(cTokenBalance) * scaledExchangeRate) /
          Math.pow(10, 18 - tokenDecimals);

        // Format values for display
        const formattedSupplied = suppliedAmount.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        });

        const formattedBorrowed = Number(
          formatUnits(borrowBalance, tokenDecimals)
        ).toLocaleString(undefined, {
          maximumFractionDigits: 2,
        });

        const formattedSupplyApy = `${supplyApy.toFixed(2)}%`;
        const formattedBorrowApy = `${borrowApy.toFixed(2)}%`;
        const formattedRewardApy = `${rewardApy.toFixed(2)}%`;

        // Check if this asset is being used as collateral
        const isCollateral = Boolean(marketInfo[0]); // isListed from markets() call

        // Simplistic price estimation (in a real implementation, you'd use price oracles)
        // For this example, we'll use 1 USD for stablecoins and placeholder prices for others
        let tokenPrice = 1.0; // Default for stablecoins
        if (tokenSymbol === "MIOTA") {
          tokenPrice = 0.2; // Example price for IOTA
        } else if (tokenSymbol === "SMR") {
          tokenPrice = 0.05; // Example price for Shimmer
        }

        // Calculate USD values
        const suppliedUsd = suppliedAmount * tokenPrice;
        const borrowedUsd =
          Number(formatUnits(borrowBalance, tokenDecimals)) * tokenPrice;

        // Update totals
        totalSuppliedValue += suppliedUsd;
        totalBorrowedValue += borrowedUsd;

        // Update weighted APYs
        if (suppliedUsd > 0) {
          weightedSupplyApy +=
            (supplyApy * suppliedUsd) / (totalSuppliedValue || 1);
        }
        if (borrowedUsd > 0) {
          weightedBorrowApy +=
            (borrowApy * borrowedUsd) / (totalBorrowedValue || 1);
        }

        // Add position to results
        positions.push({
          tokenSymbol,
          tokenAddress: underlyingTokenAddress,
          marketAddress,
          isCollateral,
          supplied: formattedSupplied,
          borrowed: formattedBorrowed,
          supplyApy: formattedSupplyApy,
          borrowApy: formattedBorrowApy,
          rewardApy: formattedRewardApy,
        });
      } catch (error) {
        console.error(
          `Error processing user position for market ${marketAddress}:`,
          error
        );
      }
    }

    // Format totals
    totalSuppliedUsd = `$${totalSuppliedValue.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}`;
    totalBorrowedUsd = `$${totalBorrowedValue.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}`;

    // Calculate net APY
    if (totalSuppliedValue > 0 || totalBorrowedValue > 0) {
      const netApyValue =
        (weightedSupplyApy * totalSuppliedValue -
          weightedBorrowApy * totalBorrowedValue) /
        Math.max(totalSuppliedValue, 1);
      netApy = `${netApyValue.toFixed(2)}%`;
    }

    // Check if user has any unclaimed rewards
    try {
      const unclaimedRewards = await comptrollerContract.read.compAccrued([
        userAddress,
      ]);
      // If needed, add this to the return object
    } catch (error) {
      console.error("Error fetching unclaimed rewards:", error);
    }
  } catch (error) {
    console.error("Error fetching user lending positions:", error);
  }

  return {
    network,
    protocol: protocol.name,
    userAddress,
    healthFactor,
    totalSuppliedUsd,
    totalBorrowedUsd,
    netApy,
    positions,
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

// ============================
// === UTILITY FUNCTIONS
// ============================

/**
 * Calculate impermanent loss for liquidity providers
 * @param initialPriceRatio Initial price ratio between token0 and token1
 * @param currentPriceRatio Current price ratio between token0 and token1
 * @returns Impermanent loss percentage
 */
export function calculateImpermanentLoss(
  initialPriceRatio: number,
  currentPriceRatio: number
): number {
  // Calculate price ratio change
  const priceRatio = currentPriceRatio / initialPriceRatio;

  // Calculate impermanent loss using the formula:
  // IL = 2 * sqrt(priceRatio) / (1 + priceRatio) - 1
  const impermanentLoss = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;

  // Convert to percentage
  return impermanentLoss * 100;
}

/**
 * Calculate APY from APR
 * @param apr Annual Percentage Rate (as a decimal, e.g., 0.05 for 5%)
 * @param compoundingFrequency Number of times compounding occurs per year
 * @returns Annual Percentage Yield (as a decimal)
 */
export function calculateApyFromApr(
  apr: number,
  compoundingFrequency: number
): number {
  // APY = (1 + APR/n)^n - 1
  return Math.pow(1 + apr / compoundingFrequency, compoundingFrequency) - 1;
}

/**
 * Calculate optimal swap amount for two tokens to achieve a specific ratio
 * @param token0Amount Current amount of token0
 * @param token1Amount Current amount of token1
 * @param targetRatio Desired ratio of token0:token1
 * @returns Amount of token0 to swap for token1 (negative means swap token1 for token0)
 */
export function calculateOptimalSwap(
  token0Amount: number,
  token1Amount: number,
  targetRatio: number
): number {
  // Calculate current ratio
  const currentRatio = token0Amount / token1Amount;

  // If current ratio is already at target, no swap needed
  if (Math.abs(currentRatio - targetRatio) < 0.0001) {
    return 0;
  }

  // If we need to swap token0 for token1
  if (currentRatio > targetRatio) {
    // Formula: dx = (sqrt(token0*token1*targetRatio) - token0) / (1 - targetRatio/currentRatio)
    const numerator =
      Math.sqrt(token0Amount * token1Amount * targetRatio) - token0Amount;
    const denominator = 1 - targetRatio / currentRatio;
    return numerator / denominator;
  } else {
    // If we need to swap token1 for token0, return negative value
    // Formula: dy = (sqrt(token0*token1/targetRatio) - token1) / (1 - currentRatio/targetRatio)
    const numerator =
      Math.sqrt((token0Amount * token1Amount) / targetRatio) - token1Amount;
    const denominator = 1 - currentRatio / targetRatio;
    return -numerator / denominator;
  }
}

/**
 * Calculate the expected return for liquidity providers
 * @param initialInvestment Initial investment amount in USD
 * @param tradingFeeApr Trading fee APR (as a decimal, e.g., 0.05 for 5%)
 * @param rewardApr Reward token APR (as a decimal, e.g., 0.10 for 10%)
 * @param impermanentLoss Expected impermanent loss (as a decimal, e.g., 0.03 for 3%)
 * @param timeInYears Investment time period in years (e.g., 1.0 for one year)
 * @returns Expected return in USD
 */
export function calculateExpectedReturn(
  initialInvestment: number,
  tradingFeeApr: number,
  rewardApr: number,
  impermanentLoss: number,
  timeInYears: number
): number {
  // Convert APRs to absolute returns over the time period
  const feeReturn = initialInvestment * tradingFeeApr * timeInYears;
  const rewardReturn = initialInvestment * rewardApr * timeInYears;

  // Calculate impermanent loss in USD
  const ilLoss = initialInvestment * impermanentLoss;

  // Calculate expected return
  return initialInvestment + feeReturn + rewardReturn - ilLoss;
}

/**
 * Calculate equivalent annual interest rate
 * @param rate Interest rate for a given period (as a decimal)
 * @param periodInDays Duration of the period in days
 * @returns Annualized interest rate (as a decimal)
 */
export function annualizeRate(rate: number, periodInDays: number): number {
  // Convert to annual rate: (1 + r)^(365/days) - 1
  return Math.pow(1 + rate, 365 / periodInDays) - 1;
}
