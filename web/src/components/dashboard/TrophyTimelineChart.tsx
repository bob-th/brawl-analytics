import ReactECharts from 'echarts-for-react';
import {
  CHART_FONT,
  COLOR_WIN,
  niceTenInterval,
  rangeOf,
} from '../../lib/chartUtils';

interface TrophyPoint {
  battleTime: string;
  trophies: number;
}

interface TrophyTimelineChartProps {
  points: TrophyPoint[];
}

function formatBattleTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const TrophyTimelineChart: React.FC<TrophyTimelineChartProps> = ({ points }) => {
  const chronological = [...points].reverse();
  const trophyValues = chronological.map((p) => p.trophies);
  const { min: dataMin, max: dataMax } = rangeOf(trophyValues);
  const yMin = Math.floor(dataMin / 10) * 10;
  const yMax = Math.ceil(dataMax / 10) * 10;
  const yInterval = niceTenInterval(yMax - yMin);

  const option = {
    grid: { left: 56, right: 16, top: 16, bottom: 16 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 4, 9, 0.92)',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      borderWidth: 1,
      padding: 10,
      textStyle: {
        color: '#d4d4d8',
        fontFamily: CHART_FONT,
        fontSize: 12,
      },
      axisPointer: { lineStyle: { color: 'rgba(255, 255, 255, 0.15)' } },
      formatter: (params: { dataIndex: number }[]) => {
        const i = params[0].dataIndex;
        const p = chronological[i];
        return `
          <div style="font-size:11px;color:#71717a;margin-bottom:4px">${formatBattleTime(p.battleTime)}</div>
          <div style="font-size:13px;color:#fafafa;font-weight:500">${p.trophies.toLocaleString()} <span style="color:#71717a;font-weight:400">trophies</span></div>
        `;
      },
    },
    xAxis: {
      type: 'category',
      data: chronological.map((_, i) => String(i + 1)),
      show: false,
    },
    yAxis: {
      type: 'value',
      min: yMin,
      max: yMax,
      interval: yInterval,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: 'rgba(228, 228, 231, 0.45)',
        fontFamily: CHART_FONT,
        fontSize: 11,
      },
      splitLine: {
        lineStyle: { color: 'rgba(255, 255, 255, 0.04)', type: 'solid' },
      },
    },
    series: [
      {
        type: 'line',
        data: trophyValues,
        smooth: 0.35,
        symbol: 'none',
        lineStyle: {
          width: 2,
          color: COLOR_WIN,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(34, 197, 94, 0.35)' },
              { offset: 1, color: 'rgba(34, 197, 94, 0.0)' },
            ],
          },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 360, width: '100%' }} />;
};

export default TrophyTimelineChart;
