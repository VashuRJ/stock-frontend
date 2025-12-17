import React, { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'

// Aapke Dashboard se jo data aa raha hai uska type
type Point = {
  time: string       // time label (e.g., "10:30")
  timestamp?: number
  open?: number
  high?: number
  low?: number
  close?: number
  volume?: number
  sma?: number       // Simple Moving Average (Indicators)
  ema?: number       // Exponential Moving Average
}

interface EChartCandleProps {
  data: Point[]
  showVolume?: boolean
}

export default function EChartCandle({ data, showVolume = true }: EChartCandleProps) {
  
  // Data ko ECharts ke format mein convert karna padega
  const option = useMemo(() => {
    if (!data || data.length === 0) return {}

    // 1. Arrays prepare karo
    const dates = data.map(item => item.time)
    
    // ECharts Candlestick format: [Open, Close, Low, High]
    const candleValues = data.map(item => [
      item.open ?? 0,
      item.close ?? 0,
      item.low ?? 0,
      item.high ?? 0
    ])

    // Volume data with color logic (Green if Up, Red if Down)
    const volumes = data.map((item, index) => ({
      value: item.volume ?? 0,
      itemStyle: {
        color: (item.close ?? 0) > (item.open ?? 0) ? '#26a69a' : '#ef5350'
      }
    }))

    // SMA/EMA Data (agar available ho)
    const smaData = data.map(item => item.sma || null)
    const emaData = data.map(item => item.ema || null)

    return {
      backgroundColor: '#131722', // Aapke app ka dark background
      animation: false, // Performance ke liye animation band
      
      // Layout Grid (Price upar, Volume neeche)
      grid: [
        {
          left: '50px',
          right: '50px',
          top: '20px',
          height: showVolume ? '65%' : '85%' // Volume on hai to price chart chhota karo
        },
        {
          left: '50px',
          right: '50px',
          top: showVolume ? '75%' : '90%', // Volume bar neeche
          height: showVolume ? '15%' : '0%',
          show: showVolume
        }
      ],

      // X-Axis (Time)
      xAxis: [
        {
          type: 'category',
          data: dates,
          gridIndex: 0, // Price chart
          axisLine: { lineStyle: { color: '#2a2e39' } },
          axisLabel: { color: '#787b86' },
          axisPointer: { label: { show: false } }
        },
        {
          type: 'category',
          data: dates,
          gridIndex: 1, // Volume chart
          show: false   // Hide labels for volume
        }
      ],

      // Y-Axis (Price & Volume)
      yAxis: [
        {
          scale: true, // Auto scale based on price
          gridIndex: 0,
          splitLine: { show: true, lineStyle: { color: '#1f2330' } }, // Grid lines
          axisLabel: { color: '#787b86' },
          axisLine: { show: false },
          position: 'right' // Price right side pe
        },
        {
          scale: true,
          gridIndex: 1,
          splitLine: { show: false },
          axisLabel: { show: false },
          axisLine: { show: false }
        }
      ],

      // Mouse Hover Tooltip
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', label: { backgroundColor: '#2a2e39' } },
        backgroundColor: '#1e222d',
        borderColor: '#2a2e39',
        textStyle: { color: '#d1d4dc' },
        // Tooltip formatting is optional, default is mostly fine
      },

      // Zoom Slider (Bottom Scrollbar)
      dataZoom: [
        {
          type: 'inside', // Mouse scroll se zoom
          xAxisIndex: [0, 1],
          start: 50,      // Default zoom level (last 50% data)
          end: 100
        },
        {
          type: 'slider', // Neeche wala slider bar
          xAxisIndex: [0, 1],
          top: '92%',
          height: 20,
          borderColor: '#2a2e39',
          textStyle: { color: '#787b86' },
          handleStyle: { color: '#2962ff' },
          dataBackground: { lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 } },
          brushSelect: false
        }
      ],

      // The Actual Charts
      series: [
        {
          name: 'Price',
          type: 'candlestick',
          data: candleValues,
          itemStyle: {
            color: '#26a69a',        // Bullish (Green) body
            color0: '#ef5350',       // Bearish (Red) body
            borderColor: '#26a69a',  // Wick color same as body
            borderColor0: '#ef5350'
          }
        },
        // Volume Bars
        ...(showVolume ? [{
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumes
        }] : []),
        // SMA Line (Yellow)
        {
          name: 'SMA(20)',
          type: 'line',
          data: smaData,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1, color: '#ff9800' }
        },
        // EMA Line (Blue)
        {
          name: 'EMA(12)',
          type: 'line',
          data: emaData,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1, color: '#2196f3' }
        }
      ]
    }
  }, [data, showVolume])

  return (
    <div className="w-full h-full">
      <ReactECharts 
        option={option} 
        style={{ height: '100%', width: '100%' }} 
        notMerge={true} // Performance boost
      />
    </div>
  )
}