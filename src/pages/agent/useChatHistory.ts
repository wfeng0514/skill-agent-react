import React, { useCallback, useRef } from 'react';
import type { UIMessage } from 'ai';

const STORAGE_PREFIX = 'chat_history_';
const MAX_MESSAGES = 200;
const IDB_NAME = 'chat_images_db';
const IDB_STORE = 'images';

// ── IndexedDB 图片存储 ──

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbSet(key: string, value: string): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

function idbGet(key: string): Promise<string | undefined> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result as string | undefined);
        req.onerror = () => reject(req.error);
      }),
  );
}

function idbDelete(key: string): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

// ── 序列化（图片存 IndexedDB，消息只保留引用 key） ──

async function serializeMessages(messages: UIMessage[], sessionId: string): Promise<UIMessage[]> {
  const result = messages.slice(-MAX_MESSAGES).map((msg) => ({
    ...msg,
    parts: msg.parts?.map((part) => {
      if (part.type === 'file' && (part as { type: 'file'; url?: string }).url?.startsWith('data:image/')) {
        const url = (part as { type: 'file'; url: string }).url;
        const imgKey = `${sessionId}_${msg.id}_${Date.now()}`;
        // 异步存入 IndexedDB，不阻塞返回
        idbSet(imgKey, url).catch((e) => console.warn('[useChatHistory] Failed to save image to IndexedDB:', e));
        return { ...part, url: `__img_ref__${imgKey}` };
      }
      return part;
    }),
  }));

  return result;
}

// ── 反序列化（从 IndexedDB 恢复图片 URL） ──

async function deserializeMessages(messages: UIMessage[]): Promise<UIMessage[]> {
  const tasks: { msgIdx: number; partIdx: number; imgKey: string }[] = [];

  messages.forEach((msg, msgIdx) => {
    msg.parts?.forEach((part, partIdx) => {
      if (part.type === 'file') {
        const url = (part as { type: 'file'; url?: string }).url;
        if (url?.startsWith('__img_ref__')) {
          const imgKey = url.replace('__img_ref__', '');
          tasks.push({ msgIdx, partIdx, imgKey });
        }
      }
    });
  });

  if (tasks.length === 0) return messages;

  // 深拷贝避免修改原对象
  const restored = JSON.parse(JSON.stringify(messages)) as UIMessage[];

  // 并行从 IndexedDB 读取所有图片
  const results = await Promise.allSettled(tasks.map((t) => idbGet(t.imgKey)));

  results.forEach((result, idx) => {
    const task = tasks[idx];
    if (result.status === 'fulfilled' && result.value) {
      const part = restored[task.msgIdx].parts?.[task.partIdx];
      if (part) {
        (part as { url: string }).url = result.value;
      }
    }
  });

  return restored;
}

// ── 基础读写 ──

async function loadMessages(agentId: string, sessionId: string): Promise<UIMessage[]> {
  try {
    const key = `${STORAGE_PREFIX}${agentId}_${sessionId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const messages = JSON.parse(raw) as UIMessage[];
    // 反序列化：从 IndexedDB 恢复图片
    return deserializeMessages(messages);
  } catch {
    return [];
  }
}

async function saveMessages(agentId: string, messages: UIMessage[], sessionId: string) {
  try {
    const key = `${STORAGE_PREFIX}${agentId}_${sessionId}`;
    const serialized = await serializeMessages(messages, sessionId);
    localStorage.setItem(key, JSON.stringify(serialized));
  } catch (e) {
    console.warn('[useChatHistory] Failed to save messages:', e);
  }
}

async function removeMessages(agentId: string, sessionId: string) {
  const key = `${STORAGE_PREFIX}${agentId}_${sessionId}`;
  // 清理 localStorage
  localStorage.removeItem(key);
  // 清理 IndexedDB 中该 session 的图片引用
  try {
    const db = await openDB();
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.getAllKeys();

    req.onsuccess = () => {
      const keys = req.result as string[];
      keys.filter((k) => k.startsWith(`${sessionId}_`)).forEach((k) => idbDelete(k).catch(() => {}));
    };
  } catch {
    // ignore
  }
}

// ── 历史会话列表 ──

export interface HistorySession {
  id: string;
  title: string;
  agentId: string;
  timestamp: number;
  messageCount: number;
}

/**
 * 扫描 localStorage，找出指定 Agent 的所有历史会话
 * 按时间倒序排列（最新的在前）
 */
export function getHistorySessions(agentId: string): HistorySession[] {
  const sessions: HistorySession[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(`${STORAGE_PREFIX}${agentId}_`)) continue;

      const sessionId = key.replace(`${STORAGE_PREFIX}${agentId}_`, '');
      if (!sessionId.includes('-')) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const messages = JSON.parse(raw) as UIMessage[];
        if (messages.length === 0) continue;

        const firstUserMsg = messages.find((m) => m.role === 'user' && m.parts?.some((p) => p.type === 'text'));
        const textPart = firstUserMsg?.parts?.find((p) => p.type === 'text');
        const text = ((textPart as { text: string })?.text || '').trim();

        const title = text.length > 30 ? text.slice(0, 30) + '...' : text || '空对话';
        const timestamp = parseInt(sessionId.split('-')[0], 10) || 0;

        sessions.push({
          id: sessionId,
          title,
          agentId,
          timestamp,
          messageCount: messages.length,
        });
      } catch {
        continue;
      }
    }
  } catch {
    // ignore
  }

  return sessions.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * 清除指定 Agent 的所有历史会话
 */
export function clearAllHistory(agentId: string) {
  const keysToRemove: string[] = [];
  const sessionIds: string[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${STORAGE_PREFIX}${agentId}_`)) {
        keysToRemove.push(key);
        const sid = key.replace(`${STORAGE_PREFIX}${agentId}_`, '');
        if (sid.includes('-')) sessionIds.push(sid);
      }
    }
  } catch {
    // ignore
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));

  // 清理 IndexedDB
  openDB().then((db) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.getAllKeys();
    req.onsuccess = () => {
      const keys = req.result as string[];
      keys
        .filter((k) => sessionIds.some((sid) => k.startsWith(`${sid}_`)))
        .forEach((k) => idbDelete(k).catch(() => {}));
    };
  });
}

/**
 * 删除指定的历史会话
 */
export async function deleteSession(agentId: string, sessionId: string) {
  await removeMessages(agentId, sessionId);
}

// ── Hook ──

/**
 * useChatHistory
 *
 * - initialMessages: 组件挂载时从 localStorage + IndexedDB 读取
 * - persist(messages): 保存最新消息到 localStorage + IndexedDB
 * - clear(): 清空当前会话记录
 */
export function useChatHistory(agentId: string, sessionId: string) {
  const [initialMessages, setInitialMessages] = React.useState<UIMessage[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const refs = useRef({ agentId, sessionId });
  refs.current = { agentId, sessionId };

  // 挂载时从 localStorage + IndexedDB 加载
  React.useEffect(() => {
    let cancelled = false;
    loadMessages(agentId, sessionId).then((msgs) => {
      if (!cancelled) {
        setInitialMessages(msgs);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [agentId, sessionId]);

  const persist = useCallback((messages: UIMessage[]) => {
    saveMessages(refs.current.agentId, messages, refs.current.sessionId);
  }, []);

  const clear = useCallback(() => {
    removeMessages(refs.current.agentId, refs.current.sessionId);
  }, []);

  return {
    initialMessages,
    loaded,
    persist,
    clear,
  };
}
