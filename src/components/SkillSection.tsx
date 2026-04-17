import { memo, useState } from 'react';
import type { SkillFile, SkillFeature } from '../types';
import { skillFeatures, skillTreeData } from '../utils/constants';
import styles from './SkillSection.module.scss';

// ===== 特征卡片 =====
const FeatureCard: React.FC<{ feature: SkillFeature }> = ({ feature }) => (
  <div className={styles.featureCard} style={{ '--accent': feature.color } as React.CSSProperties}>
    <div className={styles.featureIcon}>{feature.icon}</div>
    <h3 className={styles.featureTitle}>{feature.title}</h3>
    <p className={styles.featureDesc}>{feature.description}</p>
  </div>
);

// ===== 文件树组件 =====
const FileTreeItem: React.FC<{
  item: SkillFile;
  depth?: number;
  activeFile: string | null;
  onSelect: (name: string) => void;
}> = ({ item, depth = 0, activeFile, onSelect }) => {
  const [expanded, setExpanded] = useState(depth < 1);
  const isActive = activeFile === item.name;

  if (item.type === 'folder') {
    return (
      <div>
        <button
          className={`${styles.treeFolder} ${isActive ? styles.active : ''}`}
          style={{ paddingLeft: `${12 + depth * 18}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          <span className={styles.folderArrow}>{expanded ? '▾' : '▸'}</span>
          <span className={styles.folderIcon}>📁</span>
          <span>{item.name}</span>
        </button>
        {expanded &&
          item.children?.map((child) => (
            <FileTreeItem key={child.name} item={child} depth={depth + 1} activeFile={activeFile} onSelect={onSelect} />
          ))}
      </div>
    );
  }

  return (
    <button
      className={`${styles.treeFile} ${isActive ? styles.active : ''}`}
      style={{ paddingLeft: `${28 + depth * 18}px` }}
      onClick={() => onSelect(item.name)}
    >
      <span>{getFileIcon(item.name)}</span>
      {item.name}
    </button>
  );
};

function getFileIcon(name: string): string {
  if (name.endsWith('.md')) return '📄';
  if (name.endsWith('.py')) return '🐍';
  if (name.endsWith('.json')) return '{ }';
  if (name.endsWith('.pdf')) return '📑';
  if (name.endsWith('.tpl')) return '📋';
  if (name.includes('/')) return '📁';
  return '📎';
}

// ===== 预览面板 =====
const PreviewPanel: React.FC<{ content: string; fileName: string }> = ({ content, fileName }) => (
  <div className={styles.previewPanel}>
    <div className={styles.previewHeader}>
      <div className={styles.previewDots}>
        <span className={styles.dotRed} />
        <span className={styles.dotYellow} />
        <span className={styles.dotGreen} />
      </div>
      <span className={styles.previewName}>{fileName}</span>
    </div>
    <pre className={styles.preContent}>
      <code>{content}</code>
    </pre>
  </div>
);

// ===== Skill 主章节 =====
const SkillSection: React.FC = () => {
  const [activeFile, setActiveFile] = useState<string | null>('SKILL.md');

  const findFile = (items: SkillFile[], name: string): SkillFile | null => {
    for (const item of items) {
      if (item.name === name && item.type === 'file') return item;
      const found = item.children ? findFile(item.children, name) : null;
      if (found) return found;
    }
    return null;
  };

  const selected = findFile(skillTreeData, activeFile || '');

  return (
    <section id="skill" className={styles.section}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.tag}>Section 01</span>
        <h2 className={styles.title}>
          什么是 <em>Skill</em>？
        </h2>
        <p className={styles.desc}>
          Skill 是 Agent 的「技能包」——就像游戏角色装备不同的武器和法术。 每个 Skill 封装了特定领域的
          <strong>知识</strong>、<strong>工作流程</strong> 和<strong>可执行工具</strong>，让 Agent
          能像专家一样处理专业任务。
        </p>
      </div>

      {/* 核心特征卡片 */}
      <div className={styles.grid}>
        {skillFeatures.map((f: SkillFeature) => (
          <FeatureCard key={f.title} feature={f} />
        ))}
      </div>

      {/* 文件树 + 预览 */}
      <div className={styles.demo}>
        <div className={styles.demoLabel}>🔍 点击文件查看内容</div>
        <div className={styles.fileViewer}>
          {/* 左侧文件树 */}
          <div className={styles.treePane}>
            <div className={styles.treeHeader}>📂 skill-pdf /</div>
            {skillTreeData.map((root) => (
              <FileTreeItem key={root.name} item={root} activeFile={activeFile} onSelect={setActiveFile} />
            ))}
          </div>

          {/* 右侧预览区 */}
          <div className={styles.previewPane}>
            {selected?.content ? (
              <PreviewPanel content={selected.content} fileName={selected.name || ''} />
            ) : (
              <div className={styles.emptyPreview}>
                <span>← 选择一个文件查看详情</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 存储位置说明 */}
      <div className={styles.storageInfo}>
        <div className={styles.storageCard}>
          <h4>💾 Skill 的存储位置</h4>
          <code className={styles.pathCode}>~/.workbuddy/skills/{'<skill-name>'}/SKILL.md</code>
          <ul>
            <li>
              <strong>用户级</strong>：~/.workbuddy/skills/ （跨项目共享）
            </li>
            <li>
              <strong>项目级</strong>：{'.workbuddy/skills/'}（团队共享）
            </li>
            <li>
              <strong>内置</strong>：系统预装（pdf、xlsx、pptx、docx 等）
            </li>
          </ul>
        </div>
      </div>

      {/* 触发流程图 */}
      <div className={styles.flowInfo}>
        <h4 className={styles.flowTitle}>⚡ 触发流程</h4>
        <div className={styles.flowSteps}>
          <div className={styles.flowStep}>
            <div className={styles.flowNum}>1</div>
            <span>用户发送任务请求</span>
          </div>
          <div className={styles.flowArrow}>→</div>
          <div className={styles.flowStep}>
            <div className={styles.flowNum}>2</div>
            <span>Agent 分析任务关键词 &amp; 意图</span>
          </div>
          <div className={styles.flowArrow}>→</div>
          <div className={styles.flowStep}>
            <div className={styles.flowNum}>3</div>
            <span>匹配可用 Skills 列表</span>
          </div>
          <div className={styles.flowArrow}>→</div>
          <div className={styles.flowStep}>
            <div className={styles.flowNum}>4</div>
            <span>调用 use_skill() 加载匹配的 Skill</span>
          </div>
          <div className={styles.flowArrow}>→</div>
          <div className={styles.flowStep}>
            <div className={styles.flowNum}>5</div>
            <span>Skill 注入知识 → Agent 执行任务</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default memo(SkillSection);
