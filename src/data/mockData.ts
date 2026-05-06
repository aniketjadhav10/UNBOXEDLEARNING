// ============================================================
// MOCK DATA — UnBoxed Learning Homeschool App
// ============================================================

// ─── Users ──────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'student';
  avatarInitials: string;
  avatarColor: string;
}

export const CURRENT_USER: User = {
  id: 'u1',
  name: 'Sarah Johnson',
  email: 'sarah@unboxed.edu',
  role: 'admin',
  avatarInitials: 'SJ',
  avatarColor: 'from-violet-500 to-purple-600',
};

export const USERS: User[] = [
  CURRENT_USER,
  {
    id: 'u2',
    name: 'Emma Johnson',
    email: 'emma@unboxed.edu',
    role: 'student',
    avatarInitials: 'EJ',
    avatarColor: 'from-pink-400 to-rose-500',
  },
];

// ─── Kids ───────────────────────────────────────────────────
export interface KidProgress {
  overall: number;
  subjectsEnrolled: number;
  activitiesCompleted: number;
  achievements: number;
}

export interface Kid {
  id: string;
  name: string;
  age: number;
  grade: string;
  learningStyle: string;
  interests: string[];
  favoriteSubjects: string[];
  parentName: string;
  avatarInitials: string;
  avatarColor: string;
  progress: KidProgress;
  bio: string;
}

export const KIDS: Kid[] = [
  {
    id: 'k1',
    name: 'Emma Johnson',
    age: 10,
    grade: '5th Grade',
    learningStyle: 'Visual',
    interests: ['Art', 'Science', 'Reading', 'Puzzles'],
    favoriteSubjects: ['Mathematics', 'Science'],
    parentName: 'Sarah Johnson',
    avatarInitials: 'EJ',
    avatarColor: 'from-pink-400 to-rose-500',
    bio: 'Emma loves hands-on experiments and colorful diagrams. She thrives with visual learning materials.',
    progress: {
      overall: 78,
      subjectsEnrolled: 6,
      activitiesCompleted: 24,
      achievements: 8,
    },
  },
  {
    id: 'k2',
    name: 'Liam Johnson',
    age: 8,
    grade: '3rd Grade',
    learningStyle: 'Kinesthetic',
    interests: ['Sports', 'Building', 'Animals', 'Music'],
    favoriteSubjects: ['Science', 'Physical Education'],
    parentName: 'Sarah Johnson',
    avatarInitials: 'LJ',
    avatarColor: 'from-sky-400 to-blue-500',
    bio: 'Liam learns best through movement and building things. He loves outdoor science experiments.',
    progress: {
      overall: 65,
      subjectsEnrolled: 5,
      activitiesCompleted: 18,
      achievements: 5,
    },
  },
  {
    id: 'k3',
    name: 'Ava Johnson',
    age: 13,
    grade: '8th Grade',
    learningStyle: 'Reading/Writing',
    interests: ['Writing', 'History', 'Technology', 'Chess'],
    favoriteSubjects: ['English Language Arts', 'History'],
    parentName: 'Sarah Johnson',
    avatarInitials: 'AJ',
    avatarColor: 'from-amber-400 to-orange-500',
    bio: 'Ava is a voracious reader who excels at writing. She enjoys deep research projects and history.',
    progress: {
      overall: 91,
      subjectsEnrolled: 7,
      activitiesCompleted: 42,
      achievements: 15,
    },
  },
];

// ─── Subjects ───────────────────────────────────────────────
export interface Subject {
  id: string;
  name: string;
  description: string;
  emoji: string;
  gradient: string;
  topicsCount: number;
  progress: number;
  kidId?: string; // optional filter by kid
}

