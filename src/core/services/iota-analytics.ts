import {
  type Address,
  type Hash,
  type TransactionReceipt,
  type Block,
} from "viem";
import { getPublicClient } from "./clients.js";
import { getTransaction, getTransactionReceipt } from "./transactions.js";
import { getIOTATokenInfo } from "./iota.js";
import { resolveAddress } from "./ens.js";

/**
 * Analyze an IOTA transaction and provide detailed insights
 * @param txHash Transaction hash to analyze
 * @param network IOTA network to use (iota, iota-testnet, shimmer)
 * @returns Detailed transaction analysis
 */
export async function analyzeIOTATransaction(
  txHash: Hash,
  network = "iota"
): Promise<{
  transaction: any;
  receipt: TransactionReceipt;
  analysis: {
    transactionType: string;
    gasEfficiency: string;
    valueTransferred: string;
    formattedValue: string;
    timestamp: number;
    age: string;
    blockConfirmations: number;
    success: boolean;
    gasUsedPercentage: number;
    tokenSymbol: string;
  };
}> {
  // Get transaction and receipt
  const transaction = await getTransaction(txHash, network);
  const receipt = await getTransactionReceipt(txHash, network);

  // Get the latest block to calculate confirmations
  const client = getPublicClient(network);
  const latestBlock = await client.getBlock();
  const confirmations =
    Number(latestBlock.number) - Number(receipt.blockNumber);

  // Get token information
  const tokenInfo = await getIOTATokenInfo(network);

  // Determine transaction type
  // In Viem, transaction data might be in different properties depending on the version and network
  // We'll check multiple potential locations
  let txData = "";

  // Try to access data from various possible locations in the transaction object
  if (transaction) {
    if ("data" in transaction && transaction.data) {
      txData = transaction.data as string;
    } else if ("input" in transaction && transaction.input) {
      txData = transaction.input as string;
    } else if ("calldata" in transaction && transaction.calldata) {
      txData = transaction.calldata as string;
    }
  }

  // Standardize txData to a string
  if (typeof txData !== "string") {
    txData = String(txData || "");
  }

  // Determine transaction type based on the data
  let transactionType = "Unknown";

  if (!txData || txData === "0x" || txData === "0x0") {
    transactionType = "Native Token Transfer";
  } else if (txData.startsWith("0xa9059cbb")) {
    transactionType = "ERC20 Token Transfer";
  } else if (txData.startsWith("0x23b872dd")) {
    transactionType = "ERC721 NFT Transfer";
  } else if (txData.startsWith("0xf242432a")) {
    transactionType = "ERC1155 Token Transfer";
  } else if (txData.startsWith("0x095ea7b3")) {
    transactionType = "Token Approval";
  } else if (
    !transaction.to ||
    transaction.to === "0x" ||
    transaction.to === null
  ) {
    transactionType = "Contract Deployment";
  } else {
    transactionType = "Contract Interaction";
  }

  // Calculate gas efficiency
  const gasUsed = Number(receipt.gasUsed || 0);
  const gasLimit = Number(transaction.gas || 0);
  const gasUsedPercentage =
    gasLimit > 0 ? Math.round((gasUsed / gasLimit) * 100) : 0;

  let gasEfficiency = "Unknown";
  if (gasUsedPercentage < 60) {
    gasEfficiency = "Excellent";
  } else if (gasUsedPercentage < 80) {
    gasEfficiency = "Good";
  } else if (gasUsedPercentage < 95) {
    gasEfficiency = "Fair";
  } else {
    gasEfficiency = "Poor";
  }

  // Calculate age
  const now = Math.floor(Date.now() / 1000);

  // Handle different timestamp property names in different Viem versions
  let txTimestamp = 0;
  if ("timestamp" in transaction && transaction.timestamp) {
    txTimestamp = Number(transaction.timestamp);
  } else if ("blockTimestamp" in transaction && transaction.blockTimestamp) {
    txTimestamp = Number(transaction.blockTimestamp);
  }

  const ageInSeconds = now - txTimestamp;
  let age = "";

  if (ageInSeconds < 60) {
    age = `${ageInSeconds} seconds ago`;
  } else if (ageInSeconds < 3600) {
    age = `${Math.floor(ageInSeconds / 60)} minutes ago`;
  } else if (ageInSeconds < 86400) {
    age = `${Math.floor(ageInSeconds / 3600)} hours ago`;
  } else {
    age = `${Math.floor(ageInSeconds / 86400)} days ago`;
  }

  // Extract and format value
  const txValue = transaction.value ? BigInt(transaction.value) : BigInt(0);
  const formattedValue = (
    Number(txValue) /
    10 ** tokenInfo.decimals
  ).toString();

  return {
    transaction,
    receipt,
    analysis: {
      transactionType,
      gasEfficiency,
      valueTransferred: txValue.toString(),
      formattedValue,
      timestamp: txTimestamp,
      age,
      blockConfirmations: confirmations,
      success: receipt.status === "success",
      gasUsedPercentage,
      tokenSymbol: tokenInfo.symbol,
    },
  };
}

