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
}

interface EChartCandleProps {
  data: Point[]
  showVolume?: boolean
  showIndicators?: boolean
}

export default function EChartCandle({ data, showVolume = true, showIndicators = false }: EChartCandleProps) {
  
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

  const bUpper = data.map(d => d.bollinger?.upper ?? null)
  const bMiddle = data.map(d => d.bollinger?.middle ?? null)
  const bLower = data.map(d => d.bollinger?.lower ?? null)


    return {
      backgroundColor: '#131722',
      animation: false,
      grid: [
        {
          left: '50px',
          right: '50px',
          top: '20px',
          height: showVolume ? '60%' : '82%'
        },
        {
          left: '50px',
          right: '50px',
          top: showVolume ? '72%' : '90%',
          height: showVolume ? '15%' : '0%',
          show: showVolume
        }
      ],
      xAxis: [
        {
          type: 'category',
          data: dates,
          gridIndex: 0,
          axisLine: { lineStyle: { color: '#2a2e39' } },
          axisLabel: { color: '#787b86' },
          axisPointer: { label: { show: false } }
        },
        {
          type: 'category',
          data: dates,
          gridIndex: 1,
          show: false
        }
      ],
      yAxis: [
        {
          scale: true,
          gridIndex: 0,
          splitLine: { show: true, lineStyle: { color: '#1f2330' } },
          axisLabel: { color: '#787b86' },
          axisLine: { show: false },
          position: 'right'
        },
        {
          scale: true,
          gridIndex: 1,
          splitLine: { show: false },
          axisLabel: { show: false },
          axisLine: { show: false }
        }
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
                // Agar value '-' hai ya null hai, to skip karo
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
      dataZoom: [
        { 
          type: 'inside', 
          xAxisIndex: [0, 1],
          // start: 50 hata diya hai taaki auto-zoom na ho
        },
        { 
          type: 'slider', 
          xAxisIndex: [0, 1], 
          top: '92%', 
          height: 20, 
          borderColor: '#2a2e39', 
          handleStyle: { color: '#2962ff' } 
        }
      ],
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
        
// 🔵 SMA & EMA (as-is)
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

// 🟣 Bollinger Bands (ONLY if valid data exists)
...(showIndicators && bUpper.some(v => v !== null) ? [
{
  name: 'BB Upper',
  type: 'line',
  data: bUpper,
  connectNulls: true,
  smooth: true,
  symbol: 'none',
  z: 5,                 //  IMPORTANT
  yAxisIndex: 0,        //  IMPORTANT
  lineStyle: {
    width: 1.5,         //  slightly thicker
    color: '#bb86fc',   //  brighter purple
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
] : [])

      ]
    }
  }, [data, showVolume, showIndicators])

  return (
    <div className="w-full h-full">
        <ReactECharts 
            option={option} 
            style={{ height: '100%', width: '100%' }} 
            notMerge={true}
            lazyUpdate={false}
        />
    </div>
  )
}