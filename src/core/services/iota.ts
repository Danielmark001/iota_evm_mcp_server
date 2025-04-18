// src/core/services/iota.ts
import {
  type Address,
  type Hash,
  type Hex,
  formatUnits,
  formatGwei,
  parseGwei,
  getContract,
  createWalletClient,
  http,
} from "viem";
import { parseAbi } from "viem";
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

/**
 * Estimate gas price for transactions on IOTA networks
 * @param network IOTA network to query
 * @returns Gas price information including standard, fast, and instant options
 */
export async function getIOTAGasPrices(
  network = "iota"
): Promise<{
  slow: { gwei: string; formatted: string };
  standard: { gwei: string; formatted: string };
  fast: { gwei: string; formatted: string };
  instant: { gwei: string; formatted: string };
  baseFee: { gwei: string; formatted: string };
  networkCongestion: "low" | "medium" | "high";
  lastUpdated: number;
}> {
  try {
    const publicClient = getPublicClient(network);
    
    // Get current gas price from the network
    const currentGasPrice = await publicClient.getGasPrice();
    
    // Get the latest block to analyze network congestion
    const latestBlock = await publicClient.getBlock();
    
    // Determine network congestion based on gas used ratio
    // (this is a simplified approach - in production you might want more data points)
    const gasUsedRatio = Number(latestBlock.gasUsed) / Number(latestBlock.gasLimit);
    
    let networkCongestion: "low" | "medium" | "high" = "low";
    if (gasUsedRatio > 0.7) {
      networkCongestion = "high";
    } else if (gasUsedRatio > 0.4) {
      networkCongestion = "medium";
    }
    
    // Calculate different gas price tiers
    // These multipliers would ideally be adjusted based on historical data
    const slowMultiplier = 0.8;
    const standardMultiplier = 1.0;
    const fastMultiplier = 1.2;
    const instantMultiplier = 1.5;
    
    // Calculate gas prices for different tiers
    const slowGasPrice = BigInt(Math.floor(Number(currentGasPrice) * slowMultiplier));
    const standardGasPrice = currentGasPrice;
    const fastGasPrice = BigInt(Math.floor(Number(currentGasPrice) * fastMultiplier));
    const instantGasPrice = BigInt(Math.floor(Number(currentGasPrice) * instantMultiplier));
    
    // Get baseFee from the latest block (EIP-1559)
    // Note: Some networks might not support EIP-1559
    const baseFee = latestBlock.baseFeePerGas || BigInt(0);
    
    return {
      slow: {
        gwei: formatGwei(slowGasPrice),
        formatted: `${formatGwei(slowGasPrice)} gwei`,
      },
      standard: {
        gwei: formatGwei(standardGasPrice),
        formatted: `${formatGwei(standardGasPrice)} gwei`,
      },
      fast: {
        gwei: formatGwei(fastGasPrice),
        formatted: `${formatGwei(fastGasPrice)} gwei`,
      },
      instant: {
        gwei: formatGwei(instantGasPrice),
        formatted: `${formatGwei(instantGasPrice)} gwei`,
      },
      baseFee: {
        gwei: formatGwei(baseFee),
        formatted: `${formatGwei(baseFee)} gwei`,
      },
      networkCongestion,
      lastUpdated: Math.floor(Date.now() / 1000),
    };
  } catch (error) {
    console.error("Error estimating IOTA gas prices:", error);
    throw error;
  }
}

/**
 * Calculate the estimated cost of a transaction on IOTA networks
 * @param gasLimit Estimated gas limit for the transaction
 * @param gasPrice Gas price in gwei (optional, will fetch current price if not provided)
 * @param network IOTA network to query
 * @returns Cost estimation in native token units with USD equivalent (if available)
 */
