import ReactECharts from 'echarts-for-react';
import type { OutcomeCell } from '../../types/battle';
import { CHART_FONT, COLOR_DRAW, COLOR_LOSS, COLOR_WIN } from '../../lib/chartUtils';

interface WinrateChartProps {
  metrics: OutcomeCell;
  compact?: boolean;
  label?: string;
}

const WinrateChart: React.FC<WinrateChartProps> = ({ metrics, compact = false, label = 'Winrate' }) => {
  const total = metrics.wins + metrics.draws + metrics.losses;
  const winratePct = total > 0 ? Math.round((metrics.wins / total) * 100) : 0;

  const height = compact ? 170 : 360;
  const pctFontSize = compact ? 20 : 28;
  const labelFontSize = compact ? 9 : 11;
  const labelTop = compact ? '66%' : '60%';
  const radius: [string, string] = compact ? ['62%', '88%'] : ['58%', '82%'];

  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15, 4, 9, 0.92)',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      borderWidth: 1,
      padding: 10,
      textStyle: {
        color: '#d4d4d8',
        fontFamily: CHART_FONT,
        fontSize: 12,
      },
      formatter: (p: { name: string; value: number; percent: number }) =>
        `<span style="color:#a1a1aa">${p.name}</span> &nbsp; <span style="color:#e4e4e7;font-weight:500">${p.value}</span> &nbsp; <span style="color:#71717a">(${p.percent.toFixed(0)}%)</span>`,
    },
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: 'center',
        style: {
          text: total > 0 ? `${winratePct}%` : '—',
          fill: '#fafafa',
          fontFamily: CHART_FONT,
          fontSize: pctFontSize,
          fontWeight: 600,
          textAlign: 'center',
        },
      },
      {
        type: 'text',
        left: 'center',
        top: labelTop,
        style: {
          text: label,
          fill: '#71717a',
          fontFamily: CHART_FONT,
          fontSize: labelFontSize,
          textAlign: 'center',
        },
      },
    ],
    series: [
      {
        type: 'pie',
        radius,
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: {
          borderColor: '#0f0409',
          borderWidth: 2,
        },
        emphasis: {
          scale: true,
          scaleSize: 4,
        },
        data: [
          { name: 'Wins', value: metrics.wins, itemStyle: { color: COLOR_WIN } },
          { name: 'Draws', value: metrics.draws, itemStyle: { color: COLOR_DRAW } },
          { name: 'Losses', value: metrics.losses, itemStyle: { color: COLOR_LOSS } },
        ],
      },
    ],
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} />;
};

export default WinrateChart;
