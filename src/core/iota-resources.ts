// src/core/iota-resources.ts
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
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
 * Register IOTA-specific resources with the MCP server
 * @param server The MCP server instance
 */
export function registerIOTAResources(server: McpServer) {
  // IOTA network information
  server.resource(
    "iota_network_info",
    new ResourceTemplate("iota://{network}/info", { list: undefined }),
    async (uri, params) => {
      try {
        const network = (params.network as string) || "iota";

        // Validate this is an IOTA network
        if (!isIOTANetwork(network)) {
          return {
            contents: [
              {
                uri: uri.href,
                text: `Error: ${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`,
              },
            ],
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
          contents: [
            {
              uri: uri.href,
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
          contents: [
            {
              uri: uri.href,
              text: `Error fetching IOTA network info: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // Default IOTA network info
  server.resource("default_iota_network_info", "iota://info", async (uri) => {
    try {
      const network = "iota";
      const chainId = IOTA_MAINNET_ID;
      const blockNumber = await services.getBlockNumber(network);

      // Get native token info
      const tokenInfo = await getIOTATokenInfo(network);

      return {
        contents: [
          {
            uri: uri.href,
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
                rpcUrl: "https://evm.wasp.sc.iota.org",
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        contents: [
          {
            uri: uri.href,
            text: `Error fetching IOTA network info: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  });

  // IOTA latest block
  server.resource(
    "iota_latest_block",
    new ResourceTemplate("iota://{network}/block/latest", { list: undefined }),
    async (uri, params) => {
      try {
        const network = (params.network as string) || "iota";

        // Validate this is an IOTA network
        if (!isIOTANetwork(network)) {
          return {
            contents: [
              {
                uri: uri.href,
                text: `Error: ${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`,
              },
            ],
          };
        }

        const block = await services.getLatestBlock(network);

        return {
          contents: [
            {
              uri: uri.href,
              text: services.helpers.formatJson(block),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error fetching latest IOTA block: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // Default IOTA latest block
  server.resource(
    "default_iota_latest_block",
    "iota://block/latest",
    async (uri) => {
      try {
        const network = "iota";
        const block = await services.getLatestBlock(network);

        return {
          contents: [
            {
              uri: uri.href,
              text: services.helpers.formatJson(block),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error fetching latest IOTA block: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // IOTA token balance
  server.resource(
    "iota_token_balance",
    new ResourceTemplate("iota://{network}/address/{address}/balance", {
      list: undefined,
    }),
    async (uri, params) => {
      try {
        const network = (params.network as string) || "iota";
        const address = params.address as string;

        // Validate this is an IOTA network
        if (!isIOTANetwork(network)) {
          return {
            contents: [
              {
                uri: uri.href,
                text: `Error: ${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`,
              },
            ],
          };
        }

        const balance = await getIOTABalance(address, network);

        return {
          contents: [
            {
              uri: uri.href,
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
          contents: [
            {
              uri: uri.href,
              text: `Error fetching IOTA balance: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // Default IOTA token balance
  server.resource(
    "default_iota_token_balance",
    new ResourceTemplate("iota://address/{address}/balance", {
      list: undefined,
    }),
    async (uri, params) => {
      try {
        const network = "iota";
        const address = params.address as string;

        const balance = await getIOTABalance(address, network);

        return {
          contents: [
            {
              uri: uri.href,
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
          contents: [
            {
              uri: uri.href,
              text: `Error fetching IOTA balance: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // IOTA staking info
  server.resource(
    "iota_staking_info",
    new ResourceTemplate("iota://{network}/address/{address}/staking", {
      list: undefined,
    }),
    async (uri, params) => {
      try {
        const network = (params.network as string) || "iota";
        const address = params.address as string;

        // Validate this is an IOTA network
        if (!isIOTANetwork(network)) {
          return {
            contents: [
              {
                uri: uri.href,
                text: `Error: ${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`,
              },
            ],
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
          contents: [
            {
              uri: uri.href,
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
          contents: [
            {
              uri: uri.href,
              text: `Error fetching IOTA staking info: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // IOTA transaction
  server.resource(
    "iota_transaction",
    new ResourceTemplate("iota://{network}/tx/{txHash}", { list: undefined }),
    async (uri, params) => {
      try {
        const network = (params.network as string) || "iota";
        const txHash = params.txHash as string;

        // Validate this is an IOTA network
        if (!isIOTANetwork(network)) {
          return {
            contents: [
              {
                uri: uri.href,
                text: `Error: ${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`,
              },
            ],
          };
        }

        const tx = await services.getTransaction(txHash as Address, network);

        return {
          contents: [
            {
              uri: uri.href,
              text: services.helpers.formatJson(tx),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error fetching IOTA transaction: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // IOTA network status
  server.resource(
    "iota_network_status",
    new ResourceTemplate("iota://{network}/status", { list: undefined }),
    async (uri, params) => {
      try {
        const network = (params.network as string) || "iota";

        // Validate this is an IOTA network
        if (!isIOTANetwork(network)) {
          return {
            contents: [
              {
                uri: uri.href,
                text: `Error: ${network} is not a valid IOTA network. Valid values are: iota, iota-testnet, shimmer`,
              },
            ],
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
          contents: [
            {
              uri: uri.href,
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
          contents: [
            {
              uri: uri.href,
              text: `Error checking IOTA network status: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
