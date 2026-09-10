import jsPDF from 'jspdf';
import { ExamResult, MultipleChoiceQuestion, OpenQuestion } from '../types';

export function exportExamResultToPdf(
  result: ExamResult,
  roomCode?: string | null,
  roomRank?: { position: number; total: number } | null
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const scoreOutOfTen = Math.round((result.totalScore / result.maxPossibleScore) * 100) / 10;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 10) {
      doc.addPage();
      y = margin;
      drawHeaderSmall();
    }
  };

  const drawHeaderSmall = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 150, 165);
    doc.text(`Testify - ${result.subject}: ${result.topic}`, margin, y);
    doc.text(`Fecha: ${new Date(result.completedAt).toLocaleDateString('es-ES')}`, pageWidth - margin, y, { align: 'right' });
    y += 3;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;
  };

  // 1. Main Header Banner
  doc.setFillColor(30, 41, 59); // slate-800
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TESTIFY - INFORME Y CORRECCIÓN DE EXAMEN', margin + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(`${result.subject} • ${result.level} • ${result.topic}`, margin + 6, y + 14);

  const studentName = result.userName || 'Estudiante';
  doc.text(`Alumno/a: ${studentName}  |  Fecha: ${new Date(result.completedAt).toLocaleDateString('es-ES')}`, margin + 6, y + 20);

  if (roomCode) {
    doc.setTextColor(253, 224, 71); // amber yellow
    doc.setFont('helvetica', 'bold');
    const roomText = roomRank
      ? `SALA: #${roomCode} (Puesto ${roomRank.position} de ${roomRank.total})`
      : `SALA MULTIJUGADOR: #${roomCode}`;
    doc.text(roomText, pageWidth - margin - 6, y + 14, { align: 'right' });
  }

  y += 32;

  // 2. Score Summary Box
  const summaryBoxHeight = 32;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, summaryBoxHeight, 2, 2, 'FD');

  // Left column: Nota final
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text('CALIFICACIÓN FINAL', margin + 6, y + 7);

  doc.setFontSize(22);
  if (scoreOutOfTen >= 9) doc.setTextColor(16, 185, 129); // emerald
  else if (scoreOutOfTen >= 7) doc.setTextColor(79, 70, 229); // indigo
  else if (scoreOutOfTen >= 5) doc.setTextColor(217, 119, 6); // amber
  else doc.setTextColor(225, 29, 72); // rose

  doc.text(`${scoreOutOfTen.toFixed(1)} / 10`, margin + 6, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`${result.percentage}% acierto global`, margin + 6, y + 24);

  // Middle Column: Puntos y desglose
  const col2X = margin + 65;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('PUNTUACIÓN TOTAL:', col2X, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(`${result.totalScore.toFixed(1)} de ${result.maxPossibleScore} puntos posibles`, col2X, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.text('PREGUNTAS TIPO TEST:', col2X, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(
    result.maxTestScore > 0
      ? `${result.testScore} / ${result.maxTestScore} pts (${Math.round((result.testScore / result.maxTestScore) * 100)}%)`
      : 'Sin preguntas test',
    col2X,
    y + 26
  );

  // Right Column: Desarrollo
  const col3X = margin + 125;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('PREGUNTAS DE DESARROLLO:', col3X, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(
    result.maxOpenScore > 0
      ? `${result.openScore.toFixed(1)} / ${result.maxOpenScore} pts (${Math.round((result.openScore / result.maxOpenScore) * 100)}%)`
      : 'Sin preguntas desarrollo',
    col3X,
    y + 13
  );

  y += summaryBoxHeight + 6;

  // 3. Overall Pedagogical Feedback
  if (result.generalFeedback) {
    checkPageBreak(25);
    doc.setFillColor(238, 242, 255); // indigo-50
    doc.setDrawColor(199, 210, 254); // indigo-200
    doc.setLineWidth(0.4);

    const feedbackLines = doc.splitTextToSize(
      `Comentario del Evaluador IA: ${result.generalFeedback}`,
      contentWidth - 10
    );
    const boxH = Math.max(16, feedbackLines.length * 4.5 + 7);
    doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'FD');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(49, 46, 129); // indigo-900
    doc.text(feedbackLines, margin + 5, y + 6);

    y += boxH + 6;
  }

  // Section divider
  checkPageBreak(12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('CORRECCIÓN DETALLADA PREGUNTA A PREGUNTA', margin, y + 4);
  y += 8;

  // 4. Questions Breakdown
  result.examData.questions.forEach((q, idx) => {
    const feedback = result.feedbackByQuestion[q.id];
    const userAnswer = result.userAnswers[q.id];
    const isTest = q.type === 'multiple_choice';

    checkPageBreak(35);

    // Question header bar
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`Pregunta ${idx + 1} de ${result.examData.questions.length} (${isTest ? 'Tipo Test' : 'Desarrollo'} - ${q.points} pt${q.points > 1 ? 's' : ''})`, margin + 3, y + 4.8);

    // Score earned badge
    const qScore = feedback ? feedback.score : 0;
    const qMax = q.points;
    const scoreColor = qScore === qMax ? [16, 185, 129] : qScore > 0 ? [217, 119, 6] : [225, 29, 72];
    doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.text(`${qScore.toFixed(1)} / ${qMax} pts`, pageWidth - margin - 3, y + 4.8, { align: 'right' });

    y += 10;

    // Question Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const qTextLines = doc.splitTextToSize(q.questionText, contentWidth - 6);
    checkPageBreak(qTextLines.length * 4.5 + 10);
    doc.text(qTextLines, margin + 2, y);
    y += qTextLines.length * 4.5 + 3;

    if (isTest) {
      const mcq = q as MultipleChoiceQuestion;
      const selectedIndex = typeof userAnswer === 'number' ? userAnswer : -1;
      const isCorrect = selectedIndex === mcq.correctOptionIndex;

      // Options
      mcq.options.forEach((opt, optIdx) => {
        const isUserChoice = selectedIndex === optIdx;
        const isCorrectChoice = mcq.correctOptionIndex === optIdx;
        const letter = String.fromCharCode(65 + optIdx);

        checkPageBreak(8);

        if (isCorrectChoice) {
          doc.setFillColor(236, 253, 245); // emerald-50
          doc.setDrawColor(167, 243, 208);
          doc.roundedRect(margin + 2, y - 3, contentWidth - 4, 6.5, 1, 1, 'FD');
          doc.setTextColor(6, 95, 70);
          doc.setFont('helvetica', 'bold');
        } else if (isUserChoice && !isCorrect) {
          doc.setFillColor(255, 241, 242); // rose-50
          doc.setDrawColor(254, 205, 211);
          doc.roundedRect(margin + 2, y - 3, contentWidth - 4, 6.5, 1, 1, 'FD');
          doc.setTextColor(159, 18, 57);
          doc.setFont('helvetica', 'normal');
        } else {
          doc.setTextColor(71, 85, 105);
          doc.setFont('helvetica', 'normal');
        }

        doc.setFontSize(8);
        const prefix = isUserChoice && isCorrectChoice
          ? `[X] Opción ${letter}) (Tu respuesta - Correcta)`
          : isUserChoice
          ? `[X] Opción ${letter}) (Tu respuesta)`
          : isCorrectChoice
          ? `[v] Opción ${letter}) (Respuesta Correcta)`
          : `[ ] Opción ${letter})`;

        const optLine = `${prefix}: ${opt}`;
        const optLines = doc.splitTextToSize(optLine, contentWidth - 8);
        doc.text(optLines, margin + 4, y + 1.2);
        y += Math.max(7, optLines.length * 4);
      });

      // Explanation
      if (mcq.explanation) {
        checkPageBreak(14);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        const expLines = doc.splitTextToSize(`Explicación: ${mcq.explanation}`, contentWidth - 8);
        doc.text(expLines, margin + 4, y);
        y += expLines.length * 3.8 + 4;
      }
    } else {
      // Open Question
      const oq = q as OpenQuestion;
      const userText = (userAnswer as string) || '(Sin respuesta)';

      checkPageBreak(25);
      // Student's answer
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('Respuesta redactada por el alumno:', margin + 2, y);
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      const ansLines = doc.splitTextToSize(`"${userText}"`, contentWidth - 6);
      doc.text(ansLines, margin + 4, y);
      y += ansLines.length * 4 + 4;

      // Model answer / Grading
      if (feedback?.feedback) {
        checkPageBreak(20);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        const fbLines = doc.splitTextToSize(`Corrección y Feedback IA: ${feedback.feedback}`, contentWidth - 8);
        const fbH = fbLines.length * 3.8 + 4;
        doc.roundedRect(margin + 2, y - 2, contentWidth - 4, fbH, 1, 1, 'FD');
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        doc.text(fbLines, margin + 5, y + 1.5);
        y += fbH + 4;
      }

      if (oq.sampleAnswer) {
        checkPageBreak(15);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Respuesta modelo esperada:', margin + 2, y);
        y += 3.5;
        doc.setFont('helvetica', 'normal');
        const sampleLines = doc.splitTextToSize(oq.sampleAnswer, contentWidth - 6);
        doc.text(sampleLines, margin + 4, y);
        y += sampleLines.length * 3.8 + 4;
      }
    }

    y += 5;
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  });

  // Page numbering on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Testify - Generador de Exámenes con IA  •  Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
  }

  // Clean filename
  const cleanSubject = result.subject.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '_');
  const cleanTopic = result.topic.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '_').substring(0, 25);
  const filename = `Examen_${cleanSubject}_${cleanTopic}_Nota_${scoreOutOfTen.toFixed(1)}.pdf`;

  doc.save(filename);
}

