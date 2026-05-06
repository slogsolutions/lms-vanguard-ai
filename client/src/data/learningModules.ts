export type ModuleSection = {
  title: string;
  body: string;
  bullets?: string[];
  exampleTitle: string;
  starterCode: string;
};

export type LearningModule = {
  id: string;
  title: string;
  shortTitle: string;
  level: string;
  summary: string;
  sections: ModuleSection[];
};

export const learningModules: LearningModule[] = [
  {
    id: 'html-basics',
    title: 'HTML Basics',
    shortTitle: 'HTML',
    level: 'Beginner',
    summary: 'Learn how pages are structured with headings, paragraphs, links, lists, and semantic sections.',
    sections: [
      {
        title: 'HTML Page Structure',
        body: 'HTML describes the meaning and structure of a web page. A clear page starts with a heading, supporting text, and semantic blocks that make content easier to scan.',
        bullets: ['Use one main heading for the page topic.', 'Group related content inside sections.', 'Use lists when items belong together.'],
        exampleTitle: 'Create a Training Card',
        starterCode: `<section class="card">
  <h1>AI Safety Basics</h1>
  <p>Learn how to write clear, safe, and useful AI instructions.</p>
  <ul>
    <li>Define the task</li>
    <li>Add context</li>
    <li>Check the output</li>
  </ul>
</section>

<style>
  body { font-family: Arial, sans-serif; background: #f4f7fb; }
  .card { max-width: 420px; margin: 28px auto; padding: 20px; background: white; border: 1px solid #d8e0eb; border-radius: 8px; }
  h1 { color: #0b2545; }
</style>`,
      },
      {
        title: 'Links And Actions',
        body: 'Links move learners to useful references or next steps. Button-like links should still explain the destination clearly.',
        bullets: ['Use descriptive link text.', 'Keep navigation predictable.', 'Avoid vague labels when the destination matters.'],
        exampleTitle: 'Add A Lesson Link',
        starterCode: `<main>
  <h2>Prompt Practice</h2>
  <p>Open the next exercise when you are ready.</p>
  <a class="lesson-link" href="#practice">Start practice</a>
</main>

<style>
  body { font-family: Arial, sans-serif; padding: 24px; }
  .lesson-link { display: inline-block; padding: 10px 14px; background: #1b3a6b; color: white; text-decoration: none; border-radius: 6px; }
</style>`,
      },
    ],
  },
  {
    id: 'css-layout',
    title: 'CSS Layout',
    shortTitle: 'CSS',
    level: 'Beginner',
    summary: 'Practice spacing, grids, typography, and visual hierarchy for clean training interfaces.',
    sections: [
      {
        title: 'Cards And Grids',
        body: 'CSS controls layout and visual rhythm. Grid is useful when repeated lesson cards need consistent spacing and alignment.',
        bullets: ['Use gap instead of manual margins between grid items.', 'Keep cards compact and readable.', 'Use color for status, not decoration only.'],
        exampleTitle: 'Build A Lesson Grid',
        starterCode: `<div class="lesson-grid">
  <article>
    <strong>01</strong>
    <h3>Prompt Basics</h3>
    <p>Write direct instructions with context.</p>
  </article>
  <article>
    <strong>02</strong>
    <h3>Review Output</h3>
    <p>Check accuracy, tone, and missing details.</p>
  </article>
</div>

<style>
  body { font-family: Arial, sans-serif; background: #eef2f8; padding: 24px; }
  .lesson-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
  article { background: white; border: 1px solid #d4dce8; border-radius: 8px; padding: 16px; }
  strong { color: #c9922a; }
</style>`,
      },
      {
        title: 'Responsive Widths',
        body: 'Responsive layouts should remain usable on smaller screens. Set reasonable max widths and let content wrap naturally.',
        bullets: ['Use max-width for readable text.', 'Avoid fixed widths for long content.', 'Test with short and long labels.'],
        exampleTitle: 'Responsive Lesson Panel',
        starterCode: `<section class="panel">
  <h2>Daily AI Drill</h2>
  <p>Summarize a document, generate questions, and review the final answer.</p>
</section>

<style>
  body { font-family: Arial, sans-serif; padding: 20px; }
  .panel { max-width: 680px; margin: auto; padding: 18px; border-left: 4px solid #1a6b6b; background: #f8fbff; }
  h2 { margin-top: 0; color: #0b2545; }
</style>`,
      },
    ],
  },
  {
    id: 'javascript-practice',
    title: 'JavaScript Practice',
    shortTitle: 'JavaScript',
    level: 'Intermediate',
    summary: 'Learn simple browser logic for interactive lessons, validation, and feedback.',
    sections: [
      {
        title: 'Interactive Buttons',
        body: 'JavaScript adds behavior to a page. Start with small interactions that make the learner feel the page responding.',
        bullets: ['Select elements by id or class.', 'Attach an event listener.', 'Update text or styles based on user action.'],
        exampleTitle: 'Add A Completion Button',
        starterCode: `<button id="complete">Mark lesson complete</button>
<p id="status">Status: pending</p>

<style>
  body { font-family: Arial, sans-serif; padding: 24px; }
  button { padding: 10px 14px; background: #0b2545; color: white; border: 0; border-radius: 6px; }
  .done { color: #1e6b3c; font-weight: bold; }
</style>

<script>
  const button = document.querySelector('#complete');
  const status = document.querySelector('#status');

  button.addEventListener('click', () => {
    status.textContent = 'Status: completed';
    status.className = 'done';
  });
</script>`,
      },
      {
        title: 'Input Validation',
        body: 'Validation helps learners notice what is missing before they submit work.',
        bullets: ['Read the input value.', 'Trim extra spaces.', 'Show a clear result message.'],
        exampleTitle: 'Check A Prompt',
        starterCode: `<label>
  Prompt:
  <input id="prompt" placeholder="Write a clear task..." />
</label>
<button id="check">Check</button>
<p id="result"></p>

<script>
  document.querySelector('#check').addEventListener('click', () => {
    const value = document.querySelector('#prompt').value.trim();
    document.querySelector('#result').textContent =
      value.length >= 20 ? 'Good start.' : 'Add more task context.';
  });
</script>`,
      },
    ],
  },
  {
    id: 'prompt-engineering',
    title: 'Prompt Engineering',
    shortTitle: 'Prompts',
    level: 'Beginner',
    summary: 'Practice writing prompts with role, task, context, constraints, and output format.',
    sections: [
      {
        title: 'Prompt Anatomy',
        body: 'A strong prompt tells the model what role to take, what task to perform, what context to use, and what output format to return.',
        bullets: ['Start with the task.', 'Add only relevant context.', 'Specify the final format.'],
        exampleTitle: 'Prompt Template Card',
        starterCode: `<article class="prompt">
  <h2>Document Summary Prompt</h2>
  <pre>
Role: You are a concise analyst.
Task: Summarize the document.
Context: Use only the provided text.
Format: Return 5 bullets and 3 action points.
  </pre>
</article>

<style>
  body { font-family: Arial, sans-serif; padding: 24px; }
  .prompt { border: 1px solid #d4dce8; border-radius: 8px; padding: 16px; }
  pre { white-space: pre-wrap; background: #eef2f8; padding: 12px; border-radius: 6px; }
</style>`,
      },
      {
        title: 'Output Format',
        body: 'Output format keeps answers consistent. This matters in training workflows where learners need repeatable results.',
        bullets: ['Name the sections you expect.', 'Limit answer length when needed.', 'Ask for tables only when comparison is useful.'],
        exampleTitle: 'Format Checklist',
        starterCode: `<h2>Answer Format</h2>
<ol>
  <li>Summary: three sentences</li>
  <li>Key points: five bullets</li>
  <li>Risks: short table</li>
</ol>

<style>
  body { font-family: Arial, sans-serif; line-height: 1.6; padding: 24px; }
  ol { background: #fff8e6; border-left: 4px solid #c9922a; padding: 16px 16px 16px 34px; }
</style>`,
      },
    ],
  },
  {
    id: 'api-basics',
    title: 'API Basics',
    shortTitle: 'APIs',
    level: 'Intermediate',
    summary: 'Understand requests, responses, JSON, and how frontend tools communicate with backend services.',
    sections: [
      {
        title: 'JSON Responses',
        body: 'Most modern APIs exchange JSON. A frontend reads the response and updates the interface.',
        bullets: ['Keep property names clear.', 'Handle success and error states.', 'Render only the fields the user needs.'],
        exampleTitle: 'Render JSON Data',
        starterCode: `<div id="profile"></div>

<script>
  const response = {
    name: 'Cadet Rao',
    module: 'API Basics',
    progress: 'In progress'
  };

  document.querySelector('#profile').innerHTML = \`
    <h2>\${response.name}</h2>
    <p>Module: \${response.module}</p>
    <strong>\${response.progress}</strong>
  \`;
</script>`,
      },
      {
        title: 'Loading States',
        body: 'A loading state keeps the interface understandable while a request is running.',
        bullets: ['Disable repeated actions during loading.', 'Show a short status label.', 'Replace the status after the response arrives.'],
        exampleTitle: 'Simulate API Loading',
        starterCode: `<button id="load">Load module status</button>
<p id="status">Ready</p>

<script>
  document.querySelector('#load').addEventListener('click', () => {
    const status = document.querySelector('#status');
    status.textContent = 'Loading...';

    setTimeout(() => {
      status.textContent = 'Module status loaded.';
    }, 900);
  });
</script>`,
      },
    ],
  },
];

export const getLearningModule = (id?: string | null) =>
  learningModules.find(module => module.id === id) ?? learningModules[0];
