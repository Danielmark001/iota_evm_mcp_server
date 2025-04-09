// src/core/services/iota-metrics.ts
import { getPublicClient } from "./clients.js";
import { getBlockByNumber, getLatestBlock } from "./blocks.js";
import { getIOTATokenInfo, isIOTANetwork } from "./iota.js";

/**
 * Get network metrics for an IOTA blockchain
 * @param network IOTA network to analyze (iota, iota-testnet, shimmer)
 * @param blockSampleSize Number of recent blocks to analyze for metrics
 * @returns Network metrics including TPS, block time, gas usage, etc.
 */
export async function getIOTANetworkMetrics(
  network = "iota",
  blockSampleSize = 20
): Promise<{
  networkName: string;
  blockHeight: string;
  recentTPS: number;
  averageBlockTime: number;
  averageGasUsed: string;
  averageTxPerBlock: number;
  totalTransactions: number;
  gasPrice: string;
  networkUtilization: string;
  isHealthy: boolean;
  tokenInfo: {
    name: string;
    symbol: string;
    totalSupply: string;
  };
}> {
  // Validate this is an IOTA network
  if (!isIOTANetwork(network)) {
    throw new Error(
      `${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`
    );
  }

  try {
    const client = getPublicClient(network);
    const latestBlock = await getLatestBlock(network);
    const blockHeight = latestBlock.number;

    // Get token info with fallback values
    let tokenInfo;
    try {
      tokenInfo = await getIOTATokenInfo(network);
    } catch (error) {
      console.error(`Error fetching token info: ${error}`);
      tokenInfo = {
        name: network === "shimmer" ? "Shimmer" : "IOTA",
        symbol: network === "shimmer" ? "SMR" : "MIOTA",
        decimals: 6,
        totalSupply: BigInt(0),
        formattedTotalSupply: "0",
      };
    }

    // Collect last N blocks for analysis
    const blocks = [];
    let totalGasUsed = BigInt(0);
    let totalTransactions = 0;
    let totalBlockTime = 0;
    let previousTimestamp = 0;

    // Process blocks in batches for better performance
    const batchSize = 5;
    const batches = Math.ceil(blockSampleSize / batchSize);

    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const batchPromises = [];

      for (let i = 0; i < batchSize; i++) {
        const blockIndex = batchIndex * batchSize + i;
        if (blockIndex >= blockSampleSize) break;

        const blockNumber = Number(blockHeight) - blockIndex;
        if (blockNumber <= 0) break;

        batchPromises.push(getBlockByNumber(blockNumber, network));
      }

      try {
        const batchBlocks = await Promise.all(batchPromises);
        blocks.push(...batchBlocks);
      } catch (error) {
        console.error(`Error fetching blocks batch ${batchIndex}:`, error);
      }
    }

    // Now process the blocks we successfully fetched
    for (const block of blocks) {
      // Track gas used
      totalGasUsed += block.gasUsed || BigInt(0);

      // Track transaction count
      const txCount = block.transactions ? block.transactions.length : 0;
      totalTransactions += txCount;

      // Calculate block time (time since previous block)
      if (previousTimestamp > 0) {
        const blockTime = previousTimestamp - Number(block.timestamp);
        totalBlockTime += blockTime;
      }
      previousTimestamp = Number(block.timestamp);
    }

    // Calculate metrics
    const blockCount = blocks.length;

    // Handle case where we couldn't fetch any blocks
    if (blockCount === 0) {
      return {
        networkName: network,
        blockHeight: blockHeight ? blockHeight.toString() : "unknown",
        recentTPS: 0,
        averageBlockTime: 0,
        averageGasUsed: "0",
        averageTxPerBlock: 0,
        totalTransactions: 0,
        gasPrice: "0",
        networkUtilization: "0%",
        isHealthy: false,
        tokenInfo: {
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          totalSupply: tokenInfo.formattedTotalSupply,
        },
      };
    }

    // Calculate average metrics with safe division
    const averageBlockTime =
      blockCount > 1 ? totalBlockTime / (blockCount - 1) : 0;
    const averageTxPerBlock = totalTransactions / blockCount;

    // Calculate TPS (transactions per second)
    const recentTPS =
      averageBlockTime > 0 ? averageTxPerBlock / averageBlockTime : 0;

    // Calculate network utilization as percentage of gas limit used
    let networkUtilization = "0%";
    if (blocks[0] && blocks[0].gasLimit) {
      const utilizationPercentage =
        (Number(totalGasUsed) / (Number(blocks[0].gasLimit) * blockCount)) *
        100;
      networkUtilization = `${utilizationPercentage.toFixed(2)}%`;
    }

    // Check if the network is healthy based on recent block times
    const now = Math.floor(Date.now() / 1000);
    const latestBlockTimestamp = blocks[0] ? Number(blocks[0].timestamp) : 0;
    const latestBlockAge = now - latestBlockTimestamp;
    const isHealthy = latestBlockTimestamp > 0 && latestBlockAge < 60; // Less than 60 seconds since last block

    // Get current gas price
    let gasPrice = "0";
    try {
      const gasPriceResult = await client.getGasPrice();
      gasPrice = gasPriceResult.toString();
    } catch (error) {
      console.error("Error getting gas price:", error);
    }

    return {
      networkName: network,
      blockHeight: blockHeight ? blockHeight.toString() : "unknown",
      recentTPS: parseFloat(recentTPS.toFixed(2)),
      averageBlockTime: parseFloat(averageBlockTime.toFixed(2)),
      averageGasUsed: (totalGasUsed / BigInt(blockCount)).toString(),
      averageTxPerBlock: parseFloat(averageTxPerBlock.toFixed(2)),
      totalTransactions,
      gasPrice,
      networkUtilization,
      isHealthy,
      tokenInfo: {
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        totalSupply: tokenInfo.formattedTotalSupply,
      },
    };
  } catch (error) {
    console.error("Error fetching network metrics:", error);
    // Return default values instead of throwing
    return {
      networkName: network,
      blockHeight: "unknown",
      recentTPS: 0,
      averageBlockTime: 0,
      averageGasUsed: "0",
      averageTxPerBlock: 0,
      totalTransactions: 0,
      gasPrice: "0",
      networkUtilization: "0%",
      isHealthy: false,
      tokenInfo: {
        name: network === "shimmer" ? "Shimmer" : "IOTA",
        symbol: network === "shimmer" ? "SMR" : "MIOTA",
        totalSupply: "0",
      },
    };
  }
}

