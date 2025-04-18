// src/core/iota-tools.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as services from "./services/index.js";
import {
  getIOTATokenInfo,
  getIOTABalance,
  getIOTAStakingInfo,
  isIOTANetwork,
  IOTA_MAINNET_ID,
  IOTA_TESTNET_ID,
  IOTA_SHIMMER_ID,
  getIOTAGasPrices,
  estimateIOTATransactionCost,
  deployIOTASmartContract,
  analyzeIOTASmartContract,
} from "./services/iota.js";
import { type Address } from "viem";

/**
 * Register IOTA-specific tools with the MCP server
 * @param server The MCP server instance
 */
export function registerIOTATools(server: McpServer) {
  // Get IOTA network information
  server.tool(
    "get_iota_network_info",
    "Get information about IOTA's EVM networks (IOTA EVM, IOTA Testnet, Shimmer)",
    {
      network: z
        .string()
        .optional()
        .describe(
          "IOTA network to query (iota, iota-testnet, shimmer). Defaults to IOTA EVM mainnet."
        ),
    },
    async ({ network = "iota" }) => {
      try {
        // Validate this is an IOTA network
        if (!isIOTANetwork(network)) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`,
              },
            ],
            isError: true,
          };
        }

        const chainId =
          network === "shimmer"
            ? IOTA_SHIMMER_ID
            : network === "iota-testnet"
            ? IOTA_TESTNET_ID
            : IOTA_MAINNET_ID;

        const blockNumber = await services.getBlockNumber(network);

        // Get native token info
        const tokenInfo = await getIOTATokenInfo(network);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  networkName: network,
                  chainId,
                  blockNumber: blockNumber.toString(),
                  nativeToken: {
                    name: tokenInfo.name,
                    symbol: tokenInfo.symbol,
                    decimals: tokenInfo.decimals,
                    totalSupply: tokenInfo.formattedTotalSupply,
                  },
                  rpcUrl:
                    network === "shimmer"
                      ? "https://json-rpc.evm.shimmer.network"
                      : network === "iota-testnet"
                      ? "https://testnet.evm.wasp.sc.iota.org"
                      : "https://evm.wasp.sc.iota.org",
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching IOTA network info: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Get IOTA token balance
  server.tool(
    "get_iota_balance",
    "Get the IOTA token balance for an address on an IOTA network",
    {
      address: z
        .string()
        .describe(
          "The address to check balance for (can be an ENS name if using IOTA mainnet)"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "IOTA network to query (iota, iota-testnet, shimmer). Defaults to IOTA EVM mainnet."
        ),
    },
    async ({ address, network = "iota" }) => {
      try {
        // Validate this is an IOTA network
        if (!isIOTANetwork(network)) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`,
              },
            ],
            isError: true,
          };
        }

        const balance = await getIOTABalance(address, network);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  address,
                  network,
                  tokenSymbol: balance.token.symbol,
                  raw: balance.raw.toString(),
                  formatted: balance.formatted,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching IOTA balance: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Transfer IOTA tokens
  server.tool(
    "transfer_iota",
    "Transfer IOTA tokens to another address on an IOTA network",
    {
      privateKey: z
        .string()
        .describe(
          "Private key of the sender account (this is used for signing only and is never stored)"
        ),
      to: z
        .string()
        .describe(
          "The recipient address (can be an ENS name if using IOTA mainnet)"
        ),
      amount: z
        .string()
        .describe(
          "Amount of IOTA to send (in MIOTA or SMR, depending on network)"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "IOTA network to use (iota, iota-testnet, shimmer). Defaults to IOTA EVM mainnet."
        ),
    },
    async ({ privateKey, to, amount, network = "iota" }) => {
      try {
        // Validate this is an IOTA network
        if (!isIOTANetwork(network)) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`,
              },
            ],
            isError: true,
          };
        }

        // Use the generic ETH transfer function for IOTA
        const txHash = await services.transferETH(
          privateKey,
          to,
          amount,
          network
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  txHash,
                  to,
                  amount,
                  network,
                  token: network === "shimmer" ? "SMR" : "MIOTA",
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error transferring IOTA tokens: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Get IOTA staking information
  server.tool(
    "get_iota_staking_info",
    "Get staking information for IOTA tokens held by an address",
    {
      address: z
        .string()
        .describe("The address to check staking information for"),
      network: z
        .string()
        .optional()
        .describe(
          "IOTA network to query (iota, iota-testnet, shimmer). Defaults to IOTA EVM mainnet."
        ),
    },
    async ({ address, network = "iota" }) => {
      try {
        // Validate this is an IOTA network
        if (!isIOTANetwork(network)) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`,
              },
            ],
            isError: true,
          };
        }

        // Resolve address if it's an ENS name
        const resolvedAddress = await services.resolveAddress(address, network);

        // Get staking information
        const stakingInfo = await getIOTAStakingInfo(
          resolvedAddress as Address,
          network
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  address,
                  resolvedAddress,
                  network,
                  staking: stakingInfo,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching IOTA staking info: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Verify IOTA network status
  server.tool(
    "verify_iota_network_status",
    "Check the status and health of an IOTA network",
    {
      network: z
        .string()
        .optional()
        .describe(
          "IOTA network to check (iota, iota-testnet, shimmer). Defaults to IOTA EVM mainnet."
        ),
    },
    async ({ network = "iota" }) => {
      try {
        // Validate this is an IOTA network
        if (!isIOTANetwork(network)) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`,
              },
            ],
            isError: true,
          };
        }

        // Check network status by querying latest block
        const latestBlock = await services.getLatestBlock(network);
        const blockNumber = latestBlock.number;
        const timestamp = latestBlock.timestamp;

        // Calculate time since last block
        const now = Math.floor(Date.now() / 1000);
        const blockDelay = now - Number(timestamp);

        // Check network health
        const isHealthy = blockDelay < 60; // Less than 60 seconds since last block

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  network,
                  status: isHealthy ? "healthy" : "delayed",
                  latestBlock: blockNumber ? blockNumber.toString() : "unknown",
                  blockTimestamp: timestamp.toString(),
                  blockDelay: `${blockDelay} seconds ago`,
                  finality: isHealthy ? "high" : "uncertain",
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error checking IOTA network status: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // NEW TOOL: Get IOTA gas prices
  server.tool(
    "get_iota_gas_prices",
    "Get current gas prices and network congestion information for IOTA networks",
    {
      network: z
        .string()
        .optional()
        .describe(
          "IOTA network to check (iota, iota-testnet, shimmer). Defaults to IOTA EVM mainnet."
        ),
    },
    async ({ network = "iota" }) => {
      try {
        // Validate this is an IOTA network
        if (!isIOTANetwork(network)) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`,
              },
            ],
            isError: true,
          };
        }

        // Get gas prices
        const gasPrices = await getIOTAGasPrices(network);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  network,
                  gasPrices: {
                    slow: gasPrices.slow.formatted,
                    standard: gasPrices.standard.formatted,
                    fast: gasPrices.fast.formatted,
                    instant: gasPrices.instant.formatted,
                  },
                  baseFee: gasPrices.baseFee.formatted,
                  networkCongestion: gasPrices.networkCongestion,
                  recommendation: 
                    gasPrices.networkCongestion === "high" 
                      ? "Use fast or instant gas price for timely transactions"
                      : gasPrices.networkCongestion === "medium"
                      ? "Standard gas price should be sufficient"
                      : "Network is not congested, slow gas price may be acceptable",
                  lastUpdated: new Date(gasPrices.lastUpdated * 1000).toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting IOTA gas prices: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // NEW TOOL: Estimate IOTA transaction cost
  server.tool(
    "estimate_iota_transaction_cost",
    "Estimate the cost of a transaction on IOTA networks based on gas limit and current gas prices",
    {
      gasLimit: z
        .string()
        .describe("Estimated gas limit for the transaction"),
      gasPrice: z
        .string()
        .optional()
        .describe("Gas price in gwei (optional, will use current network price if not provided)"),
      speed: z
        .enum(["slow", "standard", "fast", "instant"])
        .optional()
        .describe("Transaction speed preference (only used if gasPrice is not provided)"),
      network: z
        .string()
        .optional()
        .describe(
          "IOTA network to use (iota, iota-testnet, shimmer). Defaults to IOTA EVM mainnet."
        ),
    },
    async ({ gasLimit, gasPrice, speed = "standard", network = "iota" }) => {
      try {
        // Validate this is an IOTA network
        if (!isIOTANetwork(network)) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`,
              },
            ],
            isError: true,
          };
        }

        // Convert gasLimit to bigint
        const gasLimitBigInt = BigInt(gasLimit);
        
        // If no gasPrice provided, get current prices based on speed preference
        let gasPriceBigInt: bigint | undefined;
        
        if (!gasPrice) {
          const gasPrices = await getIOTAGasPrices(network);
          
          // Select gas price based on speed preference
          const selectedGasPrice = 
            speed === "slow" ? gasPrices.slow.gwei :
            speed === "fast" ? gasPrices.fast.gwei :
            speed === "instant" ? gasPrices.instant.gwei :
            gasPrices.standard.gwei;
            
          // Parse selected gas price to bigint
          gasPriceBigInt = BigInt(Math.floor(parseFloat(selectedGasPrice) * 1e9));
        } else {
          // If gasPrice is provided, convert to bigint
          gasPriceBigInt = BigInt(Math.floor(parseFloat(gasPrice) * 1e9));
        }
        
        // Estimate transaction cost
        const costEstimate = await estimateIOTATransactionCost(
          gasLimitBigInt,
          gasPriceBigInt,
          network
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  network,
                  gasLimit: costEstimate.gasLimit,
                  gasPrice: costEstimate.gasPrice.formatted,
                  totalCost: `${costEstimate.totalCost.formatted} ${costEstimate.totalCost.token}`,
                  usdEquivalent: costEstimate.usdEquivalent || "Not available",
                  speed: gasPrice ? "custom" : speed,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error estimating IOTA transaction cost: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // NEW TOOL: Deploy smart contract on IOTA networks
  server.tool(
    "deploy_iota_smart_contract",
    "Deploy a smart contract on an IOTA network",
    {
      privateKey: z
        .string()
        .describe(
          "Private key of the deployer account (used for signing only and is never stored)"
        ),
      bytecode: z
        .string()
        .describe("Compiled bytecode of the smart contract"),
      abi: z
        .array(z.any())
        .describe("ABI of the smart contract as a JSON array"),
      constructorArgs: z
        .array(z.any())
        .optional()
        .describe("Constructor arguments for the smart contract deployment"),
      gasLimit: z
        .string()
        .optional()
        .describe("Gas limit for the deployment transaction"),
      maxFeePerGas: z
        .string()
        .optional()
        .describe("Maximum fee per gas for the transaction in gwei"),
      maxPriorityFeePerGas: z
        .string()
        .optional()
        .describe("Maximum priority fee per gas for the transaction in gwei"),
      network: z
        .string()
        .optional()
        .describe(
          "IOTA network to deploy on (iota, iota-testnet, shimmer). Defaults to IOTA EVM mainnet."
        ),
    },
    async ({ 
      privateKey, 
      bytecode, 
      abi, 
      constructorArgs = [], 
      gasLimit, 
      maxFeePerGas, 
      maxPriorityFeePerGas, 
      network = "iota" 
    }) => {
      try {
        // Validate this is an IOTA network
        if (!isIOTANetwork(network)) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`,
              },
            ],
            isError: true,
          };
        }

        // Convert string values to bigint if provided
        const gasLimitBigInt = gasLimit ? BigInt(gasLimit) : undefined;
        const maxFeePerGasBigInt = maxFeePerGas ? BigInt(Math.floor(parseFloat(maxFeePerGas) * 1e9)) : undefined;
        const maxPriorityFeePerGasBigInt = maxPriorityFeePerGas ? BigInt(Math.floor(parseFloat(maxPriorityFeePerGas) * 1e9)) : undefined;

        // Deploy the contract
        const deploymentResult = await deployIOTASmartContract(
          privateKey,
          bytecode,
          abi,
          constructorArgs,
          gasLimitBigInt,
          maxFeePerGasBigInt,
          maxPriorityFeePerGasBigInt,
          network
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  network,
                  contractAddress: deploymentResult.contractAddress,
                  transaction: {
                    hash: deploymentResult.txHash,
                    blockNumber: deploymentResult.blockNumber,
                  },
                  deployer: deploymentResult.deployer,
                  gas: {
                    used: deploymentResult.gasUsed,
                    effectiveGasPrice: deploymentResult.effectiveGasPrice,
                  },
                  nextSteps: [
                    "Verify your contract on the IOTA network explorer",
                    "Interact with your contract using the read_contract and write_contract tools",
                    "Analyze your contract with the analyze_iota_smart_contract tool"
                  ],
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error deploying smart contract on IOTA: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // NEW TOOL: Analyze smart contract on IOTA networks
  server.tool(
    "analyze_iota_smart_contract",
    "Analyze a deployed smart contract on an IOTA network",
    {
      contractAddress: z
        .string()
        .describe("Address of the deployed smart contract"),
      abi: z
        .array(z.any())
        .describe("ABI of the smart contract as a JSON array"),
      network: z
        .string()
        .optional()
        .describe(
          "IOTA network where the contract is deployed (iota, iota-testnet, shimmer). Defaults to IOTA EVM mainnet."
        ),
    },
    async ({ contractAddress, abi, network = "iota" }) => {
      try {
        // Validate this is an IOTA network
        if (!isIOTANetwork(network)) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`,
              },
            ],
            isError: true,
          };
        }

        // Resolve address if it's an ENS name
        const resolvedAddress = await services.resolveAddress(contractAddress, network);

        // Analyze the contract
        const analysis = await analyzeIOTASmartContract(
          resolvedAddress as string,
          abi,
          network
        );

        // Format the response
        if (!analysis.isContract) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    address: resolvedAddress,
                    isContract: false,
                    message: "The provided address is not a contract on this network",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  address: resolvedAddress,
                  network,
                  isContract: true,
                  interfaces: analysis.implementedInterfaces,
                  functionCount: analysis.functions.length,
                  eventCount: analysis.events.length,
                  writeFunctions: analysis.functions
                    .filter((f) => f.stateMutability !== "view" && f.stateMutability !== "pure")
                    .map((f) => f.name),
                  readFunctions: analysis.functions
                    .filter((f) => f.stateMutability === "view" || f.stateMutability === "pure")
                    .map((f) => f.name),
                  events: analysis.events.map((e) => e.name),
                  securityAnalysis: {
                    ...analysis.securityAnalysis,
                    securityNotes: [
                      analysis.securityAnalysis.hasExternalCalls ? 
                        "⚠️ Contract makes external calls which may lead to reentrancy attacks" : null,
                      analysis.securityAnalysis.hasSelfDestruct ?
                        "⚠️ Contract contains selfdestruct which can permanently remove contract from the blockchain" : null,
                      analysis.securityAnalysis.usesTransfer ?
                        "⚠️ Contract uses transfer/send which may fail with some tokens or contracts" : null,
                      analysis.securityAnalysis.hasDelegatecall ?
                        "⚠️ Contract uses delegatecall which can be dangerous if not properly secured" : null,
                    ].filter(Boolean),
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error analyzing smart contract on IOTA: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
