import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from 'recharts';

/**
 * PdfBarChart — Gráfica de barras optimizada para captura con html2canvas.
 * Usa dimensiones fijas y colores sólidos (sin CSS variables) para
 * garantizar fidelidad en el PDF generado.
 */

const CLASSIFICATION_COLORS = {
  fortaleza:      '#10b981', // verde
  mejorar:        '#f59e0b', // amarillo
  debilidad:      '#ef4444', // rojo
  default:        '#6366f1', // índigo (para PDF general)
};

function getBarColor(value, mode = 'individual') {
  if (mode === 'general') return CLASSIFICATION_COLORS.default;
  if (value >= 4.0)  return CLASSIFICATION_COLORS.fortaleza;
  if (value >= 2.5)  return CLASSIFICATION_COLORS.mejorar;
  return CLASSIFICATION_COLORS.debilidad;
}

// ── PDF Individual: promedio por pregunta (escala 1-5) ─────────────────────
export function PdfSurveyBarChart({ data, width = 740, height = 300 }) {
  if (!data || data.length === 0) return null;

  return (
    <BarChart
      width={width}
      height={height}
      data={data}
      margin={{ top: 24, right: 20, left: 0, bottom: 60 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis
        dataKey="label"
        tick={{ fill: '#374151', fontSize: 10, fontFamily: 'Arial, sans-serif' }}
        stroke="#d1d5db"
        angle={-35}
        textAnchor="end"
        interval={0}
      />
      <YAxis
        domain={[0, 5]}
        ticks={[0, 1, 2, 3, 4, 5]}
        tick={{ fill: '#374151', fontSize: 10, fontFamily: 'Arial, sans-serif' }}
        stroke="#d1d5db"
        label={{
          value: 'Calificación (1-5)',
          angle: -90,
          position: 'insideLeft',
          offset: 10,
          style: { fill: '#6b7280', fontSize: 10, fontFamily: 'Arial, sans-serif' },
        }}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          fontFamily: 'Arial, sans-serif',
          fontSize: 12,
        }}
        formatter={(v) => [v.toFixed(2), 'Promedio']}
      />
      <Bar dataKey="promedio" radius={[4, 4, 0, 0]}>
        {data.map((entry, index) => (
          <Cell key={index} fill={getBarColor(entry.promedio, 'individual')} />
        ))}
        <LabelList
          dataKey="promedio"
          position="top"
          formatter={(v) => v.toFixed(1)}
          style={{ fill: '#111827', fontSize: 10, fontFamily: 'Arial, sans-serif', fontWeight: 700 }}
        />
      </Bar>
    </BarChart>
  );
}

// ── PDF General: promedio por encuesta (escala 0-100%) ─────────────────────
export function PdfGeneralBarChart({ data, width = 740, height = 300 }) {
  if (!data || data.length === 0) return null;

  return (
    <BarChart
      width={width}
      height={height}
      data={data}
      margin={{ top: 24, right: 20, left: 0, bottom: 60 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis
        dataKey="nombre"
        tick={{ fill: '#374151', fontSize: 10, fontFamily: 'Arial, sans-serif' }}
        stroke="#d1d5db"
        angle={-35}
        textAnchor="end"
        interval={0}
      />
      <YAxis
        domain={[0, 5]}
        ticks={[0, 1, 2, 3, 4, 5]}
        tick={{ fill: '#374151', fontSize: 10, fontFamily: 'Arial, sans-serif' }}
        stroke="#d1d5db"
        label={{
          value: 'Puntaje Promedio (1-5)',
          angle: -90,
          position: 'insideLeft',
          offset: 10,
          style: { fill: '#6b7280', fontSize: 10, fontFamily: 'Arial, sans-serif' },
        }}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          fontFamily: 'Arial, sans-serif',
          fontSize: 12,
        }}
        formatter={(v) => [v.toFixed(2), 'Promedio']}
      />
      <Bar dataKey="promedio" radius={[4, 4, 0, 0]}>
        {data.map((entry, index) => (
          <Cell key={index} fill={getBarColor(entry.promedio, 'general')} />
        ))}
        <LabelList
          dataKey="promedio"
          position="top"
          formatter={(v) => v.toFixed(2)}
          style={{ fill: '#111827', fontSize: 10, fontFamily: 'Arial, sans-serif', fontWeight: 700 }}
        />
      </Bar>
    </BarChart>
  );
}

export default PdfSurveyBarChart;
