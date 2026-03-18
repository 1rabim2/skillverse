import React from 'react'

function Card({ title, children }){
  return (
    <div className="sv-card">
      <h4>{title}</h4>
      {children}
    </div>
  )
}

export default function ProgressOverview({ stats }){
  const progress = stats?.avgProgress || 0
  const xp = stats?.xp || 0
  const badges = stats?.badgesCount || 0

  return (
    <section className="sv-progress-grid">
      <Card title="Course Progress">
        <div className="progress-row">
          <div className="progress-info">You have completed <strong>{progress}%</strong> of your current learning progress</div>
          <div className="progress-bar"><div style={{width:`${progress}%`}} /></div>
        </div>
      </Card>

      <Card title="XP Points">
        <div className="xp"><strong>{xp}</strong> XP</div>
      </Card>

      <Card title="Badges">
        <div className="badges"><strong>{badges}</strong> Badges Earned</div>
      </Card>
    </section>
  )
}
