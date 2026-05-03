import ReactECharts from 'echarts-for-react';
import type { RecentBattle } from '../../types/battle';

interface TrophyChartProps {
  battles: RecentBattle[];
}

const COLOR_LOSS = '#ef4444';
const COLOR_NEUTRAL = '#52525b';
const COLOR_WIN = '#22c55e';

const TrophyChart: React.FC<TrophyChartProps> = ({ battles }) => {
  
  console.log("got battles:", battles.slice(0,5))
  
  const chronological = [...battles].reverse();
  const trophies = chronological.map((b) => b.trophies);
  const changes = chronological.map((b) => b.trophyChange);

  const dataMin = Math.min(...trophies);
  const dataMax = Math.max(...trophies);
  const padding = Math.max(5, Math.round((dataMax - dataMin) * 0.2));

  const changeMax = Math.max(1, ...changes.map((c) => Math.abs(c)));

  const points = chronological.map((b) => [b.trophies, b.trophyChange]);

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
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 12,
      },
      axisPointer: {
        lineStyle: { color: 'rgba(255, 255, 255, 0.15)' },
      },
      formatter: (params: { dataIndex: number }[]) => {
        const i = params[0].dataIndex;
        const b = chronological[i];
        const change =
          b.trophyChange > 0 ? `+${b.trophyChange}` : `${b.trophyChange}`;
        const changeColor =
          b.trophyChange > 0
            ? COLOR_WIN
            : b.trophyChange < 0
              ? COLOR_LOSS
              : COLOR_NEUTRAL;
        return `
          <div style="font-weight:500;color:#fafafa;margin-bottom:4px">${b.map}</div>
          <div style="color:#a1a1aa">Mode: <span style="color:#d4d4d8">${b.modeId}</span></div>
          <div style="color:#a1a1aa">Brawler: <span style="color:#d4d4d8">${b.brawler}</span></div>
          <div style="color:#a1a1aa">Trophies: <span style="color:${changeColor};font-weight:500">${change}</span></div>
        `;
      },
    },
    visualMap: {
      show: false,
      type: 'continuous',
      seriesIndex: 0,
      dimension: 1,
      min: -changeMax,
      max: changeMax,
      inRange: {
        color: [COLOR_LOSS, COLOR_NEUTRAL, COLOR_WIN],
      },
    },
    xAxis: {
      type: 'category',
      data: chronological.map((_, i) => String(i + 1)),
      show: false,
      boundaryGap: false,
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
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 11,
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.04)',
          type: 'solid',
        },
      },
    },
    series: [
      {
        type: 'line',
        dimensions: ['trophies', 'change'],
        data: points,
        smooth: 0.25,
        symbol: 'circle',
        symbolSize: 7,
        showSymbol: true,
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
