import * as React from 'react';
import type { AgentConfig } from './config';
import styles from '../Agent.module.scss';

/**
 * Agent 侧边栏 — 展示 Agent 列表，支持切换
 */
export const ChatSidebar: React.FC<{
  agents: AgentConfig[];
  activeAgentId: string;
  onSwitch: (agentId: string) => void;
}> = ({ agents, activeAgentId, onSwitch }) => (
  <aside className={styles.sidebar}>
    <nav className={styles.agentList}>
      {agents.map((agent) => (
        <button
          key={agent.id}
          className={`${styles.agentItem} ${agent.id === activeAgentId ? styles.agentItemActive : ''}`}
          onClick={() => onSwitch(agent.id)}
        >
          <span className={styles.agentIcon}>{agent.icon}</span>
          <span className={styles.agentItemLabel}>{agent.label}</span>
        </button>
      ))}
    </nav>
  </aside>
);
