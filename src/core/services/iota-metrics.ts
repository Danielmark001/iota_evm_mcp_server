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

  const client = getPublicClient(network);
  const latestBlock = await getLatestBlock(network);
  const blockHeight = latestBlock.number;

  // Get token info
  const tokenInfo = await getIOTATokenInfo(network);

  // Collect last N blocks for analysis
  const blocks = [];
  let totalGasUsed = BigInt(0);
  let totalTransactions = 0;
  let totalBlockTime = 0;
  let previousTimestamp = 0;

  for (let i = 0; i < blockSampleSize; i++) {
    const blockNumber = Number(blockHeight) - i;
    if (blockNumber <= 0) break;

    const block = await getBlockByNumber(blockNumber, network);
    blocks.push(block);

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
  const averageBlockTime = totalBlockTime / (blockCount - 1);
  const averageTxPerBlock = totalTransactions / blockCount;

  // Calculate TPS (transactions per second)
  const recentTPS = averageTxPerBlock / (averageBlockTime || 1); // Avoid division by zero

  // Calculate network utilization as percentage of gas limit used
  let networkUtilization = "0%";
  if (blocks[0].gasLimit) {
    const utilizationPercentage =
      (Number(totalGasUsed) / (Number(blocks[0].gasLimit) * blockCount)) * 100;
    networkUtilization = `${utilizationPercentage.toFixed(2)}%`;
  }

  // Check if the network is healthy based on recent block times
  const now = Math.floor(Date.now() / 1000);
  const latestBlockAge = now - Number(blocks[0].timestamp);
  const isHealthy = latestBlockAge < 60; // Less than 60 seconds since last block

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

  // Get current metrics
  const currentMetrics = await getIOTANetworkMetrics(network);

  // Estimate blocks per day based on average block time
  const blocksPerDay = Math.floor(86400 / currentMetrics.averageBlockTime);
  const totalBlocksToAnalyze = blocksPerDay * periodDays;

  // Get the latest block
  const latestBlock = await getLatestBlock(network);

  // Get a historical block from approximately 'periodDays' ago
  const historicalBlockNumber = Math.max(
    1,
    Number(latestBlock.number) - totalBlocksToAnalyze
  );
  const historicalBlock = await getBlockByNumber(
    historicalBlockNumber,
    network
  );

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

  for (let i = 0; i < sampleSize; i++) {
    const blockNumber = historicalBlockNumber + i * sampleInterval;
    try {
      const block = await getBlockByNumber(blockNumber, network);
      totalTransactions += block.transactions ? block.transactions.length : 0;
      totalGasUsed += block.gasUsed || BigInt(0);
      blockTimestamps.push(Number(block.timestamp));
    } catch (error) {
      console.error(`Error fetching block ${blockNumber}:`, error);
    }
  }

  // Calculate block time over the sample
  let totalBlockTime = 0;
  for (let i = 1; i < blockTimestamps.length; i++) {
    totalBlockTime += blockTimestamps[i] - blockTimestamps[i - 1];
  }
  const historicalAverageBlockTime =
    totalBlockTime / (blockTimestamps.length - 1) ||
    currentMetrics.averageBlockTime;

  // Calculate metrics
  const actualBlockCount = Number(latestBlock.number) - historicalBlockNumber;
  const dailyBlocks = Math.round(actualBlockCount / actualTimeDifferenceDays);
  const sampleTransactionsPerBlock = totalTransactions / blockTimestamps.length;
  const estimatedTotalTransactions =
    actualBlockCount * sampleTransactionsPerBlock;
  const dailyTransactions = Math.round(
    estimatedTotalTransactions / actualTimeDifferenceDays
  );
  const averageDailyTPS = dailyTransactions / 86400;

  // Calculate improvements
  const blockTimeImprovement =
    ((historicalAverageBlockTime - currentMetrics.averageBlockTime) /
      historicalAverageBlockTime) *
    100;
  const blockTimeImprovementStr =
    blockTimeImprovement >= 0
      ? `${blockTimeImprovement.toFixed(2)}% faster`
      : `${Math.abs(blockTimeImprovement).toFixed(2)}% slower`;

  // Calculate transaction growth rate
  const currentDailyEstimate = currentMetrics.averageTxPerBlock * dailyBlocks;
  const transactionGrowthRate =
    ((currentDailyEstimate - dailyTransactions) / dailyTransactions) * 100;
  const transactionGrowthStr =
    transactionGrowthRate >= 0
      ? `+${transactionGrowthRate.toFixed(2)}%`
      : `${transactionGrowthRate.toFixed(2)}%`;

  // Network utilization change cannot be reliably calculated without more data
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
}
