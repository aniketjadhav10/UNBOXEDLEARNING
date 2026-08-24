// ============================================================
// globalCurriculumBlueprint — the master 3–6 curriculum the batch builder
// generates into the SHARED (global) library. One entry per subject across the
// 7 development domains; each sourceText describes a basic→advanced progression
// so the Director/SME agents build a laddered skill tree. Families then pick
// these up from /library and each child starts where their prerequisites allow.
// ============================================================
export interface BlueprintSubject {
  name: string;          // display label for progress UI
  age: number;           // guideline age (the ladder handles 3–6)
  topicsCount: number;
  tasksPerTopic: number;
  sourceText: string;
}

export const GLOBAL_CURRICULUM_BLUEPRINT: BlueprintSubject[] = [
  // ── Academic ───────────────────────────────────────────────
  {
    name: 'Numbers & Counting', age: 4, topicsCount: 5, tasksPerTopic: 2,
    sourceText:
      'Early mathematics: Numbers & Counting for ages 3–6, building step by step from first exposure to confident use. ' +
      'Progression: recognizing numbers 1–5, then 1–10; counting objects with one-to-one correspondence to 10, then to 20, then to 100; ' +
      'comparing quantities (more/less/equal); understanding zero; ordering numbers; number formation and writing; ' +
      'skip counting by 2s, 5s, 10s; and readiness for place value (tens and ones). Play-based, hands-on with everyday objects.',
  },
  {
    name: 'Alphabet & Phonics', age: 4, topicsCount: 5, tasksPerTopic: 2,
    sourceText:
      'Early literacy: Alphabet & Phonics for ages 3–6. Progression from recognizing and naming uppercase then lowercase letters, ' +
      'to matching letters to their sounds, blending simple CVC words (cat, dog), identifying beginning and ending sounds, ' +
      'rhyming, sight words, and reading first simple sentences. Includes letter formation and pre-writing strokes.',
  },
  {
    name: 'Shapes, Colors & Patterns', age: 3, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'Foundational thinking: Shapes, Colors & Patterns for ages 3–6. From naming basic colors and 2D shapes (circle, square, triangle), ' +
      'to sorting and classifying by attribute, recognizing and extending patterns (AB, ABC, ABB), mixing primary colors, ' +
      'identifying shapes in the environment, and simple 3D shapes.',
  },
  {
    name: 'Early Math Operations', age: 5, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'Early operations & problem solving for ages 4–6. From combining and separating groups of objects, to addition within 5 then within 10, ' +
      'subtraction as taking away, using fingers and number lines, simple story/word problems, and real-world math reasoning with money and time readiness.',
  },
  {
    name: 'Little Science Explorers', age: 4, topicsCount: 5, tasksPerTopic: 2,
    sourceText:
      'Science for ages 3–6: senses and the human body, living vs non-living things, plants and how they grow, animals and habitats, ' +
      'weather and seasons, water and floating/sinking, and simple observation and prediction. Hands-on exploration and nature-based activities.',
  },

  // ── Social-Emotional ───────────────────────────────────────
  {
    name: 'Feelings & Self-Regulation', age: 4, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'Social-emotional learning for ages 3–6: naming feelings (happy, sad, angry, scared, excited), recognizing feelings in others, ' +
      'calm-down strategies (deep breaths, counting, quiet corner), managing frustration and waiting, and expressing needs with words.',
  },
  {
    name: 'Friendship & Sharing', age: 4, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'Relationships for ages 3–6: greeting others, taking turns, sharing toys, playing cooperatively, asking to join play, ' +
      'simple conflict resolution, empathy and helping friends, and being a good listener.',
  },

  // ── Physical & Motor ───────────────────────────────────────
  {
    name: 'Gross Motor & Movement', age: 3, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'Physical development (gross motor) for ages 3–6: walking, running, jumping with two feet, hopping on one foot, balancing, ' +
      'climbing, throwing and catching a ball, kicking, and basic movement games and dance for coordination and healthy activity.',
  },
  {
    name: 'Fine Motor Skills', age: 3, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'Physical development (fine motor) for ages 3–6: grasping and scribbling, stacking, threading beads, using scissors safely, ' +
      'proper pencil grip, tracing lines and shapes, buttoning and zipping, and hand-eye coordination activities that build writing readiness.',
  },

  // ── Creative & Arts ────────────────────────────────────────
  {
    name: 'Art & Craft Foundations', age: 4, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'Creative arts for ages 3–6: finger painting and color mixing, drawing shapes and people, collage and cutting/pasting, ' +
      'playdough modeling, printing and stamping, and expressing ideas and stories through art.',
  },
  {
    name: 'Music, Rhythm & Rhymes', age: 3, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'Music for ages 3–6: singing nursery rhymes and songs, keeping a beat, clapping rhythms, exploring loud/soft and fast/slow, ' +
      'simple instruments, and moving to music. Builds listening, memory, and language.',
  },

  // ── Life Skills ────────────────────────────────────────────
  {
    name: 'Self-Care & Independence', age: 4, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'Life skills (self-care) for ages 3–6: hand washing, brushing teeth, dressing and undressing, using the toilet independently, ' +
      'eating with a spoon and fork, drinking from a cup, and healthy habits like sleep and tidiness.',
  },
  {
    name: 'Everyday Life Skills', age: 5, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'Practical life skills for ages 4–6: tidying and putting toys away, following two- and three-step instructions, ' +
      'simple helping tasks and chores, safety basics (road, stranger, kitchen), telling time-of-day routines, and caring for belongings.',
  },

  // ── Character & Values ─────────────────────────────────────
  {
    name: 'Kindness & Manners', age: 4, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'Character & values for ages 3–6: saying please, thank you, and sorry; kindness and helping others; gentle hands and words; ' +
      'gratitude; and simple good manners at home and with friends.',
  },
  {
    name: 'Honesty & Responsibility', age: 5, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'Character & values for ages 4–6: telling the truth, keeping promises, taking responsibility for actions and belongings, ' +
      'patience and waiting one’s turn, perseverance when things are hard, and caring for shared spaces.',
  },

  // ── Digital Literacy ───────────────────────────────────────
  {
    name: 'Safe & Smart Screen Basics', age: 5, topicsCount: 3, tasksPerTopic: 2,
    sourceText:
      'Digital literacy for ages 4–6: healthy screen-time habits and taking breaks, tapping and swiping with purpose, ' +
      'cause-and-effect and simple educational apps, telling a grown-up about anything upsetting online, and using devices gently and safely.',
  },

  // ══ Wave 2 — holistic-development extras (add your own below and re-run) ══

  // ── Academic (depth) ───────────────────────────────────────
  {
    name: 'Time & Daily Routines', age: 5, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'Understanding time for ages 4–6: morning/afternoon/night, daily routines and sequencing (first/next/last), days of the week, ' +
      'months and seasons, yesterday/today/tomorrow, and clock readiness (o’clock, fast/slow, before/after).',
  },
  {
    name: 'Measurement & Comparing', age: 4, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'Early measurement for ages 3–6: comparing big/small, long/short, tall/short, heavy/light, full/empty; ordering by size; ' +
      'measuring with non-standard units (hands, blocks); and comparing capacity and weight through play.',
  },
  {
    name: 'Money Sense & Saving', age: 5, topicsCount: 3, tasksPerTopic: 2,
    sourceText:
      'Early financial literacy for ages 4–6: recognizing coins and notes, understanding that things cost money, needs vs wants, ' +
      'saving in a piggy bank, simple buying and giving change, and the idea of earning and sharing.',
  },
  {
    name: 'Position & Spatial Words', age: 3, topicsCount: 3, tasksPerTopic: 2,
    sourceText:
      'Spatial reasoning for ages 3–6: positional words (in/on/under/behind/in front/next to/between), left and right, ' +
      'near/far, over/through, and following and giving simple directions to build map and geometry readiness.',
  },
  {
    name: 'Memory, Focus & Logic Games', age: 4, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'Executive function and thinking skills for ages 3–6: working memory games, focus and attention, matching and classifying, ' +
      'sequencing and ordering, simple puzzles and mazes, odd-one-out, and reasoning with cause and effect.',
  },
  {
    name: 'Unplugged Coding & Sequencing', age: 5, topicsCount: 3, tasksPerTopic: 2,
    sourceText:
      'Computational thinking (screen-free) for ages 4–6: putting steps in order, following and giving instructions, ' +
      'simple algorithms (recipes, routines), patterns, if-then thinking, and debugging (fixing a wrong step) through games.',
  },
  {
    name: 'Storytelling & Vocabulary', age: 4, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'Oral language for ages 3–6: retelling stories in order, describing pictures, building vocabulary through categories and opposites, ' +
      'answering who/what/where/why, making up simple stories, and expressing ideas in full sentences.',
  },

  // ── Social-Emotional & Character (depth) ───────────────────
  {
    name: 'Confidence & Growth Mindset', age: 5, topicsCount: 3, tasksPerTopic: 2,
    sourceText:
      'Growth mindset for ages 4–6: “I can try”, learning from mistakes, keeping going when things are hard, celebrating effort, ' +
      'positive self-talk, and building confidence to attempt new challenges.',
  },
  {
    name: 'Gratitude & Mindfulness', age: 4, topicsCount: 3, tasksPerTopic: 2,
    sourceText:
      'Wellbeing for ages 3–6: noticing and naming things to be thankful for, simple breathing and calming exercises, ' +
      'mindful listening and noticing the senses, being present, and kindness to self and others.',
  },
  {
    name: 'Respect, Courage & New Things', age: 5, topicsCount: 3, tasksPerTopic: 2,
    sourceText:
      'Character for ages 4–6: respecting others and listening, courage to try unfamiliar things, perseverance, ' +
      'caring for the environment, and standing up kindly for what is right.',
  },

  // ── Physical & Life Skills (depth) ─────────────────────────
  {
    name: 'Yoga & Stretching for Kids', age: 4, topicsCount: 3, tasksPerTopic: 2,
    sourceText:
      'Movement and body-awareness for ages 3–6: simple animal yoga poses, balance and stretching, breathing, ' +
      'body control and coordination, and calming movement routines.',
  },
  {
    name: 'Healthy Eating & My Body', age: 4, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'Health for ages 3–6: naming body parts, healthy vs sometimes foods, fruits and vegetables, drinking water, ' +
      'hygiene, exercise and rest, and taking care of my growing body.',
  },
  {
    name: 'Kitchen Helpers', age: 5, topicsCount: 3, tasksPerTopic: 2,
    sourceText:
      'Practical life for ages 4–6: safe kitchen helping — washing fruits, spreading, pouring, mixing, simple no-cook snacks, ' +
      'setting the table, cleaning up, and kitchen safety with an adult.',
  },
  {
    name: 'Building & Construction', age: 4, topicsCount: 3, tasksPerTopic: 2,
    sourceText:
      'STEM play for ages 3–6: building with blocks, balance and stability, ramps and rolling, simple bridges and towers, ' +
      'shapes in structures, and early engineering through trial and error.',
  },
  {
    name: 'Dramatic & Pretend Play', age: 3, topicsCount: 3, tasksPerTopic: 2,
    sourceText:
      'Imaginative play for ages 3–6: role-playing community helpers and family, puppet and story play, using props, ' +
      'acting out feelings and stories, and building language, empathy, and creativity.',
  },

  // ── Interdisciplinary interest units (whole-child, high engagement) ──
  {
    name: 'My Five Senses Adventure', age: 3, topicsCount: 5, tasksPerTopic: 2,
    sourceText:
      'A senses-themed unit for ages 3–6 weaving science, language, and art: sight, hearing, smell, taste, and touch — ' +
      'exploring, describing, and sorting sensory experiences, with hands-on discovery for each sense.',
  },
  {
    name: 'Garden & Growing Plants', age: 4, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'A nature unit for ages 3–6 blending science, life skills, and responsibility: what plants need, planting seeds, ' +
      'observing growth, parts of a plant, caring for a garden, and where food comes from.',
  },
  {
    name: 'Space & Stars Explorers', age: 5, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'A space-themed unit for ages 4–6 combining science, counting, and imagination: sun, moon, and stars; day and night; ' +
      'planets and rockets; counting and shapes with space objects; and creative space stories and art.',
  },
  {
    name: 'Ocean & Sea Creatures', age: 4, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'An ocean-themed unit for ages 3–6 blending science, math, and art: sea animals and habitats, big/small and counting sea creatures, ' +
      'floating and sinking, colors of the sea, and caring for the ocean.',
  },
  {
    name: 'Festivals & Cultures', age: 5, topicsCount: 4, tasksPerTopic: 2,
    sourceText:
      'A cultural-awareness unit for ages 4–6: celebrations and festivals around the world, families and traditions, ' +
      'foods, music, and clothes from different cultures, kindness and respect for differences, and simple greetings in other languages.',
  },
];
