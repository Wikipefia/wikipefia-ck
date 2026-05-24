export interface LocalizedString {
  ru: string;
  en: string;
  cz: string;
}

export interface MockSubject {
  slug: string;
  name: LocalizedString;
  description: LocalizedString;
  articleCount: number;
  difficulty: "easy" | "medium" | "hard";
  semester: number;
  credits: number;
  icon: string;
}

export interface MockTeacher {
  slug: string;
  name: LocalizedString;
  description: LocalizedString;
  ratings: {
    overall: number;
    clarity: number;
    difficulty: number;
    usefulness: number;
    count: number;
  };
  subjects: string[];
}

export interface SearchEntry {
  id: string;
  type:
    | "subject"
    | "teacher"
    | "subject-article"
    | "teacher-article"
    | "system-article";
  title: string;
  description: string;
  route: string;
}

export const subjects: MockSubject[] = [
  {
    slug: "linear-algebra",
    name: {
      ru: "Линейная алгебра",
      en: "Linear Algebra",
      cz: "Lineární algebra",
    },
    description: {
      ru: "Векторные пространства, матрицы, определители и линейные отображения",
      en: "Vector spaces, matrices, determinants, and linear transformations",
      cz: "Vektorové prostory, matice, determinanty a lineární zobrazení",
    },
    articleCount: 24,
    difficulty: "medium",
    semester: 1,
    credits: 5,
    icon: "📐",
  },
  {
    slug: "mathematical-analysis",
    name: {
      ru: "Математический анализ",
      en: "Mathematical Analysis",
      cz: "Matematická analýza",
    },
    description: {
      ru: "Пределы, производные, интегралы и ряды",
      en: "Limits, derivatives, integrals, and series",
      cz: "Limity, derivace, integrály a řady",
    },
    articleCount: 31,
    difficulty: "hard",
    semester: 1,
    credits: 6,
    icon: "∫",
  },
  {
    slug: "discrete-mathematics",
    name: {
      ru: "Дискретная математика",
      en: "Discrete Mathematics",
      cz: "Diskrétní matematika",
    },
    description: {
      ru: "Графы, комбинаторика, логика и теория множеств",
      en: "Graphs, combinatorics, logic, and set theory",
      cz: "Grafy, kombinatorika, logika a teorie množin",
    },
    articleCount: 18,
    difficulty: "medium",
    semester: 2,
    credits: 4,
    icon: "🔗",
  },
  {
    slug: "probability-theory",
    name: {
      ru: "Теория вероятностей",
      en: "Probability Theory",
      cz: "Teorie pravděpodobnosti",
    },
    description: {
      ru: "Случайные величины, распределения, предельные теоремы",
      en: "Random variables, distributions, limit theorems",
      cz: "Náhodné veličiny, distribuce, limitní věty",
    },
    articleCount: 15,
    difficulty: "hard",
    semester: 3,
    credits: 5,
    icon: "🎲",
  },
  {
    slug: "programming-fundamentals",
    name: {
      ru: "Основы программирования",
      en: "Programming Fundamentals",
      cz: "Základy programování",
    },
    description: {
      ru: "Алгоритмы, структуры данных, основы Python и C++",
      en: "Algorithms, data structures, Python and C++ basics",
      cz: "Algoritmy, datové struktury, základy Pythonu a C++",
    },
    articleCount: 28,
    difficulty: "easy",
    semester: 1,
    credits: 5,
    icon: "💻",
  },
];

export const teachers: MockTeacher[] = [
  {
    slug: "ivan-petrov",
    name: {
      ru: "Иван Петров",
      en: "Ivan Petrov",
      cz: "Ivan Petrov",
    },
    description: {
      ru: "Профессор математики, 15 лет преподавательского опыта",
      en: "Professor of mathematics, 15 years of teaching experience",
      cz: "Profesor matematiky, 15 let pedagogických zkušeností",
    },
    ratings: { overall: 4.5, clarity: 4.8, difficulty: 3.2, usefulness: 4.6, count: 127 },
    subjects: ["linear-algebra", "mathematical-analysis"],
  },
  {
    slug: "maria-novakova",
    name: {
      ru: "Мария Новакова",
      en: "Maria Novakova",
      cz: "Marie Nováková",
    },
    description: {
      ru: "Доцент информатики, специалист по алгоритмам",
      en: "Associate professor of CS, algorithms specialist",
      cz: "Docentka informatiky, specialistka na algoritmy",
    },
    ratings: { overall: 4.7, clarity: 4.9, difficulty: 2.8, usefulness: 4.8, count: 203 },
    subjects: ["programming-fundamentals", "discrete-mathematics"],
  },
  {
    slug: "alexander-sokolov",
    name: {
      ru: "Александр Соколов",
      en: "Alexander Sokolov",
      cz: "Alexandr Sokolov",
    },
    description: {
      ru: "Старший преподаватель статистики и теории вероятностей",
      en: "Senior lecturer in statistics and probability theory",
      cz: "Starší přednášející statistiky a teorie pravděpodobnosti",
    },
    ratings: { overall: 4.2, clarity: 4.0, difficulty: 3.8, usefulness: 4.3, count: 89 },
    subjects: ["probability-theory"],
  },
  {
    slug: "elena-kozlova",
    name: {
      ru: "Елена Козлова",
      en: "Elena Kozlova",
      cz: "Elena Kozlová",
    },
    description: {
      ru: "Кандидат наук, эксперт по математическому анализу",
      en: "PhD, expert in mathematical analysis and calculus",
      cz: "PhD, expertka na matematickou analýzu",
    },
    ratings: { overall: 4.8, clarity: 4.9, difficulty: 3.5, usefulness: 4.7, count: 156 },
    subjects: ["mathematical-analysis"],
  },
];