export const SUBJECTS: Subject[] = [
  {
    id: 'math',
    name: 'Mathematics',
    description: 'Numbers, equations, geometry and algebraic thinking for everyday problem solving.',
    emoji: '🔢',
    gradient: 'from-violet-500 to-purple-600',
    topicsCount: 12,
    progress: 65,
  },
  {
    id: 'science',
    name: 'Science',
    description: 'Explore the natural world through experiments, observation, and discovery.',
    emoji: '🔬',
    gradient: 'from-emerald-500 to-teal-600',
    topicsCount: 10,
    progress: 42,
  },
  {
    id: 'english',
    name: 'English Language Arts',
    description: 'Reading comprehension, creative writing, grammar, and communication skills.',
    emoji: '📚',
    gradient: 'from-blue-500 to-cyan-600',
    topicsCount: 14,
    progress: 78,
  },
  {
    id: 'history',
    name: 'History',
    description: 'Journey through civilizations, events, and the stories that shaped our world.',
    emoji: '🏛️',
    gradient: 'from-amber-500 to-orange-600',
    topicsCount: 8,
    progress: 55,
  },
  {
    id: 'art',
    name: 'Art & Creativity',
    description: 'Develop artistic skills through drawing, painting, and creative expression.',
    emoji: '🎨',
    gradient: 'from-pink-500 to-rose-600',
    topicsCount: 9,
    progress: 90,
  },
  {
    id: 'coding',
    name: 'Coding & Technology',
    description: 'Learn programming fundamentals, problem solving, and digital literacy.',
    emoji: '💻',
    gradient: 'from-slate-600 to-gray-700',
    topicsCount: 11,
    progress: 30,
  },
  {
    id: 'music',
    name: 'Music',
    description: 'Theory, rhythm, instruments, and the joy of musical expression.',
    emoji: '🎵',
    gradient: 'from-indigo-500 to-blue-600',
    topicsCount: 7,
    progress: 50,
  },
  {
    id: 'pe',
    name: 'Physical Education',
    description: 'Fitness, health habits, sports skills, and understanding body wellness.',
    emoji: '⚽',
    gradient: 'from-lime-500 to-green-600',
    topicsCount: 6,
    progress: 80,
  },
];

// ─── Topics ─────────────────────────────────────────────────
export interface Topic {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  completed: boolean;
}