/**
 * Compare IOTA network metrics with other EVM networks
 * @param iotaNetwork IOTA network to compare (iota, iota-testnet, shimmer)
 * @param compareNetworks Array of other networks to compare with
 * @returns Comparative metrics between IOTA and other networks
 */
export async function compareIOTAWithOtherNetworks(
  iotaNetwork = "iota",
  compareNetworks = ["ethereum", "arbitrum", "optimism", "polygon"]
): Promise<{
  iotaMetrics: any;
  comparisonNetworks: Array<{
    networkName: string;
    blockHeight: string;
    recentTPS: number;
    averageBlockTime: number;
    averageTxPerBlock: number;
    gasPrice: string;
    networkUtilization: string;
  }>;
  comparison: {
    tpsRanking: Array<{ network: string; tps: number }>;
    blockTimeRanking: Array<{ network: string; blockTime: number }>;
    gasPriceRanking: Array<{ network: string; gasPrice: string }>;
    utilizationRanking: Array<{ network: string; utilization: string }>;
  };
}> {
  try {
    // Validate IOTA network
    if (!isIOTANetwork(iotaNetwork)) {
      throw new Error(
        `${iotaNetwork} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`
      );
    }

    // Get IOTA metrics
    const iotaMetrics = await getIOTANetworkMetrics(iotaNetwork);

    // Get metrics for comparison networks
    const comparisonNetworks = [];
    for (const network of compareNetworks) {
      try {
        // Use a smaller sample size for comparison networks to speed up the process
        const metrics = await getIOTANetworkMetrics(network, 5);
        comparisonNetworks.push({
          networkName: network,
          blockHeight: metrics.blockHeight,
          recentTPS: metrics.recentTPS,
          averageBlockTime: metrics.averageBlockTime,
          averageTxPerBlock: metrics.averageTxPerBlock,
          gasPrice: metrics.gasPrice,
          networkUtilization: metrics.networkUtilization,
        });
      } catch (error) {
        console.error(`Error getting metrics for ${network}:`, error);
        // Add placeholder metrics for networks that fail
        comparisonNetworks.push({
          networkName: network,
          blockHeight: "unknown",
          recentTPS: 0,
          averageBlockTime: 0,
          averageTxPerBlock: 0,
          gasPrice: "0",
          networkUtilization: "0%",
        });
      }
    }

    // Create network objects for ranking with standardized data types
    const allNetworksForRanking = [
      {
        networkName: iotaNetwork,
        recentTPS: iotaMetrics.recentTPS,
        averageBlockTime: iotaMetrics.averageBlockTime,
        gasPrice: iotaMetrics.gasPrice,
        networkUtilization: iotaMetrics.networkUtilization,
      },
      ...comparisonNetworks,
    ];

    // Create rankings - with proper handling of types
    // For TPS ranking (higher is better)
    const tpsRanking = [...allNetworksForRanking]
      .sort((a, b) => b.recentTPS - a.recentTPS)
      .map((n) => ({ network: n.networkName, tps: n.recentTPS }));

    // For block time ranking (lower is better)
    const blockTimeRanking = [...allNetworksForRanking]
      .sort((a, b) => a.averageBlockTime - b.averageBlockTime)
      .map((n) => ({ network: n.networkName, blockTime: n.averageBlockTime }));

    // For gas price ranking (lower is better)
    // Convert gasPrice strings to numbers for proper comparison
    const gasPriceRanking = [...allNetworksForRanking]
      .map((n) => ({
        network: n.networkName,
        gasPriceNumeric: n.gasPrice ? Number(n.gasPrice) : 0,
        gasPrice: n.gasPrice,
      }))
      .sort((a, b) => a.gasPriceNumeric - b.gasPriceNumeric)
      .map((n) => ({ network: n.network, gasPrice: n.gasPrice }));

    // For utilization ranking (higher might be better for popular networks)
    // Extract numeric values from utilization percentage strings
    const utilizationRanking = [...allNetworksForRanking]
      .map((n) => ({
        network: n.networkName,
        utilizationNumeric: parseFloat(
          n.networkUtilization?.replace("%", "") || "0"
        ),
        utilization: n.networkUtilization,
      }))
      .sort((a, b) => b.utilizationNumeric - a.utilizationNumeric)
      .map((n) => ({ network: n.network, utilization: n.utilization }));

    return {
      iotaMetrics,
      comparisonNetworks,
      comparison: {
        tpsRanking,
        blockTimeRanking,
        gasPriceRanking,
        utilizationRanking,
      },
    };
  } catch (error) {
    console.error("Error comparing networks:", error);
    // Return minimal values instead of throwing
    return {
      iotaMetrics: {},
      comparisonNetworks: [],
      comparison: {
        tpsRanking: [],
        blockTimeRanking: [],
        gasPriceRanking: [],
        utilizationRanking: [],
      },
    };
  }
}

