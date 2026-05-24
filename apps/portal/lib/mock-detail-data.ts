/* ═══════════════════════════════════════════════════════
   Detailed mock data for Stage 1 — Subject, Teacher,
   Article pages with full content blocks.
   ═══════════════════════════════════════════════════════ */

// ── Types ──────────────────────────────────────────────

export interface SubjectDetail {
  slug: string;
  name: string;
  description: string;
  icon: string;
  metadata: {
    semester: number;
    credits: number;
    difficulty: "easy" | "medium" | "hard";
    department: string;
    lastUpdated: string;
  };
  categories: {
    slug: string;
    name: string;
    articles: {
      slug: string;
      title: string;
      difficulty: "beginner" | "intermediate" | "advanced";
      readTime: number;
    }[];
  }[];
  teachers: {
    slug: string;
    name: string;
    rating: number;
    reviewCount: number;
    description: string;
  }[];
  stats: {
    totalArticles: number;
    totalStudents: number;
  };
}

export interface TeacherDetail {
  slug: string;
  name: string;
  description: string;
  contacts: {
    email: string;
    office: string;
    website?: string;
  };
  ratings: {
    overall: number;
    clarity: number;
    difficulty: number;
    usefulness: number;
    count: number;
  };
  subjects: {
    slug: string;
    name: string;
    icon: string;
  }[];
  reviews: {
    text: string;
    rating: number;
    date: string;
  }[];
  articles: {
    slug: string;
    title: string;
    readTime: number;
  }[];
}

export type ContentBlock =
  | { type: "heading"; depth: 2 | 3; id: string; text: string }
  | { type: "paragraph"; text: string }
  | { type: "code"; language: string; code: string }
  | {
      type: "callout";
      variant: "info" | "warning" | "tip";
      title: string;
      text: string;
    }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "divider" };

export interface ArticleDetail {
  slug: string;
  parentSlug: string;
  parentName: string;
  parentType: "subject" | "teacher";
  title: string;
  author: { name: string; slug: string };
  difficulty: "beginner" | "intermediate" | "advanced";
  readTime: number;
  created: string;
  updated: string;
  prerequisites: { title: string; route: string }[];
  toc: { id: string; text: string; depth: number }[];
  content: ContentBlock[];
}

// ── Subject Details ────────────────────────────────────

