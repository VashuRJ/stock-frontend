import React, { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  CandlestickData,
  HistogramData,
  LineData,
  Time,
  CrosshairMode
} from 'lightweight-charts';

// --- Types ---
type Point = {
  time: string;
  timestamp?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  sma?: number;
  ema?: number;
  bollinger?: {
    upper: number;
    middle: number;
    lower: number;
  };
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
};

interface EChartCandleProps {
  data: Point[];
  showVolume?: boolean;
  showIndicators?: boolean;
  showRSI?: boolean;
  showMACD?: boolean;
}

// Helper: Convert date string to timestamp
const parseTime = (timeStr: string, timestamp?: number): Time => {
  // If timestamp is provided directly, use it
  if (timestamp && timestamp > 0) {
    // Convert milliseconds to seconds if needed
    const ts = timestamp > 1e12 ? Math.floor(timestamp / 1000) : timestamp;
    return ts as Time;
  }

  // Handle "HH:MM" format (intraday)
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    now.setHours(hours, minutes, 0, 0);
    return Math.floor(now.getTime() / 1000) as Time;
  }

  // Handle "Mon DD" or "Jan 12" format
  if (/^[A-Za-z]{3}\s+\d{1,2}$/.test(timeStr)) {
    const now = new Date();
    const [monthStr, day] = timeStr.split(/\s+/);
    const months: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const month = months[monthStr] ?? now.getMonth();
    const year = now.getFullYear();
    const date = new Date(year, month, parseInt(day));
    return Math.floor(date.getTime() / 1000) as Time;
  }

  // Handle various date formats
  const date = new Date(timeStr);
  if (!isNaN(date.getTime())) {
    return Math.floor(date.getTime() / 1000) as Time;
  }

  // Fallback: try to parse as YYYY-MM-DD
  const parts = timeStr.split(/[-/T]/);
  if (parts.length >= 3) {
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    return Math.floor(new Date(year, month - 1, day).getTime() / 1000) as Time;
  }

  return 0 as Time;
};

// Helper: Validate candle data
const validateCandle = (item: Point): CandlestickData<Time> | null => {
  const open = Number(item.open);
  const close = Number(item.close);
  const high = Number(item.high);
  const low = Number(item.low);
  const time = parseTime(item.time, item.timestamp);

  // Skip invalid time
  if (!time || time === 0) {
    console.warn('Invalid time:', item.time, item.timestamp);
    return null;
  }

  // Skip invalid data
  if (isNaN(open) || isNaN(close) || isNaN(high) || isNaN(low)) {
    return null;
  }
  if (open <= 0 || close <= 0 || high <= 0 || low <= 0) {
    return null;
  }

  // Ensure data integrity
  const actualHigh = Math.max(high, open, close);
  const actualLow = Math.min(low, open, close);

  // Skip zero-range candles
  if (actualHigh === actualLow) {
    return null;
  }

  return {
    time,
    open,
    high: actualHigh,
    low: actualLow,
    close,
  };
};