export async function estimateIOTATransactionCost(
  gasLimit: bigint,
  gasPrice?: bigint,
  network = "iota"
): Promise<{
  gasLimit: string;
  gasPrice: { gwei: string; formatted: string };
  totalCost: { raw: string; formatted: string; token: string };
  usdEquivalent: string | null;
}> {
  try {
    const publicClient = getPublicClient(network);
    
    // If gas price not provided, get current gas price
    const actualGasPrice = gasPrice || await publicClient.getGasPrice();
    
    // Calculate total cost in wei (gas price * gas limit)
    const totalWei = actualGasPrice * gasLimit;
    
    // Get token info for formatting
    let symbol = "MIOTA";
    let decimals = 6;
    
    if (
      network.toLowerCase() === "shimmer" ||
      String(network) === String(IOTA_SHIMMER_ID)
    ) {
      symbol = "SMR";
    }
    
    // Format total cost
    const totalFormatted = formatUnits(totalWei, decimals);
    
    // USD equivalent calculation would require price feeds 
    // This is just a placeholder implementation
    // In a real implementation, you would integrate with price oracles
    const usdEquivalent = null;
    
    return {
      gasLimit: gasLimit.toString(),
      gasPrice: {
        gwei: formatGwei(actualGasPrice),
        formatted: `${formatGwei(actualGasPrice)} gwei`,
      },
      totalCost: {
        raw: totalWei.toString(),
        formatted: totalFormatted,
        token: symbol,
      },
      usdEquivalent,
    };
  } catch (error) {
    console.error("Error estimating IOTA transaction cost:", error);
    throw error;
  }
}

/**
 * Deploy a smart contract on an IOTA network
 * @param privateKey Private key of the deployer account (used for signing)
 * @param bytecode Compiled bytecode of the smart contract
 * @param abi ABI of the smart contract
 * @param constructorArgs Constructor arguments for the smart contract deployment (optional)
 * @param gasLimit Gas limit for the deployment transaction (optional)
 * @param maxFeePerGas Maximum fee per gas for the transaction (optional)
 * @param maxPriorityFeePerGas Maximum priority fee per gas for the transaction (optional)
 * @param network IOTA network to deploy on
 * @returns Deployment information including transaction hash and contract address
 */
export async function deployIOTASmartContract(
  privateKey: string,
  bytecode: string,
  abi: any[], // Replace with proper ABI type from viem if available
  constructorArgs: any[] = [],
  gasLimit?: bigint,
  maxFeePerGas?: bigint,
  maxPriorityFeePerGas?: bigint,
  network = "iota"
): Promise<{
  txHash: string;
  contractAddress: string;
  blockNumber: string;
  deployer: string;
  gasUsed: string;
  gasPrice: string;
  effectiveGasPrice: string;
}> {
  try {
    // Validate this is an IOTA network
    if (!isIOTANetwork(network)) {
      throw new Error(`${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`);
    }

    // Create wallet client for signing transactions
    const client = getPublicClient(network);
    const walletClient = createWalletClient({
      account: `0x${privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey}`,
      chain: client.chain,
      transport: http(),
    });

    // Get the deployer address
    const deployerAddress = walletClient.account?.address;
    if (!deployerAddress) {
      throw new Error("Failed to derive deployer address from private key");
    }

    // Prepare constructor parameters if any
    let deployData = bytecode;
    if (constructorArgs.length > 0) {
      const abiInterface = { fragments: abi };
      const constructorFragment = abiInterface.fragments.find(
        (fragment: any) => fragment.type === "constructor"
      );

      if (constructorFragment) {
        // Handle constructor args manually since we can't use encodeFunctionData for constructors
        // Instead of using createInterface, we'll use a simpler approach
        deployData = bytecode; // Use bytecode as is, args handled by viem's deployContract
      }
    }

    // Estimate gas if not provided
    const estimatedGasLimit = gasLimit || await client.estimateGas({
      account: deployerAddress,
      data: deployData as `0x${string}`,
    });

    // Get current gas prices if not provided
    const gasPrices = await getIOTAGasPrices(network);
    const actualMaxFeePerGas = maxFeePerGas || BigInt(Math.floor(parseFloat(gasPrices.fast.gwei) * 1e9));
    const actualMaxPriorityFeePerGas = maxPriorityFeePerGas || 
      BigInt(Math.floor(parseFloat(gasPrices.fast.gwei) * 0.1 * 1e9)); // 10% of max fee as priority fee

    // Deploy the contract
    const hash = await walletClient.deployContract({
      abi,
      bytecode: deployData as `0x${string}`,
      args: constructorArgs,
      account: walletClient.account,
      gas: estimatedGasLimit,
      maxFeePerGas: actualMaxFeePerGas,
      maxPriorityFeePerGas: actualMaxPriorityFeePerGas,
    });

    // Wait for transaction receipt
    const receipt = await client.waitForTransactionReceipt({ hash });

    // Get contract address from receipt
    const contractAddress = receipt.contractAddress;
    if (!contractAddress) {
      throw new Error("Contract deployment failed - no contract address returned");
    }

    return {
      txHash: receipt.transactionHash,
      contractAddress,
      blockNumber: receipt.blockNumber.toString(),
      deployer: deployerAddress,
      gasUsed: receipt.gasUsed.toString(),
      gasPrice: receipt.effectiveGasPrice.toString(),
      effectiveGasPrice: formatGwei(receipt.effectiveGasPrice),
    };
  } catch (error) {
    console.error("Error deploying smart contract on IOTA:", error);
    throw error;
  }
}

