import * as React from 'react';

import { AGENTS } from './agent/config';
import { ChatSidebar } from './agent/ChatSidebar';
import { ChatPanel } from './agent/ChatPanel';

import styles from './Agent.module.scss';

/** 生成唯一会话 ID（时间戳 + 随机数） */
function newSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const Agent: React.FC = () => {
  const [activeAgentId, setActiveAgentId] = React.useState('cargo-agent');
  const [sessionIds, setSessionIds] = React.useState<Record<string, string>>(() => ({
    'cargo-agent': newSessionId(),
    'weather-agent': newSessionId(),
    'mcp-agent': newSessionId(),
    'music-agent': newSessionId(),
  }));

  // 历史版本号，每次消息变化或删除时递增，触发侧边栏刷新
  const [historyVersion, setHistoryVersion] = React.useState(0);

  const activeAgent = AGENTS.find((a) => a.id === activeAgentId) || AGENTS[0];
  const activeSessionId = sessionIds[activeAgentId] || newSessionId();

  const handleAgentSwitch = (agentId: string) => {
    if (agentId === activeAgentId) return;
    setActiveAgentId(agentId);
  };

  // 切换到已有历史会话
  const handleSwitchSession = (sessionId: string) => {
    if (sessionId === activeSessionId) return;
    setSessionIds((prev) => ({
      ...prev,
      [activeAgentId]: sessionId,
    }));
  };

  // 开启新对话
  const handleNewSession = () => {
    setSessionIds((prev) => ({
      ...prev,
      [activeAgentId]: newSessionId(),
    }));
  };

  // 子组件通知历史变更（新消息、删除等）
  const handleHistoryChange = React.useCallback(() => {
    setHistoryVersion((v) => v + 1);
  }, []);

  // 删除历史会话
  const handleDeleteSession = React.useCallback(
    (sessionId: string) => {
      setHistoryVersion((v) => v + 1);
      // 如果删除的是当前活跃会话，开一个新对话
      if (sessionId === activeSessionId) {
        setSessionIds((prev) => ({
          ...prev,
          [activeAgentId]: newSessionId(),
        }));
      }
    },
    [activeAgentId, activeSessionId],
  );

  // 清空所有历史
  const handleClearAll = React.useCallback(() => {
    setHistoryVersion((v) => v + 1);
    // 当前活跃会话的历史也被清了，开新对话
    setSessionIds((prev) => ({
      ...prev,
      [activeAgentId]: newSessionId(),
    }));
  }, [activeAgentId]);

  return (
    <div className={styles.agentPage}>
      <ChatSidebar
        agents={AGENTS}
        activeAgentId={activeAgentId}
        activeSessionId={activeSessionId}
        onSwitchAgent={handleAgentSwitch}
        onSwitchSession={handleSwitchSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onClearAll={handleClearAll}
        historyVersion={historyVersion}
      />

      <div className={styles.mainContent}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {activeAgent.icon} {activeAgent.label}
          </h1>
        </div>

        <ChatPanel
          key={`${activeAgentId}-${activeSessionId}`}
          agent={activeAgent}
          sessionId={activeSessionId}
          onHistoryChange={handleHistoryChange}
        />
      </div>
    </div>
  );
};

export default Agent;
