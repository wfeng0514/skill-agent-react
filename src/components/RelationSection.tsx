import { memo } from 'react';
import styles from './RelationSection.module.scss';

// ===== 类比卡片 =====
const AnalogyCard: React.FC<{
  icon: string;
  title: string;
  left: string;
  right: string;
}> = ({ icon, title, left, right }) => (
  <div className={styles.analogyCard}>
    <div className={styles.analogyIcon}>{icon}</div>
    <h4>{title}</h4>
    <div className={styles.analogyRow}>
      <span className={styles.analogySide}>{left}</span>
      <span className={styles.analogyArrow}>≈</span>
      <span className={`${styles.analogySide} ${styles.right}`}>{right}</span>
    </div>
  </div>
);

// ===== 工作流步骤 =====
const FlowStep: React.FC<{
  num: number;
  title: string;
  desc: string;
  type?: 'user' | 'agent' | 'skill' | 'tool' | 'result';
  last?: boolean;
}> = ({ num, title, desc, type = 'agent', last = false }) => {
  const typeColors: Record<string, string> = {
    user: '#f39c12',
    agent: '#6c5ce7',
    skill: '#00cec9',
    tool: '#fd79a8',
    result: '#27ae60',
  };

  return (
    <div className={styles.flowStep} data-type={type}>
      <div
        className={styles.flowNum}
        style={{ background: typeColors[type] || '#6c5ce7' } as React.CSSProperties}
      >
        {num}
      </div>
      <div className={styles.flowContent}>
        <strong>{title}</strong>
        <p>{desc}</p>
      </div>
      {!last && (
        <>
          <div className={styles.flowConnectorV} />
          <div className={styles.flowConnectorH} />
        </>
      )}
    </div>
  );
};

const RelationSection: React.FC = () => {
  return (
    <section id="relation" className={styles.section}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.tag}>Section 03</span>
        <h2 className={styles.title}>
          Skill 与 Agent 的<em>关系</em>
        </h2>
        <p className={styles.desc}>
          它们不是替代关系，而是<strong>共生关系</strong>。 Agent 是大脑，Skill
          是专业技能——就像一个全才医生，遇到心脏问题会咨询心内科专家，
          遇到骨科问题会找骨科专家。
        </p>
      </div>

      {/* 类比理解 */}
      <div className={styles.analogies}>
        <h4>💡 类比理解</h4>
        <div className={styles.analogyGrid}>
          <AnalogyCard
            icon="🎮"
            title="游戏类比"
            left="角色（Agent）"
            right="技能/装备（Skill）"
          />
          <AnalogyCard
            icon="🏥"
            title="医疗类比"
            left="全科医生（Agent）"
            right="专科专家会诊（Skill）"
          />
          <AnalogyCard
            icon="🔌"
            title="技术类比"
            left="操作系统（Agent）"
            right="App / 插件（Skill）"
          />
          <AnalogyCard
            icon="👨‍🍳"
            title="厨房类比"
            left="主厨（Agent）"
            right="菜谱 + 专用厨具（Skill）"
          />
        </div>
      </div>

      {/* 完整工作流 */}
      <div className={styles.workflow}>
        <h4>🔄 完整工作流</h4>
        <div className={styles.flowContainer}>
          <FlowStep
            num="1"
            title="🙋 用户发起请求"
            type="user"
            desc="'帮我把这个 PDF 的表格提取成 Excel'"
          />
          <FlowStep
            num="2"
            title="🤔 Agent 分析任务"
            type="agent"
            desc="识别关键词：PDF → 需要解析；表格 → 数据处理；Excel → 输出格式"
          />
          <FlowStep
            num="3"
            title="📦 匹配 & 加载 Skill"
            type="skill"
            desc="use_skill('pdf') 注入 PDF 知识；use_skill('xlsx') 注入 Excel 能力"
          />
          <FlowStep
            num="4"
            title="⚡ 执行工具脚本"
            type="tool"
            desc="调用 pdfplumber 解析表格 → 调用 openpyxl 写入 .xlsx 文件"
          />
          <FlowStep
            num="5"
            title="✅ 返回结果给用户"
            type="result"
            desc="交付文件：report_tables.xlsx（含 3 张工作表）+ 处理摘要"
            last
          />
        </div>
      </div>

      {/* 对比表 */}
      <div className={styles.compareTable}>
        <h4>📊 核心区别对比</h4>
        <table>
          <thead>
            <tr>
              <th>维度</th>
              <th>Skill</th>
              <th>Agent</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>本质</strong>
              </td>
              <td>知识 + 工具包</td>
              <td>智能执行体</td>
            </tr>
            <tr>
              <td>
                <strong>能力</strong>
              </td>
              <td>特定领域专业能力</td>
              <td>通用思考、规划、执行能力</td>
            </tr>
            <tr>
              <td>
                <strong>主动性</strong>
              </td>
              <td>被动，被调用时生效</td>
              <td>主动分析、决策、迭代</td>
            </tr>
            <tr>
              <td>
                <strong>存储位置</strong>
              </td>
              <td>.workbuddy/skills/</td>
              <td>运行时上下文</td>
            </tr>
            <tr>
              <td>
                <strong>数量</strong>
              </td>
              <td>可拥有数百个</td>
              <td>通常一个主进程</td>
            </tr>
            <tr>
              <td>
                <strong>关系</strong>
              </td>
              <td colspan="2">Agent 调用 Skill 来增强专业能力</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default memo(RelationSection);
