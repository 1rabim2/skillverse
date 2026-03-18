import React from 'react'
import { Link } from 'react-router-dom'
import '../styles/landing.css'

export default function Landing(){
  return (
    <div className="sv-landing">
      <header className="sv-hero">
        <nav className="sv-nav" aria-label="Primary">
          <Link className="sv-brand" to="/">
            Skill<span>Verse</span>
          </Link>
          <div className="sv-nav-right">
            <div className="sv-nav-links">
              <a href="#paths">Paths</a>
              <a href="#how">How it works</a>
              <a href="#stories">Stories</a>
              <Link to="/certificates">Certificates</Link>
            </div>
            <div className="sv-nav-ctas">
              <Link className="sv-btn ghost" to="/login">Sign in</Link>
              <Link className="sv-btn primary" to="/signup">Get started</Link>
            </div>
          </div>
        </nav>

        <div className="sv-hero-grid">
          <div className="sv-hero-left">
            <div className="sv-kicker">Guided learning, not guesswork</div>
            <h1>
              Learn skills that actually show up in interviews
              <span className="sv-h1-sub">- one step at a time.</span>
            </h1>
            <p className="sv-lead">
              SkillVerse turns big goals into clear weekly plans: short lessons, quick checks, and
              a portfolio you can share when you apply.
            </p>
            <div className="sv-hero-ctas">
              <Link className="sv-btn primary" to="/signup">Start a path</Link>
              <Link className="sv-btn outline" to="/login">See your dashboard</Link>
            </div>
            <div className="sv-hero-badges" aria-label="Highlights">
              <span className="sv-badge">Bite-size lessons</span>
              <span className="sv-badge">Quizzes + practice</span>
              <span className="sv-badge">Portfolio-ready</span>
            </div>
          </div>

          <div className="sv-hero-right" aria-hidden="true">
            <div className="sv-hero-mock">
              <div className="sv-mock-card sv-mock-path">
                <div className="sv-mock-row">
                  <div className="sv-dot" />
                  <div className="sv-mock-title">Frontend Foundations</div>
                  <div className="sv-pill">In progress</div>
                </div>
                <div className="sv-mock-sub">This week: Flexbox to responsive layout</div>
                <div className="sv-progress" role="presentation">
                  <div className="sv-progress-bar" style={{ width: '62%' }} />
                </div>
                <div className="sv-mock-meta">
                  <span>5 tasks left</span>
                  <span>62%</span>
                </div>
              </div>

              <div className="sv-mock-split">
                <div className="sv-mock-card sv-mock-quiz">
                  <div className="sv-mock-row">
                    <div className="sv-mini-icon">Q</div>
                    <div className="sv-mock-title">Quick quiz</div>
                  </div>
                  <div className="sv-score">
                    <span className="sv-score-num">8/10</span>
                    <span className="sv-score-sub">CSS selectors</span>
                  </div>
                </div>
                <div className="sv-mock-card sv-mock-xp">
                  <div className="sv-mock-row">
                    <div className="sv-mini-icon">XP</div>
                    <div className="sv-mock-title">Streak</div>
                  </div>
                  <div className="sv-streak">
                    <span className="sv-streak-num">4</span>
                    <span className="sv-streak-sub">days</span>
                  </div>
                </div>
              </div>

              <div className="sv-mock-card sv-mock-portfolio">
                <div className="sv-mock-row">
                  <div className="sv-mini-icon">✓</div>
                  <div className="sv-mock-title">Portfolio</div>
                  <div className="sv-pill subtle">Auto-saved</div>
                </div>
                <div className="sv-portfolio-lines">
                  <div className="sv-line w80" />
                  <div className="sv-line w65" />
                  <div className="sv-line w90" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="sv-section-features" id="paths">
        <div className="sv-section-head">
          <h2>Pick a path. Keep momentum.</h2>
          <p>Start with the essentials, practice a little every day, and see progress you can measure.</p>
        </div>
        <div className="sv-features">
          <div className="sv-feature">
            <div className="sv-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 6h8" />
                <path d="M8 12h8" />
                <path d="M8 18h8" />
                <path d="M6 6h.01" />
                <path d="M6 12h.01" />
                <path d="M6 18h.01" />
              </svg>
            </div>
            <h4>Clear roadmap</h4>
            <p>Know exactly what to learn next—no random jumping between topics.</p>
          </div>
          <div className="sv-feature">
            <div className="sv-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <h4>Practice built in</h4>
            <p>Short lessons, quick quizzes, and tasks that help you remember the concepts.</p>
          </div>
          <div className="sv-feature">
            <div className="sv-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7z" />
              </svg>
            </div>
            <h4>Stay consistent</h4>
            <p>XP, streaks, and reminders that keep you moving even on busy weeks.</p>
          </div>
          <div className="sv-feature">
            <div className="sv-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7h-7" />
                <path d="M20 12h-9" />
                <path d="M20 17h-6" />
                <path d="M4 6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" />
              </svg>
            </div>
            <h4>Portfolio that grows</h4>
            <p>Your completed work collects into a shareable portfolio—automatically.</p>
          </div>
        </div>
      </section>

      <section className="sv-how" id="how">
        <div className="sv-section-head">
          <h2>How it works</h2>
          <p>Simple flow, real outcomes. Start fast and keep building.</p>
        </div>
        <div className="sv-steps">
          <div className="sv-step">
            <div className="num">1</div>
            <h4>Create your profile</h4>
            <p>Choose your goal and your current level. SkillVerse suggests a starting point.</p>
          </div>
          <div className="sv-step">
            <div className="num">2</div>
            <h4>Learn in small sessions</h4>
            <p>Complete short lessons, take quick quizzes, and unlock the next step.</p>
          </div>
          <div className="sv-step">
            <div className="num">3</div>
            <h4>Show your work</h4>
            <p>Earn certificates and keep a portfolio of what you’ve finished.</p>
          </div>
        </div>
      </section>

      <section className="sv-testimonials" id="stories">
        <div className="sv-section-head">
          <h2>What learners say</h2>
          <p>Real feedback from people using SkillVerse to stay consistent.</p>
        </div>
        <div className="sv-t-list">
          <figure className="sv-quote">
            <div className="sv-avatar" aria-hidden="true">M</div>
            <blockquote>
              The weekly plan helped me stop “learning everywhere”. I just followed the next step and
              got results.
            </blockquote>
            <figcaption>
              <strong>Manisha</strong> <span>• student</span>
            </figcaption>
          </figure>
          <figure className="sv-quote">
            <div className="sv-avatar" aria-hidden="true">R</div>
            <blockquote>
              Quizzes are short but effective. It’s the first time I can actually track what I’m
              improving.
            </blockquote>
            <figcaption>
              <strong>Rohit</strong> <span>• beginner developer</span>
            </figcaption>
          </figure>
          <figure className="sv-quote">
            <div className="sv-avatar" aria-hidden="true">S</div>
            <blockquote>
              My portfolio finally looks organized. I can share one link instead of explaining everything.
            </blockquote>
            <figcaption>
              <strong>Sara</strong> <span>• job seeker</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="sv-cta-banner">
        <h2>Start today and build skills you can prove.</h2>
        <p className="sv-cta-sub">Pick a path, stay consistent, and let your progress speak for you.</p>
        <Link className="sv-btn primary" to="/signup">Get Started for Free</Link>
      </section>

      <footer className="sv-footer">
        <div className="sv-footer-links">
          <a href="#">About</a>
          <a href="#">Contact</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms</a>
        </div>
        <div className="sv-footer-right">© 2026 SkillVerse • Learn. Grow. Achieve.</div>
      </footer>
    </div>
  )
}
