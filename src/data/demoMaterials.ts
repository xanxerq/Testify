import { EducationalLevel, UploadedMaterial } from '../types';

export type SpanishEducationStage = 'eso' | 'bachillerato' | 'pau';

export interface DemoSubject {
  id: string;
  name: string;
  topic: string;
  level: EducationalLevel;
  difficulty: 'Fácil' | 'Media' | 'Difícil';
  testCount: number;
  openCount: number;
  sampleSummary: string;
  sampleNotesText: string;
}

export interface QuickSubjectInfo {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  stage: SpanishEducationStage;
  defaultLevel: EducationalLevel;
  badge?: string;
  topics: {
    title: string;
    sampleNotes: string;
  }[];
}

export const SPANISH_STAGES: {
  id: SpanishEducationStage;
  label: string;
  shortLabel: string;
  sublabel: string;
  defaultLevel: EducationalLevel;
  badge: string;
  colorClass: string;
}[] = [
  {
    id: 'eso',
    label: 'ESO (1º a 4º)',
    shortLabel: 'ESO (1º - 4º)',
    sublabel: 'Educación Secundaria Obligatoria • Currículo LOMLOE',
    defaultLevel: 'Secundaria (ESO)',
    badge: '12 - 16 años',
    colorClass: 'from-blue-600 to-cyan-600',
  },
  {
    id: 'bachillerato',
    label: 'Bachillerato (1º y 2º)',
    shortLabel: 'Bachillerato',
    sublabel: 'Modalidades Ciencias, Sociales y Humanidades • LOMLOE',
    defaultLevel: 'Bachillerato',
    badge: '16 - 18 años',
    colorClass: 'from-indigo-600 to-violet-600',
  },
  {
    id: 'pau',
    label: 'Preparación PAU / EBAU',
    shortLabel: 'PAU / EBAU',
    sublabel: 'Pruebas de Acceso a la Universidad • Selectividad España',
    defaultLevel: 'Preparación PAU / EBAU',
    badge: 'Selectividad 2025/2026',
    colorClass: 'from-amber-600 to-rose-600',
  },
];

