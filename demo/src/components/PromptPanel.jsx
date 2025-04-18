import React from 'react';
import { IoSend } from 'react-icons/io5';
import { BsGraphUp } from 'react-icons/bs';
import { HiOutlineServer } from 'react-icons/hi';
import { MdOutlineSpeed } from 'react-icons/md';

const PromptPanel = ({ 
  userPrompt, 
  setUserPrompt, 
  activeScenario, 
  changeScenario, 
  sendToClaudeWithMCP, 
  isLoading 
}) => {
  const scenarios = [
    { id: 'network', label: 'Network Status', icon: <MdOutlineSpeed /> },
    { id: 'arbitrage', label: 'Arbitrage', icon: <BsGraphUp /> },
    { id: 'smartContract', label: 'Smart Contract', icon: <HiOutlineServer /> },
  ];

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Claude Prompt</h2>
      </div>
      
      <div className="scenario-buttons">
        {scenarios.map(scenario => (
          <button
            key={scenario.id}
            className={`scenario-button ${activeScenario === scenario.id ? 'active' : ''}`}
            onClick={() => changeScenario(scenario.id)}
            disabled={isLoading}
          >
            {scenario.icon} {scenario.label}
          </button>
        ))}
      </div>
      
      <textarea
        className="prompt-input"
        value={userPrompt}
        onChange={(e) => setUserPrompt(e.target.value)}
        placeholder="Enter your question for Claude..."
        disabled={isLoading}
      />
      
      <button
        className="send-button"
        onClick={sendToClaudeWithMCP}
        disabled={isLoading || !userPrompt.trim()}
      >
        {isLoading ? (
          <>
            <div className="loading-spinner" />
            Processing...
          </>
        ) : (
          <>
            <IoSend />
            Send to Claude
          </>
        )}
      </button>
    </div>
  );
};

export default PromptPanel;
