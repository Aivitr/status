import { TemplateName, templateExtend } from '@gitgraph/react';
import { LANE_COLORS } from './types';

export function createMetroTemplate() {
  return templateExtend(TemplateName.Metro, {
    colors: Array.from(LANE_COLORS),
    branch: {
      lineWidth: 3,
      spacing: 40,
      label: {
        display: true,
        font: '600 9px var(--font-geist-mono), monospace',
        bgColor: 'var(--panel-surface)',
        borderRadius: 3,
      },
    },
    commit: {
      spacing: 68,
      hasTooltipInCompactMode: true,
      dot: {
        size: 6,
        strokeWidth: 2,
        strokeColor: 'var(--panel-surface)',
        font: '10px var(--font-geist-mono), monospace',
      },
      message: {
        display: false,
        font: '10px var(--font-geist-mono), monospace',
      },
    },
    arrow: {
      size: 6,
      offset: 2,
    },
  });
}
