// src/core/services/arbitrage.ts
import { type Address, formatUnits } from "viem";
import { getPublicClient } from "./clients.js";
import { getERC20TokenInfo } from "./tokens.js";
import { isIOTANetwork } from "./iota.js";

// Common DEXes ABI (minimal for price queries)
const dexPairAbi = [
  {
    inputs: [],
    name: "getReserves",
    outputs: [
      { type: "uint112", name: "_reserve0" },
      { type: "uint112", name: "_reserve1" },
      { type: "uint32", name: "_blockTimestampLast" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token0",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token1",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Interface for DEX pair addresses across networks
export interface DexPairs {
  [tokenSymbol: string]: {
    [networkId: string]: {
      pairAddress: Address;
      isBridged: boolean;
      dexName: string;
    };
  };
}

// Example mapping of major tokens and their liquidity pools across networks
// In a production environment, this would be dynamically generated or stored in a database
const TOKEN_PAIRS: DexPairs = {
  "USDC": {
    "iota": {
      pairAddress: "0x1234567890123456789012345678901234567890" as Address, // Example address
      isBridged: true,
      dexName: "TangleSwap"
    },
    "ethereum": {
      pairAddress: "0x0987654321098765432109876543210987654321" as Address, // Example address
      isBridged: false,
      dexName: "Uniswap"
    },
    "shimmer": {
      pairAddress: "0x2345678901234567890123456789012345678901" as Address, // Example address
      isBridged: true, 
      dexName: "ShimmerSea"
    }
  },
  "WBTC": {
    "iota": {
      pairAddress: "0x3456789012345678901234567890123456789012" as Address, // Example address
      isBridged: true,
      dexName: "TangleSwap"
    },
    "ethereum": {
      pairAddress: "0x4567890123456789012345678901234567890123" as Address, // Example address
      isBridged: false,
      dexName: "Uniswap"
    }
  },
  // Additional token pairs would be defined here
};

/**
 * Get the price of a token in a specific network
 * @param tokenSymbol Symbol of the token to check
 * @param network Network to check the price on
 * @returns Price information for the token
 */
export async function getTokenPrice(
  tokenSymbol: string,
  network: string
): Promise<{
  tokenSymbol: string;
  network: string;
  price: string;
  dexName: string;
  liquidity: string;
  baseToken: string;
  timestamp: number;
}> {
  try {
    // Check if we have this token pair registered
    const tokenPairs = TOKEN_PAIRS[tokenSymbol];
    if (!tokenPairs || !tokenPairs[network]) {
      throw new Error(`No liquidity pool found for ${tokenSymbol} on ${network}`);
    }

    const { pairAddress, dexName } = tokenPairs[network];
    const publicClient = getPublicClient(network);
    
    // Get pair contract
    const pairContract = {
      address: pairAddress,
      abi: dexPairAbi,
    };
    
    // Get reserves and token addresses
    const [reserves, token0Address, token1Address] = await Promise.all([
      publicClient.readContract({
        ...pairContract,
        functionName: "getReserves",
      }),
      publicClient.readContract({
        ...pairContract,
        functionName: "token0",
      }),
      publicClient.readContract({
        ...pairContract,
        functionName: "token1",
      }),
    ]);
    
    // Get token information for both tokens in the pair
    const [token0Info, token1Info] = await Promise.all([
      getERC20TokenInfo(token0Address, network),
      getERC20TokenInfo(token1Address, network),
    ]);
    
    // Determine which token is our target and which is the base token
    let price: string;
    let baseToken: string;
    let liquidity: string;
    
    if (token0Info.symbol.toUpperCase() === tokenSymbol.toUpperCase()) {
      // token0 is our target token, token1 is the base token
      price = formatUnits(
        (reserves[1] * BigInt(10 ** token0Info.decimals)) / reserves[0],
        token1Info.decimals
      );
      baseToken = token1Info.symbol;
      liquidity = formatUnits(reserves[0], token0Info.decimals);
    } else {
      // token1 is our target token, token0 is the base token
      price = formatUnits(
        (reserves[0] * BigInt(10 ** token1Info.decimals)) / reserves[1],
        token0Info.decimals
      );
      baseToken = token0Info.symbol;
      liquidity = formatUnits(reserves[1], token1Info.decimals);
    }
    
    return {
      tokenSymbol,
      network,
      price,
      dexName,
      liquidity,
      baseToken,
      timestamp: Math.floor(Date.now() / 1000),
    };
  } catch (error) {
    console.error(`Error getting price for ${tokenSymbol} on ${network}:`, error);
    throw error;
  }
}

/**
 * Find arbitrage opportunities for a token across multiple networks
 * @param tokenSymbol Symbol of the token to check for arbitrage
 * @param networks Array of networks to check
 * @param minProfitPercent Minimum profit percentage to consider an opportunity viable
 * @returns Array of arbitrage opportunities
 */
export async function findArbitrageOpportunities(
  tokenSymbol: string,
  networks: string[] = ["iota", "ethereum", "shimmer"],
  minProfitPercent: number = 1.0
): Promise<{
  token: string;
  opportunities: {
    buyNetwork: string;
    sellNetwork: string;
    buyPrice: string;
    sellPrice: string;
    profitPercent: string;
    baseToken: string;
    estimatedProfit: string;
    buyDex: string;
    sellDex: string;
    bridgingRequired: boolean;
    timestamp: number;
    details: string;
  }[];
  timestamp: number;
}> {
  try {
    // Filter networks to only include those with liquidity for this token
    const availableNetworks = networks.filter(
      (network) => TOKEN_PAIRS[tokenSymbol] && TOKEN_PAIRS[tokenSymbol][network]
    );
    
    if (availableNetworks.length < 2) {
      return {
        token: tokenSymbol,
        opportunities: [],
        timestamp: Math.floor(Date.now() / 1000),
      };
    }
    
    // Get prices for the token across all available networks
    const pricePromises = availableNetworks.map((network) => 
      getTokenPrice(tokenSymbol, network)
    );
    
    const prices = await Promise.all(pricePromises);
    
    // Find arbitrage opportunities by comparing prices across networks
    const opportunities = [];
    
    for (let i = 0; i < prices.length; i++) {
      for (let j = 0; j < prices.length; j++) {
        if (i !== j) {
          const buyPrice = parseFloat(prices[i].price);
          const sellPrice = parseFloat(prices[j].price);
          
          // Calculate profit percentage
          const profitPercent = ((sellPrice - buyPrice) / buyPrice) * 100;
          
          // Only consider opportunities above the minimum profit percentage
          if (profitPercent >= minProfitPercent) {
            // Check if bridging is required (both networks are not IOTA networks)
            const buyIsIOTA = isIOTANetwork(prices[i].network);
            const sellIsIOTA = isIOTANetwork(prices[j].network);
            const bridgingRequired = !(buyIsIOTA && sellIsIOTA);
            
            // Calculate estimated profit for 1 unit of the token
            const estimatedProfit = (sellPrice - buyPrice).toFixed(6);
            
            opportunities.push({
              buyNetwork: prices[i].network,
              sellNetwork: prices[j].network,
              buyPrice: prices[i].price,
              sellPrice: prices[j].price,
              profitPercent: profitPercent.toFixed(2),
              baseToken: prices[i].baseToken, // Assuming same base token across networks
              estimatedProfit,
              buyDex: prices[i].dexName,
              sellDex: prices[j].dexName,
              bridgingRequired,
              timestamp: Math.floor(Date.now() / 1000),
              details: `Buy ${tokenSymbol} on ${prices[i].dexName} (${prices[i].network}) at ${prices[i].price} ${prices[i].baseToken} and sell on ${prices[j].dexName} (${prices[j].network}) at ${prices[j].price} ${prices[j].baseToken} for a ${profitPercent.toFixed(2)}% profit.`,
            });
          }
        }
      }
    }
    
    // Sort opportunities by profit percentage (highest first)
    opportunities.sort((a, b) => 
      parseFloat(b.profitPercent) - parseFloat(a.profitPercent)
    );
    
    return {
      token: tokenSymbol,
      opportunities,
      timestamp: Math.floor(Date.now() / 1000),
    };
  } catch (error) {
    console.error(`Error finding arbitrage opportunities for ${tokenSymbol}:`, error);
    throw error;
  }
}

/**
 * Get supported tokens for arbitrage monitoring
 * @returns List of supported tokens and networks for arbitrage monitoring
 */
export function getSupportedArbitrageTokens(): {
  supportedTokens: string[];
  tokenNetworks: { [token: string]: string[] };
} {
  const supportedTokens = Object.keys(TOKEN_PAIRS);
  
  const tokenNetworks: { [token: string]: string[] } = {};
  supportedTokens.forEach(token => {
    tokenNetworks[token] = Object.keys(TOKEN_PAIRS[token]);
  });
  
  return {
    supportedTokens,
    tokenNetworks,
  };
}
