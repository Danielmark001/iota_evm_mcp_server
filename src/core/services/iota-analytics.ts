// src/core/services/iota-analytics.ts
import {
  type Address,
  type Hash,
  type TransactionReceipt,
  type Block,
  formatUnits,
} from "viem";
import { getPublicClient } from "./clients.js";
import { getTransaction, getTransactionReceipt } from "./transactions.js";
import { getIOTATokenInfo, isIOTANetwork } from "./iota.js";
import { resolveAddress } from "./ens.js";

// Define interfaces for better type safety
export interface IOTATransaction {
  hash: Hash;
  from?: Address;
  to?: Address | null;
  value?: bigint;
  gas?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
  data?: string;
  input?: string;
  blockNumber?: bigint;
  blockHash?: Hash;
  status?: string;
  timestamp?: bigint | number;
  type?: string | number;
  [key: string]: unknown; // Allow for additional properties
}

export interface TransactionAnalysis {
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
}

export interface AddressMetrics {
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
}

export interface NetworkVolumeMetrics {
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
}

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
  transaction: IOTATransaction;
  receipt: TransactionReceipt;
  analysis: TransactionAnalysis;
}> {
  try {
    // Validate IOTA network
    if (!isIOTANetwork(network)) {
      throw new Error(
        `${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`
      );
    }

    // Get transaction and receipt
    const transaction = (await getTransaction(
      txHash,
      network
    )) as unknown as IOTATransaction;
    const receipt = await getTransactionReceipt(txHash, network);

    // Get the latest block to calculate confirmations
    const client = getPublicClient(network);
    const latestBlock = await client.getBlock();
    const confirmations =
      Number(latestBlock.number) - Number(receipt.blockNumber);

    // Get token information
    let tokenInfo;
    try {
      tokenInfo = await getIOTATokenInfo(network);
    } catch (error) {
      console.error(`Error fetching token info: ${error}`);
      tokenInfo = {
        name: network === "shimmer" ? "Shimmer" : "IOTA",
        symbol: network === "shimmer" ? "SMR" : "MIOTA",
        decimals: 6,
      };
    }

    // Determine transaction type
    // Normalize data field across different versions
    let txData = "";
    if (transaction.data) {
      txData = transaction.data as string;
    } else if (transaction.input) {
      txData = transaction.input as string;
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
    if (transaction.timestamp !== undefined) {
      txTimestamp = Number(transaction.timestamp);
    } else {
      // Try to get timestamp from block if available in receipt
      if (receipt.blockNumber) {
        try {
          const txBlock = await client.getBlock({
            blockNumber: receipt.blockNumber,
          });
          txTimestamp = Number(txBlock.timestamp);
        } catch (error) {
          console.error(`Error fetching block timestamp: ${error}`);
        }
      }
    }

    const ageInSeconds = now - txTimestamp;
    let age = "Unknown";

    if (txTimestamp > 0) {
      if (ageInSeconds < 60) {
        age = `${ageInSeconds} seconds ago`;
      } else if (ageInSeconds < 3600) {
        age = `${Math.floor(ageInSeconds / 60)} minutes ago`;
      } else if (ageInSeconds < 86400) {
        age = `${Math.floor(ageInSeconds / 3600)} hours ago`;
      } else {
        age = `${Math.floor(ageInSeconds / 86400)} days ago`;
      }
    }

    // Extract and format value
    const txValue =
      transaction.value !== undefined ? transaction.value : BigInt(0);
    const formattedValue = formatUnits(txValue, tokenInfo.decimals || 6);

    const analysis: TransactionAnalysis = {
      transactionType,
      gasEfficiency,
      valueTransferred: txValue.toString(),
      formattedValue,
      timestamp: txTimestamp,
      age,
      blockConfirmations: confirmations,
      success: receipt.status === "success",
      gasUsedPercentage,
      tokenSymbol:
        tokenInfo.symbol || (network === "shimmer" ? "SMR" : "MIOTA"),
    };

    return {
      transaction,
      receipt,
      analysis,
    };
  } catch (error) {
    console.error(`Error analyzing transaction ${txHash}:`, error);
    throw new Error(
      `Failed to analyze transaction: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get historical transactions for an IOTA address
 * @param addressOrEns Address or ENS name to get transaction history for
 * @param network IOTA network to use (iota, iota-testnet, shimmer)
 * @param limit Maximum number of transactions to return
 * @returns Array of transactions for the address
 */
export async function getIOTATransactionHistory(
  addressOrEns: string,
  network: string = "iota",
  limit: number = 10
): Promise<IOTATransaction[]> {
  try {
    // Validate IOTA network
    if (!isIOTANetwork(network)) {
      throw new Error(
        `${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`
      );
    }

    // Resolve address if it's an ENS name
    const address = await resolveAddress(addressOrEns, network);

    // Since viem doesn't have a direct method to get transaction history,
    // we'll need to scan recent blocks and filter for the address
    const client = getPublicClient(network);
    const latestBlock = await client.getBlock();

    // We'll scan the last 50 blocks (reduced from 100 for performance)
    const blocksToScan = Math.min(50, Number(latestBlock.number));
    const transactions: IOTATransaction[] = [];

    // Process blocks in batches of 5 for better performance
    for (let i = 0; i < blocksToScan && transactions.length < limit; i += 5) {
      const batchPromises = [];

      for (let j = 0; j < 5 && i + j < blocksToScan; j++) {
        const blockNumber = Number(latestBlock.number) - (i + j);
        batchPromises.push(
          client.getBlock({
            blockNumber: BigInt(blockNumber),
            includeTransactions: true, // Get full transactions if supported
          })
        );
      }

      try {
        const blocks = await Promise.all(batchPromises);

        for (const block of blocks) {
          if (transactions.length >= limit) break;

          // Process transactions in this block
          if (!block.transactions || block.transactions.length === 0) {
            continue;
          }

          // Process at most 10 transactions per block
          const txsToProcess = block.transactions.slice(0, 10);

          for (const tx of txsToProcess) {
            if (transactions.length >= limit) break;

            try {
              // Convert to our IOTATransaction type
              let transaction: IOTATransaction;
              let txFrom: string;
              let txTo: string;

              if (typeof tx === "string") {
                // If we only have a hash, fetch the full transaction
                const fetchedTx = await getTransaction(tx as Hash, network);
                transaction = fetchedTx as unknown as IOTATransaction;
              } else {
                // We already have the full transaction object
                transaction = {
                  ...tx,
                  hash: tx.hash as Hash,
                };
              }

              // Add block timestamp if transaction doesn't have it
              if (transaction.timestamp === undefined) {
                transaction.timestamp = block.timestamp;
              }

              // Check if address is sender or recipient
              txFrom = transaction.from
                ? transaction.from.toString().toLowerCase()
                : "";
              txTo = transaction.to
                ? transaction.to.toString().toLowerCase()
                : "";
              const addressLower = address.toLowerCase();

              if (txFrom === addressLower || txTo === addressLower) {
                transactions.push(transaction);
              }
            } catch (error) {
              console.error(`Error processing transaction:`, error);
              // Continue to next transaction
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching blocks:`, error);
        // Continue to next batch
      }
    }

    return transactions;
  } catch (error) {
    console.error(
      `Error getting transaction history for ${addressOrEns}:`,
      error
    );
    return []; // Return empty array instead of throwing
  }
}

