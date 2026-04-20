import * as React from 'react';

import { AGENTS, type AgentConfig } from './agent/config';
import { ChatSidebar } from './agent/ChatSidebar';
import { ChatPanel } from './agent/ChatPanel';

import styles from './Agent.module.scss';

const Agent: React.FC = () => {
  const [activeAgentId, setActiveAgentId] = React.useState('cargo-agent');
  const activeAgent = AGENTS.find((a) => a.id === activeAgentId) || AGENTS[0];

  const handleAgentSwitch = (agentId: string) => {
    if (agentId === activeAgentId) return;
    setActiveAgentId(agentId);
  };

  return (
    <div className={styles.agentPage}>
      <ChatSidebar
        agents={AGENTS}
        activeAgentId={activeAgentId}
        onSwitch={handleAgentSwitch}
      />

      <div className={styles.mainContent}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {activeAgent.icon} {activeAgent.label}
          </h1>
        </div>

        {/* key 强制切换 Agent 时完全重新挂载，确保 useChat 用新的 transport */}
        <ChatPanel key={activeAgentId} agent={activeAgent} />
      </div>
    </div>
  );
};

export default Agent;
