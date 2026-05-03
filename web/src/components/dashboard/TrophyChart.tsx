import ReactECharts from 'echarts-for-react';
import type { RecentBattle } from '../../types/battle';

interface TrophyChartProps {
  battles: RecentBattle[];
}

const TrophyChart: React.FC<TrophyChartProps> = ({ battles }) => {
  const chronological = [...battles].reverse();
  const trophies = chronological.map((b) => b.trophies);
  const dataMin = Math.min(...trophies);
  const dataMax = Math.max(...trophies);
  const padding = Math.max(5, Math.round((dataMax - dataMin) * 0.2));

  const option = {
    grid: { left: 56, right: 16, top: 24, bottom: 24 },
    tooltip: {
      trigger: 'axis',
      formatter: (params: { dataIndex: number }[]) => {
        const i = params[0].dataIndex;
        const b = chronological[i];
        const change =
          b.trophyChange > 0 ? `+${b.trophyChange}` : `${b.trophyChange}`;
        return `Map: ${b.map}<br/>Mode: ${b.modeId}<br/>Brawler: ${b.brawler}<br/>Trophy change: ${change}`;
      },
    },
    xAxis: {
      type: 'category',
      data: chronological.map((_, i) => i + 1),
      axisLabel: { show: false },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    yAxis: {
      type: 'value',
      min: dataMin - padding,
      max: dataMax + padding,
      scale: true,
    },
    series: [
      {
        type: 'line',
        data: trophies,
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2 },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 360, width: '100%' }} />;
};

export default TrophyChart;
