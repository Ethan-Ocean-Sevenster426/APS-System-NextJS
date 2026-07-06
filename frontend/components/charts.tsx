"use client";

/**
 * Centralized chart.js setup, split into its own module so it can be loaded
 * lazily (via next/dynamic) rather than shipped in every analytics route's
 * initial JS bundle. Exposes datalabel-enabled wrappers used across the app.
 */
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Filler,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Radar } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Filler,
  Title,
  Tooltip,
  Legend
);
// ChartDataLabels is injected per-chart (not registered globally) via the plugins prop.

// Plain chart components (chart.js already registered above) for pages that
// don't need the datalabels plugin.
export { Bar, Line, Radar } from "react-chartjs-2";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function DLBar(props: any) { return <Bar {...props} plugins={[ChartDataLabels, ...(props.plugins || [])]} />; }
export function DLLine(props: any) { return <Line {...props} plugins={[ChartDataLabels, ...(props.plugins || [])]} />; }
export function DLRadar(props: any) { return <Radar {...props} plugins={[ChartDataLabels, ...(props.plugins || [])]} />; }
