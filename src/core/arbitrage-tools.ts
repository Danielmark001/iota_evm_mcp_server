// src/core/arbitrage-tools.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as services from "./services/index.js";
import { isIOTANetwork } from "./services/iota.js";

/**
 * Register cross-chain arbitrage tools with the MCP server
 * @param server The MCP server instance
 */
export function registerArbitrageTools(server: McpServer) {
  // Get token price across networks
  server.tool(
    "get_cross_chain_token_price",
    "Get the price of a token across multiple networks including IOTA networks",
    {
      token: z
        .string()
        .describe("Token symbol to check price for (e.g., USDC, WBTC)"),
      network: z
        .string()
        .describe("Network to check the price on (e.g., iota, ethereum, shimmer)"),
    },
    async ({ token, network }) => {
      try {
        const tokenPrice = await services.getTokenPrice(token, network);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  token: tokenPrice.tokenSymbol,
                  network: tokenPrice.network,
                  price: `${tokenPrice.price} ${tokenPrice.baseToken}`,
                  exchange: tokenPrice.dexName,
                  liquidity: `${tokenPrice.liquidity} ${tokenPrice.tokenSymbol}`,
                  updated: new Date(tokenPrice.timestamp * 1000).toISOString(),
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
              text: `Error getting token price: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Find arbitrage opportunities
  server.tool(
    "find_arbitrage_opportunities",
    "Find arbitrage opportunities for a token across multiple networks including IOTA",
    {
      token: z
        .string()
        .describe("Token symbol to check arbitrage for (e.g., USDC, WBTC)"),
      networks: z
        .array(z.string())
        .optional()
        .describe("Networks to include in the arbitrage search (default: iota, ethereum, shimmer)"),
      minProfitPercent: z
        .number()
        .optional()
        .describe("Minimum profit percentage to consider an opportunity valid (default: 1.0)"),
    },
    async ({ token, networks, minProfitPercent = 1.0 }) => {
      try {
        const opportunities = await services.findArbitrageOpportunities(
          token,
          networks,
          minProfitPercent
        );

        // Format response based on opportunities found
        if (opportunities.opportunities.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    token: opportunities.token,
                    message: `No arbitrage opportunities found for ${token} with at least ${minProfitPercent}% profit.`,
                    timestamp: new Date(opportunities.timestamp * 1000).toISOString(),
                    networksChecked: networks || ["iota", "ethereum", "shimmer"],
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
                  token: opportunities.token,
                  opportunitiesFound: opportunities.opportunities.length,
                  topOpportunities: opportunities.opportunities.slice(0, 3).map(opp => ({
                    route: `${opp.buyNetwork} → ${opp.sellNetwork}`,
                    profit: `${opp.profitPercent}%`,
                    buyAt: `${opp.buyPrice} ${opp.baseToken} on ${opp.buyDex}`,
                    sellAt: `${opp.sellPrice} ${opp.baseToken} on ${opp.sellDex}`,
                    bridgingRequired: opp.bridgingRequired,
                    details: opp.details,
                  })),
                  timestamp: new Date(opportunities.timestamp * 1000).toISOString(),
                  notes: opportunities.opportunities.some(opp => opp.bridgingRequired) 
                    ? "Some opportunities require bridging tokens between networks, which may incur additional fees and time delays." 
                    : "All opportunities are within IOTA ecosystem networks, minimizing bridging costs.",
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
              text: `Error finding arbitrage opportunities: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // List supported tokens for arbitrage
  server.tool(
    "list_arbitrage_tokens",
    "List all tokens supported for cross-chain arbitrage monitoring",
    {},
    async () => {
      try {
        const { supportedTokens, tokenNetworks } = services.getSupportedArbitrageTokens();

        // Format the supported tokens with their networks
        const formattedTokens = supportedTokens.map(token => ({
          symbol: token,
          networks: tokenNetworks[token],
          iotaNetworks: tokenNetworks[token].filter(network => isIOTANetwork(network)),
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  supportedTokens: formattedTokens,
                  totalTokensSupported: supportedTokens.length,
                  networksMonitored: [...new Set(supportedTokens.flatMap(token => tokenNetworks[token]))],
                  updatedAt: new Date().toISOString(),
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
              text: `Error listing arbitrage tokens: ${
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
