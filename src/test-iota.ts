import { IOTADefiAgent } from "./iota-defi-agent.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function testIOTAIntegration() {
  try {
    console.log("Initializing IOTA DeFi Agent...");
    const agent = new IOTADefiAgent();

    console.log("Connecting to IOTA network...");
    await agent.connectToIOTANetwork();

    console.log("Testing IOTA balance check...");
    const testAddress =
      "iota1qpszqzadsym6wpppng6wsxeuj7eume7zyts8qeylm9rpg8qgqwruqcu9rhl";
    const balance = await agent.getIOTABalance(testAddress);
    console.log(`Balance for address ${testAddress}: ${balance} IOTA`);

    console.log("Testing DeFi opportunities analysis...");
    const opportunities = await agent.analyzeDefiOpportunities();
    console.log("DeFi Opportunities:", JSON.stringify(opportunities, null, 2));

    console.log("Testing market analysis...");
    const marketAnalysis = await agent.analyzeIOTAMarket();
    console.log("Market Analysis:", JSON.stringify(marketAnalysis, null, 2));
  } catch (error) {
    console.error("Error during IOTA integration test:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
    }
  }
}

testIOTAIntegration().catch(console.error);
