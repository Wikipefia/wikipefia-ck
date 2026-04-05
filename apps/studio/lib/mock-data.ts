export interface LocalizedString {
  ru: string;
  en: string;
  cz: string;
}

export interface SubjectCategory {
  slug: string;
  name: LocalizedString;
  articles: string[];
}

export interface SubjectMetadata {
  semester: number;
  credits: number;
  difficulty: "beginner" | "medium" | "advanced";
  department: LocalizedString;
}

export interface Subject {
  slug: string;
  name: LocalizedString;
  description: LocalizedString;
  teachers: string[];
  categories: SubjectCategory[];
  metadata: SubjectMetadata;
}

export interface OpenTab {
  id: string;
  type: "article" | "metadata";
  subjectSlug: string;
  articleSlug?: string;
  label: string;
  modified: boolean;
}

export function createTabId(
  type: "article" | "metadata",
  subjectSlug: string,
  articleSlug?: string,
): string {
  if (type === "metadata") return `meta:${subjectSlug}`;
  return `file:${subjectSlug}/${articleSlug}`;
}

export function getSubject(slug: string): Subject | undefined {
  return MOCK_SUBJECTS.find((s) => s.slug === slug);
}

export function getArticleTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function getArticleContent(
  subjectSlug: string,
  articleSlug: string,
): string {
  return (
    MOCK_CONTENT[`${subjectSlug}/${articleSlug}`] ??
    `# ${getArticleTitle(articleSlug)}\n\nContent placeholder for **${articleSlug}** article.\n\n<Callout type="info">\nThis is a placeholder article. Replace this content with actual educational material.\n</Callout>\n`
  );
}

export const MOCK_SUBJECTS: Subject[] = [
  {
    slug: "discrete-mathematics",
    name: {
      ru: "Дискретная математика",
      en: "Discrete Mathematics",
      cz: "Diskrétní matematika",
    },
    description: {
      ru: "Основы дискретных структур, комбинаторики и теории графов",
      en: "Fundamentals of discrete structures, combinatorics, and graph theory",
      cz: "Základy diskrétních struktur, kombinatoriky a teorie grafů",
    },
    teachers: ["ivan-petrov", "maria-novakova"],
    metadata: {
      semester: 2,
      credits: 6,
      difficulty: "medium",
      department: {
        ru: "Кафедра математики",
        en: "Department of Mathematics",
        cz: "Katedra matematiky",
      },
    },
    categories: [
      {
        slug: "foundations",
        name: { ru: "Основы", en: "Foundations", cz: "Základy" },
        articles: ["introduction", "sets-and-logic", "combinatorics"],
      },
      {
        slug: "graph-theory",
        name: {
          ru: "Теория графов",
          en: "Graph Theory",
          cz: "Teorie grafů",
        },
        articles: ["graphs-basics", "graph-algorithms"],
      },
    ],
  },
  {
    slug: "linear-algebra",
    name: {
      ru: "Линейная алгебра",
      en: "Linear Algebra",
      cz: "Lineární algebra",
    },
    description: {
      ru: "Векторные пространства, матрицы и линейные преобразования",
      en: "Vector spaces, matrices, linear transformations, and eigenvalue theory",
      cz: "Vektorové prostory, matice, lineární transformace a teorie vlastních čísel",
    },
    teachers: ["maria-novakova"],
    metadata: {
      semester: 1,
      credits: 5,
      difficulty: "medium",
      department: {
        ru: "Кафедра математики",
        en: "Department of Mathematics",
        cz: "Katedra matematiky",
      },
    },
    categories: [
      {
        slug: "vectors-matrices",
        name: {
          ru: "Векторы и матрицы",
          en: "Vectors & Matrices",
          cz: "Vektory a matice",
        },
        articles: ["vectors-intro", "matrix-operations"],
      },
      {
        slug: "transformations",
        name: {
          ru: "Преобразования",
          en: "Transformations",
          cz: "Transformace",
        },
        articles: ["linear-transformations", "eigenvalues"],
      },
    ],
  },
  {
    slug: "economics",
    name: { ru: "Экономика", en: "Economics", cz: "Ekonomie" },
    description: {
      ru: "Принципы микро- и макроэкономики для современных рынков",
      en: "Principles of micro and macroeconomics for modern markets",
      cz: "Principy mikro a makroekonomie pro moderní trhy",
    },
    teachers: ["anna-kovaleva"],
    metadata: {
      semester: 3,
      credits: 4,
      difficulty: "beginner",
      department: {
        ru: "Кафедра экономики",
        en: "Department of Economics",
        cz: "Katedra ekonomie",
      },
    },
    categories: [
      {
        slug: "microeconomics",
        name: {
          ru: "Микроэкономика",
          en: "Microeconomics",
          cz: "Mikroekonomie",
        },
        articles: ["supply-and-demand", "market-structures"],
      },
      {
        slug: "macroeconomics",
        name: {
          ru: "Макроэкономика",
          en: "Macroeconomics",
          cz: "Makroekonomie",
        },
        articles: ["gdp-and-growth", "monetary-policy"],
      },
    ],
  },
];