/**
 * Exporta un examen limpio maquetado para imprimir en papel o compartir en PDF,
 * con opción de incluir la plantilla de soluciones y rúbrica al final.
 */
export function exportExamToPrintablePdf(
  exam: {
    title: string;
    subject: string;
    topic: string;
    level: string;
    difficulty: string;
    timeLimitMinutes?: number;
    totalPoints: number;
    overview?: string;
    questions: any[];
  },
  includeSolutions = true
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 10) {
      doc.addPage();
      y = margin;
      drawHeaderSmall();
    }
  };

  const drawHeaderSmall = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 150, 165);
    doc.text(`Testify - Examen: ${exam.subject} (${exam.topic})`, margin, y);
    doc.text(`${exam.level} • Dificultad: ${exam.difficulty}`, pageWidth - margin, y, { align: 'right' });
    y += 3;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  // 1. Header Banner
  doc.setFillColor(30, 41, 59); // slate-800
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TESTIFY - EXAMEN FORMAL DE EVALUACIÓN', margin + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `${exam.subject}  |  Tema: ${exam.topic}  |  Nivel: ${exam.level}`,
    margin + 6,
    y + 14
  );

  doc.text(
    `Tiempo estimado: ${exam.timeLimitMinutes || 20} min  |  Puntuación total: ${exam.totalPoints} puntos`,
    margin + 6,
    y + 19
  );

  y += 28;

  // 2. Student identification box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('DATOS DEL ALUMNO / ALUMNA', margin + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Nombre y Apellidos: ____________________________________________________', margin + 5, y + 13);
  doc.text('Fecha: ________________  Curso/Grupo: _________  Calificación: ____ / 10', margin + 5, y + 18);

  y += 26;

  // Overview / General Instructions
  if (exam.overview) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const overviewLines = doc.splitTextToSize(`Instrucciones: ${exam.overview} Lee con atención cada enunciado. En las preguntas tipo test selecciona una sola opción; en las abiertas razona tu respuesta.`, contentWidth);
    doc.text(overviewLines, margin, y);
    y += overviewLines.length * 3.8 + 4;
  }

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // 3. Questions Section
  exam.questions.forEach((q: any, idx: number) => {
    checkPageBreak(35);

    const isMultipleChoice = q.type === 'multiple_choice' || (Array.isArray(q.options) && q.options.length > 0);
    const qPoints = q.points || (isMultipleChoice ? 1 : 2);

    // Question header line
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y - 2, contentWidth, 7, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Pregunta ${idx + 1}.`, margin + 3, y + 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const typeLabel = isMultipleChoice ? 'Opción múltiple (Tipo Test)' : 'Pregunta abierta / Desarrollo';
    doc.text(`[${typeLabel}  -  ${qPoints} ${qPoints === 1 ? 'punto' : 'puntos'}]`, margin + 30, y + 3);

    y += 9;

    // Question statement
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const statementLines = doc.splitTextToSize(q.questionText || '', contentWidth - 6);
    checkPageBreak(statementLines.length * 4 + 10);
    doc.text(statementLines, margin + 2, y);
    y += statementLines.length * 4 + 3;

    if (isMultipleChoice) {
      // Options
      const options = q.options || [];
      options.forEach((opt: string, optIdx: number) => {
        checkPageBreak(10);
        const letter = String.fromCharCode(65 + optIdx); // A, B, C, D
        
        // Draw checkbox box
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin + 4, y - 2.8, 3.8, 3.8, 0.8, 0.8, 'D');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`${letter})`, margin + 10, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        const optLines = doc.splitTextToSize(opt, contentWidth - 20);
        doc.text(optLines, margin + 16, y);
        y += Math.max(5.5, optLines.length * 3.8 + 2);
      });
      y += 2;
    } else {
      // Open question: Draw lines for handwritten answer
      if (q.hint) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`Pista orientativa: ${q.hint}`, margin + 3, y);
        y += 4;
      }

      checkPageBreak(25);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.25);
      // 5 ruled lines for student answers
      for (let line = 0; line < 5; line++) {
        y += 5.5;
        doc.line(margin + 4, y, pageWidth - margin - 4, y);
      }
      y += 5;
    }

    y += 4;
  });

  // 4. Solutions Sheet (if requested)
  if (includeSolutions) {
    doc.addPage();
    y = margin;

    // Solutions Banner
    doc.setFillColor(79, 70, 229); // indigo-600
    doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PLANTILLA DE SOLUCIONES Y CRITERIOS DE CORRECCIÓN', margin + 6, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(224, 231, 255);
    doc.text(
      `Hoja de respuestas oficiales generada por IA para ${exam.subject} (${exam.topic})`,
      margin + 6,
      y + 14
    );
    doc.text(
      'Uso exclusivo para el docente o autoevaluación guiada al finalizar el examen.',
      margin + 6,
      y + 19
    );

    y += 28;

    exam.questions.forEach((q: any, idx: number) => {
      checkPageBreak(25);

      const isMultipleChoice = q.type === 'multiple_choice' || (Array.isArray(q.options) && q.options.length > 0);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(`Solución Pregunta ${idx + 1}:`, margin + 2, y);

      if (isMultipleChoice) {
        const correctIndex = typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0;
        const letter = String.fromCharCode(65 + correctIndex);
        const correctText = (q.options && q.options[correctIndex]) || '';

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129); // emerald
        doc.text(`Opción correcta [ ${letter} ]`, margin + 42, y);

        y += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        const correctLines = doc.splitTextToSize(`Respuesta: "${correctText}"`, contentWidth - 8);
        doc.text(correctLines, margin + 4, y);
        y += correctLines.length * 3.8 + 2;

        if (q.explanation) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          const expLines = doc.splitTextToSize(`Justificación pedagógica: ${q.explanation}`, contentWidth - 8);
          doc.text(expLines, margin + 4, y);
          y += expLines.length * 3.8 + 3;
        }
      } else {
        y += 4.5;
        if (q.sampleAnswer) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(71, 85, 105);
          doc.text('Respuesta modelo esperada:', margin + 4, y);
          y += 4;

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          const ansLines = doc.splitTextToSize(q.sampleAnswer, contentWidth - 8);
          doc.text(ansLines, margin + 4, y);
          y += ansLines.length * 3.8 + 3;
        }

        if (Array.isArray(q.gradingCriteria) && q.gradingCriteria.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(79, 70, 229);
          doc.text('Criterios clave de evaluación / Rúbrica:', margin + 4, y);
          y += 3.5;

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
          q.gradingCriteria.forEach((crit: string) => {
            const critLines = doc.splitTextToSize(`• ${crit}`, contentWidth - 12);
            doc.text(critLines, margin + 6, y);
            y += critLines.length * 3.5 + 1.5;
          });
        }
      }

      y += 4;
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
    });
  }

  // Page numbering on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Testify - Examen Imprimible  •  Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
  }

  const cleanSubject = exam.subject.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '_');
  const cleanTopic = exam.topic.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '_').substring(0, 25);
  const suffix = includeSolutions ? 'Con_Soluciones' : 'Imprimible';
  const filename = `Examen_${cleanSubject}_${cleanTopic}_${suffix}.pdf`;

  doc.save(filename);
}