export const TOPICS: Topic[] = [
  // Mathematics
  { id: 'math-1', subjectId: 'math', title: 'Algebra Basics', description: 'Introduction to variables, expressions, and solving simple one-step equations. Master the language of algebra.', duration: '3 weeks', difficulty: 'Beginner', completed: true },
  { id: 'math-2', subjectId: 'math', title: 'Fractions & Decimals', description: 'Operations with fractions and decimals, converting between forms, and real-world applications.', duration: '2 weeks', difficulty: 'Intermediate', completed: true },
  { id: 'math-3', subjectId: 'math', title: 'Geometry Fundamentals', description: 'Shapes, angles, area, perimeter, and the properties of 2D and 3D figures explored visually.', duration: '3 weeks', difficulty: 'Beginner', completed: false },
  { id: 'math-4', subjectId: 'math', title: 'Ratios & Proportions', description: 'Understanding relationships between quantities and applying proportional reasoning to solve problems.', duration: '2 weeks', difficulty: 'Intermediate', completed: false },
  { id: 'math-5', subjectId: 'math', title: 'Statistics & Data', description: 'Collecting, organizing, and interpreting data using graphs, mean, median, and mode.', duration: '2 weeks', difficulty: 'Intermediate', completed: false },
  { id: 'math-6', subjectId: 'math', title: 'Pre-Algebra Concepts', description: 'Bridging arithmetic and algebra through patterns, expressions, and problem-solving strategies.', duration: '3 weeks', difficulty: 'Advanced', completed: false },

  // Science
  { id: 'sci-1', subjectId: 'science', title: 'The Scientific Method', description: 'Learn how scientists ask questions, form hypotheses, run experiments, and draw conclusions.', duration: '1 week', difficulty: 'Beginner', completed: true },
  { id: 'sci-2', subjectId: 'science', title: 'Living Organisms & Cells', description: 'Explore cell structure, functions, and how life processes work at the microscopic level.', duration: '3 weeks', difficulty: 'Intermediate', completed: false },
  { id: 'sci-3', subjectId: 'science', title: 'Earth & Space', description: 'The solar system, earth layers, weather patterns, and the forces that shape our planet.', duration: '3 weeks', difficulty: 'Beginner', completed: false },
  { id: 'sci-4', subjectId: 'science', title: 'Forces & Motion', description: 'Newton\'s laws of motion, gravity, friction, and simple machines explained through hands-on demos.', duration: '2 weeks', difficulty: 'Intermediate', completed: false },
  { id: 'sci-5', subjectId: 'science', title: 'Chemistry Intro', description: 'Atoms, molecules, states of matter, and basic chemical reactions made simple and fun.', duration: '2 weeks', difficulty: 'Advanced', completed: false },

  // English
  { id: 'eng-1', subjectId: 'english', title: 'Reading Comprehension', description: 'Strategies for understanding, analyzing, and critically thinking about texts of all types.', duration: '4 weeks', difficulty: 'Beginner', completed: true },
  { id: 'eng-2', subjectId: 'english', title: 'Creative Writing', description: 'Story structure, character development, setting, and the craft of compelling narrative writing.', duration: '4 weeks', difficulty: 'Intermediate', completed: true },
  { id: 'eng-3', subjectId: 'english', title: 'Grammar & Mechanics', description: 'Parts of speech, sentence structure, punctuation, and the rules that make writing clear and correct.', duration: '3 weeks', difficulty: 'Beginner', completed: false },
  { id: 'eng-4', subjectId: 'english', title: 'Poetry & Prose', description: 'Exploring poetic forms, literary devices, figurative language, and the beauty of language.', duration: '2 weeks', difficulty: 'Intermediate', completed: false },
  { id: 'eng-5', subjectId: 'english', title: 'Research & Essays', description: 'How to research, outline, draft, revise, and present well-structured academic essays.', duration: '3 weeks', difficulty: 'Advanced', completed: false },

  // History
  { id: 'hist-1', subjectId: 'history', title: 'Ancient Civilizations', description: 'Egypt, Mesopotamia, Greece, and Rome — the civilizations that laid the foundations of modern society.', duration: '4 weeks', difficulty: 'Beginner', completed: true },
  { id: 'hist-2', subjectId: 'history', title: 'The Middle Ages', description: 'Feudal systems, knights, the Church, plagues, and the events that shaped medieval Europe.', duration: '3 weeks', difficulty: 'Intermediate', completed: false },
  { id: 'hist-3', subjectId: 'history', title: 'Age of Exploration', description: 'Explorers, trade routes, colonization, and the consequences of global contact and exchange.', duration: '2 weeks', difficulty: 'Intermediate', completed: false },
  { id: 'hist-4', subjectId: 'history', title: 'American History', description: 'From colonization to independence, civil war, and the twentieth century\'s defining moments.', duration: '5 weeks', difficulty: 'Beginner', completed: false },

  // Art
  { id: 'art-1', subjectId: 'art', title: 'Color Theory', description: 'Primary and secondary colors, color wheels, complementary pairs, and using color for mood and expression.', duration: '1 week', difficulty: 'Beginner', completed: true },
  { id: 'art-2', subjectId: 'art', title: 'Drawing Fundamentals', description: 'Line, shape, value, texture, form, and space — the building blocks of observational drawing.', duration: '2 weeks', difficulty: 'Beginner', completed: true },
  { id: 'art-3', subjectId: 'art', title: 'Watercolor Painting', description: 'Wet-on-wet, wet-on-dry, layering, and blending techniques to create beautiful watercolor pieces.', duration: '2 weeks', difficulty: 'Intermediate', completed: true },
  { id: 'art-4', subjectId: 'art', title: 'Art History Survey', description: 'From cave paintings to modern art — exploring movements, artists, and the evolution of human creativity.', duration: '3 weeks', difficulty: 'Intermediate', completed: false },

  // Coding
  { id: 'code-1', subjectId: 'coding', title: 'Intro to Scratch', description: 'Block-based coding to create games, animations, and interactive stories. Perfect for beginners.', duration: '2 weeks', difficulty: 'Beginner', completed: true },
  { id: 'code-2', subjectId: 'coding', title: 'Python Basics', description: 'Variables, loops, functions, and conditionals in Python — the world\'s most beginner-friendly language.', duration: '4 weeks', difficulty: 'Intermediate', completed: false },
  { id: 'code-3', subjectId: 'coding', title: 'Web Design Basics', description: 'HTML, CSS, and how web pages are structured, styled, and displayed in a browser.', duration: '3 weeks', difficulty: 'Intermediate', completed: false },

  // Music
  { id: 'music-1', subjectId: 'music', title: 'Music Theory Basics', description: 'Notes, scales, rhythm, time signatures, and reading music — the grammar of musical language.', duration: '3 weeks', difficulty: 'Beginner', completed: true },
  { id: 'music-2', subjectId: 'music', title: 'Rhythm & Beat', description: 'Clapping, tapping, and counting rhythms to build a strong sense of beat and musical timing.', duration: '1 week', difficulty: 'Beginner', completed: true },
  { id: 'music-3', subjectId: 'music', title: 'Music Appreciation', description: 'Classical, jazz, folk, and world music — listening deeply and understanding genre differences.', duration: '2 weeks', difficulty: 'Intermediate', completed: false },

  // PE
  { id: 'pe-1', subjectId: 'pe', title: 'Fitness Fundamentals', description: 'Cardio, strength, flexibility — building a balanced fitness routine tailored to your level.', duration: '2 weeks', difficulty: 'Beginner', completed: true },
  { id: 'pe-2', subjectId: 'pe', title: 'Team Sports Skills', description: 'Coordination, communication, and sport-specific skills for soccer, basketball, and more.', duration: '3 weeks', difficulty: 'Beginner', completed: true },
  { id: 'pe-3', subjectId: 'pe', title: 'Health & Nutrition', description: 'Food groups, meal planning, hydration, sleep, and how lifestyle choices affect overall health.', duration: '2 weeks', difficulty: 'Intermediate', completed: false },
];

