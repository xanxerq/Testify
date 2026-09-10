import { StudyNote } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEY_STUDY_NOTES = 'testify_study_notes';

// High-quality default starter note so users can explore immediately
const STARTER_NOTE: StudyNote = {
  id: 'starter_note_fotosintesis',
  userId: 'guest',
  title: 'Biología Celular: La Fotosíntesis y el Ciclo de Calvin',
  subject: 'Biología Celular',
  topic: 'Fotosíntesis y Fijación de Carbono',
  level: 'Bachillerato',
  style: 'comprehensive',
  createdAt: new Date().toISOString(),
  summary:
    'Guía completa sobre la fase luminosa en los tilacoides y la fase oscura o Ciclo de Calvin en el estroma, analizando la enzima RuBisCO y la producción de ATP y NADPH.',
  contentMarkdown: `## 1. Fundamentos de la Fotosíntesis
La fotosíntesis es el proceso anabólico y autótrofo mediante el cual los organismos fotosintetizadores (plantas, algas y cianobacterias) transforman la **energía luminosa** solar en **energía química** estable (ATP y NADPH), sintetizando glúcidos a partir de $CO_2$ y agua.

> **Ecuación Global General:**  
> $$6 CO_2 + 6 H_2O + \\text{Luz} \\rightarrow C_6H_{12}O_6 + 6 O_2$$

---

## 2. Fase Luminosa (Fotoquímica)
Ocurre en la **membrana de los tilacoides** del cloroplasto y depende directamente de la luz:

1. **Fotólisis del agua:** En el Fotosistema II (PS II / P680), la luz induce la escisión del agua:
   $$2 H_2O \\rightarrow 4 H^+ + 4 e^- + O_2$$
   *(El $O_2$ se libera a la atmósfera como subproducto vital).*
2. **Cadena de transporte electrónico:** Los electrones excitados viajan por plastoquinona, complejo citocromo $b_6f$ y plastocianina hasta el Fotosistema I (PS I / P700).
3. **Fotofosforilación (Quimiósmosis):** Se genera un gradiente electroquímico de protones ($H^+$) hacia el lumen tilacoidal. Al salir por la **ATP sintasa**, se sintetiza ATP.
4. **Reducción del $NADP^+$:** La enzima ferredoxina-NADP+ reductasa produce **NADPH**.

💡 **Consejo para el examen:** Recuerda que en la fase luminosa acíclica se generan **ATP, NADPH y $O_2$**, mientras que en la fotofosforilación cíclica solo se genera ATP (no se desprende oxígeno ni se produce NADPH).

---

## 3. Fase Oscura o Biosintética (Ciclo de Calvin)
Ocurre en el **estroma** del cloroplasto y no requiere luz directa, pero necesita el ATP y NADPH producidos en la fase fotoquímica:

### Etapas del Ciclo:
1. **Fijación del Carbono:** La enzima **RuBisCO** (Ribulosa-1,5-bisfosfato carboxilasa/oxigenasa) cataliza la unión de $CO_2$ con la ribulosa-1,5-bisfosfato ($RuBP$), produciendo 3-fosfoglicerato ($3-PGA$).
2. **Reducción:** El $3-PGA$ se fosforila y reduce a **Gliceraldehído-3-fosfato (G3P)** consumiendo ATP y NADPH.
3. **Regeneración:** De cada 6 moléculas de G3P formadas, 1 molécula neta sale para la biosíntesis de glucosa y sacarosa, mientras que las otras 5 se utilizan para regenerar la $RuBP$ consumiendo más ATP.

⚠️ **Error frecuente:** La "fase oscura" no ocurre obligatoriamente de noche. Muchas enzimas del ciclo de Calvin se activan de día mediante el sistema ferredoxina-tiorredoxina regulado por luz.`,
  keyConcepts: [
    {
      term: 'RuBisCO',
      definition:
        'Enzima estromática fundamental que cataliza la fijación de CO2 en el ciclo de Calvin. Es la proteína más abundante del planeta.',
      exampleOrNote: 'Posee actividad oxigenasa indeseada que da lugar a la fotorrespiración en climas cálidos.',
    },
    {
      term: 'Fotólisis del Agua',
      definition:
        'Ruptura de la molécula de agua en el Fotosistema II por acción de la energía lumínica, liberando electrones, protones y oxígeno gaseoso.',
      exampleOrNote: 'La fuente del O2 desprendido es el H2O, no el CO2.',
    },
    {
      term: 'Tilacoide vs. Estroma',
      definition:
        'El tilacoide es el compartimento membranoso donde ocurre la fase luminosa; el estroma es el fluido acuoso donde se realiza el Ciclo de Calvin.',
    },
    {
      term: 'NADPH y ATP',
      definition:
        'Transportadores energéticos generados en la membrana tilacoidal que impulsan las reacciones biosintéticas del estroma.',
    },
  ],
  quickReviewQuestions: [
    {
      question: '¿De dónde procede exactamente el oxígeno que las plantas liberan a la atmósfera?',
      answer:
        'Procede de la fotólisis (ruptura) de las moléculas de agua (H2O) en el Fotosistema II durante la fase luminosa, no del CO2.',
    },
    {
      question: '¿Qué productos de la fase luminosa son imprescindibles para que funcione el Ciclo de Calvin?',
      answer:
        'El ATP (fuente de energía libre) y el NADPH (poder reductor), ambos generados en la membrana del tilacoide.',
    },
    {
      question: '¿Por qué la enzima RuBisCO es clave en la biosfera?',
      answer:
        'Porque es la principal encargada de fijar el carbono inorgánico (CO2) convirtiéndolo en materia orgánica asimilable por los seres vivos.',
    },
  ],
  tags: ['Biología', 'Metabolismo', 'Fotosíntesis', 'Bachillerato'],
};

