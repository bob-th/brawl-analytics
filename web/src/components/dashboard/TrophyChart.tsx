import ReactECharts from 'echarts-for-react';
import type { RecentBattle } from '../../types/battle';
import { brawlerName } from '../../data/brawlers';
import { modeName } from '../../data/modes';

const CHART_FONT = '"Google Sans Code", monospace';

interface TrophyChartProps {
  battles: RecentBattle[];
}

const COLOR_LOSS = '#ef4444';
const COLOR_NEUTRAL = '#52525b';
const COLOR_WIN = '#22c55e';

function colorForChange(change: number): string {
  if (change > 0) return COLOR_WIN;
  if (change < 0) return COLOR_LOSS;
  return COLOR_NEUTRAL;
}

function formatResult(result: string | number): string {
  if (typeof result === 'number') return `Rank ${result}`;
  if (!result) return '—';
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function colorForResult(result: string | number): string {
  if (typeof result === 'number') return result <= 4 ? COLOR_WIN : COLOR_LOSS;
  if (result === 'victory') return COLOR_WIN;
  if (result === 'defeat') return COLOR_LOSS;
  return COLOR_NEUTRAL;
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

const TrophyChart: React.FC<TrophyChartProps> = ({ battles }) => {
  console.log("got battles:", battles.slice(0, 5));

  const chronological = [...battles].reverse();
  const trophies = chronological.map((b) => b.trophies);

  const dataMin = Math.min(...trophies);
  const dataMax = Math.max(...trophies);
  const padding = Math.max(5, Math.round((dataMax - dataMin) * 0.2));

  const data = chronological.map((b) => ({
    value: b.trophies,
    itemStyle: { color: colorForChange(b.trophyChange) },
  }));

  const colorStops =
    chronological.length === 1
      ? [
          { offset: 0, color: colorForChange(chronological[0].trophyChange) },
          { offset: 1, color: colorForChange(chronological[0].trophyChange) },
        ]
      : chronological.map((b, i) => ({
          offset: i / (chronological.length - 1),
          color: colorForChange(b.trophyChange),
        }));

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
        const b = chronological[i];
        const change =
          b.trophyChange > 0 ? `+${b.trophyChange}` : `${b.trophyChange}`;
        const changeColor = colorForChange(b.trophyChange);
        const result = formatResult(b.result);
        const resultColor = colorForResult(b.result);

        return `
          <div style="font-weight:500;color:#fafafa;font-size:13px;margin-bottom:2px">${b.map}</div>
          <div style="font-size:11px;color:#71717a;margin-bottom:8px">${formatBattleTime(b.battleTime)}</div>
          <div style="display:grid;grid-template-columns:auto auto;gap:3px 14px;font-size:12px">
            <span style="color:#a1a1aa">Mode</span>
            <span style="color:#e4e4e7">${modeName(b.modeId)}</span>
            <span style="color:#a1a1aa">Brawler</span>
            <span style="color:#e4e4e7">${brawlerName(b.brawler)}</span>
            <span style="color:#a1a1aa">Result</span>
            <span style="color:${resultColor};font-weight:500">${result}</span>
            <span style="color:#a1a1aa">Trophies</span>
            <span style="color:#e4e4e7">${b.trophies.toLocaleString()}</span>
            <span style="color:#a1a1aa">Brawler trophies</span>
            <span style="color:#e4e4e7">${b.brawlerTrophies}</span>
            <span style="color:#a1a1aa">Change</span>
            <span style="color:${changeColor};font-weight:500">${change}</span>
          </div>
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
      min: dataMin - padding,
      max: dataMax + padding,
      scale: true,
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
        data: data,
        smooth: 0.25,
        symbol: 'circle',
        symbolSize: 7,
        showSymbol: true,
        lineStyle: {
          width: 2.5,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops,
          },
        },
        emphasis: {
          scale: 1.6,
          itemStyle: {
            borderColor: 'rgba(255, 255, 255, 0.85)',
            borderWidth: 2,
          },
        },
      },
    ],
  };

  return (
    <ReactECharts option={option} style={{ height: 360, width: '100%' }} />
  );
};

export default TrophyChart;
