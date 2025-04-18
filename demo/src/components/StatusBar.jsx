import React from 'react';

const StatusBar = ({ connected }) => {
  return (
    <div className="status-bar">
      <div className={`status-indicator ${connected ? 'connected' : ''}`} />
      <span>{connected ? 'Connected to MCP Server' : 'Disconnected'}</span>
    </div>
  );
};

export default StatusBar;
