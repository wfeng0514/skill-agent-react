import * as React from 'react';
import styles from '../Agent.module.scss';

/**
 * 思考指示器 — 三个跳动圆点 + 渐隐文字
 */
export const ThinkingIndicator: React.FC = () => (
  <div className={styles.thinkingIndicator}>
    <div className={styles.thinkingDots}>
      <span className={styles.dot} />
      <span className={`${styles.dot} ${styles.dot2}`} />
      <span className={`${styles.dot} ${styles.dot3}`} />
    </div>
    <span className={styles.thinkingText}>正在思考中...</span>
  </div>
);