const MOCK_CONTENT: Record<string, string> = {
  "discrete-mathematics/introduction": `# Introduction to Discrete Mathematics

Discrete mathematics is the study of mathematical structures that are fundamentally **discrete** rather than continuous. It underpins nearly all of modern computer science.

<Callout type="info">
Unlike calculus which deals with continuous change, discrete mathematics studies objects that can be enumerated by integers.
</Callout>

## What You Will Learn

<StepByStep>
<Step title="Sets & Logic">
Foundation of all mathematical reasoning — propositions, predicates, and set operations.
</Step>
<Step title="Combinatorics">
Counting techniques: permutations, combinations, and the pigeonhole principle.
</Step>
<Step title="Graph Theory">
Vertices, edges, paths, and trees — modeling relationships between objects.
</Step>
</StepByStep>

## Applications

| Domain | Application |
|--------|------------|
| Computer Science | Algorithm design & analysis |
| Cryptography | Public-key encryption |
| Networking | Routing & optimization |
| Databases | Relational algebra |

---

> "The essence of mathematics is not to make simple things complicated, but to make complicated things simple." — Stan Gudder
`,

  "discrete-mathematics/sets-and-logic": `# Sets and Logic

<Definition term="Set">
A set is an unordered collection of distinct objects, called elements or members. Sets are denoted by capital letters and their elements are listed within curly braces.
</Definition>

## Set Notation

Let A = \\{1, 2, 3\\} and B = \\{2, 3, 4\\}. We write:
- x ∈ A means "x is an element of A"
- A ⊆ B means "A is a subset of B"
- |A| denotes the cardinality (size) of A

<Tabs>
<Tab label="Union">
The union A ∪ B = \\{1, 2, 3, 4\\} contains all elements from both sets.
</Tab>
<Tab label="Intersection">
The intersection A ∩ B = \\{2, 3\\} contains elements common to both.
</Tab>
<Tab label="Difference">
The difference A \\ B = \\{1\\} contains elements in A but not in B.
</Tab>
</Tabs>

## Propositional Logic

<Callout type="warning">
A proposition is a statement that is either **true** or **false**, never both. Questions, commands, and opinions are not propositions.
</Callout>

| Operator | Symbol | Example |
|----------|--------|---------|
| Negation | ¬ | ¬p |
| Conjunction | ∧ | p ∧ q |
| Disjunction | ∨ | p ∨ q |
| Implication | → | p → q |
| Biconditional | ↔ | p ↔ q |
`,

  "discrete-mathematics/combinatorics": `# Combinatorics

Combinatorics is the branch of mathematics concerned with **counting**, arranging, and selecting objects.

<Callout type="info">
The fundamental question of combinatorics: "In how many ways can we...?"
</Callout>

## Fundamental Principles

<Definition term="Product Rule">
If task A can be done in m ways and task B can be done in n ways, then A followed by B can be done in m × n ways.
</Definition>

<Definition term="Sum Rule">
If task A can be done in m ways and task B in n ways, and the two tasks cannot be done simultaneously, then "A or B" can be done in m + n ways.
</Definition>

## Permutations vs Combinations

| Type | Order Matters? | Formula |
|------|---------------|---------|
| Permutation | Yes | P(n,r) = n!/(n-r)! |
| Combination | No | C(n,r) = n!/(r!(n-r)!) |

<Collapse title="Example: Committee Selection">
From 10 people, how many ways can we choose a committee of 3?

Since order doesn't matter, we use combinations: C(10,3) = 120 ways.

But if we're choosing a president, VP, and secretary (order matters): P(10,3) = 720 ways.
</Collapse>
`,

  "discrete-mathematics/graphs-basics": `# Introduction to Graph Theory

<Definition term="Graph">
A graph G = (V, E) consists of a set V of vertices (or nodes) and a set E of edges, where each edge connects two vertices.
</Definition>

## Types of Graphs

<Tabs>
<Tab label="Undirected">
Edges have no direction. If (u, v) is an edge, you can traverse it both ways. Common in social networks.
</Tab>
<Tab label="Directed">
Each edge has a direction (u → v). Used in web page links, dependency graphs, and state machines.
</Tab>
<Tab label="Weighted">
Each edge carries a numerical weight. Used in shortest-path problems, network routing, and cost optimization.
</Tab>
</Tabs>

## Key Terminology

| Term | Definition |
|------|-----------|
| Degree | Number of edges incident to a vertex |
| Path | Sequence of vertices connected by edges |
| Cycle | A path that starts and ends at the same vertex |
| Connected | Every pair of vertices has a path between them |
| Tree | A connected graph with no cycles |

<Callout type="info">
**Handshaking Lemma**: The sum of degrees of all vertices equals twice the number of edges.
</Callout>
`,

  "linear-algebra/vectors-intro": `# Introduction to Vectors

<Definition term="Vector">
A vector is an ordered list of numbers (called components) that represents both magnitude and direction in space.
</Definition>

## Vector Operations

Vectors can be added, subtracted, and scaled:

<StepByStep>
<Step title="Addition">
Add corresponding components: (a₁, a₂) + (b₁, b₂) = (a₁+b₁, a₂+b₂)
</Step>
<Step title="Scalar Multiplication">
Multiply each component: c·(a₁, a₂) = (ca₁, ca₂)
</Step>
<Step title="Dot Product">
Multiply corresponding components and sum: a·b = a₁b₁ + a₂b₂
</Step>
</StepByStep>

<Callout type="info">
Two vectors are **orthogonal** (perpendicular) if and only if their dot product equals zero.
</Callout>

## Properties

| Property | Formula |
|----------|---------|
| Commutativity | a + b = b + a |
| Associativity | (a + b) + c = a + (b + c) |
| Distributivity | c(a + b) = ca + cb |
| Zero vector | a + 0 = a |
`,

  "economics/supply-and-demand": `# Supply and Demand

The **law of supply and demand** is the most fundamental concept in economics, describing how prices are determined in a market.

<Definition term="Demand">
The quantity of a good that consumers are willing and able to purchase at various price levels, all else being equal.
</Definition>

<Definition term="Supply">
The quantity of a good that producers are willing and able to offer for sale at various price levels, all else being equal.
</Definition>

## Market Equilibrium

<Callout type="info">
**Equilibrium** occurs where supply equals demand. At this point, there is no tendency for the price to change.
</Callout>

## Factors Affecting Demand

<Tabs>
<Tab label="Income">
Higher income generally increases demand for normal goods but decreases demand for inferior goods.
</Tab>
<Tab label="Substitutes">
A rise in the price of a substitute good increases demand for the original good.
</Tab>
<Tab label="Preferences">
Changes in consumer tastes and preferences shift the demand curve.
</Tab>
</Tabs>

| Shift Factor | Demand Effect | Supply Effect |
|-------------|--------------|--------------|
| Technology | — | Increases supply |
| Income rise | Increases demand | — |
| Input costs | — | Decreases supply |
| Population growth | Increases demand | — |
`,
};
