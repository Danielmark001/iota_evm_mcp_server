// src/core/iota-resources.ts
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getIOTATokenInfo,
  getIOTABalance,
  getIOTAStakingInfo,
  isIOTANetwork,
  IOTA_MAINNET_ID,
  IOTA_TESTNET_ID,
  IOTA_SHIMMER_ID,
} from "./services/iota.js";
import {
  getIOTALiquidityPools,
  getIOTALendingMarkets,
  getIOTAStakingOpportunities,
  getIOTATopTokens,
} from "./services/iota-defi.js";
import {
  analyzeIOTATransaction,
  getIOTAAddressMetrics,
} from "./services/iota-analytics.js";
import { getIOTANetworkMetrics } from "./services/iota-metrics.js";
import * as services from "./services/index.js";
import { type Address } from "viem";

/**
 * Register IOTA-specific resources
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

        // Get network metrics which includes comprehensive information
        const metrics = await getIOTANetworkMetrics(network, 10);

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(metrics, null, 2),
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

  // Default IOTA network info (mainnet)
  server.resource("default_iota_network_info", "iota://info", async (uri) => {
    try {
      const network = "iota";
      const metrics = await getIOTANetworkMetrics(network, 10);

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(metrics, null, 2),
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

  // IOTA address metrics
  server.resource(
    "iota_address_metrics",
    new ResourceTemplate("iota://{network}/address/{address}/metrics", {
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

        const metrics = await getIOTAAddressMetrics(address, network);

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(metrics, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error fetching IOTA address metrics: ${
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

        const analysis = await analyzeIOTATransaction(txHash as any, network);

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  transaction: {
                    hash: txHash,
                    network,
                    ...analysis.analysis,
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

  // IOTA DeFi liquidity pools
  server.resource(
    "iota_liquidity_pools",
    new ResourceTemplate("iota://{network}/defi/liquidity-pools", {
      list: undefined,
    }),
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

        const pools = await getIOTALiquidityPools(network);

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(pools, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error fetching IOTA liquidity pools: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // IOTA DeFi lending markets
  server.resource(
    "iota_lending_markets",
    new ResourceTemplate("iota://{network}/defi/lending-markets", {
      list: undefined,
    }),
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

        const markets = await getIOTALendingMarkets(network);

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(markets, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error fetching IOTA lending markets: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // IOTA DeFi staking opportunities
  server.resource(
    "iota_staking_opportunities",
    new ResourceTemplate("iota://{network}/defi/staking", { list: undefined }),
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

        const opportunities = await getIOTAStakingOpportunities(network);

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(opportunities, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error fetching IOTA staking opportunities: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // IOTA top tokens
  server.resource(
    "iota_top_tokens",
    new ResourceTemplate("iota://{network}/tokens/top", { list: undefined }),
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

        const tokens = await getIOTATopTokens(network);

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(tokens, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error fetching IOTA top tokens: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // IOTA network comparison
  server.resource(
    "iota_network_comparison",
    "iota://networks/comparison",
    async (uri) => {
      try {
        const comparison = await compareIOTAWithOtherNetworks("iota", [
          "ethereum",
          "arbitrum",
          "optimism",
          "polygon",
        ]);

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(comparison, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error comparing IOTA with other networks: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // IOTA network status (health and performance)
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

        const metrics = await getIOTANetworkMetrics(network, 5);

        // Check if the network is healthy based on recent block times
        const isHealthy = metrics.isHealthy;

        // Create a simplified status response
        const status = {
          network,
          status: isHealthy ? "healthy" : "delayed",
          blockHeight: metrics.blockHeight,
          recentTPS: metrics.recentTPS,
          averageBlockTime: metrics.averageBlockTime,
          networkUtilization: metrics.networkUtilization,
          tokenInfo: metrics.tokenInfo,
        };

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(status, null, 2),
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

/**
 * Function to import from server.ts
 * This needs access to compareIOTAWithOtherNetworks which might not be directly imported above
 */
import { compareIOTAWithOtherNetworks } from "./services/iota-metrics.js";
