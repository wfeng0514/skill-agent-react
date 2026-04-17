// ===== 通用工具函数 =====

/**
 * 延迟执行（用于动画序列）
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 生成带前缀的 CSS 类名
 */
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let last = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= delay) {
      fn(...args);
      last = now;
    }
  };
}
