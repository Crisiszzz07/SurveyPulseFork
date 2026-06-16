/**
 * pdfGenerator.js
 * Genera PDFs profesionales usando jsPDF + html2canvas.
 *
 * Funciones exportadas:
 *   - generateSurveyPDF(surveyTitle, surveyDesc, attemptInfo, questions, answers)
 *   - generateGeneralPDF(surveys, attempts)
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { PdfSurveyBarChart, PdfGeneralBarChart } from '../components/charts/PdfBarChart';

// ────────────────────────────────────────────────────────────────────────────
// HELPERS ESTADÍSTICOS
// ────────────────────────────────────────────────────────────────────────────

/** Promedio de un arreglo numérico */
function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** Mediana */
function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Desviación estándar muestral */
function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/** Clasificación según promedio (escala 1-5) */
function classify(avg) {
  if (avg < 2.5)  return { label: 'Debilidad',        emoji: '🔴', color: '#ef4444' };
  if (avg < 4.0)  return { label: 'Aspecto a mejorar', emoji: '🟡', color: '#f59e0b' };
  return            { label: 'Fortaleza',             emoji: '🟢', color: '#10b981' };
}

// ────────────────────────────────────────────────────────────────────────────
// UTILIDAD: renderizar un componente React en un div oculto y capturar canvas
// ────────────────────────────────────────────────────────────────────────────