export const notesService = {
  // Synchronous read from localStorage
  getNotes(userId?: string): StudyNote[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_STUDY_NOTES);
      let list: StudyNote[] = raw ? JSON.parse(raw) : [];

      // If empty on first load, seed with starter note
      if (list.length === 0) {
        list = [STARTER_NOTE];
        localStorage.setItem(STORAGE_KEY_STUDY_NOTES, JSON.stringify(list));
      }

      if (!userId || userId === 'guest' || userId === 'all') {
        return list;
      }

      return list.filter((n) => !n.userId || n.userId === userId || n.userId === 'guest');
    } catch (e) {
      console.warn('Error reading notes from localStorage:', e);
      return [STARTER_NOTE];
    }
  },

  // Save or update a note
  async saveNote(note: StudyNote, userId?: string): Promise<StudyNote> {
    const updatedNote: StudyNote = {
      ...note,
      userId: userId || note.userId || 'guest',
      createdAt: note.createdAt || new Date().toISOString(),
    };

    try {
      const currentNotes = this.getNotes();
      const existingIdx = currentNotes.findIndex((n) => n.id === updatedNote.id);

      let newList: StudyNote[];
      if (existingIdx >= 0) {
        newList = [...currentNotes];
        newList[existingIdx] = updatedNote;
      } else {
        newList = [updatedNote, ...currentNotes];
      }

      localStorage.setItem(STORAGE_KEY_STUDY_NOTES, JSON.stringify(newList));

      // Attempt background save to Supabase if configured
      if (isSupabaseConfigured() && userId && userId !== 'guest') {
        try {
          await supabase.from('study_notes').upsert({
            id: updatedNote.id,
            user_id: userId,
            title: updatedNote.title,
            subject: updatedNote.subject,
            topic: updatedNote.topic,
            level: updatedNote.level,
            style: updatedNote.style,
            data: updatedNote,
            created_at: updatedNote.createdAt,
          });
        } catch (dbErr) {
          // Table may not exist yet in Supabase, local persistence is guaranteed
          console.debug('Supabase notes sync note:', dbErr);
        }
      }

      return updatedNote;
    } catch (e) {
      console.error('Error saving note:', e);
      return updatedNote;
    }
  },

  // Delete a note
  async deleteNote(id: string): Promise<boolean> {
    try {
      const currentNotes = this.getNotes();
      const filtered = currentNotes.filter((n) => n.id !== id);
      localStorage.setItem(STORAGE_KEY_STUDY_NOTES, JSON.stringify(filtered));

      if (isSupabaseConfigured()) {
        try {
          await supabase.from('study_notes').delete().eq('id', id);
        } catch (dbErr) {
          console.debug('Supabase notes delete note:', dbErr);
        }
      }

      return true;
    } catch (e) {
      console.error('Error deleting note:', e);
      return false;
    }
  },

  // Fetch single note by ID
  getNoteById(id: string): StudyNote | undefined {
    const all = this.getNotes();
    return all.find((n) => n.id === id);
  },
};