const subjectDetails: Record<string, SubjectDetail> = {
  "linear-algebra": {
    slug: "linear-algebra",
    name: "Linear Algebra",
    description:
      "Vector spaces, matrices, determinants, and linear transformations. A foundational course for mathematics, physics, and computer science students.",
    icon: "📐",
    metadata: {
      semester: 1,
      credits: 5,
      difficulty: "medium",
      department: "Department of Mathematics",
      lastUpdated: "2025-01-15",
    },
    categories: [
      {
        slug: "fundamentals",
        name: "Fundamentals",
        articles: [
          {
            slug: "vectors-intro",
            title: "Introduction to Vectors",
            difficulty: "beginner",
            readTime: 5,
          },
          {
            slug: "matrix-operations",
            title: "Matrix Operations",
            difficulty: "intermediate",
            readTime: 8,
          },
          {
            slug: "linear-systems",
            title: "Systems of Linear Equations",
            difficulty: "intermediate",
            readTime: 12,
          },
          {
            slug: "determinants",
            title: "Determinants and Their Properties",
            difficulty: "intermediate",
            readTime: 10,
          },
        ],
      },
      {
        slug: "advanced",
        name: "Advanced Topics",
        articles: [
          {
            slug: "eigenvalues",
            title: "Eigenvalues & Eigenvectors",
            difficulty: "advanced",
            readTime: 15,
          },
          {
            slug: "svd-decomposition",
            title: "SVD Decomposition",
            difficulty: "advanced",
            readTime: 20,
          },
          {
            slug: "vector-spaces",
            title: "Abstract Vector Spaces",
            difficulty: "advanced",
            readTime: 18,
          },
        ],
      },
    ],
    teachers: [
      {
        slug: "ivan-petrov",
        name: "Ivan Petrov",
        rating: 4.5,
        reviewCount: 127,
        description: "Professor of mathematics, 15 years of teaching experience",
      },
      {
        slug: "elena-kozlova",
        name: "Elena Kozlova",
        rating: 4.8,
        reviewCount: 156,
        description: "PhD, expert in mathematical analysis and calculus",
      },
    ],
    stats: {
      totalArticles: 7,
      totalStudents: 342,
    },
  },

  "programming-fundamentals": {
    slug: "programming-fundamentals",
    name: "Programming Fundamentals",
    description:
      "Algorithms, data structures, Python and C++ basics. Learn the core principles of programming from scratch.",
    icon: "💻",
    metadata: {
      semester: 1,
      credits: 5,
      difficulty: "easy",
      department: "Department of Computer Science",
      lastUpdated: "2025-02-01",
    },
    categories: [
      {
        slug: "getting-started",
        name: "Getting Started",
        articles: [
          {
            slug: "python-basics",
            title: "Python Basics",
            difficulty: "beginner",
            readTime: 7,
          },
          {
            slug: "control-flow",
            title: "Control Flow & Loops",
            difficulty: "beginner",
            readTime: 6,
          },
          {
            slug: "functions",
            title: "Functions & Modules",
            difficulty: "intermediate",
            readTime: 9,
          },
        ],
      },
      {
        slug: "data-structures",
        name: "Data Structures",
        articles: [
          {
            slug: "arrays-lists",
            title: "Arrays and Lists",
            difficulty: "beginner",
            readTime: 8,
          },
          {
            slug: "sorting-algorithms",
            title: "Sorting Algorithms",
            difficulty: "intermediate",
            readTime: 12,
          },
          {
            slug: "trees-graphs",
            title: "Trees and Graphs",
            difficulty: "advanced",
            readTime: 15,
          },
        ],
      },
    ],
    teachers: [
      {
        slug: "maria-novakova",
        name: "Maria Novakova",
        rating: 4.7,
        reviewCount: 203,
        description: "Associate professor of CS, algorithms specialist",
      },
    ],
    stats: {
      totalArticles: 6,
      totalStudents: 518,
    },
  },
};

// ── Teacher Details ────────────────────────────────────

const teacherDetails: Record<string, TeacherDetail> = {
  "ivan-petrov": {
    slug: "ivan-petrov",
    name: "Ivan Petrov",
    description:
      "Professor of mathematics with 15 years of teaching experience. Specializes in linear algebra and mathematical analysis. Known for making abstract concepts intuitive through geometric visualization.",
    contacts: {
      email: "petrov@university.edu",
      office: "Building A, Room 305",
      website: "https://petrov.math.university.edu",
    },
    ratings: {
      overall: 4.5,
      clarity: 4.8,
      difficulty: 3.2,
      usefulness: 4.6,
      count: 127,
    },
    subjects: [
      { slug: "linear-algebra", name: "Linear Algebra", icon: "📐" },
      {
        slug: "mathematical-analysis",
        name: "Mathematical Analysis",
        icon: "∫",
      },
    ],
    reviews: [
      {
        text: "Explains complex topics with remarkable clarity. His geometric approach to linear algebra made everything click. Highly recommended.",
        rating: 5,
        date: "2025-06-15",
      },
      {
        text: "Good lecturer overall. Sometimes the pace is fast for beginners, but office hours are very helpful. Fair grading.",
        rating: 4,
        date: "2025-05-20",
      },
      {
        text: "Best math professor I've had. Makes you actually understand WHY things work, not just how to compute them.",
        rating: 5,
        date: "2025-04-10",
      },
      {
        text: "Solid teaching, but the exams are harder than the lectures suggest. Study the problem sets thoroughly.",
        rating: 4,
        date: "2025-03-05",
      },
      {
        text: "His enthusiasm for the subject is contagious. Went from dreading math to actually enjoying linear algebra.",
        rating: 5,
        date: "2025-01-22",
      },
    ],
    articles: [
      {
        slug: "teaching-philosophy",
        title: "My Teaching Philosophy",
        readTime: 8,
      },
      {
        slug: "exam-tips",
        title: "Exam Preparation Tips",
        readTime: 5,
      },
    ],
  },

  "maria-novakova": {
    slug: "maria-novakova",
    name: "Maria Novakova",
    description:
      "Associate professor of computer science and algorithms specialist. Pioneer of the university's practical-first programming curriculum. Research focus on computational complexity.",
    contacts: {
      email: "novakova@university.edu",
      office: "Building C, Room 412",
    },
    ratings: {
      overall: 4.7,
      clarity: 4.9,
      difficulty: 2.8,
      usefulness: 4.8,
      count: 203,
    },
    subjects: [
      {
        slug: "programming-fundamentals",
        name: "Programming Fundamentals",
        icon: "💻",
      },
      {
        slug: "discrete-mathematics",
        name: "Discrete Mathematics",
        icon: "🔗",
      },
    ],
    reviews: [
      {
        text: "The best CS professor at this university. Her coding exercises are challenging but incredibly well-designed.",
        rating: 5,
        date: "2025-07-01",
      },
      {
        text: "Clear explanations, great slides, and she actually cares if students understand. 10/10 would take again.",
        rating: 5,
        date: "2025-05-15",
      },
      {
        text: "Very approachable during office hours. The course workload is manageable and the material is well-organized.",
        rating: 4,
        date: "2025-04-22",
      },
      {
        text: "Transformed my understanding of algorithms. After her course, I could actually solve LeetCode problems.",
        rating: 5,
        date: "2025-02-10",
      },
    ],
    articles: [
      {
        slug: "exam-tips",
        title: "How to Ace Programming Exams",
        readTime: 6,
      },
    ],
  },
};