export const searchEntries: SearchEntry[] = [
  // Subjects
  ...subjects.map((s) => ({
    id: `subject:${s.slug}`,
    type: "subject" as const,
    title: s.name.en,
    description: s.description.en,
    route: `/${s.slug}`,
  })),
  // Teachers
  ...teachers.map((t) => ({
    id: `teacher:${t.slug}`,
    type: "teacher" as const,
    title: t.name.en,
    description: t.description.en,
    route: `/${t.slug}`,
  })),
  // Subject articles
  {
    id: "article:linear-algebra/vectors-intro",
    type: "subject-article",
    title: "Introduction to Vectors",
    description: "Vectors in 2D and 3D, operations, dot and cross products",
    route: "/linear-algebra/vectors-intro",
  },
  {
    id: "article:linear-algebra/matrix-operations",
    type: "subject-article",
    title: "Matrix Operations",
    description: "Addition, multiplication, transposition, and inversion of matrices",
    route: "/linear-algebra/matrix-operations",
  },
  {
    id: "article:linear-algebra/eigenvalues",
    type: "subject-article",
    title: "Eigenvalues & Eigenvectors",
    description: "Finding eigenvalues, characteristic polynomial, diagonalization",
    route: "/linear-algebra/eigenvalues",
  },
  {
    id: "article:mathematical-analysis/limits",
    type: "subject-article",
    title: "Limits and Continuity",
    description: "Epsilon-delta definition, properties of limits, continuity of functions",
    route: "/mathematical-analysis/limits",
  },
  {
    id: "article:mathematical-analysis/derivatives",
    type: "subject-article",
    title: "Derivatives",
    description: "Rules of differentiation, chain rule, implicit differentiation",
    route: "/mathematical-analysis/derivatives",
  },
  {
    id: "article:discrete-mathematics/graph-theory",
    type: "subject-article",
    title: "Introduction to Graph Theory",
    description: "Vertices, edges, paths, cycles, and graph properties",
    route: "/discrete-mathematics/graph-theory",
  },
  {
    id: "article:probability-theory/random-variables",
    type: "subject-article",
    title: "Random Variables",
    description: "Discrete and continuous random variables, PMF and PDF",
    route: "/probability-theory/random-variables",
  },
  {
    id: "article:programming-fundamentals/python-basics",
    type: "subject-article",
    title: "Python Basics",
    description: "Variables, control flow, functions, and basic data structures",
    route: "/programming-fundamentals/python-basics",
  },
  {
    id: "article:programming-fundamentals/sorting-algorithms",
    type: "subject-article",
    title: "Sorting Algorithms",
    description: "Bubble sort, merge sort, quicksort — analysis and implementation",
    route: "/programming-fundamentals/sorting-algorithms",
  },
  // Teacher articles
  {
    id: "article:ivan-petrov/teaching-philosophy",
    type: "teacher-article",
    title: "Teaching Philosophy — Ivan Petrov",
    description: "My approach to making abstract mathematics intuitive and engaging",
    route: "/ivan-petrov/teaching-philosophy",
  },
  {
    id: "article:maria-novakova/exam-tips",
    type: "teacher-article",
    title: "Exam Preparation Tips — Maria Novakova",
    description: "How to prepare effectively for programming and algorithms exams",
    route: "/maria-novakova/exam-tips",
  },
  // System articles
  {
    id: "system:semester-1-overview",
    type: "system-article",
    title: "First Semester Overview",
    description: "Complete guide to your first semester: subjects, schedule, and tips",
    route: "/semester-1-overview",
  },
  {
    id: "system:how-to-use-wikipefia",
    type: "system-article",
    title: "How to Use Wikipefia",
    description: "Navigate subjects, find teachers, search articles, and more",
    route: "/how-to-use-wikipefia",
  },
];

export const stats = {
  subjects: subjects.length,
  articles: 116,
  teachers: teachers.length,
  languages: 3,
};
