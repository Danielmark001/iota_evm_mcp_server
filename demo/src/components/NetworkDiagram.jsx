import React, { useEffect, useState } from 'react';
import { IoLogoIota } from 'react-icons/io5';
import { FaEthereum } from 'react-icons/fa';
import { SiShimmer } from 'react-icons/si';
import { RiRobot2Line } from 'react-icons/ri';

const NETWORK_CONFIGS = {
  network: {
    nodes: [
      { id: 'claude', icon: <RiRobot2Line />, label: 'Claude AI' },
      { id: 'iota', icon: <IoLogoIota />, label: 'IOTA Network' }
    ],
    edges: [
      { source: 'claude', target: 'iota', id: 'verify_iota_network_status' },
      { source: 'claude', target: 'iota', id: 'get_iota_gas_prices' }
    ]
  },
  arbitrage: {
    nodes: [
      { id: 'claude', icon: <RiRobot2Line />, label: 'Claude AI' },
      { id: 'iota', icon: <IoLogoIota />, label: 'IOTA Network' },
      { id: 'ethereum', icon: <FaEthereum />, label: 'Ethereum' },
      { id: 'shimmer', icon: <SiShimmer />, label: 'Shimmer' }
    ],
    edges: [
      { source: 'claude', target: 'iota', id: 'get_cross_chain_token_price' },
      { source: 'claude', target: 'ethereum', id: 'get_cross_chain_token_price' },
      { source: 'claude', target: 'shimmer', id: 'list_arbitrage_tokens' },
      { source: 'iota', target: 'ethereum', id: 'find_arbitrage_opportunities' }
    ]
  },
  smartContract: {
    nodes: [
      { id: 'claude', icon: <RiRobot2Line />, label: 'Claude AI' },
      { id: 'iota', icon: <IoLogoIota />, label: 'IOTA Network' }
    ],
    edges: [
      { source: 'claude', target: 'iota', id: 'get_iota_gas_prices' },
      { source: 'claude', target: 'iota', id: 'estimate_iota_transaction_cost' }
    ]
  }
};

const NetworkDiagram = ({ scenario, toolsInProgress, completedTools }) => {
  const [activeNodes, setActiveNodes] = useState([]);
  const [activeEdges, setActiveEdges] = useState([]);
  
  useEffect(() => {
    // Always activate Claude node
    setActiveNodes(['claude']);
    
    // Set active edges based on in-progress and completed tools
    const updatedEdges = [...toolsInProgress, ...completedTools];
    setActiveEdges(updatedEdges);
    
    // Activate nodes that are connected by active edges
    const config = NETWORK_CONFIGS[scenario] || NETWORK_CONFIGS.network;
    const nodesToActivate = ['claude']; // Claude is always active
    
    updatedEdges.forEach(toolId => {
      const edge = config.edges.find(e => e.id === toolId);
      if (edge) {
        nodesToActivate.push(edge.source, edge.target);
      }
    });
    
    setActiveNodes([...new Set(nodesToActivate)]);
  }, [scenario, toolsInProgress, completedTools]);
  
  const config = NETWORK_CONFIGS[scenario] || NETWORK_CONFIGS.network;
  
  return (
    <div className="network-diagram">
      <div className="network-nodes">
        {config.nodes.map(node => (
          <div 
            key={node.id} 
            className={`node ${activeNodes.includes(node.id) ? 'active' : ''}`}
          >
            <div className="node-icon">{node.icon}</div>
            <div className="node-label">{node.label}</div>
          </div>
        ))}
        
        <div className="network-edges">
          {config.edges.map(edge => {
            // Find node positions (this is simplified for demo)
            const sourceIndex = config.nodes.findIndex(n => n.id === edge.source);
            const targetIndex = config.nodes.findIndex(n => n.id === edge.target);
            
            // Skip if nodes not found
            if (sourceIndex === -1 || targetIndex === -1) return null;
            
            // Calculate positions (simplified)
            const width = 100; // percent
            const nodeSpacing = width / (config.nodes.length - 1);
            const sourcePos = sourceIndex * nodeSpacing;
            const targetPos = targetIndex * nodeSpacing;
            
            // Calculate angle and length
            const dx = targetPos - sourcePos;
            const length = Math.abs(dx);
            
            const isActive = activeEdges.includes(edge.id);
            
            return (
              <div 
                key={edge.id}
                className={`edge ${isActive ? 'active' : ''}`}
                style={{
                  left: `${sourcePos}%`,
                  width: `${length}%`,
                  top: '50%',
                  transform: dx < 0 ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
                title={edge.id}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NetworkDiagram;
