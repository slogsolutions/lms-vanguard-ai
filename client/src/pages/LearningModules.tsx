import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { getLearningModule, learningModules } from '../data/learningModules.js';

const PracticeEditor: React.FC<{ title: string; starterCode: string }> = ({ title, starterCode }) => {
  const [code, setCode] = useState(starterCode);
  const [previewCode, setPreviewCode] = useState(starterCode);

  useEffect(() => {
    setCode(starterCode);
    setPreviewCode(starterCode);
  }, [starterCode]);

  const srcDoc = useMemo(() => {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>${previewCode}</body>
</html>`;
  }, [previewCode]);

  return (
    <div className="practice-editor">
      <div className="practice-editor-hdr">
        <div>
          <div className="practice-kicker">Try It Yourself</div>
          <h3>{title}</h3>
        </div>
        <div className="practice-actions">
          <button type="button" className="topbar-btn" onClick={() => setCode(starterCode)}>Reset</button>
          <button type="button" className="topbar-btn primary" onClick={() => setPreviewCode(code)}>Run</button>
        </div>
      </div>
      <div className="practice-grid">
        <textarea
          className="practice-code mono"
          value={code}
          spellCheck={false}
          onChange={event => setCode(event.target.value)}
          aria-label={`${title} code editor`}
        />
        <iframe
          className="practice-preview"
          title={`${title} preview`}
          sandbox="allow-scripts"
          srcDoc={srcDoc}
        />
      </div>
    </div>
  );
};

const LearningModules: React.FC = () => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const module = getLearningModule(topicId);
  const moduleIndex = learningModules.findIndex(item => item.id === module.id);
  const previous = moduleIndex > 0 ? learningModules[moduleIndex - 1] : null;
  const next = moduleIndex < learningModules.length - 1 ? learningModules[moduleIndex + 1] : null;

  useEffect(() => {
    if (!topicId) {
      navigate(`/modules/${module.id}`, { replace: true });
    }
  }, [module.id, navigate, topicId]);

  return (
    <div className="module-workspace">
      <aside className="module-topic-nav">
        <div className="module-topic-title">Modules</div>
        {learningModules.map(item => (
          <NavLink
            key={item.id}
            to={`/modules/${item.id}`}
            className={({ isActive }) => `module-topic-link${isActive ? ' active' : ''}`}
          >
            <span>{item.shortTitle}</span>
            <small>{item.level}</small>
          </NavLink>
        ))}
      </aside>

      <main className="module-lesson">
        <section className="module-hero">
          <div>
            <div className="task-kicker">Learning Module</div>
            <h1>{module.title}</h1>
            <p>{module.summary}</p>
          </div>
          <span className="badge active">{module.level}</span>
        </section>

        <div className="module-pager">
          <button type="button" className="topbar-btn" disabled={!previous} onClick={() => previous && navigate(`/modules/${previous.id}`)}>
            Previous
          </button>
          <button type="button" className="topbar-btn primary" disabled={!next} onClick={() => next && navigate(`/modules/${next.id}`)}>
            Next
          </button>
        </div>

        {module.sections.map(section => (
          <section key={section.title} className="lesson-section">
            <h2>{section.title}</h2>
            <p>{section.body}</p>
            {section.bullets && (
              <ul className="lesson-points">
                {section.bullets.map(point => <li key={point}>{point}</li>)}
              </ul>
            )}
            <PracticeEditor title={section.exampleTitle} starterCode={section.starterCode} />
          </section>
        ))}
      </main>
    </div>
  );
};

export default LearningModules;
