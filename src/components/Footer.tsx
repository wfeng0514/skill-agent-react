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
        <button type="button" onClick={() => document.getElementById('skill')?.scrollIntoView({ behavior: 'smooth' })}>📦 Skill</button>
        <button type="button" onClick={() => document.getElementById('agent')?.scrollIntoView({ behavior: 'smooth' })}>🤖 Agent</button>
        <button type="button" onClick={() => document.getElementById('relation')?.scrollIntoView({ behavior: 'smooth' })}>🔗 关系</button>
        <button type="button" onClick={() => document.getElementById('playground')?.scrollIntoView({ behavior: 'smooth' })}>🧪 实验场</button>
      </div>
      <p className={styles.copyright}>Made with 🐾 by 狗子</p>
    </div>
  </footer>
);

export default memo(Footer);
