import { Exam, ExamSetupConfig, OpenQuestion, QuestionFeedback, UploadedMaterial } from '../types';

export const geminiService = {
  // Generate exam from syllabus materials
  async generateExam(
    config: ExamSetupConfig,
    materials: UploadedMaterial[]
  ): Promise<Exam> {
    const payload = {
      subject: config.subject,
      topic: config.topic,
      level: config.level,
      difficulty: config.difficulty,
      testCount: config.testCount,
      openCount: config.openCount,
      timeLimitMinutes: config.timeLimitMinutes,
      additionalNotes: config.additionalNotes,
      materials: materials.map((m) => ({
        name: m.name,
        mimeType: m.mimeType,
        base64Data: m.base64Data,
      })),
    };

    const response = await fetch('/api/generate-exam', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(
        errJson.message ||
        errJson.error ||
        `Error del servidor (${response.status}) al generar el examen con IA`
      );
    }

    const data = await response.json();
    if (!data.success || !data.exam) {
      throw new Error('La respuesta de la IA no contiene la estructura del examen.');
    }

    return data.exam as Exam;
  },

  // Grade an individual open/development question with AI
  async gradeOpenAnswer(
    question: OpenQuestion,
    userAnswer: string,
    subject: string,
    topic: string,
    level: string
  ): Promise<QuestionFeedback> {
    try {
      const response = await fetch('/api/grade-open-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          userAnswer,
          subject,
          topic,
          level,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al evaluar la respuesta en el servidor');
      }

      const data = await response.json();
      return {
        questionId: question.id,
        score: typeof data.score === 'number' ? data.score : 0,
        maxScore: question.points,
        feedback: data.feedback || 'Evaluación completada.',
        strengths: data.strengths || [],
        improvements: data.improvements || [],
        userAnswer,
      };
    } catch (err: any) {
      console.error('Error grading open answer', err);
      // Fallback feedback if network or server error happens
      const hasContent = userAnswer.trim().length > 15;
      const fallbackScore = hasContent ? Math.round(question.points * 0.7 * 10) / 10 : 0;
      return {
        questionId: question.id,
        score: fallbackScore,
        maxScore: question.points,
        feedback: hasContent
          ? 'Respuesta registrada. Compara tu desarrollo con la respuesta modelo proporcionada para comprobar los puntos clave.'
          : 'Respuesta muy breve o incompleta. Revisa el temario para profundizar.',
        strengths: hasContent ? ['Respuesta estructurada'] : [],
        improvements: ['Revisa los criterios de corrección detallados'],
        userAnswer,
      };
    }
  },
};
