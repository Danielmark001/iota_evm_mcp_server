import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import ClaudeResponse from './components/ClaudeResponse';
import ToolLog from './components/ToolLog';
import PromptPanel from './components/PromptPanel';
import NetworkDiagram from './components/NetworkDiagram';
import StatusBar from './components/StatusBar';
import { IoLogoIota } from 'react-icons/io5';
import { RiRobot2Line } from 'react-icons/ri';

// Predefined prompts for different scenarios
const DEMO_PROMPTS = {
  network: "I want to check the status of the IOTA network and current gas prices. Is it a good time for transactions?",
  arbitrage: "I'm looking for arbitrage opportunities between IOTA and other networks. Can you analyze USDC prices and find profitable trades?",
  smartContract: "I need to deploy a smart contract on IOTA. Can you analyze current conditions and help me estimate costs?"
};

function App() {
  const [activeScenario, setActiveScenario] = useState('network');
  const [userPrompt, setUserPrompt] = useState(DEMO_PROMPTS.network);
  const [claudeResponse, setClaudeResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [connected, setConnected] = useState(false);
  const [toolsInProgress, setToolsInProgress] = useState([]);
  const [completedTools, setCompletedTools] = useState([]);
  const wsRef = useRef(null);

  // Setup WebSocket connection
  useEffect(() => {
    wsRef.current = new WebSocket(`ws://${window.location.hostname}:3005`);
    
    wsRef.current.onopen = () => {
      setConnected(true);
      addLog('system', 'Connected to demo server');
    };
    
    wsRef.current.onclose = () => {
      setConnected(false);
      addLog('error', 'Disconnected from demo server');
    };
    
    wsRef.current.onerror = (error) => {
      addLog('error', `WebSocket error: ${error.message || 'Unknown error'}`);
    };
    
    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        addLog('error', `Failed to parse WebSocket message: ${error.message}`);
      }
    };
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Update prompt when scenario changes
  useEffect(() => {
    setUserPrompt(DEMO_PROMPTS[activeScenario]);
  }, [activeScenario]);

  // Handle WebSocket messages
  const handleWebSocketMessage = (message) => {
    switch (message.type) {
      case 'INIT_STATE':
        // Initialize state from server
        if (message.state.activeScenario) {
          setActiveScenario(message.state.activeScenario);
          setToolsInProgress(message.state.toolsCalled || []);
          setCompletedTools(message.state.completedTools || []);
        }
        break;
        
      case 'CLAUDE_THINKING':
        setIsLoading(true);
        addLog('claude', `Claude is analyzing your request about ${message.scenario}...`);
        break;
        
      case 'CLAUDE_TOOL_SELECTION':
        addLog('claude', `Claude has decided to use the ${message.tool} tool`);
        break;
        
      case 'CLAUDE_TOOL_CALL':
        addLog('tool', `Calling ${message.tool} with parameters:`, message.params);
        setToolsInProgress((prev) => [...prev, message.tool]);
        break;
        
      case 'CLAUDE_TOOL_RESPONSE':
        addLog('response', `Received response from ${message.tool}:`, message.data);
        setCompletedTools((prev) => [...prev, message.tool]);
        break;
        
      case 'CLAUDE_RESPONSE':
        setClaudeResponse(message.response);
        setIsLoading(false);
        addLog('claude', 'Claude has completed the analysis');
        break;
        
      case 'TOOL_ERROR':
        addLog('error', `Tool error: ${message.error}`);
        break;
        
      default:
        addLog('system', `Unknown message type: ${message.type}`);
    }
  };

  // Add a log entry
  const addLog = (type, message, data = null) => {
    setLogs((prevLogs) => [
      ...prevLogs,
      {
        id: Date.now(),
        type,
        message,
        data,
        timestamp: new Date().toISOString()
      }
    ]);
  };

  // Send a request to Claude
  const sendToClaudeWithMCP = async () => {
    try {
      setClaudeResponse('');
      setToolsInProgress([]);
      setCompletedTools([]);
      setIsLoading(true);
      
      addLog('user', `Sending request to Claude: ${userPrompt.substring(0, 50)}...`);
      
      const response = await fetch(`http://${window.location.hostname}:3005/api/claude/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userPrompt,
          scenario: activeScenario,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      // Full response will come via WebSocket
    } catch (error) {
      addLog('error', `Error sending request: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Change the active scenario
  const changeScenario = (scenario) => {
    setActiveScenario(scenario);
    setUserPrompt(DEMO_PROMPTS[scenario]);
    setClaudeResponse('');
    setToolsInProgress([]);
    setCompletedTools([]);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <IoLogoIota size={32} />
          <h1>IOTA MCP Demo</h1>
        </div>
        <StatusBar connected={connected} />
      </header>
      
      <main className="app-container">
        <div className="left-panel">
          <PromptPanel
            userPrompt={userPrompt}
            setUserPrompt={setUserPrompt}
            activeScenario={activeScenario}
            changeScenario={changeScenario}
            sendToClaudeWithMCP={sendToClaudeWithMCP}
            isLoading={isLoading}
          />
          
          <ToolLog 
            logs={logs} 
            toolsInProgress={toolsInProgress} 
            completedTools={completedTools} 
          />
        </div>
        
        <div className="right-panel">
          <div className="claude-header">
            <RiRobot2Line size={24} />
            <h2>Claude's Analysis</h2>
            {isLoading && <div className="loading-spinner" />}
          </div>
          
          <div className="claude-content">
            {claudeResponse ? (
              <ClaudeResponse markdown={claudeResponse} />
            ) : (
              <div className="placeholder-content">
                {isLoading ? (
                  <p>Claude is analyzing your request...</p>
                ) : (
                  <p>Claude's analysis will appear here after you send a request.</p>
                )}
              </div>
            )}
          </div>
          
          <NetworkDiagram 
            scenario={activeScenario}
            toolsInProgress={toolsInProgress}
            completedTools={completedTools}
          />
        </div>
      </main>
      
      <footer className="app-footer">
        <p>IOTA EVM MCP Server - AI-Blockchain Bridge</p>
      </footer>
    </div>
  );
}

export default App;