export const QUICK_SUBJECTS: QuickSubjectInfo[] = [
  // ===================== ESO (1º a 4º ESO) =====================
  {
    id: 'eso_matematicas',
    name: 'Matemáticas ESO',
    shortName: 'Matemáticas',
    icon: '📐',
    stage: 'eso',
    defaultLevel: 'Secundaria (ESO)',
    badge: '1º a 4º ESO',
    topics: [
      {
        title: 'Álgebra: Ecuaciones de 1º y 2º Grado y Sistemas',
        sampleNotes: 'Resolución de ecuaciones de primer grado con paréntesis y denominadores. Fórmula de la ecuación de 2º grado ax²+bx+c=0. Métodos de sustitución, igualación y reducción para sistemas lineales.',
      },
      {
        title: 'Proporcionalidad Numérica, Porcentajes e Interés Simple',
        sampleNotes: 'Proporcionalidad directa e inversa. Regla de tres compuesta. Cálculo de porcentajes, aumentos y rebajas porcentuales. Interés simple I = C·r·t / 100.',
      },
      {
        title: 'Geometría: Teorema de Pitágoras, Tales y Áreas',
        sampleNotes: 'Teorema de Pitágoras en triángulos rectángulos. Teorema de Tales y figuras semejantes. Áreas y perímetros de figuras planas. Cuerpos geométricos (prismas, pirámides, cilindros).',
      },
      {
        title: 'Funciones: Interpretación Gráfica, Función Lineal y Afín',
        sampleNotes: 'Coordenadas cartesianas. Concepto de función, dominio y recorrido. Pendiente (m) y ordenada en el origen (n): y = mx + n. Crecimiento, decrecimiento y máximos/mínimos.',
      },
      {
        title: 'Estadística Unidimensional y Probabilidad Simple',
        sampleNotes: 'Tablas de frecuencias (absoluta y relativa). Media, mediana y moda. Rango y desviación típica. Regla de Laplace para el cálculo de probabilidades simples: casos favorables / casos posibles.',
      },
    ],
  },
  {
    id: 'eso_lengua',
    name: 'Lengua Castellana y Literatura ESO',
    shortName: 'Lengua y Lit.',
    icon: '📖',
    stage: 'eso',
    defaultLevel: 'Secundaria (ESO)',
    badge: 'LOMLOE ESO',
    topics: [
      {
        title: 'Sintaxis: La Oración Simple y Compuesta Coordinada',
        sampleNotes: 'Sujeto y predicado (nominal y verbal). Complementos del verbo: CD, CI, CC, Atributo, CPred y CRég. Oraciones coordinadas: copulativas, disyuntivas y adversativas.',
      },
      {
        title: 'Morfología y Mecanismos de Creación Léxica',
        sampleNotes: 'Clases de palabras: sustantivos, adjetivos, pronombres, determinantes, verbos y adverbios. Estructura de la palabra: lexemas y morfemas flexivos/derivativos (prefijos y sufijos). Composición y parasíntesis.',
      },
      {
        title: 'Tipología Textual: Textos Argumentativos y Expositivos',
        sampleNotes: 'Estructura del texto argumentativo (tesis, cuerpo de argumentos, conclusión). Tipos de argumentos. Coherencia, cohesión y adecuación textual. Marcadores del discurso y conectores.',
      },
      {
        title: 'Educación Literaria: Géneros Literarios y Figuras Retóricas',
        sampleNotes: 'Géneros principales: lírica, épica/narrativa y dramática. Figuras estilísticas clave: metáfora, metonimia, personificación, hipérbole, anáfora y aliteración.',
      },
    ],
  },
  {
    id: 'eso_geografia_historia',
    name: 'Geografía e Historia ESO',
    shortName: 'Geografía e Hist.',
    icon: '🏛️',
    stage: 'eso',
    defaultLevel: 'Secundaria (ESO)',
    badge: 'LOMLOE ESO',
    topics: [
      {
        title: 'La Edad Media en la Península Ibérica: Al-Ándalus y Reinos Cristianos',
        sampleNotes: 'Invasión musulmana de 711. Evolución de Al-Ándalus: Emirato, Califato de Córdoba, Reinos de Taifas y Reino Nazarí de Granada. Formación y reconquista de los Reinos Cristianos del norte.',
      },
      {
        title: 'La Edad Moderna: Los Reyes Católicos y el Descubrimiento de América',
        sampleNotes: 'Unión dinástica de Castilla y Aragón. Expansión territorial (Granada, Navarra). 1492: viajes de Cristóbal Colón y colonización de América. Monarquía hispánica de los Austrias mayores.',
      },
      {
        title: 'La Revolución Industrial y el Movimiento Obrero',
        sampleNotes: 'Orígenes en Gran Bretaña: máquina de vapor de Watt, industria textil y siderurgia. Éxodo rural y nacimiento del proletariado. Ideologías obreras: socialismo marxista y anarquismo.',
      },
      {
        title: 'El Relieve Terrestre y la Diversidad Climática de España',
        sampleNotes: 'La Meseta Central, cordilleras periféricas y depresiones del Ebro y Guadalquivir. Climas de España: oceánico, mediterráneo, continentalizado, subtropical y de montaña.',
      },
    ],
  },
  {
    id: 'eso_biologia',
    name: 'Biología y Geología ESO',
    shortName: 'Biología y Geol.',
    icon: '🧬',
    stage: 'eso',
    defaultLevel: 'Secundaria (ESO)',
    badge: '1º a 4º ESO',
    topics: [
      {
        title: 'La Célula y la Organización de los Seres Vivos',
        sampleNotes: 'Teoría celular. Célula procariota vs. eucariota (animal y vegetal). Membrana, citoplasma y orgánulos principales (mitocondrias, ribosomas, cloroplastos). Niveles de organización biológica.',
      },
      {
        title: 'Tectónica de Placas, Terremotos y Volcanes',
        sampleNotes: 'Deriva continental de Wegener. Capas internas de la Tierra. Tipos de límites de placas (divergentes, convergentes y transformantes). Origen de los terremotos (hipocentro y epicentro) y vulcanismo.',
      },
      {
        title: 'La Nutrición Humana: Aparatos Digestivo, Circulatorio y Respiratorio',
        sampleNotes: 'Digestión mecánica y química en el tubo digestivo. El corazón, circulación mayor y menor. Intercambio gaseoso en los alvéolos pulmonares. Excreción en los riñones y nefronas.',
      },
      {
        title: 'Ecosistemas, Biodiversidad y Factores Ambientales',
        sampleNotes: 'Biotopo y biocenosis. Cadenas y redes tróficas: productores, consumidores y descomponedores. Relaciones intra e interespecíficas. Impacto ambiental humano y cambio climático.',
      },
    ],
  },
  {
    id: 'eso_fisica_quimica',
    name: 'Física y Química ESO',
    shortName: 'Fís. y Quím.',
    icon: '⚗️',
    stage: 'eso',
    defaultLevel: 'Secundaria (ESO)',
    badge: '2º a 4º ESO',
    topics: [
      {
        title: 'Cinemática: Movimiento Rectilíneo Uniforme y Acelerado',
        sampleNotes: 'Conceptos de posición, trayectoria, desplazamiento, velocidad y aceleración. MRU: x = x0 + v·t. MRUA: v = v0 + a·t y x = x0 + v0·t + ½·a·t². Caída libre bajo la gravedad g=9,8 m/s².',
      },
      {
        title: 'Leyes de Newton y Fuerzas Cotidianas',
        sampleNotes: 'Concepto de fuerza como vector. Primera ley de Newton (inercia). Segunda ley: F = m·a. Tercera ley (acción y reacción). Fuerza peso (P = m·g) y fuerza de rozamiento.',
      },
      {
        title: 'Estructura de la Materia, Modelos Atómicos y Tabla Periódica',
        sampleNotes: 'Modelos atómicos de Thomson, Rutherford y Bohr. Partículas subatómicas: protones, neutrones y electrones. Número atómico Z y número másico A. Grupos y periodos de la Tabla Periódica.',
      },
      {
        title: 'Reacciones Químicas y Ley de Conservación de la Masa',
        sampleNotes: 'Cambios físicos vs. cambios químicos. Reactivos y productos. Ley de Lavoisier de conservación de la masa. Ajuste por tanteo de ecuaciones químicas. Concepto básico de mol.',
      },
    ],
  },
  {
    id: 'eso_ingles',
    name: 'Inglés ESO (A2 / B1)',
    shortName: 'Inglés ESO',
    icon: '🇬🇧',
    stage: 'eso',
    defaultLevel: 'Secundaria (ESO)',
    badge: 'A2 - B1',
    topics: [
      {
        title: 'Verb Tenses: Past Simple vs. Past Continuous and Present Perfect',
        sampleNotes: 'Past Simple (regular -ed, irregular forms) for completed actions. Past Continuous (was/were + -ing) for actions in progress. Contrast with when/while. Present Perfect with just, already, yet, since, for.',
      },
      {
        title: 'Conditionals: Zero, First and Second Conditional',
        sampleNotes: 'Zero conditional (If + present, present) for scientific facts. First conditional (If + present, will + infinitive) for real future possibilities. Second conditional (If + past simple, would + infinitive) for hypothetical situations.',
      },
      {
        title: 'Passive Voice in Present and Past Simple',
        sampleNotes: 'Formation of passive: Subject + be (am/is/are/was/were) + past participle. Agent preposition by. Usage when the action or receiver is more relevant than the doer.',
      },
      {
        title: 'Reading Comprehension and Functional Vocabulary',
        sampleNotes: 'Strategies for reading comprehension: skimming, scanning and predicting. Connectors: however, because, although, in addition. Adjectives of feeling and personality.',
      },
    ],
  },

  // ===================== BACHILLERATO (1º y 2º) =====================
  {
    id: 'bach_historia',
    name: 'Historia de España (2º Bach)',
    shortName: 'Historia España',
    icon: '🏛️',
    stage: 'bachillerato',
    defaultLevel: 'Bachillerato',
    badge: 'Troncal 2º Bach',
    topics: [
      {
        title: 'Crisis del Antiguo Régimen y las Cortes de Cádiz (1808-1814)',
        sampleNotes: 'Guerra de la Independencia (causas, levantamiento del 2 de mayo de 1808 y fases bélicas). Abdicaciones de Bayona. Las Cortes de Cádiz y la Constitución de 1812: soberanía nacional, división de poderes y derechos individuales.',
      },
      {
        title: 'Construcción del Estado Liberal y Sexenio Democrático (1833-1874)',
        sampleNotes: 'Regencias de María Cristina y Espartero. El reinado de Isabel II: moderados y progresistas, desamortizaciones de Mendizábal y Madoz. La Revolución Gloriosa de 1868, reinado de Amadeo I de Saboya y la Primera República.',
      },
      {
        title: 'El Régimen de la Restauración Borbónica y la Crisis del 98 (1874-1902)',
        sampleNotes: 'El sistema canovista: Constitución de 1876, bipartidismo (conservadores y liberales), caciquismo y pucherazo. Oposición obrera y nacionalismos periféricos. La Guerra de Cuba, Filipinas y el desastre del 98.',
      },
      {
        title: 'La Segunda República Española y la Guerra Civil (1931-1939)',
        sampleNotes: 'Proclamación de la II República y Constitución de 1931. Reformas del Bienio Progresista (agraria, militar, educativa y religiosa). Bienio Radical-Cedista y Frente Popular. Golpe militar de julio de 1936, desarrollo de la Guerra Civil y consecuencias.',
      },
      {
        title: 'El Franquismo y la Transición a la Democracia (1939-1982)',
        sampleNotes: 'Evolución del Franquismo: autarquía, tecnocracia y desarrollismo de los años 60. Muerte de Franco. La Transición: Ley para la Reforma Política, legalización de partidos, elecciones de 1977 y la Constitución de 1978.',
      },
    ],
  },
  {
    id: 'bach_mates2',
    name: 'Matemáticas II (2º Bach)',
    shortName: 'Matemáticas II',
    icon: '📐',
    stage: 'bachillerato',
    defaultLevel: 'Bachillerato',
    badge: 'Científico-Tecnol.',
    topics: [
      {
        title: 'Álgebra Lineal: Matrices, Determinantes y Sistemas (Rouché-Frobenius)',
        sampleNotes: 'Operaciones matriciales y cálculo de matriz inversa por adjuntos y Gauss-Jordan. Determinantes y sus propiedades. Teorema de Rouché-Frobenius: discusión de sistemas dependientes de parámetros. Regla de Cramer.',
      },
      {
        title: 'Geometría en el Espacio: Rectas, Planos, Posiciones y Ángulos',
        sampleNotes: 'Ecuaciones de la recta (vectorial, paramétrica, continua e implícita) y del plano. Posiciones relativas de dos rectas, recta y plano, y tres planos. Producto escalar, vectorial y mixto. Ángulos y perpendicularidad.',
      },
      {
        title: 'Geometría Métrica: Distancias, Proyecciones y Puntos Simétricos',
        sampleNotes: 'Distancia entre punto y recta, punto y plano, entre dos rectas paralelas y cruzadas. Cálculo de proyecciones ortogonales y coordenadas de puntos simétricos respecto de rectas y planos.',
      },
      {
        title: 'Análisis: Límites, Continuidad, Bolzano y Regla de L\'Hôpital',
        sampleNotes: 'Cálculo de límites indeterminados (0/0, ∞/∞, 1^∞). Teorema de Bolzano de existencia de ceros. Teorema de Rolle y del Valor Medio de Lagrange. Regla de L\'Hôpital y aplicaciones analíticas.',
      },
      {
        title: 'Cálculo Diferencial e Integral: Derivadas, Optimización y Regla de Barrow',
        sampleNotes: 'Cálculo de derivadas compuestas (regla de la cadena). Problemas de optimización de funciones. Métodos de integración: inmediata, cambio de variable, por partes y racionales. Teorema fundamental del cálculo y cálculo de áreas con integrales definidas.',
      },
      {
        title: 'Probabilidad y Estadística: Bayes y Distribución Normal',
        sampleNotes: 'Espacio muestral y operaciones con sucesos. Probabilidad condicionada, Teorema de la Probabilidad Total y Teorema de Bayes. Distribución Binomial B(n,p) y Distribución Normal N(μ,σ). Tipificación de la variable Z.',
      },
    ],
  },
  {
    id: 'bach_mates_ccss',
    name: 'Matemáticas Aplicadas a las CCSS II',
    shortName: 'Mates CCSS II',
    icon: '📊',
    stage: 'bachillerato',
    defaultLevel: 'Bachillerato',
    badge: 'Ciencias Sociales',
    topics: [
      {
        title: 'Programación Lineal Bidimensional y Región Factible',
        sampleNotes: 'Función objetivo a optimizar (maximizar o minimizar). Restricciones mediante inecuaciones lineales. Representación gráfica de la región factible (acotada o no acotada). Vértices y valor óptimo.',
      },
      {
        title: 'Álgebra de Matrices y Sistemas Lineales con Aplicación Social',
        sampleNotes: 'Matrices de costes, producción y stocks. Multiplicación de matrices e inversa. Resolución de sistemas lineales mediante el método matricial o Gauss.',
      },
      {
        title: 'Análisis Funcional: Funciones Económicas, Derivadas y Extremos',
        sampleNotes: 'Funciones de costes, ingresos y beneficios: B(x) = I(x) - C(x). Continuidad y asíntotas. Derivadas, intervalos de crecimiento/decrecimiento, máximos y mínimos relativos.',
      },
      {
        title: 'Probabilidad Compuesta y Teorema de Bayes',
        sampleNotes: 'Diagramas de árbol y tablas de contingencia. Probabilidad condicionada P(A|B). Independencia de sucesos. Teorema de Bayes aplicado a estudios demográficos y de mercado.',
      },
      {
        title: 'Inferencia Estadística: Muestreo e Intervalos de Confianza',
        sampleNotes: 'Muestreo aleatorio simple. Teorema Central del Límite. Intervalo de confianza para la media poblacional μ y para una proporción p. Error máximo admisible y tamaño de la muestra n.',
      },
    ],
  },
  {
    id: 'bach_lengua2',
    name: 'Lengua Castellana y Literatura II',
    shortName: 'Lengua y Lit. II',
    icon: '📖',
    stage: 'bachillerato',
    defaultLevel: 'Bachillerato',
    badge: 'Troncal 2º Bach',
    topics: [
      {
        title: 'Comentario de Texto: Adecuación, Coherencia, Cohesión y Argumentación',
        sampleNotes: 'Estructura textual y tema central. Identificación de la tesis y argumentos (de autoridad, ejemplos, datos, analogía). Modalización y mecanismos de subjetividad. Resumen objetivo y valoración crítica argumentada.',
      },
      {
        title: 'Sintaxis de la Oración Compuesta según la NGLE (RAE)',
        sampleNotes: 'Subordinadas sustantivas (función de sujeto, CD, término de preposición). Subordinadas de relativo (con antecedente expreso o libres/semilibres). Construcciones oracionales: temporales, causales, finales, consecutivas, condicionales y concesivas.',
      },
      {
        title: 'Morfología Léxica y Relaciones Semánticas',
        sampleNotes: 'Estructura morfológica de las palabras: base léxica, afijos derivativos y desinencias. Relaciones de significado: sinonimia, antonimia, polisemia, homonimia, hiperonimia e hiponimia.',
      },
      {
        title: 'Literatura Española del Siglo XX: La Generación del 98 y Modernismo',
        sampleNotes: 'Modernismo: Rubén Darío y la búsqueda de la belleza formal. Generación del 98: Unamuno, Antonio Machado, Baroja, Azorín y Valle-Inclán (el esperpento). Temas: la decadencia de España, el sentido de la existencia y la sobriedad estilística.',
      },
      {
        title: 'La Generación del 27 y el Teatro de Posguerra (Buero Vallejo)',
        sampleNotes: 'Generación del 27: Lorca, Cernuda, Alberti, Aleixandre, Dámaso Alonso. Síntesis de tradición poética (romancero, Góngora) y vanguardias (surrealismo). El teatro español de posguerra: Antonio Buero Vallejo y Alfonso Sastre.',
      },
    ],
  },
  {
    id: 'bach_fisica',
    name: 'Física (2º Bach)',
    shortName: 'Física',
    icon: '⚡',
    stage: 'bachillerato',
    defaultLevel: 'Bachillerato',
    badge: 'Científico 2º Bach',
    topics: [
      {
        title: 'Campo Gravitatorio: Ley de Newton, Órbitas y Energía Potencial',
        sampleNotes: 'Ley de Gravitación Universal. Vector intensidad de campo gravitatorio g y potencial gravitatorio V. Conservación de la energía mecánica en campos conservativos. Velocidad orbital y velocidad de escape de un satélite.',
      },
      {
        title: 'Campo Electrostático y Campo Magnético (Lorentz y Biot-Savart)',
        sampleNotes: 'Ley de Coulomb y campo eléctrico E. Teorema de Gauss. Fuerza de Lorentz sobre cargas en movimiento y sobre conductores rectilíneos: F = q(v×B) y F = I(L×B). Ley de Biot y Savart.',
      },
      {
        title: 'Inducción Electromagnética: Leyes de Faraday y Lenz',
        sampleNotes: 'Flujo magnético Φ = B·S·cos(θ). Ley de Faraday-Lenz: fem inducida ε = -dΦ/dt. Fuerza electromotriz generada por variación de campo, superficie u orientación (generador de corriente alterna).',
      },
      {
        title: 'Movimiento Ondulatorio y Acústica',
        sampleNotes: 'Ecuación de la onda armónica y(x,t) = A·sen(ωt - kx + φ0). Longitud de onda, frecuencia y velocidad de propagación. Ondas estacionarias. Intensidad sonora (W/m²) y nivel de intensidad en decibelios (dB).',
      },
      {
        title: 'Física Cuántica y Nuclear: Efecto Fotoeléctrico y Radiactividad',
        sampleNotes: 'Hipótesis cuántica de Planck E=h·ν. Efecto fotoeléctrico de Einstein: h·ν = W0 + Ec_max. Longitud de onda de De Broglie. Defecto de masa y energía de enlace nuclear E=Δm·c². Ley de desintegración radiactiva y periodo de semidesintegración.',
      },
    ],
  },
  {
    id: 'bach_quimica',
    name: 'Química (2º Bach)',
    shortName: 'Química',
    icon: '⚗️',
    stage: 'bachillerato',
    defaultLevel: 'Bachillerato',
    badge: 'Científico 2º Bach',
    topics: [
      {
        title: 'Estructura Atómica, Configuración y Propiedades Periódicas',
        sampleNotes: 'Números cuánticos (n, l, m, s) y orbitales atómicos. Principio de exclusión de Pauli y regla de Hund. Configuración electrónica. Variación periódica: radio atómico, energía de ionización, afinidad electrónica y electronegatividad.',
      },
      {
        title: 'Enlace Químico y Fuerzas Intermoleculares',
        sampleNotes: 'Ciclo de Born-Haber para enlace iónico. Enlace covalente: estructuras de Lewis y teoría RPECV (geometría molecular). Polaridad de moléculas. Fuerzas intermoleculares: puentes de hidrógeno y fuerzas de Van der Waals.',
      },
      {
        title: 'Termoquímica: Entalpía de Reacción, Ley de Hess y Espontaneidad',
        sampleNotes: 'Primer principio de la termodinámica. Entalpía estándar de reacción y de formación. Ley de Hess para el cálculo de ΔHº. Entropía ΔSº y Energía libre de Gibbs ΔGº = ΔHº - T·ΔSº (criterio de espontaneidad).',
      },
      {
        title: 'Equilibrio Químico y Equilibrios de Solubilidad (Kc, Kp y Ks)',
        sampleNotes: 'Concepto dinámico de equilibrio. Constantes Kc y Kp, relación Kp = Kc(RT)^Δn. Grado de disociación α. Principio de Le Chatelier (temperatura, presión, volumen, concentración). Producto de solubilidad Ks y efecto del ión común.',
      },
      {
        title: 'Reacciones Ácido-Base: Teoría de Brönsted-Lowry, pH e Hidrólisis',
        sampleNotes: 'Ácidos y bases conjugados. Autoionización del agua y producto iónico Kw. Cálculo del pH y pOH en disoluciones de ácidos y bases fuertes y débiles (Ka, Kb). Hidrólisis de sales. Volumetrías de neutralización.',
      },
      {
        title: 'Reacciones Redox y Pilas Electroquímicas (Células Galvánicas)',
        sampleNotes: 'Número de oxidación. Ajuste de reacciones de oxidación-reducción por el método del ión-electrón en medio ácido y básico. Pilas galvánicas: ánodo, cátodo y puente salino. Potenciales estándar Eº y espontaneidad de la pila.',
      },
    ],
  },
  {
    id: 'bach_biologia',
    name: 'Biología (2º Bach)',
    shortName: 'Biología',
    icon: '🧬',
    stage: 'bachillerato',
    defaultLevel: 'Bachillerato',
    badge: 'Científico 2º Bach',
    topics: [
      {
        title: 'Bioquímica: Glúcidos, Lípidos, Proteínas y Ácidos Nucleicos',
        sampleNotes: 'Estructura química y función biológica. Enlace glucosídico, enlace éster, enlace peptídico y fosfodiéster. Estructura primaria, secundaria, terciaria y cuaternaria de proteínas. Desnaturalización proteica.',
      },
      {
        title: 'Metabolismo Celular: Catabolismo y Anabolismo',
        sampleNotes: 'Glucólisis (en citosol), ciclo de Krebs y fosforilación oxidativa mitocondrial (cadena de transporte y ATP sintasa). Fermentación láctica y alcohólica. Fotosíntesis: fase luminosa en tilacoides y ciclo de Calvin en el estroma.',
      },
      {
        title: 'Genética Molecular: Replicación, Transcripción y Traducción',
        sampleNotes: 'Modelo de doble hélice de Watson y Crick. Replicación semiconservativa del ADN (polimerasas, ligasas). Transcripción del ARNm y maduración (corte y empalme / splicing). Código genético degenerado y universal. Síntesis de proteínas.',
      },
      {
        title: 'Inmunología: Sistema Inmune, Vacunas y Respuesta Antígeno-Anticuerpo',
        sampleNotes: 'Inmunidad innata vs. adaptativa (humoral y celular). Linfocitos B y T. Estructura de las inmunoglobulinas (anticuerpos). Respuesta primaria y secundaria de memoria. Inmunidad activa (vacunas) y pasiva (sueros). Autoinmunidad y alergias.',
      },
    ],
  },
  {
    id: 'bach_geografia',
    name: 'Geografía de España (2º Bach)',
    shortName: 'Geografía España',
    icon: '🌍',
    stage: 'bachillerato',
    defaultLevel: 'Bachillerato',
    badge: 'Humanidades / CCSS',
    topics: [
      {
        title: 'El Relieve Español: Morfoestructura, Litología y Unidades Físicas',
        sampleNotes: 'Evolución geológica (orogenia herciniana y alpina). España silícea, caliza y arcillosa. La Meseta Central, cordilleras interiores, rebordes montañosos, cordilleras exteriores y depresiones exteriores.',
      },
      {
        title: 'Climas y Aguas en España: Dominios Climáticos y Regímenes Fluviales',
        sampleNotes: 'Factores geográficos y termodinámicos (corriente en chorro, anticiclón de las Azores, frentes). Dominios climáticos: oceánico, mediterráneo, de montaña y canario. Vertientes hidrográficas (cantábrica, atlántica y mediterránea).',
      },
      {
        title: 'Población y Sistema Urbano Español',
        sampleNotes: 'Evolución demográfica: régimen demográfico antiguo, de transición y moderno. Estructura por edad y sexo (envejecimiento). Movimientos migratorios interiores y exteriores. Jerarquía urbana peninsular y áreas metropolitanas.',
      },
    ],
  },
  {
    id: 'bach_filosofia',
    name: 'Historia de la Filosofía (2º Bach)',
    shortName: 'Filosofía',
    icon: '🏛️',
    stage: 'bachillerato',
    defaultLevel: 'Bachillerato',
    badge: 'Troncal 2º Bach',
    topics: [
      {
        title: 'Filosofía Antigua: Platón (Mundo de las Ideas, Alma y Estado Ideal)',
        sampleNotes: 'Dualismo ontológico: Mundo Sensible y Mundo Inteligible (Teoría de las Ideas). Dualismo antropológico y mito del carro alado. Teoría de la reminiscencia y dialéctica. La polis justa en La República: correspondencia entre alma y clases sociales.',
      },
      {
        title: 'Filosofía Moderna: Descartes y el Racionalismo Metódico',
        sampleNotes: 'La duda metódica radical y el criterio de verdad (ideas claras y distintas). El "Cogito, ergo sum" como primera verdad indudable. Las tres sustancias: Res cogitans (pensamiento), Res infinita (Dios) y Res extensa (mundo material).',
      },
      {
        title: 'La Ilustración: Immanuel Kant (Razón Crítica y Ética Formal)',
        sampleNotes: 'El giro copernicano en teoría del conocimiento: síntesis entre empirismo y racionalismo (sensibilidad, entendimiento y razón). Fenómeno y noúmeno. Ética deontológica formal: imperativo categórico vs. imperativos hipotéticos. Autonomía moral.',
      },
      {
        title: 'Filosofía Contemporánea: Friedrich Nietzsche y la Crítica a la Cultura Occidental',
        sampleNotes: 'Crítica a la metafísica platónico-cristiana: lo apolíneo vs. lo dionisíaco. La "muerte de Dios" y el advenimiento del nihilismo. Voluntad de poder, transvaloración de los valores morales y la figura del Superhombre (Übermensch). Eterno retorno.',
      },
    ],
  },
  {
    id: 'bach_ingles2',
    name: 'Inglés II (Bachillerato - B2)',
    shortName: 'Inglés II',
    icon: '🇬🇧',
    stage: 'bachillerato',
    defaultLevel: 'Bachillerato',
    badge: 'Nivel B2',
    topics: [
      {
        title: 'Sentence Transformation and Rephrasing (B2 Grammar)',
        sampleNotes: 'Key sentence transformation patterns: passive into active, direct into reported speech, inversion after negative adverbials (Seldom/Never have I...), comparative clauses, conditional alternatives (Unless, As long as, Provided that).',
      },
      {
        title: 'Advanced Verb Structures, Modal Verbs of Deduction & Causatives',
        sampleNotes: 'Modal verbs of deduction in present and past (must have, can\'t have, might have). Causative structures (have/get something done). Gerunds and Infinitives with meaning change (remember, stop, try).',
      },
      {
        title: 'Connectors and Cohesion in Argumentative Writing',
        sampleNotes: 'Expressing contrast (whereas, while, on the contrary, nevertheless), addition (furthermore, moreover, besides), cause and consequence (due to, owing to, as a result, consequently). Writing formal opinion essays.',
      },
    ],
  },

  // ===================== PREPARACIÓN PAU / EBAU (SELECTIVIDAD) =====================
  {
    id: 'pau_historia',
    name: 'PAU: Historia de España',
    shortName: 'PAU Historia',
    icon: '🏛️',
    stage: 'pau',
    defaultLevel: 'Preparación PAU / EBAU',
    badge: 'Formato PAU 2025/2026',
    topics: [
      {
        title: 'Examen Oficial PAU: Comentario de Fuente Histórica y Desarrollo',
        sampleNotes: 'Estructura oficial PAU: Clasificación de la fuente (tipo de texto, autor, destinatario, fecha), análisis de ideas principales y secundarias, contextualización histórica rigurosa en el temario LOMLOE y conclusión con consecuencias históricas.',
      },
      {
        title: 'Examen Oficial PAU: La Guerra de la Independencia y la Constitución de 1812',
        sampleNotes: 'Preguntas tipo PAU sobre el Tratado de Fontainebleau, el Motín de Aranjuez, las Cortes Extraordinarias de Cádiz, soberanía nacional y la vigencia/derogación de la obra legislativa gaditana.',
      },
      {
        title: 'Examen Oficial PAU: La Segunda República y la Guerra Civil Española',
        sampleNotes: 'Cuestiones modelo PAU: Reformas estructurales de 1931, radicalización política, la intervención extranjera en la Guerra Civil (Comité de No Intervención, Eje y URSS) y consecuencias demográficas/económicas.',
      },
      {
        title: 'Examen Oficial PAU: Transición Democrática y Constitución de 1978',
        sampleNotes: 'Análisis de textos oficiales de la Transición: Pactos de la Moncloa, papel de la Corona y Adolfo Suárez, consenso constitucional de 1978 y consolidación del Estado de las Autonomías.',
      },
    ],
  },
  {
    id: 'pau_mates2',
    name: 'PAU: Matemáticas II',
    shortName: 'PAU Mates II',
    icon: '📐',
    stage: 'pau',
    defaultLevel: 'Preparación PAU / EBAU',
    badge: 'Selectividad Mates',
    topics: [
      {
        title: 'Examen Oficial PAU: Álgebra Lineal y Discusión de Sistemas con Parámetro',
        sampleNotes: 'Problema típico PAU: Discusión del sistema lineal dependiente de un parámetro m aplicando el Teorema de Rouché-Frobenius. Resolución en casos compatible determinado e indeterminado mediante la Regla de Cramer.',
      },
      {
        title: 'Examen Oficial PAU: Geometría en el Espacio y Posición Relativa',
        sampleNotes: 'Problema tipo PAU de geometría tridimensional: Determinación de la recta perpendicular común, distancia mínima entre rectas que se cruzan, cálculo de plano mediador o punto simétrico.',
      },
      {
        title: 'Examen Oficial PAU: Análisis de Funciones, Optimización y Regla de Barrow',
        sampleNotes: 'Ejercicio tipo PAU de cálculo: Derivabilidad en puntos conflictivos con parámetro, asíntotas, problema de optimización geométrica o física, y cálculo de área comprendida entre curvas mediante integral definida.',
      },
      {
        title: 'Examen Oficial PAU: Probabilidad, Teorema de Bayes y Distribución Normal',
        sampleNotes: 'Problema de probabilidad de examen PAU: Construcción del árbol de probabilidades, aplicación del Teorema de la Probabilidad Total y Teorema de Bayes. Problema de distribución normal con tipificación y lectura en tablas.',
      },
    ],
  },
  {
    id: 'pau_mates_ccss',
    name: 'PAU: Matemáticas CCSS II',
    shortName: 'PAU Mates CCSS',
    icon: '📊',
    stage: 'pau',
    defaultLevel: 'Preparación PAU / EBAU',
    badge: 'Selectividad Sociales',
    topics: [
      {
        title: 'Examen Oficial PAU: Problema Completo de Programación Lineal',
        sampleNotes: 'Problema clásico de la PAU de Ciencias Sociales: Planteamiento del sistema de inecuaciones a partir de un enunciado comercial/industrial, dibujo exacto de la región factible, cálculo de coordenadas de los vértices y determinación del máximo/mínimo.',
      },
      {
        title: 'Examen Oficial PAU: Función de Beneficios, Continuidad y Extremos Relativos',
        sampleNotes: 'Problema PAU de funciones a trozos: Estudio de continuidad y derivabilidad para valores de parámetros a y b. Estudio de crecimiento y cálculo del precio óptimo para maximizar el beneficio empresarial.',
      },
      {
        title: 'Examen Oficial PAU: Inferencia Estadística y Tamaño Muestral Óptimo',
        sampleNotes: 'Problema PAU de intervalos de confianza: Cálculo del intervalo para la media o proporción poblacional con un nivel de confianza del 95% o 99% (z_α/2). Cálculo del tamaño muestral mínimo necesario para no superar un error prefijado.',
      },
    ],
  },
  {
    id: 'pau_lengua',
    name: 'PAU: Lengua Castellana y Literatura',
    shortName: 'PAU Lengua',
    icon: '📖',
    stage: 'pau',
    defaultLevel: 'Preparación PAU / EBAU',
    badge: 'Selectividad Lengua',
    topics: [
      {
        title: 'Examen Oficial PAU: Comentario Crítico y Resumen de Texto de Opinión',
        sampleNotes: 'Prueba de examen PAU: Enunciado del tema, resumen en un solo párrafo objetivo sin copiar frases literales, delimitación de la estructura organizativa (inductiva, deductiva, encuadrada) y redacción del comentario personal crítico argumentado.',
      },
      {
        title: 'Examen Oficial PAU: Análisis Sintáctico de Oración Compuesta (NGLE)',
        sampleNotes: 'Análisis oracional riguroso según los criterios de corrección de la PAU: Identificación del verbo principal, proposiciones subordinadas sustantivas, de relativo o adverbiales, funciones sintácticas de cada constituyente.',
      },
      {
        title: 'Examen Oficial PAU: Significado Contextual, Conectores y Pregunta Literaria',
        sampleNotes: 'Definición precisa del significado de dos palabras según su contexto en el texto. Clasificación de dos marcadores discursivos. Respuesta desarrollada a la pregunta de literatura española prescrita.',
      },
    ],
  },
  {
    id: 'pau_fisica',
    name: 'PAU: Física',
    shortName: 'PAU Física',
    icon: '⚡',
    stage: 'pau',
    defaultLevel: 'Preparación PAU / EBAU',
    badge: 'Selectividad Física',
    topics: [
      {
        title: 'Examen Oficial PAU: Problema de Campo Gravitatorio y Satélites',
        sampleNotes: 'Cálculo de la altura orbital, velocidad lineal y periodo de un satélite geoestacionario. Energía mecánica total y energía requerida para trasladar el satélite a otra órbita.',
      },
      {
        title: 'Examen Oficial PAU: Problema de Inducción Electromagnética y Flujo',
        sampleNotes: 'Cálculo del flujo magnético a través de una espira circular. Expresión de la fuerza electromotriz inducida mediante la derivada del flujo con respecto al tiempo ε = -dΦ/dt y sentido de la corriente por la Ley de Lenz.',
      },
      {
        title: 'Examen Oficial PAU: Cuestión de Efecto Fotoeléctrico y Cuántica',
        sampleNotes: 'Determinación de la frecuencia umbral, longitud de onda umbral y trabajo de extracción a partir del potencial de frenado. Cálculo de la energía cinética máxima de los fotoelectrones.',
      },
    ],
  },
  {
    id: 'pau_quimica',
    name: 'PAU: Química',
    shortName: 'PAU Química',
    icon: '⚗️',
    stage: 'pau',
    defaultLevel: 'Preparación PAU / EBAU',
    badge: 'Selectividad Química',
    topics: [
      {
        title: 'Examen Oficial PAU: Problema de Equilibrio Químico Homogéneo',
        sampleNotes: 'Planteamiento de la tabla de equilibrio (moles iniciales, transformados y en equilibrio). Cálculo de las concentraciones molares, grado de disociación α, constante Kc y Kp. Efecto de la presión y volumen.',
      },
      {
        title: 'Examen Oficial PAU: Neutralización Ácido-Base, Hidrólisis y pH',
        sampleNotes: 'Cálculo del pH de una disolución de ácido débil a partir de su constante Ka. Neutralización estequiométrica con NaOH y estudio del carácter ácido, básico o neutro de la disolución resultante por hidrólisis de la sal.',
      },
      {
        title: 'Examen Oficial PAU: Ajuste Redox por Ión-Electrón y Fuerza Electromotriz',
        sampleNotes: 'Identificación de especies oxidante y reductora. Escritura y balanceo de las semirreacciones de oxidación y reducción en medio ácido/básico. Ecuación global iónica y molecular. Cálculo del potencial estándar Eº de la pila.',
      },
    ],
  },
  {
    id: 'pau_biologia',
    name: 'PAU: Biología',
    shortName: 'PAU Biología',
    icon: '🧬',
    stage: 'pau',
    defaultLevel: 'Preparación PAU / EBAU',
    badge: 'Selectividad Biología',
    topics: [
      {
        title: 'Examen Oficial PAU: Pregunta Competencial con Esquema Metabólico',
        sampleNotes: 'Identificación de procesos metabólicos a partir de un esquema mudo (fotosíntesis, glucólisis, beta-oxidación). Localización subcelular de cada etapa y balance de ATP/coenzimas reducidas (NADH, FADH2, NADPH).',
      },
      {
        title: 'Examen Oficial PAU: Problema de Genética Mendeliana o Ligada al Sexo',
        sampleNotes: 'Resolución formal de cruzamientos genéticos: asignación de alelos y genotipos, proporciones fenotípicas y genotípicas esperadas en la F1 y F2, y análisis de árboles genealógicos familiares (herencia autosómica vs. ligada al cromosoma X).',
      },
      {
        title: 'Examen Oficial PAU: Inmunología Aplicada, Vacunas y Anticuerpos',
        sampleNotes: 'Comparación detallada entre sueroterapia y vacunación (origen, duración y mecanismo). Dibujo esquemático de un anticuerpo (cadenas pesadas, ligeras, regiones constantes y variables) y mecanismo de neutralización.',
      },
    ],
  },
  {
    id: 'pau_geografia',
    name: 'PAU: Geografía de España',
    shortName: 'PAU Geografía',
    icon: '🌍',
    stage: 'pau',
    defaultLevel: 'Preparación PAU / EBAU',
    badge: 'Selectividad Geografía',
    topics: [
      {
        title: 'Examen Oficial PAU: Práctica de Comentario de Climograma Peninsular',
        sampleNotes: 'Análisis de temperaturas (media anual, amplitud térmica estacional, verano/invierno) y precipitaciones (total anual, aridez estival según índice de Gaussen). Determinación del tipo de clima y su localización geográfica probable en España.',
      },
      {
        title: 'Examen Oficial PAU: Práctica de Mapa del Tiempo o Mapa de Coropletas',
        sampleNotes: 'Lectura e interpretación de isobaras, centros de acción (borrascas y anticiclones) y frentes. O bien análisis de distribución espacial de densidades de población o áreas industriales en el mapa de España.',
      },
      {
        title: 'Examen Oficial PAU: Definición Precisa de 4 Conceptos Clave del Glosario',
        sampleNotes: 'Definición rigurosa de términos oficiales del glosario de la PAU (ej. Barbecho, Ciudad difusa, Tasa de fecundidad, Cuenca sedimentaria, Ría, Solana/Umbría, Saldo migratorio).',
      },
    ],
  },
  {
    id: 'pau_filosofia',
    name: 'PAU: Historia de la Filosofía',
    shortName: 'PAU Filosofía',
    icon: '🏛️',
    stage: 'pau',
    defaultLevel: 'Preparación PAU / EBAU',
    badge: 'Selectividad Filosofía',
    topics: [
      {
        title: 'Examen Oficial PAU: Comentario Guiado de Texto de Platón o Descartes',
        sampleNotes: 'Síntesis de las ideas fundamentales del fragmento y argumentación interna. Definición de dos términos filosóficos clave en el autor. Justificación de la posición filosófica del autor en relación con el problema epistemológico u ontológico.',
      },
      {
        title: 'Examen Oficial PAU: Comentario de Texto de Kant o Nietzsche',
        sampleNotes: 'Análisis del fragmento ético o crítico. Exposición razonada de la moral kantiana o la crítica nietzscheana. Comparación filosófica razonada con otro autor del currículo de Bachillerato y valoración crítica de su vigencia.',
      },
    ],
  },
  {
    id: 'pau_ingles',
    name: 'PAU: Inglés',
    shortName: 'PAU Inglés',
    icon: '🇬🇧',
    stage: 'pau',
    defaultLevel: 'Preparación PAU / EBAU',
    badge: 'Selectividad Inglés',
    topics: [
      {
        title: 'Examen Oficial PAU: Reading Comprehension y Preguntas Justificadas',
        sampleNotes: 'Lectura de un texto periodístico de actualidad. Respuesta a preguntas de comprensión con evidencia textual explícita entre comillas. Búsqueda de sinónimos y antónimos en párrafos indicados.',
      },
      {
        title: 'Examen Oficial PAU: Rephrasing de 4 Oraciones Gramaticales',
        sampleNotes: 'Transformación de oraciones sin alterar el significado (oraciones condicionales, pasivas con agente, estilo indirecto, conectores de concesión e inversión sintáctica).',
      },
      {
        title: 'Examen Oficial PAU: Composición Escrita Guiada (120-150 palabras)',
        sampleNotes: 'Redacción de un ensayo argumentativo o de opinión siguiendo la estructura formal: introducción con gancho temático, dos párrafos de desarrollo con conectores formales y conclusión coherente.',
      },
    ],
  },
];