/**
 * Calculate IOTA transaction metrics for an address
 * @param addressOrEns Address or ENS name to analyze
 * @param network IOTA network to use (iota, iota-testnet, shimmer)
 * @returns Transaction metrics for the address
 */
export async function getIOTAAddressMetrics(
  addressOrEns: string,
  network: string = "iota"
): Promise<AddressMetrics> {
  try {
    // Validate IOTA network
    if (!isIOTANetwork(network)) {
      throw new Error(
        `${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`
      );
    }

    // Resolve address and get transactions
    const address = await resolveAddress(addressOrEns, network);
    const transactions = await getIOTATransactionHistory(address, network, 100);

    // Get token information
    let tokenInfo;
    try {
      tokenInfo = await getIOTATokenInfo(network);
    } catch (error) {
      console.error(`Error fetching token info: ${error}`);
      tokenInfo = {
        symbol: network === "shimmer" ? "SMR" : "MIOTA",
        decimals: 6,
      };
    }

    let sentTxCount = 0;
    let receivedTxCount = 0;
    let totalSent = BigInt(0);
    let totalReceived = BigInt(0);
    let firstTxTimestamp: number | null = null;
    let lastTxTimestamp: number | null = null;

    const addressLower = address.toLowerCase();

    for (const tx of transactions) {
      // Get timestamp
      let timestamp = 0;
      if (tx.timestamp !== undefined) {
        timestamp = Number(tx.timestamp);
      }

      // Update first and last transaction timestamps
      if (timestamp > 0) {
        if (firstTxTimestamp === null || timestamp < firstTxTimestamp) {
          firstTxTimestamp = timestamp;
        }
        if (lastTxTimestamp === null || timestamp > lastTxTimestamp) {
          lastTxTimestamp = timestamp;
        }
      }

      const txValue = tx.value !== undefined ? tx.value : BigInt(0);
      const txFrom = tx.from ? tx.from.toString().toLowerCase() : "";
      const txTo = tx.to ? tx.to.toString().toLowerCase() : "";

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
    const decimals = tokenInfo.decimals || 6;
    const formattedSent = formatUnits(totalSent, decimals);
    const formattedReceived = formatUnits(totalReceived, decimals);

    return {
      address,
      txCount: transactions.length,
      sentTxCount,
      receivedTxCount,
      totalSent: formattedSent,
      totalReceived: formattedReceived,
      tokenSymbol:
        tokenInfo.symbol || (network === "shimmer" ? "SMR" : "MIOTA"),
      firstTxTimestamp,
      lastTxTimestamp,
      accountAge,
    };
  } catch (error) {
    console.error(
      `Error calculating address metrics for ${addressOrEns}:`,
      error
    );

    // Return default values
    return {
      address: addressOrEns,
      txCount: 0,
      sentTxCount: 0,
      receivedTxCount: 0,
      totalSent: "0",
      totalReceived: "0",
      tokenSymbol: network === "shimmer" ? "SMR" : "MIOTA",
      firstTxTimestamp: null,
      lastTxTimestamp: null,
      accountAge: null,
    };
  }
}

/**
 * Get transaction volume metrics for an IOTA network
 * This is a simplified implementation to avoid excessive RPC calls
 * @param network IOTA network to analyze (iota, iota-testnet, shimmer)
 * @param days Number of days to analyze (approximate, defaults to 1)
 * @returns Transaction volume metrics
 */
export async function getIOTANetworkVolume(
  network: string = "iota",
  days: number = 1
): Promise<NetworkVolumeMetrics> {
  try {
    // Validate IOTA network
    if (!isIOTANetwork(network)) {
      throw new Error(
        `${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`
      );
    }

    const client = getPublicClient(network);

    // Get token information
    let tokenInfo;
    try {
      tokenInfo = await getIOTATokenInfo(network);
    } catch (error) {
      console.error(`Error fetching token info: ${error}`);
      tokenInfo = {
        symbol: network === "shimmer" ? "SMR" : "MIOTA",
        decimals: 6,
      };
    }

    // Get the latest block
    const latestBlock = await client.getBlock();
    const endBlock = Number(latestBlock.number);
    const endTime = Number(latestBlock.timestamp);

    // Estimate blocks per day based on a 2-second block time
    // Adjust this value for different networks
    const avgBlockTime = 2; // seconds per block
    const blocksPerDay = Math.floor(86400 / avgBlockTime);
    const blocksToAnalyze = blocksPerDay * days;

    // Calculate start block (with safety check)
    const startBlock = Math.max(1, endBlock - blocksToAnalyze);

    // Sample blocks evenly from the period to analyze
    // We'll use max 20 blocks to avoid rate limiting
    const sampleSize = Math.min(20, blocksToAnalyze);
    const sampleInterval = Math.floor(blocksToAnalyze / sampleSize);

    let totalTransactions = 0;
    let totalVolume = BigInt(0);
    let largestTx = BigInt(0);
    let startTime = endTime;

    // Process blocks in batches of 5
    for (let i = 0; i < sampleSize; i += 5) {
      const batchPromises = [];

      for (let j = 0; j < 5 && i + j < sampleSize; j++) {
        const blockNumber = startBlock + (i + j) * sampleInterval;
        batchPromises.push(
          client.getBlock({
            blockNumber: BigInt(blockNumber),
            includeTransactions: true,
          })
        );
      }

      try {
        const blocks = await Promise.all(batchPromises);

        for (const block of blocks) {
          // Record earliest block timestamp
          if (Number(block.timestamp) < startTime) {
            startTime = Number(block.timestamp);
          }

          // Process transactions
          if (!block.transactions || block.transactions.length === 0) {
            continue;
          }

          const txCount = block.transactions.length;
          totalTransactions += txCount;

          // Sample up to 5 transactions from this block
          const txsToSample = Math.min(5, txCount);

          for (let k = 0; k < txsToSample; k++) {
            const txIndex = Math.floor(k * (txCount / txsToSample));
            const tx = block.transactions[txIndex];

            try {
              // Get transaction value
              let txValue = BigInt(0);

              if (typeof tx === "string") {
                // If we only have the hash, fetch full transaction
                const fullTx = await getTransaction(tx as Hash, network);
                txValue =
                  fullTx.value !== undefined ? BigInt(fullTx.value) : BigInt(0);
              } else {
                // We already have the full transaction
                txValue = tx.value !== undefined ? BigInt(tx.value) : BigInt(0);
              }

              totalVolume += txValue;

              if (txValue > largestTx) {
                largestTx = txValue;
              }
            } catch (error) {
              console.error(`Error processing transaction:`, error);
              // Continue to next transaction
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching blocks batch:`, error);
        // Continue to next batch
      }
    }

    // Calculate average transaction value
    const avgTxValue =
      totalTransactions > 0
        ? totalVolume / BigInt(totalTransactions)
        : BigInt(0);

    // Scale up totalTransactions based on our sampling
    const estimatedTotalTx = totalTransactions * (blocksToAnalyze / sampleSize);

    // Format values
    const decimals = tokenInfo.decimals || 6;
    const formattedVolume = formatUnits(totalVolume, decimals);
    const formattedAvgValue = formatUnits(avgTxValue, decimals);
    const formattedLargestTx = formatUnits(largestTx, decimals);

    // Calculate time span
    const timeSpanSeconds = endTime - startTime;
    let timeSpan = "Unknown";

    if (timeSpanSeconds > 0) {
      if (timeSpanSeconds < 3600) {
        timeSpan = `${Math.floor(timeSpanSeconds / 60)} minutes`;
      } else if (timeSpanSeconds < 86400) {
        timeSpan = `${Math.floor(timeSpanSeconds / 3600)} hours`;
      } else {
        timeSpan = `${(timeSpanSeconds / 86400).toFixed(1)} days`;
      }
    }

    return {
      network,
      totalTransactions: Math.round(estimatedTotalTx),
      totalVolume: formattedVolume,
      averageTxValue: formattedAvgValue,
      largestTx: formattedLargestTx,
      tokenSymbol:
        tokenInfo.symbol || (network === "shimmer" ? "SMR" : "MIOTA"),
      startBlock,
      endBlock,
      startTime,
      endTime,
      timeSpan,
    };
  } catch (error) {
    console.error(`Error analyzing network volume:`, error);

    // Return default values
    return {
      network,
      totalTransactions: 0,
      totalVolume: "0",
      averageTxValue: "0",
      largestTx: "0",
      tokenSymbol: network === "shimmer" ? "SMR" : "MIOTA",
      startBlock: 0,
      endBlock: 0,
      startTime: 0,
      endTime: 0,
      timeSpan: "unknown",
    };
  }
}
