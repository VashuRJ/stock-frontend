import React, { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'

// Types define karte hain
type Point = {
  time: string
  timestamp?: number
  open?: number
  high?: number
  low?: number
  close?: number
  volume?: number
  sma?: number
  ema?: number
  bollinger?: {
    upper: number
    middle: number
    lower: number
  }
  rsi?: number
  macd?: number
  macdSignal?: number
  macdHist?: number
}

interface EChartCandleProps {
  data: Point[]
  showVolume?: boolean
  showIndicators?: boolean
  showRSI?: boolean
  showMACD?: boolean
}

export default function EChartCandle({ data, showVolume = true, showIndicators = false, showRSI = false, showMACD = false }: EChartCandleProps) {
  
  const option = useMemo(() => {
    if (!data || data.length === 0) return {}

    const dates = data.map(item => item.time)
    
    // Candle Data: [Open, Close, Low, High]
    const candleValues = data.map(item => [
      item.open ?? 0,
      item.close ?? 0,
      item.low ?? 0,
      item.high ?? 0
    ])

    // Volume Data with Colors
    const volumes = data.map((item) => ({
      value: item.volume ?? 0,
      itemStyle: {
        color: (item.close ?? 0) > (item.open ?? 0) ? '#26a69a' : '#ef5350'
      }
    }))

    // Indicators Data (Crash Proofing: Pass '-' instead of null/undefined)
    const smaData = data.map(d => d.sma ?? null)
    const emaData = data.map(d => d.ema ?? null)
    const macdLine = data.map(d => d.macd ?? null)
    const macdSignal = data.map(d => d.macdSignal ?? null)
    const macdHist = data.map(d => d.macdHist ?? null)
    const bUpper = data.map(d => d.bollinger?.upper ?? null)
    const bMiddle = data.map(d => d.bollinger?.middle ?? null)
    const bLower = data.map(d => d.bollinger?.lower ?? null)
    const rsiData = data.map(d => d.rsi ?? null)

    return {
      backgroundColor: '#131722',
      animation: false,
      grid: [
        // Main price grid
        { left: 50, right: 50, top: 20, height: showVolume ? '60%' : '75%' },
        // Volume grid (middle)
        { left: 50, right: 50, top: showVolume ? '72%' : '90%', height: showVolume ? '15%' : 0 },
        // Indicator / timeline grid (bottom) - timeline labels will appear here
        ...(showIndicators ? [{ left: 50, right: 50, top: '85%', height: '15%' }] : [{ left: 50, right: 50, top: '85%', height: '8%' }])
      ],
      xAxis: [
        // price axis - hide labels (timeline will be at bottom)
        { type: 'category', data: dates, gridIndex: 0, splitLine: { show: false }, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false } },
        // volume axis - hide labels
        { type: 'category', data: dates, gridIndex: 1, splitLine: { show: false }, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false } },
        // bottom timeline axis - show compact labels
        ...(showIndicators ? [{ type: 'category', data: dates, gridIndex: 2, splitLine: { show: false }, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: true, color: '#8b95a1', fontSize: 11 } }] : [{ type: 'category', data: dates, gridIndex: 2, splitLine: { show: false }, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: true, color: '#8b95a1', fontSize: 11 } }])
      ],
      yAxis: [
        { scale: true, gridIndex: 0, position: 'right', splitLine: { show: false } },
        { scale: true, gridIndex: 1, show: false, splitLine: { show: false } },
        ...(showIndicators ? [{ type: 'value', gridIndex: 2, splitLine: { show: false }, position: 'right' }] : [{ type: 'value', gridIndex: 2, splitLine: { show: false }, position: 'right' }])
      ],
      dataZoom: [
        // Keep only inside dataZoom for horizontal (time) and vertical (price)
        { type: 'inside', xAxisIndex: [0, 1].concat(showIndicators ? [2] : []) },
        { type: 'inside', yAxisIndex: [0], orient: 'vertical' }
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', label: { backgroundColor: '#2a2e39' } },
        backgroundColor: '#1e222d',
        borderColor: '#2a2e39',
        textStyle: { color: '#d1d4dc' },
        formatter: function (params: any) {
          if (!params || params.length === 0) return '';
          const date = params[0].axisValue;
          let res = `<div style="font-weight:bold; margin-bottom:5px;">${date}</div>`;
          params.forEach((param: any) => {
            if (param.value === '-' || param.value === null || param.value === undefined) return;
            if (param.seriesName === 'Price') {
              const [o, c, l, h] = param.data.slice(1);
              res += `O: ${o.toFixed(2)}  H: ${h.toFixed(2)}<br/>L: ${l.toFixed(2)}  C: ${c.toFixed(2)}<br/>`;
            } else if (param.seriesName !== 'Volume') {
              const val = typeof param.value === 'number' ? param.value.toFixed(2) : param.value;
              res += `<span style="color:${param.color}">●</span> ${param.seriesName}: ${val}<br/>`;
            }
          });
          return res;
        }
      },
      // Remove markLine and markPoint from all series to remove horizontal lines
      series: [
        {
          name: 'Price',
          type: 'candlestick',
          data: candleValues,
          itemStyle: {
            color: '#26a69a',
            color0: '#ef5350',
            borderColor: '#26a69a',
            borderColor0: '#ef5350'
          }
        },
        ...(showVolume ? [{
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumes
        }] : []),
        // Indicators (SMA, EMA, Bollinger, RSI, MACD) as before
        ...(showIndicators ? [
          {
            name: 'SMA(20)',
            type: 'line',
            data: smaData,
            smooth: true,
            symbol: 'none',
            lineStyle: { width: 2, color: '#ff9800' }
          },
          {
            name: 'EMA(12)',
            type: 'line',
            data: emaData,
            smooth: true,
            symbol: 'none',
            lineStyle: { width: 1, color: '#2196f3' }
          }
        ] : []),
        ...(showIndicators && bUpper.some(v => v !== null) ? [
          {
            name: 'BB Upper',
            type: 'line',
            data: bUpper,
            connectNulls: true,
            smooth: true,
            symbol: 'none',
            z: 5,
            yAxisIndex: 0,
            lineStyle: {
              width: 1.5,
              color: '#bb86fc',
              opacity: 1
            }
          },
          {
            name: 'BB Lower',
            type: 'line',
            data: bLower,
            connectNulls: true,
            smooth: true,
            symbol: 'none',
            z: 5,
            yAxisIndex: 0,
            lineStyle: {
              width: 1.5,
              color: '#bb86fc',
              opacity: 1
            }
          }
        ] : []),
        // RSI
        ...(showRSI ? [
          {
            name: 'RSI',
            type: 'line',
            data: rsiData,
            xAxisIndex: 2,
            yAxisIndex: 2,
            connectNulls: true,
            smooth: true,
            symbol: 'none',
            z: 4,
            lineStyle: {
              color: '#fbc02d',
              width: 1.5
            }
          },
          {
            name: 'RSI 70',
            type: 'line',
            data: new Array(dates.length).fill(70),
            xAxisIndex: 2,
            yAxisIndex: 2,
            symbol: 'none',
            lineStyle: {
              color: '#ef5350',
              type: 'dashed',
              width: 1
            }
          },
          {
            name: 'RSI 30',
            type: 'line',
            data: new Array(dates.length).fill(30),
            xAxisIndex: 2,
            yAxisIndex: 2,
            symbol: 'none',
            lineStyle: {
              color: '#26a69a',
              type: 'dashed',
              width: 1
            }
          }
        ] : []),
        // MACD
        ...(showMACD ? [
          {
            name: 'MACD',
            type: 'line',
            data: macdLine,
            xAxisIndex: 2,
            yAxisIndex: 2,
            smooth: true,
            symbol: 'none',
            lineStyle: { color: '#4caf50', width: 1.5 }
          },
          {
            name: 'Signal',
            type: 'line',
            data: macdSignal,
            xAxisIndex: 2,
            yAxisIndex: 2,
            smooth: true,
            symbol: 'none',
            lineStyle: { color: '#ff9800', width: 1.2 }
          },
          {
            name: 'Histogram',
            type: 'bar',
            data: macdHist,
            xAxisIndex: 2,
            yAxisIndex: 2,
            barWidth: '60%',
            itemStyle: {
              color: (params: any) =>
                params.value >= 0 ? '#26a69a' : '#ef5350'
            }
          },
          {
            name: 'MACD Zero',
            type: 'line',
            data: new Array(dates.length).fill(0),
            xAxisIndex: 2,
            yAxisIndex: 2,
            symbol: 'none',
            lineStyle: {
              color: '#9e9e9e',
              type: 'dashed',
              width: 1
            }
          }
        ] : [])
      ]
    }
  }, [data, showVolume, showIndicators, showRSI, showMACD])

  // Handler to reset yAxis zoom on double-click
  const onChartReady = (chart: any) => {
    chart.getZr().on('dblclick', (params: any) => {
      // Only reset if double-click is on the price axis area (right side)
      const dom = chart.getDom();
      const rect = dom.getBoundingClientRect();
      // If click is within 60px of the right edge (adjust as needed)
      if (params && params.offsetX > rect.width - 60) {
        chart.dispatchAction({
          type: 'dataZoom',
          // Reset yAxis zoom
          start: 0,
          end: 100,
          yAxisIndex: 0
        });
      }
    });
  };
  return (
    <div className="w-full h-full">
        <ReactECharts 
            key={showIndicators ? 'indicators-on' : 'indicators-off'}
            option={option} 
            style={{ height: '100%', width: '100%' }} 
            notMerge={true}
            lazyUpdate={false}
            onChartReady={onChartReady}
        />
    </div>
  )
}