"use client";
import { BarChart, BoxplotChart, CustomChart, HeatmapChart, LineChart, ScatterChart } from "echarts/charts";
import {
  AriaComponent, DataZoomComponent, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent,
  MarkPointComponent, TitleComponent, TooltipComponent, VisualMapComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";

echarts.use([BarChart, BoxplotChart, CustomChart, HeatmapChart, LineChart, ScatterChart, AriaComponent, DataZoomComponent, GridComponent,
  LegendComponent, MarkAreaComponent, MarkLineComponent, MarkPointComponent, TitleComponent, TooltipComponent, VisualMapComponent, SVGRenderer]);

export type EOption = echarts.EChartsCoreOption;

export function EChart({ option, height = 320, label, onClick }: {
  option: EOption; height?: number; label: string; onClick?: (p: { dataIndex: number; seriesIndex?: number; name?: string }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const clickRef = useRef(onClick);
  clickRef.current = onClick;

  useEffect(() => {
    if (!ref.current) return;
    const c = echarts.init(ref.current, undefined, { renderer: "svg" });
    chart.current = c;
    c.on("click", (p) => clickRef.current?.(p as never));
    let w = ref.current.clientWidth;
    const ro = new ResizeObserver(([e]) => {
      if (Math.abs(e.contentRect.width - w) > 1) { w = e.contentRect.width; c.resize(); }
    });
    ro.observe(ref.current);
    return () => { ro.disconnect(); c.dispose(); chart.current = null; };
  }, []);

  useEffect(() => {
    chart.current?.setOption({ aria: { enabled: true, label: { description: label } }, animationDuration: 350, ...option }, { notMerge: true });
  }, [option, label]);

  return <div ref={ref} style={{ height }} className="w-full" role="img" aria-label={label} />;
}