// ─── Activities ──────────────────────────────────────────────
export interface Activity {
  id: string;
  title: string;
  type: 'Worksheet' | 'Project' | 'Quiz' | 'Video' | 'Reading' | 'Experiment';
  subjectId: string;
  kidId: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  description: string;
}

export const ACTIVITIES: Activity[] = [
  { id: 'act-1', title: 'Algebra Worksheet #3', type: 'Worksheet', subjectId: 'math', kidId: 'k1', dueDate: '2026-05-08', status: 'pending', description: 'Complete exercises 1-20 on solving two-step equations.' },
  { id: 'act-2', title: 'Cell Diagram Project', type: 'Project', subjectId: 'science', kidId: 'k1', dueDate: '2026-05-10', status: 'in-progress', description: 'Draw and label a plant cell and an animal cell with all organelles.' },
  { id: 'act-3', title: 'Reading Comprehension Quiz', type: 'Quiz', subjectId: 'english', kidId: 'k1', dueDate: '2026-05-07', status: 'completed', description: 'Quiz on Charlotte\'s Web chapters 1-5.' },
  { id: 'act-4', title: 'Color Wheel Painting', type: 'Project', subjectId: 'art', kidId: 'k1', dueDate: '2026-05-09', status: 'completed', description: 'Paint a complete color wheel showing all primary, secondary, and tertiary colors.' },
  { id: 'act-5', title: 'Scratch Animation', type: 'Project', subjectId: 'coding', kidId: 'k1', dueDate: '2026-05-12', status: 'pending', description: 'Create a 30-second animation in Scratch using at least 3 sprites and sound.' },
  { id: 'act-6', title: 'PE Fitness Log', type: 'Worksheet', subjectId: 'pe', kidId: 'k2', dueDate: '2026-05-07', status: 'completed', description: 'Track 5 different exercises performed this week with sets and reps.' },
  { id: 'act-7', title: 'Ancient Egypt Research', type: 'Reading', subjectId: 'history', kidId: 'k3', dueDate: '2026-05-11', status: 'in-progress', description: 'Read chapters 3-5 and write a 2-page summary on Egyptian daily life.' },
];

// ─── Dashboard Stats (derived from data) ────────────────────
export const getDashboardStats = () => ({
  totalKids: KIDS.length,
  totalSubjects: SUBJECTS.length,
  totalTopics: TOPICS.length,
  completedTopics: TOPICS.filter(t => t.completed).length,
  pendingActivities: ACTIVITIES.filter(a => a.status === 'pending').length,
  completedActivities: ACTIVITIES.filter(a => a.status === 'completed').length,
  averageProgress: Math.round(SUBJECTS.reduce((acc, s) => acc + s.progress, 0) / SUBJECTS.length),
});
