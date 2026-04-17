import { memo } from 'react';
import styles from './Footer.module.scss';

const Footer: React.FC = () => (
  <footer className={styles.footer}>
    <div className={styles.inner}>
      <p>
        <strong>Skill & Agent 交互式学习指南</strong> — 由{' '}
        <span className={styles.highlight}>React + TypeScript + SCSS + Vite</span> 构建
      </p>
      <div className={styles.links}>
        <a href="#skill">📦 Skill</a>
        <a href="#agent">🤖 Agent</a>
        <a href="#relation">🔗 关系</a>
        <a href="#playground">🧪 实验场</a>
      </div>
      <p className={styles.copyright}>Made with 🐾 by 狗子</p>
    </div>
  </footer>
);

export default memo(Footer);
