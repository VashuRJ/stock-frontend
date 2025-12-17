import React, { useEffect, useRef } from 'react'
import { createChart, IChartApi, ISeriesApi, DeepPartial, ChartOptions } from 'lightweight-charts'

type Point = {
  time: number // unix seconds
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export default function LightweightCandle({ data, showVolume = true }: { data: any[], showVolume?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  useEffect(() => {
    if (!ref.current) return

    // Basic chart options to match app theme
    const options: DeepPartial<ChartOptions> = {
      layout: { background: { color: '#131722' }, textColor: '#d1d4dc' },
      rightPriceScale: { visible: true, borderColor: '#2a2e39' },
      timeScale: { borderColor: '#2a2e39', timeVisible: true, secondsVisible: false },
      grid: { vertLines: { color: '#111318' }, horzLines: { color: '#111318' } },
    }

    const chart = createChart(ref.current, { width: ref.current.clientWidth, height: ref.current.clientHeight, layout: options.layout, rightPriceScale: options.rightPriceScale, timeScale: options.timeScale, grid: options.grid })
    chartRef.current = chart

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: true,
      wickVisible: true,
      borderColor: '#00000000'
    })
    candleRef.current = candleSeries

    if (showVolume) {
      // Place volume in its own bottom pane by using an empty priceScaleId
      // and reserve more space for the main price pane (increase top margin)
      const vol = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: '',
        color: '#26a69a',
        base: 0,
        overlay: false,
        // Reserve ~85% of the chart for price, leaving ~15% for volume
        scaleMargins: { top: 0.85, bottom: 0 },
        // Let lightweight-charts autoscale the histogram within its pane
        autoscale: true,
      })
      volRef.current = vol
    }

    const handleResize = () => {
      if (!ref.current || !chartRef.current) return
      chartRef.current.applyOptions({ width: ref.current.clientWidth, height: ref.current.clientHeight })
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartRef.current) chartRef.current.remove()
      chartRef.current = null
      candleRef.current = null
      volRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!chartRef.current || !candleRef.current) return

    // convert incoming data to lightweight format (time in seconds)
    const candleData: Point[] = data.map((d: any) => ({
      time: Math.floor((d.timestamp || Date.now()) / 1000),
      open: Number(d.open ?? d.price ?? d.o ?? 0),
      high: Number(d.high ?? d.h ?? d.price ?? 0),
      low: Number(d.low ?? d.l ?? d.price ?? 0),
      close: Number(d.close ?? d.price ?? d.c ?? 0),
      volume: Number(d.volume ?? 0)
    }))

    candleRef.current.setData(candleData)

    if (showVolume && volRef.current) {
      const hist = candleData.map(p => ({ time: p.time, value: p.volume || 0, color: p.close >= p.open ? '#26a69a' : '#ef5350' }))
      volRef.current.setData(hist)
    }
  }, [data, showVolume])

  return (
    <div style={{ width: '100%', height: '100%' }} ref={ref} />
  )
}