/**
 * Track IOTA network growth over time
 * @param network IOTA network to analyze (iota, iota-testnet, shimmer)
 * @param periodDays Number of days to analyze (approximate, based on block times)
 * @returns Network growth metrics
 */
export async function trackIOTANetworkGrowth(
  network = "iota",
  periodDays = 7
): Promise<{
  networkName: string;
  currentMetrics: any;
  growthMetrics: {
    dailyBlocks: number;
    dailyTransactions: number;
    averageDailyTPS: number;
    blockTimeImprovement: string;
    utilizationChange: string;
    transactionGrowthRate: string;
  };
}> {
  // Validate IOTA network
  if (!isIOTANetwork(network)) {
    throw new Error(
      `${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`
    );
  }

  try {
    // Get current metrics
    const currentMetrics = await getIOTANetworkMetrics(network);

    // Estimate blocks per day based on average block time
    const blocksPerDay =
      currentMetrics.averageBlockTime > 0
        ? Math.floor(86400 / currentMetrics.averageBlockTime)
        : 43200; // Default to 2-second blocks if we can't calculate

    const totalBlocksToAnalyze = blocksPerDay * periodDays;

    // Get the latest block
    const latestBlock = await getLatestBlock(network);

    // Get a historical block from approximately 'periodDays' ago
    const historicalBlockNumber = Math.max(
      1,
      Number(latestBlock.number) - totalBlocksToAnalyze
    );

    let historicalBlock;
    try {
      historicalBlock = await getBlockByNumber(historicalBlockNumber, network);
    } catch (error) {
      console.error(
        `Error fetching historical block ${historicalBlockNumber}:`,
        error
      );
      // Create a fallback block with minimal data
      historicalBlock = {
        number: BigInt(historicalBlockNumber),
        timestamp: BigInt(Math.floor(Date.now() / 1000) - periodDays * 86400),
        transactions: [],
        gasUsed: BigInt(0),
      };
    }

    // Calculate time difference in days (more accurate than our estimation)
    const latestTimestamp = Number(latestBlock.timestamp);
    const historicalTimestamp = Number(historicalBlock.timestamp);
    const actualTimeDifferenceDays =
      (latestTimestamp - historicalTimestamp) / 86400;

    // Sample blocks between historical and current to get transaction data
    const sampleSize = Math.min(50, totalBlocksToAnalyze); // Limit sample size for performance
    const sampleInterval = Math.floor(totalBlocksToAnalyze / sampleSize);

    let totalTransactions = 0;
    let totalGasUsed = BigInt(0);
    const blockTimestamps: number[] = [];

    // Process blocks in batches
    const batchSize = 5;
    const batches = Math.ceil(sampleSize / batchSize);

    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const batchPromises = [];

      for (let i = 0; i < batchSize; i++) {
        const blockIndex = batchIndex * batchSize + i;
        if (blockIndex >= sampleSize) break;

        const blockNumber = historicalBlockNumber + blockIndex * sampleInterval;
        batchPromises.push(getBlockByNumber(blockNumber, network));
      }

      try {
        const batchBlocks = await Promise.all(batchPromises);

        for (const block of batchBlocks) {
          totalTransactions += block.transactions
            ? block.transactions.length
            : 0;
          totalGasUsed += block.gasUsed || BigInt(0);
          blockTimestamps.push(Number(block.timestamp));
        }
      } catch (error) {
        console.error(`Error fetching blocks batch ${batchIndex}:`, error);
      }
    }

    // Sort timestamps to ensure they're in order
    blockTimestamps.sort((a, b) => a - b);

    // Calculate block time over the sample
    let totalBlockTime = 0;
    let historicalAverageBlockTime = currentMetrics.averageBlockTime;

    if (blockTimestamps.length > 1) {
      for (let i = 1; i < blockTimestamps.length; i++) {
        totalBlockTime += blockTimestamps[i] - blockTimestamps[i - 1];
      }
      historicalAverageBlockTime =
        totalBlockTime / (blockTimestamps.length - 1);
    }

    // Calculate metrics
    const actualBlockCount = Number(latestBlock.number) - historicalBlockNumber;
    const dailyBlocks = Math.round(
      actualBlockCount / (actualTimeDifferenceDays || 1)
    );
    const sampleTransactionsPerBlock =
      totalTransactions / (blockTimestamps.length || 1);
    const estimatedTotalTransactions =
      actualBlockCount * sampleTransactionsPerBlock;
    const dailyTransactions = Math.round(
      estimatedTotalTransactions / (actualTimeDifferenceDays || 1)
    );
    const averageDailyTPS = dailyTransactions / 86400;

    // Calculate improvements
    const blockTimeImprovement =
      historicalAverageBlockTime > 0
        ? ((historicalAverageBlockTime - currentMetrics.averageBlockTime) /
            historicalAverageBlockTime) *
          100
        : 0;

    const blockTimeImprovementStr =
      blockTimeImprovement >= 0
        ? `${blockTimeImprovement.toFixed(2)}% faster`
        : `${Math.abs(blockTimeImprovement).toFixed(2)}% slower`;

    // Calculate transaction growth rate
    const currentDailyEstimate = currentMetrics.averageTxPerBlock * dailyBlocks;
    const transactionGrowthRate =
      dailyTransactions > 0
        ? ((currentDailyEstimate - dailyTransactions) / dailyTransactions) * 100
        : 0;

    const transactionGrowthStr =
      transactionGrowthRate >= 0
        ? `+${transactionGrowthRate.toFixed(2)}%`
        : `${transactionGrowthRate.toFixed(2)}%`;

    // Network utilization change is more complex - we'll use a placeholder for now
    const utilizationChange = "Data not available";

    return {
      networkName: network,
      currentMetrics,
      growthMetrics: {
        dailyBlocks,
        dailyTransactions,
        averageDailyTPS: parseFloat(averageDailyTPS.toFixed(4)),
        blockTimeImprovement: blockTimeImprovementStr,
        utilizationChange,
        transactionGrowthRate: transactionGrowthStr,
      },
    };
  } catch (error) {
    console.error(`Error tracking network growth: ${error}`);
    // Return default values instead of throwing
    return {
      networkName: network,
      currentMetrics: {},
      growthMetrics: {
        dailyBlocks: 0,
        dailyTransactions: 0,
        averageDailyTPS: 0,
        blockTimeImprovement: "Unknown",
        utilizationChange: "Unknown",
        transactionGrowthRate: "0%",
      },
    };
  }
}
