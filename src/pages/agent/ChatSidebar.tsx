import * as React from 'react';
import type { AgentConfig } from './config';
import { getHistorySessions, deleteSession, clearAllHistory, type HistorySession } from './useChatHistory';
import styles from '../Agent.module.scss';

interface ChatSidebarProps {
  agents: AgentConfig[];
  activeAgentId: string;
  activeSessionId: string;
  onSwitchAgent: (agentId: string) => void;
  onSwitchSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onClearAll: () => void;
  /** 父组件在历史变更后调用，触发列表刷新 */
  historyVersion: number;
}

/**
 * 侧边栏 — Agent 切换 + 历史会话列表
 */
export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  agents,
  activeAgentId,
  activeSessionId,
  onSwitchAgent,
  onSwitchSession,
  onNewSession,
  onDeleteSession,
  onClearAll,
  historyVersion,
}) => {
  const [sessions, setSessions] = React.useState<HistorySession[]>([]);
  const [hoveredSession, setHoveredSession] = React.useState<string | null>(null);

  // 加载当前 Agent 的历史会话列表
  const refreshSessions = React.useCallback(() => {
    setSessions(getHistorySessions(activeAgentId));
  }, [activeAgentId]);

  React.useEffect(() => {
    refreshSessions();
  }, [refreshSessions, historyVersion]);

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    deleteSession(activeAgentId, sessionId);
    // 通知父组件刷新 + 如果删除的是当前活跃会话则开新对话
    onDeleteSession(sessionId);
  };

  const handleClearAll = () => {
    clearAllHistory(activeAgentId);
    onClearAll();
  };

  return (
    <aside className={styles.sidebar}>
      {/* ── Agent 切换区域 ── */}
      <div className={styles.sidebarAgents}>
        {agents.map((agent) => (
          <button
            key={agent.id}
            className={`${styles.agentItem} ${agent.id === activeAgentId ? styles.agentItemActive : ''}`}
            onClick={() => onSwitchAgent(agent.id)}
            title={agent.label}
          >
            <span className={styles.agentIcon}>{agent.icon}</span>
            <span className={styles.agentItemLabel}>{agent.label}</span>
          </button>
        ))}
      </div>

      {/* ── 新对话按钮 ── */}
      <button className={styles.newChatBtn} onClick={onNewSession}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>新对话</span>
      </button>

      {/* ── 历史会话列表 ── */}
      <div className={styles.sessionList}>
        <div className={styles.sessionListHeader}>
          <span>历史会话</span>
          {sessions.length > 0 && (
            <button className={styles.clearAllBtn} onClick={handleClearAll} title="清空所有历史">
              清空
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className={styles.sessionEmpty}>暂无历史会话</div>
        ) : (
          <div className={styles.sessionItems}>
            {sessions.map((session) => (
              <button
                key={session.id}
                className={`${styles.sessionItem} ${session.id === activeSessionId ? styles.sessionItemActive : ''}`}
                onClick={() => onSwitchSession(session.id)}
                onMouseEnter={() => setHoveredSession(session.id)}
                onMouseLeave={() => setHoveredSession(null)}
              >
                <div className={styles.sessionItemContent}>
                  <span className={styles.sessionItemIcon}>💬</span>
                  <div className={styles.sessionItemText}>
                    <span className={styles.sessionItemTitle}>{session.title}</span>
                    <span className={styles.sessionItemMeta}>
                      {formatTime(session.timestamp)} · {session.messageCount} 条
                    </span>
                  </div>
                </div>
                {(hoveredSession === session.id || session.id === activeSessionId) && (
                  <span
                    className={styles.sessionItemDelete}
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    title="删除此会话"
                  >
                    ×
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 底部信息 ── */}
      <div className={styles.sidebarFooter}>
        <span className={styles.sidebarVersion}>v0.1.0</span>
      </div>
    </aside>
  );
};

/** 时间格式化：今天显示时间，昨天显示"昨天"，更早显示日期 */
function formatTime(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);

  const isToday =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) {
    return '昨天';
  }

  return `${date.getMonth() + 1}/${date.getDate()}`;
}
