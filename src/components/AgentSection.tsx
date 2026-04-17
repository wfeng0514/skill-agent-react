import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { loopSteps } from '../utils/constants';
import type { LoopStep } from '../types';
import { sleep } from '../utils/helpers';
import styles from './AgentSection.module.scss';

// ===== 圆环几何参数 =====
const LOOP_SIZE = 380; // SVG 容器尺寸（足够大，避免标签被裁切）
const RING_RADIUS = 130; // 节点所在圆的半径
const CENTER_X = LOOP_SIZE / 2; // 圆心 X
const CENTER_Y = LOOP_SIZE / 2; // 圆心 Y

// 计算第 N 个步骤在圆上的位置（6 步均布，从正上方顺时针排列）
function getNodePosition(index: number, total: number) {
  // -90deg 让第一个点在正上方（12 点钟方向）
  const angleDeg = index * (360 / total) - 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: Math.round(CENTER_X + RING_RADIUS * Math.cos(angleRad)),
    y: Math.round(CENTER_Y + RING_RADIUS * Math.sin(angleRad)),
  };
}

// 计算标签文字偏移方向（根据节点所在象限，让标签向外延伸）
function getLabelOffset(index: number, total: number): { dx: number; dy: number } {
  const angleDeg = index * (360 / total) - 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  const dist = 24; // 标签距离节点的像素
  return {
    dx: Math.cos(angleRad) * dist,
    dy: Math.sin(angleRad) * dist,
  };
}

// 验证：6 个节点的坐标
// index=0 (步骤1): 角度=-90° → top center → (170, 45)
// index=1 (步骤2): 角度=-30° → upper right → (278, 107)
// index=2 (步骤3): 角度=30°  → lower right → (278, 233)
// index=3 (步骤4): 角度=90°  → bottom      → (170, 295)
// index=4 (步骤5): 角度=150° → lower left  → (62, 233)
// index=5 (步骤6): 角度=210° → upper left  → (62, 107)