// ── Article Details ────────────────────────────────────

const articleDetails: Record<string, ArticleDetail> = {
  "linear-algebra/vectors-intro": {
    slug: "vectors-intro",
    parentSlug: "linear-algebra",
    parentName: "Linear Algebra",
    parentType: "subject",
    title: "Introduction to Vectors",
    author: { name: "Ivan Petrov", slug: "ivan-petrov" },
    difficulty: "beginner",
    readTime: 5,
    created: "2024-09-01",
    updated: "2025-01-15",
    prerequisites: [],
    toc: [
      { id: "what-is-a-vector", text: "What is a Vector?", depth: 2 },
      { id: "vector-notation", text: "Vector Notation", depth: 2 },
      { id: "basic-operations", text: "Basic Operations", depth: 2 },
      { id: "addition", text: "Addition & Subtraction", depth: 3 },
      { id: "scalar-multiplication", text: "Scalar Multiplication", depth: 3 },
      { id: "dot-product", text: "The Dot Product", depth: 2 },
      { id: "cross-product", text: "The Cross Product", depth: 2 },
      { id: "applications", text: "Applications", depth: 2 },
    ],
    content: [
      {
        type: "heading",
        depth: 2,
        id: "what-is-a-vector",
        text: "What is a Vector?",
      },
      {
        type: "paragraph",
        text: "A vector is a mathematical object that has both magnitude (length) and direction. Unlike scalars, which are described by a single number, vectors carry information about where they point and how far they extend. This dual nature makes vectors essential tools in physics, engineering, and computer graphics.",
      },
      {
        type: "callout",
        variant: "info",
        title: "Formal Definition",
        text: "A vector in ℝⁿ is an ordered n-tuple of real numbers (v₁, v₂, ..., vₙ). Geometrically, it represents a directed line segment from the origin to the point (v₁, v₂, ..., vₙ) in n-dimensional space.",
      },
      {
        type: "paragraph",
        text: "In two dimensions, a vector can be visualized as an arrow on a flat plane. The arrow's length represents the magnitude, and its orientation represents the direction. The same vector can be placed anywhere in the plane — what matters is the relative displacement, not the absolute position.",
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "vector-notation",
        text: "Vector Notation",
      },
      {
        type: "paragraph",
        text: "Vectors are typically denoted with bold letters (v) or with an arrow above the letter (v⃗). Components are written in parentheses or brackets:",
      },
      {
        type: "code",
        language: "python",
        code: "# Representing vectors in Python\nimport numpy as np\n\n# A 2D vector\nv = np.array([3, 4])\n\n# A 3D vector\nw = np.array([1, -2, 5])\n\n# Magnitude (length)\nmagnitude = np.linalg.norm(v)  # = 5.0\nprint(f\"|v| = {magnitude}\")",
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "basic-operations",
        text: "Basic Operations",
      },
      {
        type: "heading",
        depth: 3,
        id: "addition",
        text: "Addition & Subtraction",
      },
      {
        type: "paragraph",
        text: "Vector addition is performed component-wise. Given vectors u = (u₁, u₂) and v = (v₁, v₂), their sum is u + v = (u₁ + v₁, u₂ + v₂). Geometrically, this corresponds to placing the tail of v at the head of u — the result is the vector from the tail of u to the head of v.",
      },
      {
        type: "list",
        ordered: false,
        items: [
          "Commutative: u + v = v + u",
          "Associative: (u + v) + w = u + (v + w)",
          "Identity: v + 0 = v",
          "Inverse: v + (-v) = 0",
        ],
      },
      {
        type: "heading",
        depth: 3,
        id: "scalar-multiplication",
        text: "Scalar Multiplication",
      },
      {
        type: "paragraph",
        text: "Multiplying a vector by a scalar c scales every component: c · v = (cv₁, cv₂). When c > 1, the vector stretches. When 0 < c < 1, it shrinks. When c < 0, the vector reverses direction.",
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "dot-product",
        text: "The Dot Product",
      },
      {
        type: "paragraph",
        text: "The dot product (or inner product) of two vectors u · v = u₁v₁ + u₂v₂ + ... + uₙvₙ returns a scalar. It measures how much two vectors point in the same direction. When the dot product is zero, the vectors are perpendicular (orthogonal).",
      },
      {
        type: "code",
        language: "python",
        code: "u = np.array([1, 2, 3])\nv = np.array([4, -5, 6])\n\ndot = np.dot(u, v)  # 1*4 + 2*(-5) + 3*6 = 12\nprint(f\"u · v = {dot}\")\n\n# Angle between vectors\ncos_theta = dot / (np.linalg.norm(u) * np.linalg.norm(v))\ntheta = np.arccos(cos_theta)\nprint(f\"Angle: {np.degrees(theta):.1f}°\")",
      },
      {
        type: "callout",
        variant: "tip",
        title: "Geometric Interpretation",
        text: "u · v = |u| · |v| · cos(θ), where θ is the angle between the vectors. This relationship is fundamental in physics for computing work (W = F · d) and in computer graphics for lighting calculations.",
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "cross-product",
        text: "The Cross Product",
      },
      {
        type: "paragraph",
        text: "The cross product u × v is defined only in three dimensions and produces a vector perpendicular to both u and v. Its magnitude equals the area of the parallelogram formed by u and v. The direction follows the right-hand rule.",
      },
      {
        type: "callout",
        variant: "warning",
        title: "Not Commutative",
        text: "Unlike the dot product, the cross product is anti-commutative: u × v = -(v × u). The order of operands matters — reversing them flips the direction of the result.",
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "applications",
        text: "Applications",
      },
      {
        type: "paragraph",
        text: "Vectors are ubiquitous in applied mathematics and engineering. In physics, they describe forces, velocities, and accelerations. In computer graphics, they define positions, normals, and transformations. In machine learning, feature vectors represent data points in high-dimensional spaces.",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Physics: Force decomposition, projectile motion, electromagnetic fields",
          "Computer Graphics: 3D rendering, ray tracing, collision detection",
          "Machine Learning: Feature spaces, gradient descent, embeddings",
          "Robotics: Kinematics, path planning, sensor fusion",
        ],
      },
    ],
  },

  "linear-algebra/matrix-operations": {
    slug: "matrix-operations",
    parentSlug: "linear-algebra",
    parentName: "Linear Algebra",
    parentType: "subject",
    title: "Matrix Operations",
    author: { name: "Ivan Petrov", slug: "ivan-petrov" },
    difficulty: "intermediate",
    readTime: 8,
    created: "2024-09-15",
    updated: "2025-01-20",
    prerequisites: [
      { title: "Introduction to Vectors", route: "/linear-algebra/vectors-intro" },
    ],
    toc: [
      { id: "what-is-a-matrix", text: "What is a Matrix?", depth: 2 },
      { id: "matrix-addition", text: "Matrix Addition", depth: 2 },
      { id: "matrix-multiplication", text: "Matrix Multiplication", depth: 2 },
      { id: "transpose", text: "Transpose", depth: 2 },
      { id: "inverse", text: "Matrix Inverse", depth: 2 },
    ],
    content: [
      {
        type: "heading",
        depth: 2,
        id: "what-is-a-matrix",
        text: "What is a Matrix?",
      },
      {
        type: "paragraph",
        text: "A matrix is a rectangular array of numbers arranged in rows and columns. An m×n matrix has m rows and n columns. Matrices are the workhorses of linear algebra — they represent linear transformations, systems of equations, and data tables.",
      },
      {
        type: "code",
        language: "python",
        code: "import numpy as np\n\n# A 2x3 matrix\nA = np.array([\n    [1, 2, 3],\n    [4, 5, 6]\n])\nprint(f\"Shape: {A.shape}\")  # (2, 3)",
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "matrix-addition",
        text: "Matrix Addition",
      },
      {
        type: "paragraph",
        text: "Two matrices can be added if and only if they have the same dimensions. Addition is performed element-wise: (A + B)ᵢⱼ = Aᵢⱼ + Bᵢⱼ. Like vector addition, matrix addition is commutative and associative.",
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "matrix-multiplication",
        text: "Matrix Multiplication",
      },
      {
        type: "paragraph",
        text: "Matrix multiplication is more involved. To multiply A (m×n) by B (n×p), the number of columns in A must equal the number of rows in B. The result is an m×p matrix where each element is the dot product of a row from A and a column from B.",
      },
      {
        type: "callout",
        variant: "warning",
        title: "Not Commutative",
        text: "In general, AB ≠ BA. Matrix multiplication order matters. Always pay attention to which matrix is on the left and which is on the right.",
      },
      {
        type: "code",
        language: "python",
        code: "A = np.array([[1, 2], [3, 4]])\nB = np.array([[5, 6], [7, 8]])\n\nC = A @ B  # Matrix multiplication\nprint(C)\n# [[19 22]\n#  [43 50]]",
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "transpose",
        text: "Transpose",
      },
      {
        type: "paragraph",
        text: "The transpose of a matrix A, written Aᵀ, is obtained by swapping rows and columns: (Aᵀ)ᵢⱼ = Aⱼᵢ. Key properties: (AB)ᵀ = BᵀAᵀ and (Aᵀ)ᵀ = A. A matrix is symmetric if A = Aᵀ.",
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "inverse",
        text: "Matrix Inverse",
      },
      {
        type: "paragraph",
        text: "A square matrix A has an inverse A⁻¹ if AA⁻¹ = A⁻¹A = I (identity matrix). Not all matrices are invertible — a matrix is singular (non-invertible) if its determinant is zero. The inverse is crucial for solving systems Ax = b, where x = A⁻¹b.",
      },
      {
        type: "callout",
        variant: "tip",
        title: "Computing Inverses",
        text: "For 2×2 matrices, there's a simple formula. For larger matrices, use Gaussian elimination or LU decomposition. In practice, never compute the inverse explicitly — use np.linalg.solve(A, b) instead of np.linalg.inv(A) @ b.",
      },
    ],
  },

  "programming-fundamentals/python-basics": {
    slug: "python-basics",
    parentSlug: "programming-fundamentals",
    parentName: "Programming Fundamentals",
    parentType: "subject",
    title: "Python Basics",
    author: { name: "Maria Novakova", slug: "maria-novakova" },
    difficulty: "beginner",
    readTime: 7,
    created: "2024-09-05",
    updated: "2025-02-01",
    prerequisites: [],
    toc: [
      { id: "why-python", text: "Why Python?", depth: 2 },
      { id: "variables-types", text: "Variables & Types", depth: 2 },
      { id: "control-flow", text: "Control Flow", depth: 2 },
      { id: "functions", text: "Functions", depth: 2 },
      { id: "next-steps", text: "Next Steps", depth: 2 },
    ],
    content: [
      {
        type: "heading",
        depth: 2,
        id: "why-python",
        text: "Why Python?",
      },
      {
        type: "paragraph",
        text: "Python is one of the most popular programming languages in the world, and for good reason. Its clean syntax reads almost like English, making it the ideal first language. Python powers everything from web development (Django, Flask) to data science (NumPy, Pandas) to AI (TensorFlow, PyTorch).",
      },
      {
        type: "callout",
        variant: "info",
        title: "Setup",
        text: "Install Python 3.12+ from python.org. We recommend using VS Code as your editor with the Python extension installed.",
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "variables-types",
        text: "Variables & Types",
      },
      {
        type: "paragraph",
        text: "Python is dynamically typed — you don't need to declare variable types explicitly. The interpreter figures it out. The basic types are: int (integers), float (decimals), str (strings), bool (True/False), and None.",
      },
      {
        type: "code",
        language: "python",
        code: 'name = "Alice"         # str\nage = 21               # int\ngpa = 3.85             # float\nis_enrolled = True     # bool\n\nprint(f"{name} is {age} years old")\nprint(f"Type of age: {type(age)}")  # <class \'int\'>',
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "control-flow",
        text: "Control Flow",
      },
      {
        type: "paragraph",
        text: "Python uses indentation (not braces) to define code blocks. The main control flow structures are if/elif/else for branching and for/while for loops.",
      },
      {
        type: "code",
        language: "python",
        code: '# Branching\nscore = 85\nif score >= 90:\n    grade = "A"\nelif score >= 80:\n    grade = "B"\nelse:\n    grade = "C"\n\n# Looping\nfor i in range(5):\n    print(f"Step {i}")\n\n# List comprehension (Pythonic!)\nsquares = [x**2 for x in range(10)]',
      },
      {
        type: "callout",
        variant: "tip",
        title: "Indentation Matters",
        text: "Use 4 spaces for indentation (not tabs). Most editors can be configured to insert spaces when you press Tab. Inconsistent indentation will cause IndentationError.",
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "functions",
        text: "Functions",
      },
      {
        type: "paragraph",
        text: "Functions are defined with the def keyword. They can accept parameters and return values. Python supports default arguments, keyword arguments, and *args/**kwargs for flexible function signatures.",
      },
      {
        type: "code",
        language: "python",
        code: 'def greet(name, greeting="Hello"):\n    """Return a greeting string."""\n    return f"{greeting}, {name}!"\n\nprint(greet("Alice"))           # Hello, Alice!\nprint(greet("Bob", "Hey"))      # Hey, Bob!',
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "next-steps",
        text: "Next Steps",
      },
      {
        type: "paragraph",
        text: "You now know the fundamentals of Python. From here, explore data structures (lists, dictionaries, sets), file I/O, error handling, and object-oriented programming. The next article in this series covers Control Flow & Loops in greater depth.",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Practice: Solve problems on Exercism or HackerRank",
          "Read: 'Automate the Boring Stuff with Python' (free online)",
          "Build: Create a small project — a calculator, a quiz game, or a file organizer",
          "Next article: Control Flow & Loops →",
        ],
      },
    ],
  },

  "ivan-petrov/teaching-philosophy": {
    slug: "teaching-philosophy",
    parentSlug: "ivan-petrov",
    parentName: "Ivan Petrov",
    parentType: "teacher",
    title: "My Teaching Philosophy",
    author: { name: "Ivan Petrov", slug: "ivan-petrov" },
    difficulty: "beginner",
    readTime: 8,
    created: "2024-08-20",
    updated: "2025-01-10",
    prerequisites: [],
    toc: [
      { id: "why-teach", text: "Why I Teach", depth: 2 },
      { id: "visual-approach", text: "The Visual Approach", depth: 2 },
      { id: "mistakes", text: "On Making Mistakes", depth: 2 },
      { id: "advice", text: "Advice for Students", depth: 2 },
    ],
    content: [
      {
        type: "heading",
        depth: 2,
        id: "why-teach",
        text: "Why I Teach",
      },
      {
        type: "paragraph",
        text: "After 15 years of teaching mathematics at the university level, I still find the moment of understanding in a student's eyes to be the most rewarding part of my career. Mathematics is often feared, but it doesn't have to be. My goal is to make abstract concepts tangible and intuitive.",
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "visual-approach",
        text: "The Visual Approach",
      },
      {
        type: "paragraph",
        text: "I believe in teaching through geometric intuition first, formalism second. Before proving a theorem, I want students to see it, feel it, and predict it. A 3D visualization of eigenvalues teaches more than ten pages of proofs. Once the intuition is there, the formalism becomes a language to describe what you already understand.",
      },
      {
        type: "callout",
        variant: "tip",
        title: "For My Students",
        text: "If you can't draw a picture of a concept, you probably don't understand it yet. Every linear algebra concept has a geometric meaning — find it.",
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "mistakes",
        text: "On Making Mistakes",
      },
      {
        type: "paragraph",
        text: "Mistakes are not failures — they're data. Every wrong answer tells you something about your understanding. I encourage students to show their work, even (especially) when it's wrong. The path to the wrong answer is often more instructive than the right answer itself.",
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "advice",
        text: "Advice for Students",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Work through problems by hand before using software",
          "Form study groups — teaching others is the best way to learn",
          "Come to office hours with specific questions, not just 'I don't understand'",
          "Read the textbook before the lecture, not after",
          "Don't memorize formulas — understand where they come from",
        ],
      },
    ],
  },

  "ivan-petrov/exam-tips": {
    slug: "exam-tips",
    parentSlug: "ivan-petrov",
    parentName: "Ivan Petrov",
    parentType: "teacher",
    title: "Exam Preparation Tips",
    author: { name: "Ivan Petrov", slug: "ivan-petrov" },
    difficulty: "beginner",
    readTime: 5,
    created: "2024-10-01",
    updated: "2025-01-05",
    prerequisites: [],
    toc: [
      { id: "before-the-exam", text: "Before the Exam", depth: 2 },
      { id: "study-strategy", text: "Study Strategy", depth: 2 },
      { id: "during-the-exam", text: "During the Exam", depth: 2 },
      { id: "common-mistakes", text: "Common Mistakes", depth: 2 },
    ],
    content: [
      {
        type: "heading",
        depth: 2,
        id: "before-the-exam",
        text: "Before the Exam",
      },
      {
        type: "paragraph",
        text: "Preparation for a mathematics exam should start from the first lecture, not the night before. The concepts build on each other — if you miss the foundations, the advanced material becomes impenetrable. Here is my recommended timeline for effective preparation.",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Weeks 1-4: Attend all lectures and take detailed notes",
          "Weeks 5-8: Work through every problem set, even optional ones",
          "Week 9-10: Review notes and identify weak areas",
          "Week 11: Work through past exams under timed conditions",
          "Week 12: Focus review on weak areas, rest before the exam",
        ],
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "study-strategy",
        text: "Study Strategy",
      },
      {
        type: "paragraph",
        text: "The most effective study strategy for mathematics is active problem-solving, not passive reading. Reading your notes gives you a false sense of understanding. You truly understand a concept only when you can solve problems with it — without looking at examples.",
      },
      {
        type: "callout",
        variant: "tip",
        title: "The Feynman Technique",
        text: "Try explaining each concept to an imaginary student. If you get stuck or resort to jargon, you've found a gap in your understanding. Go back to the material and fill that gap.",
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "during-the-exam",
        text: "During the Exam",
      },
      {
        type: "paragraph",
        text: "Read all problems first before solving any. Start with the ones you're most confident about to build momentum. For longer proofs, sketch an outline before writing the full solution. Always show your work — partial credit can make the difference.",
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "common-mistakes",
        text: "Common Mistakes",
      },
      {
        type: "list",
        ordered: false,
        items: [
          "Memorizing formulas without understanding derivations",
          "Skipping 'easy' problem sets (they build essential fluency)",
          "Studying in groups too early (understand alone first, then discuss)",
          "Ignoring edge cases in proofs (zero vectors, singular matrices)",
          "Not sleeping enough before the exam",
        ],
      },
      {
        type: "callout",
        variant: "warning",
        title: "About Cramming",
        text: "Cramming the night before a math exam is counterproductive. Mathematical understanding requires sleep for memory consolidation. A rested mind with 80% knowledge will outperform an exhausted mind with 100% knowledge.",
      },
    ],
  },

  "maria-novakova/exam-tips": {
    slug: "exam-tips",
    parentSlug: "maria-novakova",
    parentName: "Maria Novakova",
    parentType: "teacher",
    title: "How to Ace Programming Exams",
    author: { name: "Maria Novakova", slug: "maria-novakova" },
    difficulty: "beginner",
    readTime: 6,
    created: "2024-10-15",
    updated: "2025-01-20",
    prerequisites: [],
    toc: [
      { id: "exam-format", text: "Exam Format", depth: 2 },
      { id: "coding-strategy", text: "Coding Strategy", depth: 2 },
      { id: "debugging-under-pressure", text: "Debugging Under Pressure", depth: 2 },
      { id: "practice-resources", text: "Practice Resources", depth: 2 },
    ],
    content: [
      {
        type: "heading",
        depth: 2,
        id: "exam-format",
        text: "Exam Format",
      },
      {
        type: "paragraph",
        text: "Our programming exams consist of three parts: multiple choice (20%), code reading (30%), and code writing (50%). The code writing section is where most points are won or lost. You will be asked to implement algorithms, fix buggy code, or design data structures.",
      },
      {
        type: "callout",
        variant: "info",
        title: "What We Test",
        text: "We test understanding, not memorization. You won't need to remember exact library functions — pseudocode is acceptable. We care about correct logic, proper edge case handling, and clean structure.",
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "coding-strategy",
        text: "Coding Strategy",
      },
      {
        type: "paragraph",
        text: "When facing a coding problem on an exam, resist the urge to start writing immediately. Spend the first 2-3 minutes understanding the problem and planning your approach. Write pseudocode or draw a diagram. Then implement step by step.",
      },
      {
        type: "code",
        language: "python",
        code: "# Step 1: Understand the problem\n# Input: list of integers, target sum\n# Output: indices of two numbers that add to target\n\n# Step 2: Plan (brute force first, optimize later)\n# Brute force: O(n²) - check all pairs\n# Optimized: O(n) - use a hash map\n\n# Step 3: Implement\ndef two_sum(nums, target):\n    seen = {}  # value -> index\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i\n    return []",
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "debugging-under-pressure",
        text: "Debugging Under Pressure",
      },
      {
        type: "paragraph",
        text: "If your code isn't working and you're running out of time, trace through it manually with a small example. Write down variable values at each step. This systematic approach finds bugs faster than staring at the code.",
      },
      {
        type: "callout",
        variant: "tip",
        title: "Edge Cases to Check",
        text: "Always test your solution mentally with: empty input, single element, two elements, all same values, already sorted input, and reverse sorted input. These cover the majority of common bugs.",
      },
      { type: "divider" },
      {
        type: "heading",
        depth: 2,
        id: "practice-resources",
        text: "Practice Resources",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Past exam papers (available on the course page)",
          "LeetCode Easy and Medium problems for algorithm practice",
          "Exercism.io for language-specific drills",
          "Visualize algorithms at visualgo.net",
          "Form study groups to explain concepts to each other",
        ],
      },
    ],
  },
};

// ── Resolvers ──────────────────────────────────────────

export function resolveEntity(
  slug: string
): { type: "subject"; data: SubjectDetail } | { type: "teacher"; data: TeacherDetail } | null {
  if (subjectDetails[slug]) return { type: "subject", data: subjectDetails[slug] };
  if (teacherDetails[slug]) return { type: "teacher", data: teacherDetails[slug] };
  return null;
}

export function resolveArticle(
  entitySlug: string,
  articleSlug: string
): ArticleDetail | null {
  return articleDetails[`${entitySlug}/${articleSlug}`] || null;
}

export function getAllEntitySlugs(): string[] {
  return [...Object.keys(subjectDetails), ...Object.keys(teacherDetails)];
}

export function getAllArticleParams(): { entitySlug: string; articleSlug: string }[] {
  return Object.keys(articleDetails).map((key) => {
    const [entitySlug, articleSlug] = key.split("/");
    return { entitySlug, articleSlug };
  });
}
