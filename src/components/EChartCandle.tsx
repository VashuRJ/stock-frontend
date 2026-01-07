import React, { useMemo, useRef } from 'react'
import ReactECharts from 'echarts-for-react'

// --- Types ---
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

export default function EChartCandle({ 
  data, 
  showVolume = true, 
  showIndicators = false, 
  showRSI = false, 
  showMACD = false 
}: EChartCandleProps) {
  
  // Ref to hold current chart instance
  const chartRef = useRef<any>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const xAxisOverlayRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = React.useState<{start: number, end: number}>({start: 0, end: 100});
  const [showSettings, setShowSettings] = React.useState(false);

  const option = useMemo(() => {
    if (!data || data.length === 0) {
      console.warn('⚠️ No chart data available');
      return {};
    }

    try {
      // 🛡️ DATA VALIDATION & SANITIZATION
      const validateAndCleanData = (item: Point) => {
      const open = Number(item.open) || 0;
      const close = Number(item.close) || 0;
      const high = Number(item.high) || 0;
      const low = Number(item.low) || 0;
      
      // If any value is invalid, skip this candle
      if (open <= 0 || close <= 0 || high <= 0 || low <= 0) {
        return null;
      }
      
      // Ensure data integrity: high >= max(open, close) and low <= min(open, close)
      const actualHigh = Math.max(high, open, close);
      const actualLow = Math.min(low, open, close);
      
      // Prevent zero-height candles
      if (actualHigh === actualLow) {
        return null;
      }
      
      return { open, close, high: actualHigh, low: actualLow, volume: item.volume || 0 };
    };
    
    // Filter and clean data
    const validData = data
      .map((item, index) => ({ ...validateAndCleanData(item), time: item.time, index }))
      .filter(item => item.open !== undefined);
    
    if (validData.length === 0) return {};
    
    const dates = validData.map(item => item.time);
    
    // ✅ CORRECT Candle Data Mapping (ECharts format: [open, close, lowest, highest])
    const candleValues = validData.map(item => [
      item.open!,   // Opening price
      item.close!,  // Closing price  
      item.low!,    // Lowest price (this must be <= min(open, close))
      item.high!    // Highest price (this must be >= max(open, close))
    ]);

    // 📊 Volume Data (using validated data)
    const volumes = validData.map((item) => ({
      value: Math.max(0, item.volume!),
      itemStyle: {
        color: item.close! >= item.open! ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
      }
    }));

    // 📈 Indicators Data (map back to original data)
    const smaData = validData.map(v => data[v.index!].sma ?? null);
    const emaData = validData.map(v => data[v.index!].ema ?? null);
    const macdLine = validData.map(v => data[v.index!].macd ?? null);
    const macdSignal = validData.map(v => data[v.index!].macdSignal ?? null);
    const macdHist = validData.map(v => data[v.index!].macdHist ?? null);
    const bUpper = validData.map(v => data[v.index!].bollinger?.upper ?? null);
    const bLower = validData.map(v => data[v.index!].bollinger?.lower ?? null);
    const rsiData = validData.map(v => data[v.index!].rsi ?? null);

    // 📊 Calculate Y-axis range (STABLE - doesn't change on pan)
    const allPrices = candleValues.flatMap(candle => [candle[2], candle[3]]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.1; // 10% padding for stability

    return {
      backgroundColor: '#131722',
      animation: false,
      
      // 1. Tooltip
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross', 
          label: { backgroundColor: '#131722', color: '#fff' },
          crossStyle: { color: '#787b86', width: 1, type: 'dashed' }
        },
        backgroundColor: 'rgba(19, 23, 34, 0.95)',
        borderColor: '#2a2e39',
        textStyle: { color: '#d1d4dc', fontSize: 12 },
        formatter: function (params: any) {
             if (!params || params.length === 0) return '';
             let res = `<div style="font-weight:bold; border-bottom:1px solid #2a2e39; margin-bottom:5px; padding-bottom:5px;">${params[0].axisValue}</div>`;
             params.forEach((p: any) => {
                 if(p.value !== null && p.value !== undefined && p.seriesName !== 'Volume') {
                    const val = Array.isArray(p.value) ? p.value[1] : p.value;
                    if(val !== undefined && val !== null) {
                        res += `<div style="display:flex; justify-content:space-between; width:140px; gap: 10px;">
                                <span style="color:${p.color}">● ${p.seriesName}</span> 
                                <span style="font-family:monospace">${Number(val).toFixed(2)}</span>
                                </div>`;
                    }
                 }
             });
             return res;
        }
      },

      axisPointer: {
        link: { xAxisIndex: 'all' },
        label: { backgroundColor: '#777' }
      },

      // 2. Grid Layout (Fixed to prevent candle cutoff)
      grid: [
        { 
            left: 10, 
            right: 1,
            top: '8%',
            bottom: showVolume ? '28%' : '12%', // Space for volume + X-axis labels
            containLabel: true
        },
        { 
            left: 10, 
            right: 30, 
            top: showVolume ? '68%' : 'auto', // Auto height when no volume
            height: showVolume ? '15%' : '0%',
            containLabel: false
        },
        { 
            left: 10, 
            right: 30, 
            top: showVolume ? '84%' : (100 - 12) + '%', // Position at bottom edge - bottom margin
            height: '30%',
            containLabel: false
        }
      ],

      // 3. X-Axis
      xAxis: [
        { 
            type: 'category', data: dates, gridIndex: 0, 
            axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false }, 
            splitLine: { show: true, lineStyle: { color: '#2a2e39', type: 'dashed', opacity: 0.3 } },
            axisPointer: { label: { show: false } } 
        },
        { 
            type: 'category', data: dates, gridIndex: 1, 
            axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false },
            axisPointer: { label: { show: false } }
        },
        { 
            type: 'category', data: dates, gridIndex: 2, 
            axisLabel: { show: true, color: '#8b95a1' }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false },
            axisPointer: { label: { show: true } }
        }
      ],

      // 4. Y-Axis (Stable configuration - no jumping)
      yAxis: [
        { 
            scale: true, 
            gridIndex: 0, 
            position: 'right',
            min: minPrice - padding, // Stable fixed range
            max: maxPrice + padding,
            splitLine: { show: true, lineStyle: { color: '#2a2e39', type: 'dashed', opacity: 0.3 } },
            axisLabel: { 
              color: '#8b95a1', 
              margin: 4, // Tight padding between chart and Y labels
              formatter: (val: number) => {
                // Smart price formatting
                if (val >= 1000) return val.toFixed(0);
                if (val >= 10) return val.toFixed(2);
                return val.toFixed(4);
              }
            },
            axisPointer: {
                show: true,
                label: { show: true, backgroundColor: '#2962ff', color: '#fff', fontWeight: 'bold' }
            }
        },
        { scale: true, gridIndex: 1, show: false },
        { type: 'value', gridIndex: 2, show: false }
      ],

      // 5. ZOOM & PAN CONFIGURATION (Professional Trading Style)
      dataZoom: [
        {
          // Index 0: Horizontal (Time) - Zoom + Pan  
          type: 'inside',
          xAxisIndex: [0, 1, 2],
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: false,
          preventDefaultMouseMove: true,
          throttle: 50,
          zoomLock: false,
          minSpan: 2, // Allow very close zoom (was 5)
          maxSpan: 100,
          // Remove auto-reset: let user control zoom position
          filterMode: 'none' // Don't filter data, just zoom view
        },
        {
          // Index 1: Vertical (Price) - Pan Only (Zoom handled manually)
          type: 'inside',
          yAxisIndex: 0,
          zoomOnMouseWheel: false, // Disable wheel zoom (we handle it manually)
          moveOnMouseMove: true, // ✅ Enable pan
          moveOnMouseWheel: false,
          preventDefaultMouseMove: true,
          throttle: 50,
          zoomLock: true, // 🔒 Lock zoom but allow pan
          minSpan: 2,
          maxSpan: 100,
          orient: 'vertical',
          rangeMode: ['value', 'value'],
          filterMode: 'none' // 🚀 NEVER filter data
        }
      ],

      series: [
        {
          name: 'Price',
          type: 'candlestick',
          data: candleValues,
          clip: true, // 🚀 Clip candles at grid boundaries (prevents X-axis overlap)
          itemStyle: {
            color: '#089981',
            color0: '#f23645',
            borderColor: '#089981',
            borderColor0: '#f23645',
            borderWidth: 1
          },
          // 🎯 Smart bar width - auto-calculated by ECharts based on zoom
          barWidth: validData.length > 200 ? '60%' : validData.length > 100 ? '70%' : '80%',
          barMaxWidth: 20, // Allow wider candles when zoomed in
          barMinWidth: 0.5, // Thinner lines when zoomed out
          large: true, // Enable large dataset optimization
          largeThreshold: 500 // Optimize when > 500 candles
        },
        ...(showVolume ? [{
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumes,
          // 🎯 Smart volume bar width - auto-calculated by ECharts
          barWidth: validData.length > 200 ? '60%' : validData.length > 100 ? '70%' : '80%',
          barMaxWidth: 20,
          barMinWidth: 0.5,
          large: true,
          largeThreshold: 500
        }] : []),
        
        // Indicators...
        ...(showIndicators ? [
          { name: 'SMA(20)', type: 'line', data: smaData, smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#ff9800' } },
          { name: 'EMA(12)', type: 'line', data: emaData, smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#2962ff' } }
        ] : []),
        
        ...(showIndicators && bUpper.some(v => v !== null) ? [
             { name: 'BB Upper', type: 'line', data: bUpper, symbol: 'none', lineStyle: { width: 1, color: 'rgba(187, 134, 252, 0.6)' } },
             { name: 'BB Lower', type: 'line', data: bLower, symbol: 'none', lineStyle: { width: 1, color: 'rgba(187, 134, 252, 0.6)' } }
        ] : []),

        ...(showRSI ? [
             { name: 'RSI', type: 'line', data: rsiData, xAxisIndex: 2, yAxisIndex: 2, symbol: 'none', lineStyle: { color: '#fbc02d', width: 1.5 } },
             { name: '70', type: 'line', data: rsiData.map(() => 70), xAxisIndex: 2, yAxisIndex: 2, symbol: 'none', lineStyle: { color: '#ef5350', type: 'dashed', width: 1 } },
             { name: '30', type: 'line', data: rsiData.map(() => 30), xAxisIndex: 2, yAxisIndex: 2, symbol: 'none', lineStyle: { color: '#26a69a', type: 'dashed', width: 1 } }
        ] : []),

        ...(showMACD ? [
             { name: 'MACD', type: 'line', data: macdLine, xAxisIndex: 2, yAxisIndex: 2, symbol: 'none', lineStyle: { color: '#4caf50', width: 1.5 } },
             { name: 'Signal', type: 'line', data: macdSignal, xAxisIndex: 2, yAxisIndex: 2, symbol: 'none', lineStyle: { color: '#ff9800', width: 1.5 } },
             { name: 'Hist', type: 'bar', data: macdHist, xAxisIndex: 2, yAxisIndex: 2, itemStyle: { color: (p: any) => p.value > 0 ? '#26a69a' : '#ef5350' } }
        ] : [])
      ]
    };
    } catch (error) {
      console.error('❌ Chart rendering error:', error);
      return {
        backgroundColor: '#131722',
        title: {
          text: 'Chart Error - Invalid Data',
          left: 'center',
          top: 'center',
          textStyle: { color: '#f23645', fontSize: 16 }
        }
      };
    }
  }, [data, showVolume, showIndicators, showRSI, showMACD])

  // --- 🔥 PROFESSIONAL ZOOM + PAN (TradingView Style) ---
  const onChartReady = (chart: any) => {
    chartRef.current = chart;
    const zr = chart.getZr();
    const chartDom = zr.dom;
    
    let isDraggingY = false;
    let isPanning = false;
    let startY = 0;
    let startZoomRange = { start: 0, end: 100 };

    // 📊 Listen to dataZoom changes to update visible range
    chart.on('dataZoom', (params: any) => {
      const xModel = chart.getModel().getComponent('dataZoom', 0);
      if (xModel) {
        const newStart = xModel.option.start || 0;
        const newEnd = xModel.option.end || 100;
        setVisibleRange({ start: newStart, end: newEnd });
      }
    });

    // Helper: Check if mouse is in Y-axis area
    const isInYAxisArea = (offsetX: number, width: number) => {
      return offsetX > width - 70; // Right 70px is Y-axis zone
    };
    
    // Helper: Check if mouse is in chart center (pan area)
    const isInChartCenter = (offsetX: number, width: number, offsetY: number, height: number) => {
      return offsetX < width - 70 && offsetX > 60 && offsetY < height - 35 && offsetY > 0;
    };

    // Helper: Get current zoom range
    const getCurrentZoomRange = () => {
      const model = chart.getModel().getComponent('dataZoom', 1);
      return model ? { start: model.option.start || 0, end: model.option.end || 100 } : { start: 0, end: 100 };
    };

    // Helper: Apply vertical zoom with smooth animation
    const applyVerticalZoom = (newStart: number, newEnd: number, animate = true) => {
      chart.dispatchAction({
        type: 'dataZoom',
        dataZoomIndex: 1,
        start: Math.max(0, newStart),
        end: Math.min(100, newEnd),
        animation: animate ? { duration: 200, easing: 'quadInOut' } : undefined
      });
    };

    // 1. 🎨 CURSOR FEEDBACK: Dynamic cursor based on area
    zr.on('mousemove', (params: any) => {
      const width = chart.getWidth();
      const height = chart.getHeight();
      const onYAxis = isInYAxisArea(params.offsetX, width);
      const inCenter = isInChartCenter(params.offsetX, width, params.offsetY, height);
      
      // Handle dragging
      if (isDraggingY) {
        const delta = startY - params.offsetY;
        const speed = 0.15; // Reduced from 0.4 for slower, smoother drag
        const range = startZoomRange.end - startZoomRange.start;
        const change = (delta / chart.getHeight()) * 100 * speed;
        
        // UP drag (delta > 0) = ZOOM OUT (increase range), DOWN drag = ZOOM IN (decrease range)
        let newRange = range + change;
        
        // Limits
        if (newRange < 2) newRange = 2;
        if (newRange > 100) newRange = 100;
        
        // Maintain center
        const center = (startZoomRange.start + startZoomRange.end) / 2;
        let newStart = center - newRange / 2;
        let newEnd = center + newRange / 2;
        
        // Bounds check
        if (newStart < 0) { newStart = 0; newEnd = newRange; }
        if (newEnd > 100) { newEnd = 100; newStart = 100 - newRange; }
        
        applyVerticalZoom(newStart, newEnd);
      } 
      else if (isPanning) {
        // Panning active - show grabbing cursor
        chartDom.style.cursor = 'grabbing';
      }
      else {
        // Handle cursor change when not dragging
        if (onYAxis) {
          chartDom.style.cursor = 'ns-resize'; // ↕ cursor
        } else if (inCenter) {
          chartDom.style.cursor = 'grab'; // ✋ cursor for pan
        } else {
          chartDom.style.cursor = 'default';
        }
      }
    });

    // 2. 🖱️ MOUSE WHEEL ON Y-AXIS: Scroll to zoom vertically
    const handleWheel = (e: WheelEvent) => {
      const rect = chartDom.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      const width = chart.getWidth();
      
      // Check if Ctrl is pressed (for Y-zoom anywhere) OR mouse is on Y-axis
      const isCtrlPressed = e.ctrlKey || e.metaKey;
      const onYAxis = isInYAxisArea(offsetX, width);
      
      if (isCtrlPressed || onYAxis) {
        e.preventDefault();
        e.stopPropagation();
        
        const zoomRange = getCurrentZoomRange();
        const range = zoomRange.end - zoomRange.start;
        
        // Scroll direction: deltaY > 0 = scroll down (zoom OUT), deltaY < 0 = scroll up (zoom IN)
        const direction = e.deltaY > 0 ? 1 : -1;
        const zoomFactor = 0.05; // 5% change per scroll (reduced from 10% for smoothness)
        
        // Zoom OUT increases range, Zoom IN decreases range
        let newRange = range + (range * zoomFactor * direction);
        
        // Limits
        if (newRange < 2) newRange = 2;   // Max zoom in
        if (newRange > 100) newRange = 100; // Max zoom out
        
        // Center around mouse position
        const chartHeight = chart.getHeight();
        const gridTop = chartHeight * 0.05;
        const gridHeight = chartHeight * (showVolume ? 0.6 : 0.75);
        const relativeY = (offsetY - gridTop) / gridHeight;
        const clampedY = Math.max(0, Math.min(1, relativeY));
        
        // Calculate zoom center based on mouse position
        const center = zoomRange.start + (range * clampedY);
        let newStart = center - newRange / 2;
        let newEnd = center + newRange / 2;
        
        // Bounds check
        if (newStart < 0) { newStart = 0; newEnd = newRange; }
        if (newEnd > 100) { newEnd = 100; newStart = 100 - newRange; }
        
        applyVerticalZoom(newStart, newEnd);
      }
    };
    
    chartDom.addEventListener('wheel', handleWheel, { passive: false });

    // 3. 🖐️ DRAG ON Y-AXIS: Mouse down to start dragging
    zr.on('mousedown', (params: any) => {
      const width = chart.getWidth();
      const height = chart.getHeight();
      
      if (isInYAxisArea(params.offsetX, width)) {
        isDraggingY = true;
        startY = params.offsetY;
        startZoomRange = getCurrentZoomRange();
        chartDom.style.cursor = 'ns-resize';
      } else if (isInChartCenter(params.offsetX, width, params.offsetY, height)) {
        isPanning = true;
        chartDom.style.cursor = 'grabbing';
      }
    });

    zr.on('mouseup', () => {
      if (isDraggingY) {
        isDraggingY = false;
        chartDom.style.cursor = 'ns-resize';
      }
      if (isPanning) {
        isPanning = false;
        chartDom.style.cursor = 'grab';
      }
    });
    
    const globalMouseUp = () => {
      isDraggingY = false;
      isPanning = false;
      chartDom.style.cursor = 'grab';
    };
    window.addEventListener('mouseup', globalMouseUp);

    // 4. 🔄 DOUBLE CLICK: Reset zoom with animation (with debounce protection)
    let lastClickTime = 0;
    zr.on('dblclick', (params: any) => {
      const now = Date.now();
      if (now - lastClickTime < 300) return; // Prevent rapid double-clicks
      lastClickTime = now;
      
      const width = chart.getWidth();
      
      if (isInYAxisArea(params.offsetX, width)) {
        // Reset Y-zoom only
        applyVerticalZoom(0, 100, true);
      } else {
        // Reset both X and Y zoom
        chart.dispatchAction({ type: 'dataZoom', start: 0, end: 100 });
        applyVerticalZoom(0, 100, true);
      }
    });

    // Cleanup
    return () => {
      chartDom.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mouseup', globalMouseUp);
    };
  };
  
  // 🎯 OVERLAY EVENTS: Handle events on overlay div
  React.useEffect(() => {
    if (!overlayRef.current || !chartRef.current) return;
    
    const overlay = overlayRef.current;
    const chart = chartRef.current;
    let isDragging = false;
    let startY = 0;
    let startZoomRange = { start: 0, end: 100 };
    
    const getCurrentZoomRange = () => {
      const model = chart.getModel().getComponent('dataZoom', 1);
      return model ? { start: model.option.start || 0, end: model.option.end || 100 } : { start: 0, end: 100 };
    };
    
    const applyVerticalZoom = (newStart: number, newEnd: number) => {
      chart.dispatchAction({
        type: 'dataZoom',
        dataZoomIndex: 1,
        start: Math.max(0, newStart),
        end: Math.min(100, newEnd)
      });
    };
    
    // Wheel event on overlay
    const handleOverlayWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const zoomRange = getCurrentZoomRange();
      const range = zoomRange.end - zoomRange.start;
      const direction = e.deltaY > 0 ? 1 : -1;
      const zoomFactor = 0.05; // Reduced from 0.1 for smoother wheel zoom
      
      let newRange = range + (range * zoomFactor * direction);
      if (newRange < 2) newRange = 2;
      if (newRange > 100) newRange = 100;
      
      const center = (zoomRange.start + zoomRange.end) / 2;
      let newStart = center - newRange / 2;
      let newEnd = center + newRange / 2;
      
      if (newStart < 0) { newStart = 0; newEnd = newRange; }
      if (newEnd > 100) { newEnd = 100; newStart = 100 - newRange; }
      
      applyVerticalZoom(newStart, newEnd);
      
      applyVerticalZoom(newStart, newEnd);
    };
    
    // Drag events on overlay - TradingView style (single click + drag)
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent event bubbling
      isDragging = true;
      startY = e.clientY;
      startZoomRange = getCurrentZoomRange();
      overlay.style.cursor = 'ns-resize';
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      e.preventDefault();
      const delta = startY - e.clientY;
      const speed = 0.4;
      const range = startZoomRange.end - startZoomRange.start;
      const change = (delta / overlay.clientHeight) * 100 * speed;
      
      let newRange = range - change;
      if (newRange < 2) newRange = 2;
      if (newRange > 100) newRange = 100;
      
      const center = (startZoomRange.start + startZoomRange.end) / 2;
      let newStart = center - newRange / 2;
      let newEnd = center + newRange / 2;
      
      if (newStart < 0) { newStart = 0; newEnd = newRange; }
      if (newEnd > 100) { newEnd = 100; newStart = 100 - newRange; }
      
      applyVerticalZoom(newStart, newEnd);
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation(); // Prevent click events after drag
        isDragging = false;
        overlay.style.cursor = 'ns-resize';
      }
    };
    
    const handleDoubleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      applyVerticalZoom(0, 100);
    };
    
    // Attach listeners
    overlay.addEventListener('wheel', handleOverlayWheel, { passive: false });
    overlay.addEventListener('mousedown', handleMouseDown);
    overlay.addEventListener('dblclick', handleDoubleClick);
    document.addEventListener('mousemove', handleMouseMove); // Document level for smooth dragging
    document.addEventListener('mouseup', handleMouseUp); // Document level to catch release anywhere
    
    return () => {
      overlay.removeEventListener('wheel', handleOverlayWheel);
      overlay.removeEventListener('mousedown', handleMouseDown);
      overlay.removeEventListener('dblclick', handleDoubleClick);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [chartRef.current, showVolume]);

  // 🎯 X-AXIS OVERLAY EVENTS: Handle horizontal zoom
  React.useEffect(() => {
    if (!xAxisOverlayRef.current || !chartRef.current) return;
    
    const xAxisOverlay = xAxisOverlayRef.current;
    const chart = chartRef.current;
    let isDragging = false;
    let startX = 0;
    let startZoomRange = { start: 0, end: 100 };
    
    const getCurrentXZoomRange = () => {
      const model = chart.getModel().getComponent('dataZoom', 0);
      return model ? { start: model.option.start || 0, end: model.option.end || 100 } : { start: 0, end: 100 };
    };
    
    const applyHorizontalZoom = (newStart: number, newEnd: number) => {
      chart.dispatchAction({
        type: 'dataZoom',
        dataZoomIndex: 0,
        start: Math.max(0, newStart),
        end: Math.min(100, newEnd)
      });
    };
    
    // Wheel event on X-axis overlay
    const handleXAxisWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const zoomRange = getCurrentXZoomRange();
      const range = zoomRange.end - zoomRange.start;
      const direction = e.deltaY > 0 ? 1 : -1;
      const zoomFactor = 0.1;
      
      let newRange = range + (range * zoomFactor * direction);
      if (newRange < 5) newRange = 5;
      if (newRange > 100) newRange = 100;
      
      const center = (zoomRange.start + zoomRange.end) / 2;
      let newStart = center - newRange / 2;
      let newEnd = center + newRange / 2;
      
      if (newStart < 0) { newStart = 0; newEnd = newRange; }
      if (newEnd > 100) { newEnd = 100; newStart = 100 - newRange; }
      
      applyHorizontalZoom(newStart, newEnd);
    };
    
    // Drag events on X-axis overlay - TradingView style
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      isDragging = true;
      startX = e.clientX;
      startZoomRange = getCurrentXZoomRange();
      xAxisOverlay.style.cursor = 'ew-resize';
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      e.preventDefault();
      const delta = e.clientX - startX; // Right = positive, Left = negative
      const speed = 0.3;
      const range = startZoomRange.end - startZoomRange.start;
      const change = (delta / xAxisOverlay.clientWidth) * 100 * speed;
      
      let newRange = range - change; // Right drag = zoom in (reduce range)
      if (newRange < 5) newRange = 5;
      if (newRange > 100) newRange = 100;
      
      const center = (startZoomRange.start + startZoomRange.end) / 2;
      let newStart = center - newRange / 2;
      let newEnd = center + newRange / 2;
      
      if (newStart < 0) { newStart = 0; newEnd = newRange; }
      if (newEnd > 100) { newEnd = 100; newStart = 100 - newRange; }
      
      applyHorizontalZoom(newStart, newEnd);
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        isDragging = false;
        xAxisOverlay.style.cursor = 'ew-resize';
      }
    };
    
    const handleDoubleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      applyHorizontalZoom(0, 100);
    };
    
    // Attach listeners
    xAxisOverlay.addEventListener('wheel', handleXAxisWheel, { passive: false });
    xAxisOverlay.addEventListener('mousedown', handleMouseDown);
    xAxisOverlay.addEventListener('dblclick', handleDoubleClick);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      xAxisOverlay.removeEventListener('wheel', handleXAxisWheel);
      xAxisOverlay.removeEventListener('mousedown', handleMouseDown);
      xAxisOverlay.removeEventListener('dblclick', handleDoubleClick);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [chartRef.current]);

  return (
    <div className="w-full h-full relative">
        <ReactECharts 
            ref={chartRef}
            key={showIndicators ? 'indicators-on' : 'indicators-off'}
            option={option} 
            style={{ 
              height: '100%', 
              width: '100%',
              cursor: 'grab' // ✋ Hand cursor for pan
            }} 
            notMerge={true}
            lazyUpdate={false}
            onChartReady={onChartReady}
            theme="dark"
        />
        
        {/* 🎯 Y-Axis Overlay (Vertical Zoom) - Right side */}
        <div 
          ref={overlayRef}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '70px',
            height: '100%',
            cursor: 'ns-resize',
            pointerEvents: 'auto',
            zIndex: 10,
            userSelect: 'none'
          }}
          title="Drag or scroll to zoom vertically"
        />
        
        {/* ⚙️ SETTINGS BUTTON (TradingView Style - Bottom Position) */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            position: 'absolute',
            bottom: '1px',
            right: '1px',
            width: '32px',
            height: '32px',
            borderRadius: '4px',
            border: '1px solid #2a2e39',
            backgroundColor: '#1e222d',
            color: '#9aa0af',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            transition: 'all 0.2s ease',
            zIndex: 20,
            hover: { borderColor: '#2962ff', color: '#2962ff' }
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#2962ff';
            e.currentTarget.style.color = '#2962ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#2a2e39';
            e.currentTarget.style.color = '#9aa0af';
          }}
          title="Chart Settings"
        >
          ⚙️
        </button>
        
        {/* Settings Panel (placeholder for future features) */}
        {showSettings && (
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              right: '36px',
              width: '200px',
              backgroundColor: '#1e222d',
              border: '1px solid #2962ff',
              borderRadius: '4px',
              padding: '8px 0',
              zIndex: 30,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div style={{ padding: '8px 12px', color: '#787b86', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #2a2e39' }}>
              Chart Settings
            </div>
            <div style={{ padding: '8px 12px', color: '#9aa0af', fontSize: '13px' }}>
              More features coming soon...
            </div>
          </div>
        )}
        
        {/* ↔️ X-Axis Overlay (Horizontal Zoom) - Bottom side */}
        <div 
          ref={xAxisOverlayRef}
          style={{
            position: 'absolute',
            left: 60,
            right: 70,
            bottom: 0,
            height: '35px',
            cursor: 'ew-resize',
            pointerEvents: 'auto',
            zIndex: 10,
            userSelect: 'none'
          }}
          title="Drag or scroll to zoom horizontally"
        />
    </div>
  )
}