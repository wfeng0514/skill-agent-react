import { memo, useState, useCallback } from 'react';
import { presetTasks, agentScenarios } from '../utils/constants';
import type { OutputLine } from '../types';
import { sleep } from '../utils/helpers';
import styles from './PlaygroundSection.module.scss';

const PlaygroundSection: React.FC = () => {
  const [taskInput, setTaskInput] = useState(presetTasks[0].task);
  const [activePreset, setActivePreset] = useState<string>('pdf');
  const [isRunning, setIsRunning] = useState(false);
  const [outputLines, setOutputLines] = useState<OutputLine[]>([]);
  const [showOutput, setShowOutput] = useState(false);

  const handlePresetSelect = useCallback(
    (id: string) => {
      if (isRunning) return;
      setActivePreset(id);
      const preset = presetTasks.find((p) => p.id === id);
      if (preset) setTaskInput(preset.task);
      setOutputLines([]);
      setShowOutput(false);
    },
    [isRunning],
  );

  const handleRun = useCallback(async () => {
    if (!taskInput.trim() || isRunning) return;

    setIsRunning(true);
    setShowOutput(true);
    setOutputLines([]);

    // 获取对应场景
    const scenario = agentScenarios[activePreset] || agentScenarios.pdf;

    for (const line of scenario) {
      await sleep(600 + Math.random() * 400);
      setOutputLines((prev) => [...prev, line]);
    }

    // 完成标记
    await sleep(300);
    setOutputLines((prev) => [
      ...prev,
      {
        type: 'result',
        text: '━━━ Agent 执行完毕 ━━━',
      },
    ]);

    setIsRunning(false);
  }, [taskInput, isRunning, activePreset]);

  return (
    <section id="playground" className={`${styles.section} ${styles.altBg}`}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.tag}>Section 04</span>
        <h2 className={styles.title}>🧪 实验场</h2>
        <p className={styles.desc}>
          选择一个预设任务，模拟 Agent 从接收到完成的完整执行过程。
          观察它如何分析任务、匹配 Skill、调用工具、输出结果。
        </p>
      </div>

      <div className={styles.playground}>
        {/* 输入区 */}
        <div className={styles.inputArea}>
          <label className={styles.label}>选择预设任务：</label>
          <div className={styles.presetBtns}>
            {presetTasks.map((preset) => (
              <button
                key={preset.id}
                className={`${styles.presetBtn} ${activePreset === preset.id ? styles.active : ''}`}
                onClick={() => handlePresetSelect(preset.id)}
                disabled={isRunning}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <label className={styles.label} style={{ marginTop: '16px' }}>
            任务描述：
          </label>
          <textarea
            className={styles.textarea}
            value={taskInput}
            onChange={(e) => {
              setTaskInput(e.target.value);
              setActivePreset('');
            }}
            placeholder="输入你想让 Agent 做的任务..."
            rows={3}
            disabled={isRunning}
          />

          <button
            className={`${styles.runBtn} ${isRunning ? styles.running : ''}`}
            onClick={handleRun}
            disabled={!taskInput.trim() || isRunning}
          >
            {isRunning ? (
              <>
                <span className={styles.spinner} />
                Agent 执行中...
              </>
            ) : (
              <>🚀 运行 Agent</>
            )}
          </button>
        </div>

        {/* 输出区 */}
        {showOutput && (
          <div className={styles.outputArea}>
            <div className={styles.outputHeader}>
              <span className={styles.outputTitle}>📋 Agent 执行日志</span>
              <span
                className={`${styles.statusBadge} ${isRunning ? styles.active : styles.done}`}
              >
                {isRunning ? '运行中' : outputLines.length > 0 ? '完成' : ''}
              </span>
            </div>
            <div className={styles.outputStream}>
              {outputLines.map((line, i) => (
                <div key={i} className={`${styles.outputLine} ${styles[line.type]}`}>
                  {line.text}
                </div>
              ))}
              {outputLines.length === 0 && (
                <div className={`${styles.outputLine} ${styles.empty}`}>等待执行...</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className={styles.footerNote}>
        <p>
          💡 提示：这是一个<strong>前端模拟演示</strong>，展示的是 Agent
          的决策和执行流程。
        </p>
        <p>在实际系统中，Agent 会真正调用 Skill 和工具来完成这些操作。</p>
      </div>
    </section>
  );
};

export default memo(PlaygroundSection);
