import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";

async function testIOTAServer() {
  try {
    // Initialize server
    const server = new McpServer({
      name: "IOTA-MCP-Test-Server",
      version: "1.0.0",
    });

    console.log("🚀 Starting IOTA MCP Server Test...");

    // Test Network Information
    console.log("\n📡 Checking IOTA Network Information:");
    const networkInfo = await server.callTool("get_iota_network_info", {
      network: "iota",
    });
    console.log(JSON.stringify(networkInfo, null, 2));

    // Test Balance Lookup
    console.log("\n💰 Checking IOTA Token Balance:");
    const balanceResult = await server.callTool("get_iota_balance", {
      address: "0x4CaE2cD5EcD7A4C42A468a9cE2d8cE7aEdf58886", // Example IOTA address
      network: "iota",
    });
    console.log(JSON.stringify(balanceResult, null, 2));

    // Test Liquidity Pools
    console.log("\n🏊 Exploring IOTA Liquidity Pools:");
    const liquidityPools = await server.callTool("get_iota_liquidity_pools", {
      network: "iota",
    });
    console.log(JSON.stringify(liquidityPools, null, 2));

    console.log("\n✅ IOTA MCP Server Test Completed Successfully!");
  } catch (error) {
    console.error("🚨 Server Test Failed:", error);
  }
}

testIOTAServer();