// ===== Agent 循环图组件 =====
const AgentLoop: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>(['点击"演示循环"查看 Agent 的工作过程...']);
  const [statusText, setStatusText] = useState('就绪');
  const isRunningRef = useRef(false);

  const runLoop = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setIsRunning(true);
    setLogs([]);
    setStatusText('运行中');

    try {
      for (let i = 0; i < loopSteps.length; i++) {
        if (!isRunningRef.current) break;
        const s: LoopStep = loopSteps[i];

        setCurrentStep(s.step);
        setStatusText(`步骤 ${s.step}/${loopSteps.length}`);
        setLogs((prev) => [...prev, `[步骤${s.step}] ${s.log}`]);

        await sleep(1200);
      }

      if (isRunningRef.current) {
        setStatusText('✅ 完成');
        setLogs((prev) => [...prev, '━━━ 所有步骤执行完毕 ━━━']);
      }
    } finally {
      isRunningRef.current = false;
      setIsRunning(false);
    }
  }, []);

  const resetLoop = useCallback(() => {
    isRunningRef.current = false;
    setCurrentStep(0);
    setLogs(['点击"演示循环"查看 Agent 的工作过程...']);
    setStatusText('就绪');
  }, []);

  // 清理：组件卸载时停止循环
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
    };
  }, []);

  return (
    <div className={styles.loopContainer}>
      {/* 圆环区域：固定尺寸的定位容器 */}
      <div className={styles.loopRing}>
        <svg viewBox={`0 0 ${LOOP_SIZE} ${LOOP_SIZE}`} className={styles.loopSvg}>
          {/* 外圆环 */}
          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={RING_RADIUS}
            fill="none"
            stroke="rgba(108,92,231,0.15)"
            strokeWidth="2"
          />
          {/* 内圈 */}
          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={RING_RADIUS - 30}
            fill="none"
            stroke="rgba(108,92,231,0.06)"
            strokeWidth="1.5"
          />
          {/* 连接线：从中心到各节点 */}
          {loopSteps.map((s, idx) => {
            const pos = getNodePosition(idx, loopSteps.length);
            return (
              <line
                key={`line-${s.step}`}
                x1={CENTER_X}
                y1={CENTER_Y}
                x2={pos.x}
                y2={pos.y}
                stroke={currentStep === s.step ? 'rgba(108,92,231,0.6)' : 'rgba(108,92,231,0.08)'}
                strokeWidth={currentStep === s.step ? 2 : 1}
                strokeDasharray="4 4"
              />
            );
          })}
          {/* 步骤节点 */}
          {loopSteps.map((s, idx) => {
            const pos = getNodePosition(idx, loopSteps.length);
            const isActive = currentStep === s.step;
            // 标签沿径向向外延伸，不会被裁切
            const labelOff = getLabelOffset(idx, loopSteps.length);

            return (
              <g
                key={`node-${s.step}`}
                onClick={() => setCurrentStep(s.step)}
                style={{ cursor: 'pointer' }}
                role="button"
                tabIndex={0}
              >
                {/* 节点背景圆 */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={18}
                  fill={isActive ? '#6c5ce7' : '#1a1a2e'}
                  stroke={isActive ? '#6c5ce7' : 'rgba(255,255,255,0.12)'}
                  strokeWidth="2"
                  style={{
                    transition: 'all 0.35s ease',
                    filter: isActive ? 'drop-shadow(0 4px 16px rgba(108,92,231,0.45))' : 'none',
                  }}
                />
                {/* 步骤数字 */}
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#fff"
                  fontSize="13"
                  fontWeight="700"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {s.step}
                </text>
                {/* 活跃时显示标签文字（沿径向向外） */}
                {isActive && (
                  <text
                    x={pos.x + labelOff.dx}
                    y={pos.y + labelOff.dy}
                    textAnchor={labelOff.dx > -2 && labelOff.dx < 2 ? 'middle' : labelOff.dx > 0 ? 'start' : 'end'}
                    dominantBaseline="central"
                    fill="#fff"
                    fontSize="12"
                    fontWeight="600"
                    style={{ pointerEvents: 'none' }}
                  >
                    {s.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* 中心状态：绝对居中于圆环容器内 */}
        <div className={`${styles.loopCenter} ${isRunning ? styles.pulsing : ''}`}>
          <div className={styles.loopStatus}>
            <span className={styles.statusMain}>Agent</span>
            <span className={styles.statusSub}>{statusText}</span>
          </div>
        </div>
      </div>

      {/* 控制按钮 */}
      <div className={styles.loopControls}>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={runLoop} disabled={isRunning}>
          ▶ 演示循环
        </button>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={resetLoop}>
          ↺ 重置
        </button>
      </div>

      {/* 当前详情 */}
      {currentStep > 0 && (
        <div className={styles.detailCard}>
          <strong>
            步骤 {currentStep}: {loopSteps.find((s) => s.step === currentStep)?.label}
          </strong>
          <p>{loopSteps.find((s) => s.step === currentStep)?.detail}</p>
          <code>{loopSteps.find((s) => s.step === currentStep)?.log}</code>
        </div>
      )}

      {/* 日志面板 */}
      <div className={styles.logPanel}>
        {logs.map((log, i) => (
          <div key={i} className={`${styles.logItem} ${i === logs.length - 1 ? styles.newLog : ''}`}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};

// ===== 工具箱 =====
const ToolBox: React.FC = () => {
  const tools = [
    { icon: '📁', name: '文件系统', desc: '读写、创建、删除、搜索' },
    { icon: '🔍', name: '代码搜索', desc: 'grep/ripgrep 全文搜索' },
    { icon: '⚡', name: '命令执行', desc: 'Shell 命令、脚本运行' },
    { icon: '🌐', name: '网络请求', desc: 'API 调用、网页抓取' },
    { icon: '🖼️', name: '图像生成', desc: 'AI 图像生成能力' },
    { icon: '🤝', name: '子代理', desc: 'Task 工具，并行处理' },
  ];

  return (
    <div className={styles.toolBox}>
      <h4>🧰 Agent 的工具箱</h4>
      <p>除了 Skill，Agent 还拥有这些内置工具：</p>
      <div className={styles.toolGrid}>
        {tools.map((t) => (
          <div key={t.name} className={styles.toolItem}>
            <span className={styles.toolIcon}>{t.icon}</span>
            <div>
              <strong>{t.name}</strong>
              <small>{t.desc}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ===== 工作模式卡片 =====
const ModeCard: React.FC<{
  mode: string;
  title: string;
  desc: string;
  color: string;
  active?: boolean;
}> = ({ mode, title, desc, color }) => (
  <div className={styles.modeCard} style={{ '--mode-color': color } as React.CSSProperties}>
    <div className={styles.modeTag}>{mode}</div>
    <h4>{title}</h4>
    <p>{desc}</p>
  </div>
);

// ===== Agent 主章节 =====
const AgentSection: React.FC = () => {
  return (
    <section id="agent" className={`${styles.section} ${styles.altBg}`}>
      <div className={styles.header}>
        <span className={styles.tag}>Section 02</span>
        <h2 className={styles.title}>
          什么是 <em>Agent</em>？
        </h2>
        <p className={styles.desc}>
          Agent 是一个能够<strong>自主思考</strong>、<strong>选择工具</strong>、<strong>执行动作</strong>并
          <strong>迭代优化</strong>
          直到任务完成的智能体。 它不是简单的问答机器人，而是一个有目标驱动能力的执行者。
        </p>
      </div>

      {/* Agent 循环演示 */}
      <AgentLoop />

      {/* 工具箱 */}
      <ToolBox />

      {/* 三种工作模式 */}
      <div className={styles.modes}>
        <h4>⚙️ 三种工作模式</h4>
        <div className={styles.modesGrid}>
          <ModeCard
            mode="Craft"
            title="动手模式"
            desc="直接行动！收到任务后立即分析、规划、执行，快速交付结果。"
            color="#6c5ce7"
          />
          <ModeCard
            mode="Plan"
            title="规划模式"
            desc="先想后做。制定详细计划，等主人确认后再逐步执行。"
            color="#00cec9"
          />
          <ModeCard
            mode="Ask"
            title="咨询模式"
            desc="只说不做。回答问题、分析信息、给出建议，但不修改任何文件。"
            color="#fd79a8"
          />
        </div>
      </div>
    </section>
  );
};

export default memo(AgentSection);
