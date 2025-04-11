import { Client, initLogger, Utils, SecretManager } from "@iota/sdk";
import { EventEmitter } from "events";
import {
  IOTA_CONFIG,
  IOTA_NETWORK_EVENTS,
  IOTA_TRANSACTION_TYPES,
} from "../config/iota-config.js";

export class IOTAClientWrapper extends EventEmitter {
  private client: Client;
  private secretManager: any; // Using any for now due to type mismatch
  private isConnected: boolean = false;

  constructor() {
    super();
    // Initialize logger
    initLogger();

    this.client = new Client({
      nodes: [IOTA_CONFIG.nodes[0].url],
    });

    // Initialize secret manager with a mnemonic
    this.secretManager = {
      mnemonic:
        process.env.IOTA_MNEMONIC ||
        "giant dynamic museum toddler six deny defense ostrich bomb access mercy blood explain muscle shoot shallow glad autumn author calm heavy hawk abuse rally",
    };
  }

  async connect(): Promise<boolean> {
    try {
      const nodeInfo = await this.client.getNodeInfo(IOTA_CONFIG.nodes[0].url);
      console.log("Connected to IOTA network:", nodeInfo);
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error("Failed to connect to IOTA network:", error);
      throw error;
    }
  }

  private startEventListeners() {
    // Subscribe to events using MQTT
    setInterval(async () => {
      if (!this.isConnected) return;

      try {
        const info = await this.client.getNodeInfo(IOTA_CONFIG.nodes[0].url);
        this.emit(IOTA_NETWORK_EVENTS.BLOCK, {
          type: IOTA_NETWORK_EVENTS.BLOCK,
          data: info,
        });
      } catch (error) {
        console.error("Error fetching node info:", error);
      }
    }, 10000);
  }

  async sendTransaction(
    amount: bigint,
    recipientAddress: string
  ): Promise<string> {
    if (!this.isConnected) {
      throw new Error("Not connected to IOTA network");
    }

    try {
      // Build block with output
      const blockId = await this.client.buildAndPostBlock(this.secretManager, {
        output: {
          address: recipientAddress,
          amount: amount.toString(),
        },
      });

      return blockId[0];
    } catch (error) {
      console.error("Transaction failed:", error);
      throw error;
    }
  }

  async getBalance(address: string): Promise<string> {
    if (!this.isConnected) {
      throw new Error("Not connected to IOTA network");
    }

    try {
      // Get balance using protocol parameters
      const protocolParameters = await this.client.getProtocolParameters();
      const response = await this.client.basicOutputIds([
        {
          address: address,
        },
      ]);

      let balance = BigInt(0);

      // Get all outputs and sum their amounts
      if (response && response.items) {
        for (const outputId of response.items) {
          const output = await this.client.getOutput(outputId);
          if (output && output.output) {
            balance += BigInt(output.output.amount || 0);
          }
        }
      }

      return balance.toString();
    } catch (error) {
      console.error("Failed to get balance:", error);
      throw error;
    }
  }

  disconnect() {
    this.isConnected = false;
    this.removeAllListeners();
  }
}
