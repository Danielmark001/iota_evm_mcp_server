// demo/server.js
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Configure middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'demo/public')));

// MCP Server configuration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001';
const PORT = process.env.PORT || 3005;

// Store for active connections
const clients = new Map();

// Store ongoing demo state
let demoState = {
  activeScenario: null,
  toolsCalled: [],
  completedTools: [],
};

// WebSocket connection handler for real-time updates
wss.on('connection', (ws) => {
  const id = Date.now();
  clients.set(id, ws);
  
  console.log(`New client connected: ${id}`);
  
  // Send current demo state to new client
  ws.send(JSON.stringify({
    type: 'INIT_STATE',
    state: demoState
  }));
  
  ws.on('close', () => {
    clients.delete(id);
    console.log(`Client disconnected: ${id}`);
  });
});

// Broadcast function to send real-time updates to all connected clients
function broadcast(message) {
  clients.forEach(client => {
    if (client.readyState === 1) { // 1 = WebSocket.OPEN
      client.send(JSON.stringify(message));
    }
  });
}

// API endpoint to handle Claude's requests to MCP tools
app.post('/api/mcp-tools/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    const params = req.body;
    
    console.log(`[MCP Tool Request] ${toolName}`, params);
    
    // Broadcast tool call to connected clients
    broadcast({
      type: 'TOOL_CALL',
      toolName,
      params
    });
    
    // Update demo state
    demoState.toolsCalled.push(toolName);
    
    // Call the actual MCP server
    const response = await fetch(`${MCP_SERVER_URL}/tools/${toolName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MCP server error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    
    // Update demo state
    demoState.completedTools.push(toolName);
    
    // Broadcast response
    broadcast({
      type: 'TOOL_RESPONSE',
      toolName,
      data
    });
    
    console.log(`[MCP Tool Response] ${toolName} successful`);
    
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[MCP Tool Error]', error);
    
    broadcast({
      type: 'TOOL_ERROR',
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint to simulate Claude's response
app.post('/api/claude/chat', async (req, res) => {
  try {
    const { prompt, scenario } = req.body;
    
    console.log(`[Claude Request] New prompt for scenario: ${scenario}`);
    
    // Reset demo state
    demoState = {
      activeScenario: scenario,
      toolsCalled: [],
      completedTools: [],
    };
    
    broadcast({
      type: 'CLAUDE_THINKING',
      scenario
    });
    
    // Simulate Claude thinking time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Process different scenarios
    let tools = [];
    let finalResponse = '';
    
    switch(scenario) {
      case 'network':
        tools = ['verify_iota_network_status', 'get_iota_gas_prices'];
        break;
      case 'arbitrage':
        tools = ['list_arbitrage_tokens', 'get_cross_chain_token_price', 'find_arbitrage_opportunities'];
        break;
      case 'smartContract':
        tools = ['get_iota_gas_prices', 'estimate_iota_transaction_cost'];
        break;
      default:
        tools = [];
    }
    
    // Simulate Claude analyzing and calling tools
    for (const tool of tools) {
      broadcast({
        type: 'CLAUDE_TOOL_SELECTION',
        tool
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, we'll have predetermined responses
      // In a real setup, Claude would make actual calls through the proxy
      const demoParams = getDemoParamsForTool(tool, scenario);
      
      demoState.toolsCalled.push(tool);
      broadcast({
        type: 'CLAUDE_TOOL_CALL',
        tool,
        params: demoParams
      });
      
      // Get demo data from local MCP server if running
      try {
        const response = await fetch(`${MCP_SERVER_URL}/tools/${tool}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(demoParams),
        });
        
        if (response.ok) {
          const data = await response.json();
          
          demoState.completedTools.push(tool);
          broadcast({
            type: 'CLAUDE_TOOL_RESPONSE',
            tool,
            data
          });
        } else {
          // Use mock data if the API returns an error
          const mockData = getMockDataForTool(tool, scenario);
          broadcast({
            type: 'CLAUDE_TOOL_RESPONSE',
            tool,
            data: mockData
          });
          demoState.completedTools.push(tool);
        }
      } catch (err) {
        // Fallback to mock data if MCP server is not available
        console.log('Using mock data for demo');
        const mockData = getMockDataForTool(tool, scenario);
        broadcast({
          type: 'CLAUDE_TOOL_RESPONSE',
          tool,
          data: mockData
        });
        demoState.completedTools.push(tool);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // Generate Claude's final response
    await new Promise(resolve => setTimeout(resolve, 2000));
    finalResponse = generateClaudeResponse(scenario);
    
    broadcast({
      type: 'CLAUDE_RESPONSE',
      response: finalResponse
    });
    
    res.json({
      success: true,
      response: finalResponse
    });
  } catch (error) {
    console.error('[Claude Error]', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper functions for demo scenarios
function getDemoParamsForTool(tool, scenario) {
  switch(tool) {
    case 'verify_iota_network_status':
      return { network: 'iota' };
    case 'get_iota_gas_prices':
      return { network: 'iota' };
    case 'list_arbitrage_tokens':
      return {};
    case 'get_cross_chain_token_price':
      if (scenario === 'arbitrage') {
        return { token: 'USDC', network: 'iota' };
      }
      return { token: 'USDC', network: 'ethereum' };
    case 'find_arbitrage_opportunities':
      return { token: 'USDC', minProfitPercent: 0.5 };
    case 'estimate_iota_transaction_cost':
      return { gasLimit: '21000', speed: 'fast', network: 'iota' };
    default:
      return {};
  }
}

function getMockDataForTool(tool, scenario) {
  switch(tool) {
    case 'verify_iota_network_status':
      return {
        network: "iota",
        status: "healthy",
        latestBlock: "7352416",
        blockTimestamp: "1713526398",
        blockDelay: "12 seconds ago",
        finality: "high"
      };
    case 'get_iota_gas_prices':
      return {
        network: "iota",
        gasPrices: {
          slow: "18.2 gwei",
          standard: "22.5 gwei",
          fast: "27.0 gwei",
          instant: "33.8 gwei"
        },
        baseFee: "22.1 gwei",
        networkCongestion: "low",
        recommendation: "Network is not congested, slow gas price may be acceptable"
      };
    case 'list_arbitrage_tokens':
      return {
        supportedTokens: [
          {symbol: "USDC", networks: ["iota", "ethereum", "shimmer"], iotaNetworks: ["iota", "shimmer"]},
          {symbol: "WBTC", networks: ["iota", "ethereum"], iotaNetworks: ["iota"]}
        ],
        totalTokensSupported: 2,
        networksMonitored: ["iota", "ethereum", "shimmer"]
      };
    case 'get_cross_chain_token_price':
      if (scenario === 'arbitrage' && tool === 'get_cross_chain_token_price') {
        return {
          token: "USDC",
          network: "iota",
          price: "0.998 USD",
          exchange: "TangleSwap",
          liquidity: "245,782 USDC"
        };
      }
      return {
        token: "USDC",
        network: "ethereum",
        price: "1.002 USD",
        exchange: "Uniswap",
        liquidity: "12,568,921 USDC"
      };
    case 'find_arbitrage_opportunities':
      return {
        token: "USDC",
        opportunitiesFound: 1,
        topOpportunities: [
          {
            route: "iota → ethereum",
            profit: "0.65%",
            buyAt: "0.998 USD on TangleSwap",
            sellAt: "1.002 USD on Uniswap",
            bridgingRequired: true,
            details: "Buy USDC on TangleSwap (iota) at 0.998 USD and sell on Uniswap (ethereum) at 1.002 USD for a 0.65% profit."
          }
        ]
      };
    case 'estimate_iota_transaction_cost':
      return {
        gasLimit: "21000",
        gasPrice: {
          gwei: "27.0",
          formatted: "27.0 gwei"
        },
        totalCost: {
          raw: "567000000000000",
          formatted: "0.000567",
          token: "MIOTA"
        },
        usdEquivalent: null
      };
    default:
      return {};
  }
}

function generateClaudeResponse(scenario) {
  switch(scenario) {
    case 'network':
      return `# IOTA Network Analysis

Based on my analysis of the current IOTA network conditions:

## Network Status
The IOTA network is currently **healthy** with good finality and minimal block delays. The latest block was processed approximately 12 seconds ago, which indicates normal network operation.

## Gas Price Analysis
Current gas prices on the IOTA network:
- **Slow**: 18.2 gwei
- **Standard**: 22.5 gwei
- **Fast**: 27.0 gwei
- **Instant**: 33.8 gwei

## Congestion Assessment
The network is currently experiencing **low congestion**. This is an ideal time to make transactions on the IOTA network.

## Recommendation
Given the current conditions, I recommend:
- For non-urgent transactions: Use the **slow** gas price setting (18.2 gwei) to optimize for cost
- For standard transactions: The **standard** setting (22.5 gwei) provides a good balance
- Only use **fast** or **instant** settings if your transaction is time-sensitive

This is an excellent time to execute transactions on the IOTA network, as you'll benefit from low fees and quick confirmation times.`;

    case 'arbitrage':
      return `# Cross-Chain Arbitrage Analysis

I've analyzed potential arbitrage opportunities between IOTA and other networks:

## Available Tokens
The following tokens are currently supported for cross-chain arbitrage:
- **USDC**: Available on IOTA, Ethereum, and Shimmer networks
- **WBTC**: Available on IOTA and Ethereum networks

## Current USDC Prices
- **IOTA Network**: 0.998 USD (TangleSwap) with 245,782 USDC liquidity
- **Ethereum Network**: 1.002 USD (Uniswap) with 12,568,921 USDC liquidity

## Arbitrage Opportunity
I've identified a potential arbitrage opportunity:
- **Route**: IOTA → Ethereum
- **Strategy**: Buy USDC on TangleSwap (IOTA) and sell on Uniswap (Ethereum)
- **Theoretical Profit**: 0.65%
- **Requires Bridging**: Yes (IOTA to Ethereum)

## Profitability Analysis
While there is a price difference, this opportunity may not be profitable after accounting for:

1. **Gas Costs**: 
   - IOTA transaction: ~0.05 USD equivalent
   - Ethereum transaction: ~2-5 USD (depending on gas prices)

2. **Bridge Fees**: Cross-chain bridges typically charge 0.1-0.3% fees

3. **Time Delay**: Bridging can take 10-30 minutes, during which prices may change

## Recommendation
This specific opportunity doesn't appear profitable after all costs. I recommend:
- Setting alerts for opportunities with at least 1.5% theoretical profit
- Focusing on arbitrage within the IOTA ecosystem (IOTA ↔ Shimmer) to avoid bridging fees
- Monitoring during high market volatility when larger price discrepancies may appear`;

    case 'smartContract':
      return `# Smart Contract Deployment Strategy

I've analyzed the current conditions for deploying a smart contract on IOTA:

## Network Conditions
- **Status**: Healthy with low congestion
- **Gas Prices**:
  - Slow: 18.2 gwei
  - Standard: 22.5 gwei
  - Fast: 27.0 gwei
  - Instant: 33.8 gwei

## Deployment Cost Estimate
For a typical ERC20 token contract deployment:
- **Estimated Gas Required**: 2,100,000 gas units
- **Recommended Speed**: Standard (22.5 gwei)
- **Total Cost Estimate**: ~0.04725 MIOTA

## Deployment Process

\`\`\`javascript
// Example deployment using deploy_iota_smart_contract
const deploymentResult = await mcpClient.callTool("deploy_iota_smart_contract", {
  privateKey: "0xYourPrivateKey", // IMPORTANT: Never share your actual private key
  bytecode: "0x608060...", // Your contract bytecode
  abi: [{...}], // Your contract ABI
  network: "iota",
  gasLimit: "2100000",
  maxFeePerGas: "22.5" // Standard price in gwei
});
\`\`\`

## Security Recommendations
1. **Before Deployment**:
   - Verify your contract code with a security audit
   - Test thoroughly on IOTA testnet
   - Use the analyze_iota_smart_contract tool to check for vulnerabilities

2. **After Deployment**:
   - Verify the contract source code on the IOTA Explorer
   - Monitor initial transactions for expected behavior
   - Set up alerts for significant events or unusual activity

## Timing Recommendation
Based on current network conditions, **now is an excellent time to deploy** your contract. The low congestion means your transaction should be confirmed quickly, and gas prices are favorable.`;

    default:
      return `I'm not sure how to analyze this particular scenario using the IOTA MCP Server tools. Could you please try asking about network status, arbitrage opportunities, or smart contract deployment?`;
  }
}

// Start the server
server.listen(PORT, () => {
  console.log(`Demo server running on http://localhost:${PORT}`);
});
