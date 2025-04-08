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
}