export const POPULAR_SUBJECTS = [
  'Historia de España (PAU / Bachillerato)',
  'Matemáticas II (Bachillerato y PAU)',
  'Matemáticas Aplicadas a las CCSS',
  'Lengua Castellana y Literatura (ESO y Bachillerato)',
  'Física (Bachillerato y PAU)',
  'Química (Bachillerato y PAU)',
  'Biología y Geología (ESO y Bachillerato)',
  'Geografía de España (PAU)',
  'Historia de la Filosofía (PAU)',
  'Inglés (B1 / B2 / PAU)',
  'Geografía e Historia ESO',
  'Física y Química ESO',
];

export const DEMO_PRESETS: DemoSubject[] = [
  {
    id: 'pau_historia_cadiz',
    name: 'Historia de España',
    topic: 'Las Cortes de Cádiz y la Constitución de 1812',
    level: 'Preparación PAU / EBAU',
    difficulty: 'Media',
    testCount: 5,
    openCount: 2,
    sampleSummary: 'Modelo PAU con preguntas sobre las abdicaciones de Bayona, la soberanía nacional en la Constitución de 1812 y comentario de texto del Manifiesto de los Persas.',
    sampleNotesText: `HISTORIA DE ESPAÑA - PREPARACIÓN PAU / LOMLOE
TEMA: CRISIS DEL ANTIGUO RÉGIMEN Y CORTES DE CÁDIZ (1808-1814)

1. ANTECEDENTES Y DETONANTE
- Tratado de Fontainebleau (1807): entrada de tropas francesas para ocupar Portugal.
- Motín de Aranjuez (marzo 1808): caída de Godoy y abdicación de Carlos IV en Fernando VII.
- Abdicaciones de Bayona: Napoleón obtiene la corona española y nombra rey a su hermano José I Bonaparte. Estatuto de Bayona de 1808.
- Levantamiento del 2 de mayo de 1808 en Madrid: inicio de la Guerra de la Independencia.

2. LAS CORTES DE CÁDIZ
- Formación de la Junta Suprema Central en Aranjuez y posterior traslado a Cádiz.
- Convocatoria a Cortes generales y extraordinarias en 1810 en una asamblea única: diputados liberales, absolutistas ("serviles") y jovellanistas.
- Labor legislativa desmanteladora del Antiguo Régimen: abolición de señoríos jurisdiccionales, supresión de la Inquisición, libertad de imprenta y desamortización de bienes de órdenes militares.

3. LA CONSTITUCIÓN DE 1812 ("LA PEPA")
- Promulgada el 19 de marzo de 1812. Primer texto constitucional de la historia de España.
- Principios fundamentales:
  a) Soberanía nacional: el poder reside en la nación española, no en el monarca.
  b) División de poderes: ejecutivo (el rey), legislativo (las Cortes con el rey) y judicial (tribunales independientes).
  c) Sufragio universal masculino indirecto.
  d) Declaración de derechos y libertades civiles: igualdad jurídica ante la ley, inviolabilidad del domicilio y libertad de imprenta.
  e) Estado confesional católico sin tolerancia de otras religiones.
- Restablecimiento del absolutismo en 1814: Manifiesto de los Persas y Decreto de Valencia de Fernando VII que anula la Constitución.`,
  },
  {
    id: 'pau_mates_rouche',
    name: 'Matemáticas II',
    topic: 'Matrices, Determinantes y Sistemas (Rouché-Frobenius)',
    level: 'Preparación PAU / EBAU',
    difficulty: 'Difícil',
    testCount: 4,
    openCount: 2,
    sampleSummary: 'Problemas oficiales tipo PAU de discusión de sistemas de tres ecuaciones con tres incógnitas dependientes de un parámetro m y resolución por Cramer.',
    sampleNotesText: `MATEMÁTICAS II - BLOQUE ÁLGEBRA LINEAL PAU / LOMLOE
TEMA: SISTEMAS DE ECUACIONES LINEALES CON PARÁMETROS

1. MATRIZ DE COEFICIENTES Y MATRIZ AMPLIADA
Dado el sistema en forma matricial A·X = B, llamamos A a la matriz de coeficientes de orden 3x3 y A* (o (A|B)) a la matriz ampliada de orden 3x4.

2. TEOREMA DE ROUCHÉ-FROBENIUS
- El sistema es COMPATIBLE si y solo si rango(A) = rango(A*).
- Si rango(A) = rango(A*) = n (nº de incógnitas = 3), el sistema es COMPATIBLE DETERMINADO (solución única).
- Si rango(A) = rango(A*) < n, el sistema es COMPATIBLE INDETERMINADO (infinitas soluciones dependientes de n - rango parámetros).
- Si rango(A) ≠ rango(A*), el sistema es INCOMPATIBLE (no existe solución).

3. MÉTODO DE DISCUSIÓN MEDIANTE DETERMINANTES
1) Se calcula det(A) en función del parámetro m y se hallan las raíces igualando a cero: det(A) = 0.
2) Caso general: Si m ≠ m1 y m ≠ m2, det(A) ≠ 0 => rango(A) = 3 = rango(A*) = nº incógnitas => Sistema Compatible Determinado.
3) Casos particulares: Para m = m1 y m = m2, det(A) = 0 => rango(A) ≤ 2. Se sustituye el valor concreto de m en A* y se estudia el rango por menores o Gauss.

4. REGLA DE CRAMER
Para un sistema compatible determinado de orden 3:
x = det(Ax) / det(A), y = det(Ay) / det(A), z = det(Az) / det(A), donde Ax se obtiene sustituyendo la primera columna de A por la columna de términos independientes B.`,
  },
  {
    id: 'hist_guerra_fria',
    name: 'Historia Contemporánea',
    topic: 'La Guerra Fría: Bloques, Crisis y Descolonización',
    level: 'Bachillerato',
    difficulty: 'Media',
    testCount: 5,
    openCount: 2,
    sampleSummary: 'Doctrina Truman, Plan Marshall, OTAN vs Pacto de Varsovia, Crisis de los Misiles de Cuba (1962), Guerra de Vietnam y caída del Muro de Berlín.',
    sampleNotesText: `TEMARIO DE HISTORIA: LA GUERRA FRÍA (1947 - 1991)

1. ORÍGENES Y BIPOLARIZACIÓN (1947 - 1953)
- Definición: Estado de permanente tensión y confrontación ideológica, militar, económica y geopolítica entre las dos superpotencias surgidas de la Segunda Guerra Mundial: EE.UU. (bloque capitalista/occidental) y la URSS (bloque comunista/oriental), sin llegar a un enfrentamiento bélico nuclear directo.
- Doctrina Truman (1947): Política estadounidense de contención del expansionismo soviético en Europa y el mundo.
- Plan Marshall: Programa de ayuda económica de EE.UU. para la reconstrucción de Europa occidental y frenar el avance electoral de partidos comunistas. La URSS lo rechazó y creó el Kominform y el COMECON.
- Alianzas militares:
  * OTAN (Organización del Tratado del Atlántico Norte, 1949).
  * Pacto de Varsovia (1955) como contrapartida soviética.
- Primera gran crisis: El Bloqueo de Berlín (1948-1949) superado por el puente aéreo aliado, que culminó en la división de Alemania en RFA y RDA.

2. CRISIS CLAVE
- Guerra de Corea (1950 - 1953): Primer conflicto caliente. Paralelo 38. Armisticio de Panmunjom.
- Crisis de los Misiles en Cuba (octubre de 1962): Kennedy y Jrushchov al borde de la guerra nuclear tras el descubrimiento de rampas de misiles soviéticos en Cuba. Resolución: retirada de misiles a cambio del compromiso estadounidense de no invadir Cuba y retirada de misiles de Turquía.
- Guerra de Vietnam (1955 - 1975): Derrota militar y política de EE.UU. ante el Vietcong y Vietnam del Norte.

3. DESENLACE Y CAÍDA DEL BLOQUE SOVIÉTICO (1985 - 1991)
- Mijail Gorbachov emprende dos reformas fundamentales: Perestroika (reestructuración económica) y Glásnost (transparencia y libertad política).
- Caída del Muro de Berlín: 9 de noviembre de 1989, símbolo del colapso del bloque oriental.
- Disolución formal de la Unión Soviética en diciembre de 1991.`,
  },
  {
    id: 'info_estructuras',
    name: 'Programación e Informática',
    topic: 'Estructuras de Datos y Complejidad Algorítmica',
    level: 'Universidad / Grado',
    difficulty: 'Difícil',
    testCount: 6,
    openCount: 2,
    sampleSummary: 'Notación Asintótica Big-O, Listas enlazadas, Tablas Hash (resolución de colisiones), Árboles Binarios de Búsqueda (BST) y Grafos.',
    sampleNotesText: `TEMARIO DE INFORMÁTICA: ESTRUCTURAS DE DATOS Y COMPLEJIDAD

1. ANÁLISIS ASINTÓTICO (BIG-O)
- Notación Big-O: Describe el límite superior asintótico del tiempo de ejecución o espacio de memoria en el peor de los casos.
- Complejidades habituales: O(1) constante, O(log n) logarítmica (búsqueda binaria), O(n) lineal, O(n log n) linearítmica (MergeSort, QuickSort promedio), O(n^2) cuadrática (BubbleSort), O(2^n) exponencial.

2. TABLAS HASH (HASH TABLES)
- Función hash: Asigna claves arbitrarias a índices enteros de una tabla de tamaño fijo. Propiedades: determinista, uniforme y rápida.
- Manejo de colisiones:
  a) Encadenamiento separado (Separate Chaining): Cada celda contiene una lista enlazada o árbol rojo-negro.
  b) Direccionamiento abierto (Open Addressing): Búsqueda de hueco alternativo mediante sondeo lineal, cuadrático o doble hashing.
- Complejidad: O(1) promedio para inserción, búsqueda y borrado; O(n) en el peor caso de colisión masiva.

3. ÁRBOLES BINARIOS DE BÚSQUEDA (BST) Y BALANCEADOS (AVL)
- Propiedad BST: Para todo nodo con valor X, todos los nodos del subárbol izquierdo son < X y los del subárbol derecho son > X.
- Recorridos: Inorden (produce elementos ordenados ascendentemente), Preorden y Postorden.
- Árboles AVL y Red-Black: Garantizan balanceo automático con factor de equilibrio en [-1, 0, 1] mediante rotaciones simples y dobles (LL, RR, LR, RL), manteniendo altura O(log n).`,
  },
];