/**
 * Get historical transactions for an IOTA address
 * @param addressOrEns Address or ENS name to get transaction history for
 * @param network IOTA network to use (iota, iota-testnet, shimmer)
 * @param limit Maximum number of transactions to return (defaults to 10)
 * @returns Array of transactions for the address
 */
export async function getIOTATransactionHistory(
  addressOrEns: string,
  network = "iota",
  limit = 10
): Promise<any[]> {
  // Resolve address if it's an ENS name
  const address = await resolveAddress(addressOrEns, network);

  // Since viem doesn't have a direct method to get transaction history,
  // we'll need to scan recent blocks and filter for the address
  const client = getPublicClient(network);
  const latestBlock = await client.getBlock();

  // We'll scan the last 100 blocks or fewer if the chain hasn't reached that yet
  const blocksToScan = Math.min(100, Number(latestBlock.number));
  const transactions: any[] = [];

  // Get blocks from newest to oldest
  for (let i = 0; i < blocksToScan && transactions.length < limit; i++) {
    try {
      const blockNumber = Number(latestBlock.number) - i;
      const block = await client.getBlock({ blockNumber: BigInt(blockNumber) });

      // Some blocks might not have transactions included in the response
      if (!block.transactions || block.transactions.length === 0) {
        continue;
      }

      // Process each transaction in the block
      for (const txHash of block.transactions) {
        if (transactions.length >= limit) break;

        try {
          const tx = await getTransaction(txHash, network);

          // Check if the address is the sender or recipient
          const txFrom = tx.from ? tx.from.toLowerCase() : "";
          const txTo = tx.to ? tx.to.toLowerCase() : "";
          const addressLower = address.toLowerCase();

          if (txFrom === addressLower || txTo === addressLower) {
            transactions.push(tx);
          }
        } catch (error) {
          console.error(`Error fetching transaction ${txHash}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error fetching block:`, error);
    }
  }

  return transactions;
}

/**
 * Calculate IOTA transaction metrics for an address
 * @param addressOrEns Address or ENS name to analyze
 * @param network IOTA network to use (iota, iota-testnet, shimmer)
 * @returns Transaction metrics for the address
 */
export async function getIOTAAddressMetrics(
  addressOrEns: string,
  network = "iota"
): Promise<{
  address: string;
  txCount: number;
  sentTxCount: number;
  receivedTxCount: number;
  totalSent: string;
  totalReceived: string;
  tokenSymbol: string;
  firstTxTimestamp: number | null;
  lastTxTimestamp: number | null;
  accountAge: string | null;
}> {
  const address = await resolveAddress(addressOrEns, network);
  const transactions = await getIOTATransactionHistory(address, network, 100);
  const tokenInfo = await getIOTATokenInfo(network);

  let sentTxCount = 0;
  let receivedTxCount = 0;
  let totalSent = BigInt(0);
  let totalReceived = BigInt(0);
  let firstTxTimestamp: number | null = null;
  let lastTxTimestamp: number | null = null;

  const addressLower = address.toLowerCase();

  for (const tx of transactions) {
    // Get timestamp from different possible properties
    let timestamp = 0;
    if ("timestamp" in tx && tx.timestamp) {
      timestamp = Number(tx.timestamp);
    } else if ("blockTimestamp" in tx && tx.blockTimestamp) {
      timestamp = Number(tx.blockTimestamp);
    }

    // Update first and last transaction timestamps
    if (firstTxTimestamp === null || timestamp < firstTxTimestamp) {
      firstTxTimestamp = timestamp;
    }
    if (lastTxTimestamp === null || timestamp > lastTxTimestamp) {
      lastTxTimestamp = timestamp;
    }

    const txValue = tx.value ? BigInt(tx.value) : BigInt(0);
    const txFrom = tx.from ? tx.from.toLowerCase() : "";
    const txTo = tx.to ? tx.to.toLowerCase() : "";

    // Check if this address is the sender or receiver
    if (txFrom === addressLower) {
      sentTxCount++;
      totalSent += txValue;
    }

    if (txTo === addressLower) {
      receivedTxCount++;
      totalReceived += txValue;
    }
  }

  // Calculate account age
  let accountAge: string | null = null;
  if (firstTxTimestamp !== null) {
    const now = Math.floor(Date.now() / 1000);
    const ageInSeconds = now - firstTxTimestamp;

    if (ageInSeconds < 86400) {
      accountAge = `${Math.floor(ageInSeconds / 3600)} hours`;
    } else {
      accountAge = `${Math.floor(ageInSeconds / 86400)} days`;
    }
  }

  // Format values using token decimals
  const formattedSent =
    totalSent > 0
      ? (Number(totalSent) / 10 ** tokenInfo.decimals).toString()
      : "0";

  const formattedReceived =
    totalReceived > 0
      ? (Number(totalReceived) / 10 ** tokenInfo.decimals).toString()
      : "0";

  return {
    address,
    txCount: transactions.length,
    sentTxCount,
    receivedTxCount,
    totalSent: formattedSent,
    totalReceived: formattedReceived,
    tokenSymbol: tokenInfo.symbol,
    firstTxTimestamp,
    lastTxTimestamp,
    accountAge,
  };
}

/**
 * Get transaction volume metrics for an IOTA network
 * @param network IOTA network to analyze (iota, iota-testnet, shimmer)
 * @param days Number of days to analyze (approximate, defaults to 1)
 * @returns Transaction volume metrics
 */
export async function getIOTANetworkVolume(
  network = "iota",
  days = 1
): Promise<{
  network: string;
  totalTransactions: number;
  totalVolume: string;
  averageTxValue: string;
  largestTx: string;
  tokenSymbol: string;
  startBlock: number;
  endBlock: number;
  startTime: number;
  endTime: number;
  timeSpan: string;
}> {
  const client = getPublicClient(network);
  const tokenInfo = await getIOTATokenInfo(network);

  // Get the latest block
  const latestBlock = await client.getBlock();
  const endBlock = Number(latestBlock.number);
  const endTime = Number(latestBlock.timestamp);

  // Estimate blocks per day based on 2-second block time (typical for IOTA)
  // This is an approximation - actual IOTA EVM block times may vary
  const avgBlockTime = 2; // seconds
  const blocksPerDay = Math.floor(86400 / avgBlockTime);
  const blocksToAnalyze = blocksPerDay * days;

  // Calculate start block (with safety check)
  const startBlock = Math.max(1, endBlock - blocksToAnalyze);

  // Sample blocks for analysis (we don't want to analyze all blocks for performance reasons)
  const sampleSize = Math.min(100, blocksToAnalyze);
  const sampleInterval = Math.floor(blocksToAnalyze / sampleSize);

  let totalTransactions = 0;
  let totalVolume = BigInt(0);
  let largestTx = BigInt(0);
  let startTime = endTime;

  // Sample blocks
  for (let i = 0; i < sampleSize; i++) {
    try {
      const blockNumber = startBlock + i * sampleInterval;
      const block = await client.getBlock({ blockNumber: BigInt(blockNumber) });

      // Record earliest block timestamp
      if (block.timestamp && Number(block.timestamp) < startTime) {
        startTime = Number(block.timestamp);
      }

      // If the block has no transactions, continue
      if (!block.transactions || block.transactions.length === 0) {
        continue;
      }

      totalTransactions += block.transactions.length;

      // Sample transactions from the block (max 10 per block for performance)
      const txsToSample = Math.min(10, block.transactions.length);

      for (let j = 0; j < txsToSample; j++) {
        const txIndex = Math.floor(
          j * (block.transactions.length / txsToSample)
        );
        const txHash = block.transactions[txIndex];

        try {
          const tx = await getTransaction(txHash, network);
          const txValue = tx.value ? BigInt(tx.value) : BigInt(0);

          totalVolume += txValue;

          if (txValue > largestTx) {
            largestTx = txValue;
          }
        } catch (error) {
          console.error(`Error fetching transaction ${txHash}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error fetching block:`, error);
    }
  }

  // Calculate average transaction value
  const avgTxValue =
    totalTransactions > 0 ? totalVolume / BigInt(totalTransactions) : BigInt(0);

  // Scale up totalTransactions based on our sampling
  const estimatedTotalTx = totalTransactions * (blocksToAnalyze / sampleSize);

  // Format values
  const formattedVolume = (
    Number(totalVolume) /
    10 ** tokenInfo.decimals
  ).toString();
  const formattedAvgValue = (
    Number(avgTxValue) /
    10 ** tokenInfo.decimals
  ).toString();
  const formattedLargestTx = (
    Number(largestTx) /
    10 ** tokenInfo.decimals
  ).toString();

  // Calculate time span
  const timeSpanSeconds = endTime - startTime;
  let timeSpan = "";

  if (timeSpanSeconds < 3600) {
    timeSpan = `${Math.floor(timeSpanSeconds / 60)} minutes`;
  } else if (timeSpanSeconds < 86400) {
    timeSpan = `${Math.floor(timeSpanSeconds / 3600)} hours`;
  } else {
    timeSpan = `${Math.floor(timeSpanSeconds / 86400)} days`;
  }

  return {
    network,
    totalTransactions: Math.round(estimatedTotalTx),
    totalVolume: formattedVolume,
    averageTxValue: formattedAvgValue,
    largestTx: formattedLargestTx,
    tokenSymbol: tokenInfo.symbol,
    startBlock,
    endBlock,
    startTime,
    endTime,
    timeSpan,
  };
}
