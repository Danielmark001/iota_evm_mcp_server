import React, { useEffect, useRef } from 'react';
import { RiRobot2Line } from 'react-icons/ri';
import { FiUser, FiTool, FiMessageSquare, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import { CgSpinner } from 'react-icons/cg';
import { MdDone } from 'react-icons/md';

const ToolLog = ({ logs, toolsInProgress, completedTools }) => {
  const logEndRef = useRef(null);
  
  useEffect(() => {
    // Scroll to bottom when logs update
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);
  
  const getLogIcon = (type) => {
    switch (type) {
      case 'user': return <FiUser />;
      case 'claude': return <RiRobot2Line />;
      case 'tool': return <FiTool />;
      case 'response': return <FiMessageSquare />;
      case 'system': return <FiInfo />;
      case 'error': return <FiAlertTriangle color="#ff4040" />;
      default: return <FiInfo />;
    }
  };
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  // Determine if data should be shown as JSON
  const formatData = (data) => {
    if (!data) return null;
    
    try {
      if (typeof data === 'object') {
        return <pre className="tool-data">{JSON.stringify(data, null, 2)}</pre>;
      }
      return <pre className="tool-data">{String(data)}</pre>;
    } catch (error) {
      return <pre className="tool-data">{String(data)}</pre>;
    }
  };
  
  return (
    <div className="log-container">
      <div className="log-header">
        <h2>MCP Server Interaction Log</h2>
        <div className="log-tools">
          {toolsInProgress.map(tool => (
            <span key={tool} className="tool-badge in-progress">
              <CgSpinner className="spinning" /> {tool}
            </span>
          ))}
          {completedTools.map(tool => (
            <span key={tool} className="tool-badge completed">
              <MdDone /> {tool}
            </span>
          ))}
        </div>
      </div>
      
      <div className="log-entries">
        {logs.map((log) => (
          <div key={log.id} className={`log-entry ${log.type}`}>
            <div className="log-entry-icon">
              {getLogIcon(log.type)}
            </div>
            <div className="log-entry-content">
              <div className="log-entry-timestamp">
                {formatTime(log.timestamp)}
              </div>
              <div className="log-entry-message">
                {log.message}
              </div>
              {log.data && formatData(log.data)}
            </div>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default ToolLog;