/**
 * Verify and analyze a smart contract on IOTA networks
 * @param contractAddress Address of the deployed contract
 * @param abi ABI of the smart contract
 * @param network IOTA network where the contract is deployed
 * @returns Analysis of the contract including interfaces implemented, functions, and basic security analysis
 */
export async function analyzeIOTASmartContract(
  contractAddress: string,
  abi: any[], // Replace with proper ABI type from viem if available
  network = "iota"
): Promise<{
  address: string;
  isContract: boolean;
  implementedInterfaces: string[];
  functions: {
    name: string;
    type: string;
    stateMutability: string;
    inputs: any[];
    outputs: any[];
  }[];
  events: {
    name: string;
    inputs: any[];
  }[];
  securityAnalysis: {
    hasExternalCalls: boolean;
    hasSelfDestruct: boolean;
    usesTransfer: boolean;
    hasDelegatecall: boolean;
  };
}> {
  try {
    const client = getPublicClient(network);

    // Check if address is a contract
    const code = await client.getBytecode({ address: contractAddress as `0x${string}` });
    const isContract = code !== undefined && code !== "0x";

    if (!isContract) {
      return {
        address: contractAddress,
        isContract: false,
        implementedInterfaces: [],
        functions: [],
        events: [],
        securityAnalysis: {
          hasExternalCalls: false,
          hasSelfDestruct: false,
          usesTransfer: false,
          hasDelegatecall: false,
        },
      };
    }

    // Analyze the ABI
    const functions = abi
      .filter((item) => item.type === "function")
      .map((func) => ({
        name: func.name,
        type: func.type,
        stateMutability: func.stateMutability,
        inputs: func.inputs,
        outputs: func.outputs,
      }));

    const events = abi
      .filter((item) => item.type === "event")
      .map((event) => ({
        name: event.name,
        inputs: event.inputs,
      }));

    // Check for common interfaces
    const interfaces = {
      "ERC20": ["balanceOf", "transfer", "transferFrom", "approve", "allowance"],
      "ERC721": ["balanceOf", "ownerOf", "transferFrom", "safeTransferFrom", "approve"],
      "ERC1155": ["balanceOf", "balanceOfBatch", "safeTransferFrom", "safeBatchTransferFrom"],
      "Ownable": ["owner", "transferOwnership"],
      "Pausable": ["paused", "pause", "unpause"],
    };

    const functionNames = functions.map((f) => f.name);
    const implementedInterfaces = Object.entries(interfaces)
      .filter(([_, requiredFunctions]) => 
        requiredFunctions.every((func) => functionNames.includes(func)))
      .map(([name, _]) => name);

    // Basic security analysis
    const functionBodies = JSON.stringify(abi);
    const securityAnalysis = {
      hasExternalCalls: functionBodies.includes("call") || functionBodies.includes("callcode"),
      hasSelfDestruct: functionBodies.includes("selfdestruct") || functionBodies.includes("suicide"),
      usesTransfer: functionBodies.includes("transfer(") || functionBodies.includes("send("),
      hasDelegatecall: functionBodies.includes("delegatecall"),
    };

    return {
      address: contractAddress,
      isContract: true,
      implementedInterfaces,
      functions,
      events,
      securityAnalysis,
    };
  } catch (error) {
    console.error("Error analyzing smart contract on IOTA:", error);
    throw error;
  }
}
