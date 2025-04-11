import { describe, it, expect, beforeEach, mock } from "bun:test";
import { IOTADefiAgent } from "../src/iota-defi-agent.js";
import * as iotaDefiServices from "../src/core/services/iota-defi.js";

// Mock the imported functions
const mockLiquidityPools = {
  pools: [
    {
      token0: { symbol: "IOTA" },
      token1: { symbol: "USDT" },
      apr: "10.5",
      volume24h: "1000000",
      reserves: { reserveUSD: "5000000" },
    },
  ],
};

const mockLendingMarkets = {
  markets: [
    {
      tokenSymbol: "IOTA",
      supplyApy: "5.2",
      borrowApy: "7.8",
      liquidity: "3000000",
    },
  ],
};

const mockStakingPools = {
  stakingPools: [
    {
      poolName: "IOTA Staking",
      apr: "8.5",
      totalStaked: "10000000",
      rewardTokens: [{ symbol: "IOTA" }],
    },
  ],
};

const mockTopTokens = {
  tokens: [
    {
      symbol: "IOTA",
      price: "0.25",
      priceChange24h: "5.2",
      volume24h: "2000000",
    },
  ],
};

describe("IOTADefiAgent", () => {
  let agent: IOTADefiAgent;

  beforeEach(() => {
    // Reset mocks before each test
    mock.module("../src/core/services/iota-defi.js", () => ({
      getIOTALiquidityPools: () => Promise.resolve(mockLiquidityPools),
      getIOTALendingMarkets: () => Promise.resolve(mockLendingMarkets),
      getIOTAStakingOpportunities: () => Promise.resolve(mockStakingPools),
      getIOTATopTokens: () => Promise.resolve(mockTopTokens),
    }));

    agent = new IOTADefiAgent();
  });

  describe("analyzeDefiOpportunities", () => {
    it("should return structured DeFi opportunities", async () => {
      const opportunities = await agent.analyzeDefiOpportunities();

      // Check if the response has the expected structure
      expect(opportunities).toHaveProperty("liquidityPools");
      expect(opportunities).toHaveProperty("lendingMarkets");
      expect(opportunities).toHaveProperty("stakingPools");
      expect(opportunities).toHaveProperty("topTokens");

      // Check if each pool has the required properties
      const pool = opportunities.liquidityPools[0];
      expect(pool).toHaveProperty("pair", "IOTA/USDT");
      expect(pool).toHaveProperty("apr", "10.5");
      expect(pool).toHaveProperty("volume24h", "1000000");
      expect(pool).toHaveProperty("totalLiquidity", "5000000");

      // Check if each market has the required properties
      const market = opportunities.lendingMarkets[0];
      expect(market).toHaveProperty("token", "IOTA");
      expect(market).toHaveProperty("supplyApy", "5.2");
      expect(market).toHaveProperty("borrowApy", "7.8");
      expect(market).toHaveProperty("totalLiquidity", "3000000");
    });
  });

  describe("findBestYieldOpportunity", () => {
    it("should return the best yield opportunities", async () => {
      const bestYield = await agent.findBestYieldOpportunity();

      // Check if the response has the expected structure
      expect(bestYield).toHaveProperty("bestLiquidityPool");
      expect(bestYield).toHaveProperty("bestLendingMarket");
      expect(bestYield).toHaveProperty("bestStakingPool");
      expect(bestYield).toHaveProperty("recommendation");

      // Check if the recommendation has the expected structure
      const { recommendation } = bestYield;
      expect(recommendation).toHaveProperty("bestOption");
      expect(recommendation).toHaveProperty("allOptions");
      expect(recommendation).toHaveProperty("analysis");

      // Verify the best option is the liquidity pool (highest APR)
      expect(recommendation.bestOption.type).toBe("Liquidity Pool");
      expect(recommendation.bestOption.apr).toBe(10.5);
    });
  });

  describe("findCrossChainArbitrage", () => {
    it("should find profitable cross-chain arbitrage opportunities", async () => {
      const result = await agent.findCrossChainArbitrage();

      // Check if the response has the expected structure
      expect(result).toHaveProperty("opportunities");
      expect(result).toHaveProperty("bestOpportunity");

      // If there are opportunities, check their structure
      if (result.opportunities.length > 0) {
        const opportunity = result.opportunities[0];
        expect(opportunity).toHaveProperty("sourceChain");
        expect(opportunity).toHaveProperty("targetChain");
        expect(opportunity).toHaveProperty("token");
        expect(opportunity).toHaveProperty("sourcePrice");
        expect(opportunity).toHaveProperty("targetPrice");
        expect(opportunity).toHaveProperty("potentialProfit");
        expect(opportunity).toHaveProperty("estimatedGasCost");
      }

      // If there's a best opportunity, check its structure
      if (result.bestOpportunity) {
        expect(result.bestOpportunity).toHaveProperty("sourceChain");
        expect(result.bestOpportunity).toHaveProperty("targetChain");
        expect(result.bestOpportunity).toHaveProperty("token");
        expect(result.bestOpportunity).toHaveProperty("profit");
        expect(result.bestOpportunity).toHaveProperty("executionSteps");
        expect(Array.isArray(result.bestOpportunity.executionSteps)).toBe(true);
      }
    });
  });

  describe("analyzeIOTAMarket", () => {
    it("should analyze IOTA market data and provide recommendations", async () => {
      const result = await agent.analyzeIOTAMarket();

      // Check if the response has the expected structure
      expect(result).toHaveProperty("marketData");
      expect(result).toHaveProperty("analysis");
      expect(result).toHaveProperty("recommendations");

      // Check market data structure
      const { marketData } = result;
      expect(marketData).toHaveProperty("price");
      expect(marketData).toHaveProperty("volume");
      expect(marketData).toHaveProperty("liquidity");
      expect(marketData).toHaveProperty("stakingMetrics");

      // Check price data
      expect(marketData.price).toHaveProperty("current");
      expect(marketData.price).toHaveProperty("change24h");
      expect(marketData.price).toHaveProperty("sources");
      expect(Array.isArray(marketData.price.sources)).toBe(true);

      // Check volume data
      expect(marketData.volume).toHaveProperty("daily");
      expect(marketData.volume).toHaveProperty("weekly");
      expect(marketData.volume).toHaveProperty("monthly");

      // Check liquidity data
      expect(marketData.liquidity).toHaveProperty("total");
      expect(marketData.liquidity).toHaveProperty("byPool");
      expect(typeof marketData.liquidity.byPool).toBe("object");

      // Check staking metrics
      expect(marketData.stakingMetrics).toHaveProperty("totalStaked");
      expect(marketData.stakingMetrics).toHaveProperty("averageAPY");
      expect(marketData.stakingMetrics).toHaveProperty("activeValidators");

      // Check recommendations
      const { recommendations } = result;
      expect(recommendations).toHaveProperty("trading");
      expect(recommendations).toHaveProperty("staking");
      expect(recommendations).toHaveProperty("liquidity");

      // Check trading recommendations
      expect(recommendations.trading).toHaveProperty("action");
      expect(["BUY", "SELL", "HOLD"]).toContain(recommendations.trading.action);
      expect(recommendations.trading).toHaveProperty("confidence");
      expect(recommendations.trading).toHaveProperty("timeframe");

      // Check staking recommendations
      expect(recommendations.staking).toHaveProperty("recommended");
      expect(typeof recommendations.staking.recommended).toBe("boolean");
      expect(recommendations.staking).toHaveProperty("apy");
      expect(recommendations.staking).toHaveProperty("risk");

      // Check liquidity recommendations
      expect(recommendations.liquidity).toHaveProperty("recommendedPools");
      expect(recommendations.liquidity).toHaveProperty("allocation");
    });
  });
});
