// Patch for src/server/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerEVMResources } from "../core/resources.js";
import { registerEVMTools } from "../core/tools.js";
import { registerEVMPrompts } from "../core/prompts.js";
import { registerIOTATools } from "../core/iota-tools.js";
import { registerIOTAResources } from "../core/iota-resources.js";
import { registerIOTAPrompts } from "../core/iota-prompts.js";
import { registerArbitrageTools } from "../core/arbitrage-tools.js";
import { getSupportedNetworks } from "../core/chains.js";
import { isIOTANetwork } from "../core/services/iota.js";

// Create and start the MCP server
async function startServer() {
  try {
    // Create a new MCP server instance
    const server = new McpServer({
      name: "IOTA-EVM-Server",
      version: "1.0.0",
    });

    // Register all resources, tools, and prompts
    registerEVMResources(server);
    registerEVMTools(server);
    registerEVMPrompts(server);

    // Register IOTA-specific functionality
    registerIOTAResources(server);
    registerIOTATools(server);
    registerIOTAPrompts(server);
    
    // Register cross-chain arbitrage tools
    registerArbitrageTools(server);

    // Get all supported networks
    const networks = getSupportedNetworks();
    const iotaNetworks = networks.filter((network) => isIOTANetwork(network));

    // Log server information
    console.error(`IOTA-EVM MCP Server initialized`);
    console.error(`IOTA networks supported: ${iotaNetworks.join(", ")}`);
    console.error(`All supported networks: ${networks.join(", ")}`);
    console.error(`Cross-chain arbitrage monitoring enabled`);
    console.error("Server is ready to handle requests");

    return server;
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
}

// Export the server creation function
export default startServer;