async function renderChartToCanvas(ReactComponent, props, width = 760, height = 340) {
  return new Promise((resolve, reject) => {
    // Contenedor oculto fuera del viewport
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: ${width}px;
      height: ${height}px;
      background: #ffffff;
      padding: 8px;
    `;
    document.body.appendChild(container);

    const root = createRoot(container);
    root.render(React.createElement(ReactComponent, { ...props, width, height: height - 16 }));

    // Esperar a que Recharts termine de renderizar
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(container, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
        });
        resolve(canvas);
      } catch (err) {
        reject(err);
      } finally {
        root.unmount();
        document.body.removeChild(container);
      }
    }, 600);
  });
}

// ────────────────────────────────────────────────────────────────────────────
// UTILIDAD: cabecera del documento
// ────────────────────────────────────────────────────────────────────────────

function drawHeader(doc, title, subtitle, pageW) {
  // Franja superior
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageW, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 14);

  if (subtitle) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 14, 20);
  }

  // Fecha
  const dateStr = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  doc.setFontSize(8);
  doc.text(`Generado: ${dateStr}`, pageW - 14, 14, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  return 30; // y inicial
}

// ────────────────────────────────────────────────────────────────────────────
// UTILIDAD: pie de página
// ────────────────────────────────────────────────────────────────────────────

function drawFooter(doc, pageW, pageH, pageNum, totalPages) {
  doc.setDrawColor(200, 200, 200);
  doc.line(14, pageH - 14, pageW - 14, pageH - 14);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  doc.text('Reporte confidencial — Sistema de Encuestas', 14, pageH - 8);
  doc.text(`Página ${pageNum} / ${totalPages}`, pageW - 14, pageH - 8, { align: 'right' });
  doc.setTextColor(0, 0, 0);
}

// ────────────────────────────────────────────────────────────────────────────
// 1. PDF INDIVIDUAL POR ENCUESTA
// ────────────────────────────────────────────────────────────────────────────

/**
 * Genera un PDF con los resultados de un intento específico de encuesta.
 *
 * @param {string}   surveyTitle  - Título de la encuesta
 * @param {string}   surveyDesc   - Descripción
 * @param {object}   attemptInfo  - { company, date, totalScore }
 * @param {Array}    questions    - Array de preguntas [{ id, pregunta, category }]
 * @param {Array}    answers      - Array de respuestas [{ question_id, score, answer_text }]
 */
export async function generateSurveyPDF(surveyTitle, surveyDesc, attemptInfo, questions, answers) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW  = doc.internal.pageSize.getWidth();
  const pageH  = doc.internal.pageSize.getHeight();
  const margin = 14;
  const usableW = pageW - margin * 2;

  // ── 1. Datos por pregunta ─────────────────────────────────────────────────
  const questionData = questions.map((q, idx) => {
    const ans = answers.find(a => a.question_id === q.id);
    const score = ans ? (ans.score ?? ans.numeric_value ?? 0) : 0;
    return {
      idx: idx + 1,
      pregunta: q.pregunta || `Pregunta ${idx + 1}`,
      category: q.category?.name || q.categoria_indicador || 'General',
      score: Number(score),
      label: `P${idx + 1}`,
    };
  });

  const scores = questionData.map(q => q.score).filter(s => s > 0);

  // ── 2. Cabecera ───────────────────────────────────────────────────────────
  let y = drawHeader(
    doc,
    `Reporte: ${surveyTitle}`,
    surveyDesc,
    pageW
  );

  // ── 3. Info del intento ───────────────────────────────────────────────────
  doc.setFillColor(245, 247, 255);
  doc.roundedRect(margin, y, usableW, 22, 3, 3, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text('Empresa:', margin + 4, y + 7);
  doc.text('Fecha:', margin + 70, y + 7);
  doc.text('Puntaje Total:', margin + 130, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(99, 102, 241);
  doc.text(attemptInfo.company || 'N/A', margin + 22, y + 7);
  doc.text(attemptInfo.date || 'N/A', margin + 82, y + 7);
  doc.text(`${attemptInfo.totalScore ?? 'N/A'}%`, margin + 155, y + 7);

  // Segunda fila info
  doc.setTextColor(55, 65, 81);
  doc.setFont('helvetica', 'bold');
  doc.text('Preguntas respondidas:', margin + 4, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(99, 102, 241);
  doc.text(`${scores.length} de ${questions.length}`, margin + 50, y + 16);

  y += 30;

  // ── 4. Gráfica de barras ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text('Calificación Promedio por Pregunta', margin, y);
  y += 5;

  // Leyenda de colores
  const legend = [
    { label: 'Fortaleza (≥4.0)',        color: [16, 185, 129] },
    { label: 'Aspecto a mejorar (2.5–3.9)', color: [245, 158, 11] },
    { label: 'Debilidad (<2.5)',         color: [239, 68, 68]  },
  ];
  let lx = margin;
  legend.forEach(l => {
    doc.setFillColor(...l.color);
    doc.rect(lx, y, 5, 3, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(l.label, lx + 7, y + 3);
    lx += 62;
  });
  y += 8;

  try {
    const chartCanvas = await renderChartToCanvas(
      PdfSurveyBarChart,
      { data: questionData.map(q => ({ label: q.label, promedio: q.score })) },
      760,
      340
    );
    const imgData = chartCanvas.toDataURL('image/png');
    const chartH  = (usableW * chartCanvas.height) / chartCanvas.width;
    doc.addImage(imgData, 'PNG', margin, y, usableW, chartH);
    y += chartH + 8;
  } catch (e) {
    console.warn('Chart render error:', e);
    y += 5;
  }

  // ── 5. Tabla de preguntas ─────────────────────────────────────────────────
  // Verificar si necesita nueva página
  if (y + 20 > pageH - 20) {
    drawFooter(doc, pageW, pageH, 1, 2);
    doc.addPage();
    y = drawHeader(doc, `Reporte: ${surveyTitle} (cont.)`, '', pageW);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text('Detalle por Pregunta', margin, y);
  y += 6;

  // Encabezados de tabla
  const cols = [
    { label: '#',              x: margin,       w: 8 },
    { label: 'Pregunta',       x: margin + 8,   w: 88 },
    { label: 'Categoría',      x: margin + 96,  w: 32 },
    { label: 'Puntaje',        x: margin + 128, w: 20 },
    { label: 'Clasificación',  x: margin + 148, w: 38 },
  ];

  // Header row
  doc.setFillColor(99, 102, 241);
  doc.rect(margin, y, usableW, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  cols.forEach(col => doc.text(col.label, col.x + 2, y + 5));
  y += 7;

  // Filas
  questionData.forEach((q, i) => {
    const rowH = 8;
    const isEven = i % 2 === 0;

    // Verificar salto de página
    if (y + rowH > pageH - 20) {
      drawFooter(doc, pageW, pageH, doc.internal.getCurrentPageInfo().pageNumber, '?');
      doc.addPage();
      y = drawHeader(doc, `Reporte: ${surveyTitle} (cont.)`, '', pageW);

      // Repetir encabezados
      doc.setFillColor(99, 102, 241);
      doc.rect(margin, y, usableW, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      cols.forEach(col => doc.text(col.label, col.x + 2, y + 5));
      y += 7;
    }

    // Fondo alternado
    if (isEven) {
      doc.setFillColor(248, 249, 255);
      doc.rect(margin, y, usableW, rowH, 'F');
    }

    const cls = classify(q.score);

    doc.setTextColor(55, 65, 81);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    doc.text(String(q.idx), cols[0].x + 2, y + 5.5);

    // Pregunta truncada
    const preguntaText = doc.splitTextToSize(q.pregunta, cols[1].w - 2);
    doc.text(preguntaText[0], cols[1].x + 2, y + 5.5);

    doc.text(q.category.substring(0, 18), cols[2].x + 2, y + 5.5);

    // Puntaje con color
    doc.setTextColor(...(q.score >= 4 ? [16, 185, 129] : q.score >= 2.5 ? [180, 120, 0] : [200, 50, 50]));
    doc.setFont('helvetica', 'bold');
    doc.text(`${q.score.toFixed(1)}/5`, cols[3].x + 2, y + 5.5);

    // Clasificación
    doc.setTextColor(...(cls.label === 'Fortaleza' ? [16, 185, 129] : cls.label === 'Aspecto a mejorar' ? [180, 120, 0] : [200, 50, 50]));
    doc.setFont('helvetica', 'normal');
    doc.text(cls.label, cols[4].x + 2, y + 5.5);

    // Separador
    doc.setDrawColor(220, 220, 230);
    doc.line(margin, y + rowH, margin + usableW, y + rowH);

    y += rowH;
  });

  // ── 6. Resumen estadístico ────────────────────────────────────────────────
  y += 6;
  if (y + 30 > pageH - 20) {
    drawFooter(doc, pageW, pageH, doc.internal.getCurrentPageInfo().pageNumber, '?');
    doc.addPage();
    y = drawHeader(doc, `Reporte: ${surveyTitle} (cont.)`, '', pageW);
  }

  if (scores.length > 0) {
    const avg  = mean(scores);
    const min  = Math.min(...scores);
    const max  = Math.max(...scores);
    const med  = median(scores);
    const std  = stdDev(scores);
    const cls  = classify(avg);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text('Resumen Estadístico', margin, y);
    y += 5;

    const stats = [
      { label: 'Promedio',           value: avg.toFixed(2) },
      { label: 'Mínimo',             value: min.toFixed(2) },
      { label: 'Máximo',             value: max.toFixed(2) },
      { label: 'Mediana',            value: med.toFixed(2) },
      { label: 'Desv. Estándar',     value: std.toFixed(2) },
      { label: 'Clasificación',      value: cls.label },
    ];

    const boxW = (usableW - 5 * 4) / 3;
    let bx = margin;
    let by = y;

    stats.forEach((s, i) => {
      if (i === 3) { bx = margin; by = y + 22; }

      const isClassif = s.label === 'Clasificación';
      const fillColor = isClassif
        ? (cls.label === 'Fortaleza' ? [16, 185, 129] : cls.label === 'Aspecto a mejorar' ? [245, 158, 11] : [239, 68, 68])
        : [245, 247, 255];

      doc.setFillColor(...fillColor);
      doc.roundedRect(bx, by, boxW, 18, 2, 2, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(isClassif ? 255 : 107, isClassif ? 255 : 114, isClassif ? 255 : 128);
      doc.text(s.label, bx + 3, by + 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(isClassif ? 255 : 30, isClassif ? 255 : 30, isClassif ? 255 : 30);
      doc.text(s.value, bx + 3, by + 14);

      bx += boxW + 4;
    });
  }

  // ── 7. Footer y descarga ──────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, pageW, pageH, p, totalPages);
  }

  const fileName = `reporte_${surveyTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`;
  doc.save(fileName);
}

// ────────────────────────────────────────────────────────────────────────────
// 2. PDF GENERAL (TODAS LAS ENCUESTAS)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Genera un PDF general con estadísticas de todas las encuestas.
 *
 * @param {Array} surveys   - Lista de encuestas [{ id, titulo, questions }]
 * @param {Array} attempts  - Lista de todos los intentos [{ survey_id, total_score, status }]
 */
export async function generateGeneralPDF(surveys, attempts) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW   = doc.internal.pageSize.getWidth();
  const pageH   = doc.internal.pageSize.getHeight();
  const margin  = 14;
  const usableW = pageW - margin * 2;

  // ── 1. Calcular estadísticas por encuesta ─────────────────────────────────
  // Convertir total_score (%) a escala 1-5 dividiendo entre 20
  const surveyStats = surveys.map(survey => {
    const surveyAttempts = attempts.filter(
      a => a.survey_id === survey.id && (a.status === 'COMPLETED' || a.total_score != null)
    );

    const rawScores = surveyAttempts.map(a => {
      const ts = a.total_score ?? 0;
      // Si el score es mayor a 5, asumimos que está en escala 0-100 → convertir a 1-5
      return ts > 5 ? (ts / 100) * 5 : ts;
    }).filter(s => s > 0);

    if (rawScores.length === 0) {
      return {
        id: survey.id,
        nombre: survey.titulo,
        intentos: 0,
        promedio: 0,
        minimo: 0,
        maximo: 0,
        mediana: 0,
        desviacion: 0,
        clasificacion: classify(0),
      };
    }

    const avg = mean(rawScores);
    return {
      id: survey.id,
      nombre: survey.titulo,
      intentos: surveyAttempts.length,
      promedio: avg,
      minimo: Math.min(...rawScores),
      maximo: Math.max(...rawScores),
      mediana: median(rawScores),
      desviacion: stdDev(rawScores),
      clasificacion: classify(avg),
    };
  }).filter(s => s.intentos > 0 || true); // Incluir todas aunque no tengan intentos

  // ── 2. Cabecera ───────────────────────────────────────────────────────────
  let y = drawHeader(
    doc,
    'Reporte General de Encuestas',
    `Análisis estadístico de ${surveys.length} encuesta(s) registradas`,
    pageW
  );

  // ── 3. Tarjetas de resumen global ─────────────────────────────────────────
  const validStats = surveyStats.filter(s => s.intentos > 0);
  const globalAvg  = validStats.length > 0 ? mean(validStats.map(s => s.promedio)) : 0;
  const totalAtt   = attempts.filter(a => a.status === 'COMPLETED' || a.total_score != null).length;

  const summary = [
    { label: 'Encuestas',     value: String(surveys.length) },
    { label: 'Total Intentos', value: String(totalAtt) },
    { label: 'Promedio Global', value: globalAvg > 0 ? `${globalAvg.toFixed(2)}/5` : 'N/A' },
    { label: 'Clasificación',  value: globalAvg > 0 ? classify(globalAvg).label : 'N/A' },
  ];

  const cardW = (usableW - 3 * 4) / 4;
  let cx = margin;
  summary.forEach((s, i) => {
    const isLast = i === 3;
    const cls = classify(globalAvg);
    const fill = isLast && globalAvg > 0
      ? (cls.label === 'Fortaleza' ? [16, 185, 129] : cls.label === 'Aspecto a mejorar' ? [245, 158, 11] : [239, 68, 68])
      : [99, 102, 241];

    doc.setFillColor(...fill);
    doc.roundedRect(cx, y, cardW, 20, 3, 3, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(200, 200, 255);
    doc.text(s.label, cx + 3, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(s.value, cx + 3, y + 16);

    cx += cardW + 4;
  });
  y += 28;

  // ── 4. Gráfica de barras ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text('Puntaje Promedio por Encuesta (escala 1-5)', margin, y);
  y += 8;

  try {
    const chartData = surveyStats.map(s => ({
      nombre: s.nombre.length > 18 ? s.nombre.substring(0, 18) + '…' : s.nombre,
      promedio: Number(s.promedio.toFixed(2)),
    }));

    const chartCanvas = await renderChartToCanvas(
      PdfGeneralBarChart,
      { data: chartData },
      760,
      340
    );
    const imgData = chartCanvas.toDataURL('image/png');
    const chartH  = (usableW * chartCanvas.height) / chartCanvas.width;
    doc.addImage(imgData, 'PNG', margin, y, usableW, chartH);
    y += chartH + 10;
  } catch (e) {
    console.warn('Chart render error:', e);
    y += 5;
  }

  // ── 5. Tabla estadística ──────────────────────────────────────────────────
  if (y + 20 > pageH - 20) {
    drawFooter(doc, pageW, pageH, 1, 2);
    doc.addPage();
    y = drawHeader(doc, 'Reporte General — Tabla Estadística', '', pageW);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text('Tabla Estadística por Encuesta', margin, y);
  y += 6;

  // Columnas
  const tableCols = [
    { label: 'Encuesta',     x: margin,       w: 52 },
    { label: 'Intentos',     x: margin + 52,  w: 18 },
    { label: 'Promedio',     x: margin + 70,  w: 22 },
    { label: 'Mín.',         x: margin + 92,  w: 18 },
    { label: 'Máx.',         x: margin + 110, w: 18 },
    { label: 'Mediana',      x: margin + 128, w: 22 },
    { label: 'Desv. Std.',   x: margin + 150, w: 22 },
    { label: 'Clasificación',x: margin + 172, w: 24 },
  ];

  // Header
  doc.setFillColor(99, 102, 241);
  doc.rect(margin, y, usableW, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  tableCols.forEach(col => doc.text(col.label, col.x + 2, y + 5));
  y += 7;

  // Filas
  surveyStats.forEach((s, i) => {
    const rowH = 9;

    if (y + rowH > pageH - 20) {
      drawFooter(doc, pageW, pageH, doc.internal.getCurrentPageInfo().pageNumber, '?');
      doc.addPage();
      y = drawHeader(doc, 'Reporte General — Tabla Estadística (cont.)', '', pageW);

      doc.setFillColor(99, 102, 241);
      doc.rect(margin, y, usableW, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      tableCols.forEach(col => doc.text(col.label, col.x + 2, y + 5));
      y += 7;
    }

    // Fondo alternado
    if (i % 2 === 0) {
      doc.setFillColor(248, 249, 255);
      doc.rect(margin, y, usableW, rowH, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(55, 65, 81);

    const nombre = s.nombre.length > 28 ? s.nombre.substring(0, 28) + '…' : s.nombre;
    doc.text(nombre, tableCols[0].x + 2, y + 6);
    doc.text(String(s.intentos), tableCols[1].x + 2, y + 6);

    const hasData = s.intentos > 0;

    // Promedio con color
    if (hasData) {
      const c = s.clasificacion;
      doc.setTextColor(...(c.label === 'Fortaleza' ? [16, 185, 129] : c.label === 'Aspecto a mejorar' ? [180, 120, 0] : [200, 50, 50]));
      doc.setFont('helvetica', 'bold');
    }
    doc.text(hasData ? s.promedio.toFixed(2) : '—', tableCols[2].x + 2, y + 6);

    doc.setTextColor(55, 65, 81);
    doc.setFont('helvetica', 'normal');
    doc.text(hasData ? s.minimo.toFixed(2) : '—',    tableCols[3].x + 2, y + 6);
    doc.text(hasData ? s.maximo.toFixed(2) : '—',    tableCols[4].x + 2, y + 6);
    doc.text(hasData ? s.mediana.toFixed(2) : '—',   tableCols[5].x + 2, y + 6);
    doc.text(hasData ? s.desviacion.toFixed(2) : '—',tableCols[6].x + 2, y + 6);

    // Clasificación con color
    if (hasData) {
      const c = s.clasificacion;
      const rgb = c.label === 'Fortaleza' ? [16, 185, 129] : c.label === 'Aspecto a mejorar' ? [180, 120, 0] : [200, 50, 50];
      doc.setTextColor(...rgb);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(c.label, tableCols[7].x + 2, y + 6);
    } else {
      doc.text('Sin datos', tableCols[7].x + 2, y + 6);
    }

    // Separador
    doc.setDrawColor(220, 220, 230);
    doc.line(margin, y + rowH, margin + usableW, y + rowH);

    y += rowH;
  });

  // ── 6. Leyenda de clasificación ───────────────────────────────────────────
  y += 8;
  if (y + 20 > pageH - 20) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(248, 249, 255);
  doc.roundedRect(margin, y, usableW, 20, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  doc.text('Criterios de Clasificación:', margin + 4, y + 7);

  const criteria = [
    { label: 'Debilidad: Promedio < 2.5',             color: [239, 68, 68] },
    { label: 'Aspecto a mejorar: Promedio 2.5 – 3.9', color: [245, 158, 11] },
    { label: 'Fortaleza: Promedio ≥ 4.0',             color: [16, 185, 129] },
  ];
  let lx = margin + 50;
  criteria.forEach(c => {
    doc.setFillColor(...c.color);
    doc.circle(lx + 2, y + 6.5, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(55, 65, 81);
    doc.text(c.label, lx + 6, y + 7);
    lx += 60;
  });

  // ── 7. Footers ────────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, pageW, pageH, p, totalPages);
  }

  const fileName = `reporte_general_encuestas_${Date.now()}.pdf`;
  doc.save(fileName);
}
