import { EducationalLevel, UploadedMaterial } from '../types';

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

export const POPULAR_SUBJECTS = [
  'Biología y Geología',
  'Historia de España y Universal',
  'Filosofía',
  'Matemáticas',
  'Física y Química',
  'Lengua Castellana y Literatura',
  'Inglés',
  'Geografía',
  'Economía y Empresa',
  'Derecho',
  'Programación e Informática',
  'Medicina y Anatomía',
];

export const DEMO_PRESETS: DemoSubject[] = [
  {
    id: 'bio_fotosintesis',
    name: 'Biología Celular',
    topic: 'La Fotosíntesis y la Respiración Celular',
    level: 'Bachillerato',
    difficulty: 'Media',
    testCount: 5,
    openCount: 2,
    sampleSummary: 'Apuntes completos sobre cloroplastos, fase lumínica en tilacoides, ciclo de Calvin en el estroma, y balance energético comparado con la glucólisis mitocondrial.',
    sampleNotesText: `TEMARIO DE BIOLOGÍA: FOTOSÍNTESIS Y RESPIRACIÓN CELULAR

1. ESTRUCTURA DEL CLOROPLASTO
Los cloroplastos poseen una doble membrana (externa e interna) y un espacio interno llamado estroma. En el estroma se encuentran los tilacoides, sacos aplanados agrupados en grana (plural: granae).
En la membrana tilacoidal se localizan los fotosistemas I y II (PSI y PSII), que contienen clorofila a, clorofila b y carotenoides como pigmentos antena.

2. FASE LUMÍNICA O FOTOQUÍMICA (En la membrana del tilacoide)
- Ocurre exclusivamente en presencia de luz.
- La luz excita los electrones del PSII (P680), que se transfieren a través de una cadena de transporte de electrones (plastoquinona, citocromo b6f, plastocianina) hasta el PSI (P700).
- Fotólisis del agua: 2 H2O -> O2 + 4 H+ + 4 e-. Los electrones reponen los cedidos por el P680. Se libera oxígeno molecular (O2) a la atmósfera.
- Fotofosforilación: El gradiente electroquímico de protones (fuerza protón-motriz) acumulado en el lumen tilacoidal impulsa a la ATP sintasa para generar ATP a partir de ADP y fosfato inorgánico (quimiosmosis).
- Al final de la cadena de transporte acíclica, los electrones reducen el NADP+ a NADPH gracias a la enzima ferredoxina-NADP+ reductasa.

3. FASE OSCURA O BIOSINTÉTICA: CICLO DE CALVIN (En el estroma)
- Puede ocurrir con o sin luz directa, pero requiere del ATP y NADPH producidos en la fase lumínica.
- Fases del Ciclo de Calvin:
  a) Fijación del CO2: La enzima Rubisco (Ribulosa-1,5-bisfosfato carboxilasa-oxigenasa) cataliza la unión de CO2 a la ribulosa-1,5-bisfosfato (RuBP), originando 3-fosfoglicerato (3-PGA).
  b) Reducción: El 3-PGA se fosforila con ATP y se reduce con NADPH a Gliceraldehído-3-fosfato (G3P).
  c) Regeneración: De cada 6 moléculas de G3P formadas, 1 neta se destina a la síntesis de glucosa y otros glúcidos, y las otras 5 se utilizan para regenerar RuBP consumiendo más ATP.

4. BALANCE ENERGÉTICO COMPARADO CON LA RESPIRACIÓN CELULAR
- Fotosíntesis: Proceso anabólico y endergónico (6 CO2 + 6 H2O + luz -> C6H12O6 + 6 O2).
- Respiración celular: Proceso catabólico y exergónico en mitocondrias (C6H12O6 + 6 O2 -> 6 CO2 + 6 H2O + ~30-32 ATP). Fases: Glucólisis (citosol), Ciclo de Krebs (matriz mitocondrial) y Cadena respiratoria con fosforilación oxidativa (crestas mitocondriales).`,
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