export default function EChartCandle({
  data,
  showVolume = true,
  showIndicators = false,
  showRSI = false,
  showMACD = false,
}: EChartCandleProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsi70Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const rsi30Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const macdLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSignalRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdHistRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isChartInitialized = useRef<boolean>(false);
  const prevDataLength = useRef<number>(0);


  // Memoize processed data
  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) {
      console.warn('No data provided to chart');
      return null;
    }

    console.log('Processing chart data:', data.length, 'points');
    console.log('Sample data point:', data[0]);

    // Sort data by time and remove duplicates
    const sortedData = [...data].sort((a, b) => {
      const timeA = parseTime(a.time, a.timestamp);
      const timeB = parseTime(b.time, b.timestamp);
      return (timeA as number) - (timeB as number);
    });

    // Remove duplicates by time
    const uniqueData: Point[] = [];
    const seenTimes = new Set<number>();
    for (const item of sortedData) {
      const time = parseTime(item.time, item.timestamp) as number;
      if (time > 0 && !seenTimes.has(time)) {
        seenTimes.add(time);
        uniqueData.push(item);
      }
    }

    console.log('Unique data points:', uniqueData.length);

    // Process candle data
    const candleData: CandlestickData<Time>[] = [];
    const volumeData: HistogramData<Time>[] = [];
    const smaData: LineData<Time>[] = [];
    const emaData: LineData<Time>[] = [];
    const bbUpperData: LineData<Time>[] = [];
    const bbMiddleData: LineData<Time>[] = [];
    const bbLowerData: LineData<Time>[] = [];
    const rsiData: LineData<Time>[] = [];
    const macdLineData: LineData<Time>[] = [];
    const macdSignalData: LineData<Time>[] = [];
    const macdHistData: HistogramData<Time>[] = [];

    for (const item of uniqueData) {
      const candle = validateCandle(item);
      if (!candle) continue;

      candleData.push(candle);

      // Volume data
      if (item.volume !== undefined && item.volume > 0) {
        volumeData.push({
          time: candle.time,
          value: item.volume,
          color: candle.close >= candle.open
            ? 'rgba(38, 166, 154, 0.5)'
            : 'rgba(239, 83, 80, 0.5)',
        });
      }

      // Indicator data - SMA
      if (item.sma !== undefined && item.sma !== null && !isNaN(item.sma)) {
        smaData.push({ time: candle.time, value: item.sma });
      }
      // Indicator data - EMA
      if (item.ema !== undefined && item.ema !== null && !isNaN(item.ema)) {
        emaData.push({ time: candle.time, value: item.ema });
      }
      // Bollinger Bands
      if (item.bollinger?.upper !== undefined && !isNaN(item.bollinger.upper)) {
        bbUpperData.push({ time: candle.time, value: item.bollinger.upper });
      }
      if (item.bollinger?.middle !== undefined && !isNaN(item.bollinger.middle)) {
        bbMiddleData.push({ time: candle.time, value: item.bollinger.middle });
      }
      if (item.bollinger?.lower !== undefined && !isNaN(item.bollinger.lower)) {
        bbLowerData.push({ time: candle.time, value: item.bollinger.lower });
      }
      // RSI data
      if (item.rsi !== undefined && item.rsi !== null && !isNaN(item.rsi)) {
        rsiData.push({ time: candle.time, value: item.rsi });
      }
      // MACD data
      if (item.macd !== undefined && item.macd !== null && !isNaN(item.macd)) {
        macdLineData.push({ time: candle.time, value: item.macd });
      }
      if (item.macdSignal !== undefined && item.macdSignal !== null && !isNaN(item.macdSignal)) {
        macdSignalData.push({ time: candle.time, value: item.macdSignal });
      }
      if (item.macdHist !== undefined && item.macdHist !== null && !isNaN(item.macdHist)) {
        macdHistData.push({
          time: candle.time,
          value: item.macdHist,
          color: item.macdHist >= 0 ? '#26a69a' : '#ef5350',
        });
      }
    }

    console.log('Valid candles:', candleData.length);
    console.log('SMA data points:', smaData.length);
    console.log('EMA data points:', emaData.length);
    console.log('Bollinger data points:', bbUpperData.length);
    console.log('RSI data points:', rsiData.length);
    console.log('MACD data points:', macdLineData.length);
    if (candleData.length > 0) {
      console.log('First candle:', candleData[0]);
      console.log('Last candle:', candleData[candleData.length - 1]);
    }

    return { candleData, volumeData, smaData, emaData, bbUpperData, bbMiddleData, bbLowerData, rsiData, macdLineData, macdSignalData, macdHistData };
  }, [data]);

  // Initialize chart ONCE
  useEffect(() => {
    if (!chartContainerRef.current || isChartInitialized.current) return;

    // Create chart with v5 API
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#131722' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2a2e39' },
        horzLines: { color: '#2a2e39' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#787b86',
          width: 1,
          style: 2, // Dashed
          labelBackgroundColor: '#2962ff',
        },
        horzLine: {
          color: '#787b86',
          width: 1,
          style: 2,
          labelBackgroundColor: '#2962ff',
        },
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        scaleMargins: {
          top: 0.1,
          bottom: showVolume ? 0.25 : 0.1,
        },
        autoScale: true,
        mode: 0, // Normal price scale mode
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
        minBarSpacing: 2,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        axisDoubleClickReset: {
          time: true,
          price: true,
        },
        mouseWheel: true,
        pinch: true,
      },
      kineticScroll: {
        touch: true,
        mouse: true,
      },
    });

    chartRef.current = chart;
    isChartInitialized.current = true;

    // Create candlestick series - v5 API
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#089981',
      downColor: '#f23645',
      borderUpColor: '#089981',
      borderDownColor: '#f23645',
      wickUpColor: '#089981',
      wickDownColor: '#f23645',
    });
    candleSeriesRef.current = candleSeries;

    // Create volume series - ALWAYS create (visibility controlled separately)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
      visible: showVolume, // Control visibility based on prop
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
      visible: showVolume, // Hide price scale too when volume is hidden
    });

    volumeSeriesRef.current = volumeSeries;

    // 🎯 Always create indicator series (TradingView style - they show/hide based on data)
    // SMA line - Orange
    const smaSeries = chart.addSeries(LineSeries, {
      color: '#ff9800',
      lineWidth: 2,
      title: 'SMA',
      priceScaleId: 'right',
      lastValueVisible: true,
      priceLineVisible: false,
    });
    smaSeriesRef.current = smaSeries;

    // EMA line - Blue  
    const emaSeries = chart.addSeries(LineSeries, {
      color: '#2962ff',
      lineWidth: 2,
      title: 'EMA',
      priceScaleId: 'right',
      lastValueVisible: true,
      priceLineVisible: false,
    });
    emaSeriesRef.current = emaSeries;

    // Bollinger Bands - Purple
    const bbUpperSeries = chart.addSeries(LineSeries, {
      color: 'rgba(187, 134, 252, 0.8)',
      lineWidth: 1,
      title: 'BB Upper',
      priceScaleId: 'right',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    bbUpperSeriesRef.current = bbUpperSeries;

    const bbMiddleSeries = chart.addSeries(LineSeries, {
      color: 'rgba(187, 134, 252, 0.5)',
      lineWidth: 1,
      lineStyle: 2, // Dashed
      title: 'BB Middle',
      priceScaleId: 'right',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    bbMiddleSeriesRef.current = bbMiddleSeries;

    const bbLowerSeries = chart.addSeries(LineSeries, {
      color: 'rgba(187, 134, 252, 0.8)',
      lineWidth: 1,
      title: 'BB Lower',
      priceScaleId: 'right',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    bbLowerSeriesRef.current = bbLowerSeries;

    // 📊 RSI Indicator (separate price scale - TradingView style)
    const rsiSeries = chart.addSeries(LineSeries, {
      color: '#fbc02d',
      lineWidth: 2,
      title: 'RSI',
      priceScaleId: 'rsi',
      lastValueVisible: true,
      priceLineVisible: false,
    });
    rsiSeriesRef.current = rsiSeries;

    // RSI overbought line (70)
    const rsi70 = chart.addSeries(LineSeries, {
      color: '#ef5350',
      lineWidth: 1,
      lineStyle: 2,
      title: '',
      priceScaleId: 'rsi',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    rsi70Ref.current = rsi70;

    // RSI oversold line (30)
    const rsi30 = chart.addSeries(LineSeries, {
      color: '#26a69a',
      lineWidth: 1,
      lineStyle: 2,
      title: '',
      priceScaleId: 'rsi',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    rsi30Ref.current = rsi30;

    // RSI price scale config - Initially hidden, shown dynamically when data exists
    chart.priceScale('rsi').applyOptions({
      scaleMargins: { top: 0.75, bottom: 0.08 },
      borderVisible: false,
      visible: false, // Hidden by default
    });

    // 📈 MACD Indicator (separate price scale)
    const macdLine = chart.addSeries(LineSeries, {
      color: '#2962ff',
      lineWidth: 2,
      title: 'MACD',
      priceScaleId: 'macd',
      lastValueVisible: true,
      priceLineVisible: false,
    });
    macdLineRef.current = macdLine;

    const macdSignal = chart.addSeries(LineSeries, {
      color: '#ff9800',
      lineWidth: 2,
      title: 'Signal',
      priceScaleId: 'macd',
      lastValueVisible: true,
      priceLineVisible: false,
    });
    macdSignalRef.current = macdSignal;

    const macdHist = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceScaleId: 'macd',
      title: 'Histogram',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    macdHistRef.current = macdHist;

    // MACD price scale config - Initially hidden, shown dynamically when data exists
    chart.priceScale('macd').applyOptions({
      scaleMargins: { top: 0.75, bottom: 0.05 },
      borderVisible: false,
      visible: false, // Hidden by default
    });

    // Setup resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !chartContainerRef.current) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });

    resizeObserver.observe(chartContainerRef.current);
    resizeObserverRef.current = resizeObserver;



    // Cleanup
    return () => {
      resizeObserver.disconnect();

      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      smaSeriesRef.current = null;
      emaSeriesRef.current = null;
      bbUpperSeriesRef.current = null;
      bbMiddleSeriesRef.current = null;
      bbLowerSeriesRef.current = null;
      rsiSeriesRef.current = null;
      rsi70Ref.current = null;
      rsi30Ref.current = null;
      macdLineRef.current = null;
      macdSignalRef.current = null;
      macdHistRef.current = null;
      isChartInitialized.current = false;
    };
  }, []); // Initialize chart ONLY ONCE - no dependencies

  // 🔄 Consolidated Layout & Data Update Effect
  useEffect(() => {
    if (!chartRef.current || !processedData) return;

    const chart = chartRef.current;

    // 1. Update Data
    if (candleSeriesRef.current) candleSeriesRef.current.setData(processedData.candleData);
    if (volumeSeriesRef.current) volumeSeriesRef.current.setData(processedData.volumeData);
    if (smaSeriesRef.current) smaSeriesRef.current.setData(processedData.smaData);
    if (emaSeriesRef.current) emaSeriesRef.current.setData(processedData.emaData);
    if (bbUpperSeriesRef.current) bbUpperSeriesRef.current.setData(processedData.bbUpperData);
    if (bbMiddleSeriesRef.current) bbMiddleSeriesRef.current.setData(processedData.bbMiddleData);
    if (bbLowerSeriesRef.current) bbLowerSeriesRef.current.setData(processedData.bbLowerData);

    // 2. Refresh Indicators data
    const hasRSI = processedData.rsiData.length > 0;
    const hasMACD = processedData.macdLineData.length > 0;

    if (rsiSeriesRef.current) rsiSeriesRef.current.setData(processedData.rsiData);
    if (rsi70Ref.current && hasRSI) rsi70Ref.current.setData(processedData.rsiData.map(d => ({ time: d.time, value: 70 })));
    if (rsi30Ref.current && hasRSI) rsi30Ref.current.setData(processedData.rsiData.map(d => ({ time: d.time, value: 30 })));

    if (macdLineRef.current) macdLineRef.current.setData(processedData.macdLineData);
    if (macdSignalRef.current) macdSignalRef.current.setData(processedData.macdSignalData);
    if (macdHistRef.current) macdHistRef.current.setData(processedData.macdHistData);

    // 3. 📐 CALCULATE LAYOUT MARGINS
    // Precise calculations to strictly prevent overlap
    // Layout strategy: Stack from bottom up.
    // Bottom 0.02 padding.
    // MACD (if active): Height 0.16.
    // Padding 0.02.
    // RSI (if active): Height 0.16.
    // Padding 0.02.
    // Main Chart: Remains.

    const PANE_PADDING = 0.02;
    const INDICATOR_HEIGHT = 0.16; // 16% height per indicator

    let currentBottom = PANE_PADDING; // Start from bottom of screen

    // --- MACD Pane ---
    let macdResultMargins = { top: 0, bottom: 0 };
    let showMACDPane = false;

    if (hasMACD) {
      showMACDPane = true;
      const macdBottom = currentBottom;
      const macdTop = 1.0 - (macdBottom + INDICATOR_HEIGHT); // Convert to 'top' margin

      // Scale Margins: top is distance from top, bottom is distance from bottom
      macdResultMargins = {
        top: macdTop,
        bottom: macdBottom
      };

      currentBottom += INDICATOR_HEIGHT + PANE_PADDING; // Move up
    }

    // --- RSI Pane ---
    let rsiResultMargins = { top: 0, bottom: 0 };
    let showRSIPane = false;

    if (hasRSI) {
      showRSIPane = true;
      const rsiBottom = currentBottom;
      const rsiTop = 1.0 - (rsiBottom + INDICATOR_HEIGHT);

      rsiResultMargins = {
        top: rsiTop,
        bottom: rsiBottom
      };

      currentBottom += INDICATOR_HEIGHT + PANE_PADDING; // Move up
    }

    // --- Main Chart ---
    // The rest of the space is for Main Chart
    // Main Bottom Margin = currentBottom
    const mainBottomMargin = currentBottom;

    // Apply Main Chart Margins
    chart.priceScale('right').applyOptions({
      scaleMargins: {
        top: 0.05,
        bottom: mainBottomMargin,
      },
      autoScale: true,
    });

    // Apply Volume Margins (Overlay at bottom of Main Chart)
    // Volume takes bottom 15% of the MAIN CHART AREA (not screen) 
    // Wait, simpler: Volume takes 15% screen height, sitting just above the mainBottomMargin.
    const VOLUME_HEIGHT = 0.15;
    const volumeTopMargin = 1.0 - (mainBottomMargin + VOLUME_HEIGHT);

    chart.priceScale('volume').applyOptions({
      visible: showVolume,
      scaleMargins: {
        top: volumeTopMargin,
        bottom: mainBottomMargin,
      },
    });

    // Apply RSI Margins
    chart.priceScale('rsi').applyOptions({
      visible: showRSIPane,
      scaleMargins: rsiResultMargins,
      borderVisible: true,
      borderColor: '#2a2e39',
    });

    // Apply MACD Margins
    chart.priceScale('macd').applyOptions({
      visible: showMACDPane,
      scaleMargins: macdResultMargins,
      borderVisible: true,
      borderColor: '#2a2e39',
    });

    // 4. Fit Content if needed
    const currentLength = processedData.candleData.length;
    if (prevDataLength.current === 0 || Math.abs(currentLength - prevDataLength.current) > 50) {
      chart.timeScale().fitContent();
    }
    prevDataLength.current = currentLength;

  }, [processedData, showVolume]);

  // Reset zoom handler
  const handleResetZoom = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, []);

  // No data fallback
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#131722] text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <div>No chart data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-[#131722]">
      {/* Chart Container */}
      <div
        ref={chartContainerRef}
        className="w-full h-full"
        style={{ minHeight: '300px' }}
      />

      {/* Reset Zoom Button */}
      <button
        onClick={handleResetZoom}
        className="absolute bottom-2 right-2 px-3 py-1.5 rounded text-xs font-medium transition-all duration-200 z-10"
        style={{
          backgroundColor: '#1e222d',
          border: '1px solid #2a2e39',
          color: '#9aa0af',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#2962ff';
          e.currentTarget.style.color = '#2962ff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#2a2e39';
          e.currentTarget.style.color = '#9aa0af';
        }}
        title="Reset Zoom (Double-click chart)"
      >
        ⟲ Reset
      </button>

      {/* Legend - TradingView style (shows only active indicators) */}
      <div
        className="absolute top-2 left-2 flex flex-wrap gap-3 text-xs z-10 bg-[#131722]/80 px-2 py-1 rounded"
        style={{ color: '#9aa0af' }}
      >
        {processedData?.smaData && processedData.smaData.length > 0 && (
          <span style={{ color: '#ff9800' }}>● SMA(20)</span>
        )}
        {processedData?.emaData && processedData.emaData.length > 0 && (
          <span style={{ color: '#2962ff' }}>● EMA(12)</span>
        )}
        {processedData?.bbUpperData && processedData.bbUpperData.length > 0 && (
          <span style={{ color: 'rgba(187, 134, 252, 0.9)' }}>● Bollinger</span>
        )}
        {processedData?.rsiData && processedData.rsiData.length > 0 && (
          <span style={{ color: '#fbc02d' }}>● RSI(14)</span>
        )}
        {processedData?.macdLineData && processedData.macdLineData.length > 0 && (
          <span style={{ color: '#2962ff' }}>● MACD</span>
        )}
      </div>

      {/* Tooltip instructions removed as requested */}
    </div>
  );
}
