// ===== 类型定义 =====

// Skill 相关
export interface SkillFile {
  name: string;
  type: 'file' | 'folder';
  children?: SkillFile[];
  content?: string;
}

export interface SkillFeature {
  icon: string;
  title: string;
  description: string;
  color: string;
}

// Agent 循环
export interface LoopStep {
  step: number;
  label: string;
  log: string;
  detail: string;
}

// 实验场
export interface PresetTask {
  id: string;
  label: string;
  task: string;
}

export interface OutputLine {
  type: 'step' | 'skill' | 'tool' | 'result';
  text: string;
}

export interface AgentScenario {
  [key: string]: OutputLine[];
}
