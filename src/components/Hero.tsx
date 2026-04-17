import { memo } from 'react';
import styles from './Hero.module.scss';

const Hero: React.FC = () => {
  return (
    <header className={styles.hero}>
      {/* 装饰性光晕 */}
      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.badge}>
        <span className={styles.dot} />
        交互式学习指南
      </div>

      <h1 className={styles.title}>
        理解 <span className={styles.highlight}>Skill</span> 与{' '}
        <span className={`${styles.highlight} ${styles.highlightAlt}`}>Agent</span>
      </h1>

      <p className={styles.subtitle}>
        通过可视化、交互式的方式，深入了解 AI Agent 的核心架构： Skill 如何为 Agent
        注入专业能力，以及它们如何协同完成复杂任务。 前端开发者友好，React + TypeScript +
        SCSS 实现的完整项目。
      </p>

      <div className={styles.actions}>
        <a href="#skill" className={`${styles.btn} ${styles.btnPrimary}`}>
          开始学习 ↓
        </a>
        <a href="#playground" className={`${styles.btn} ${styles.btnOutline}`}>
          🧪 直接实验
        </a>
      </div>

      <div className={styles.scrollHint}>
        <span>向下滚动探索</span>
        <span className={styles.arrow} />
      </div>
    </header>
  );
};

export default memo(Hero);
