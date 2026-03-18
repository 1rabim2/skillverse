import React from 'react'

export default function Achievements({ badges = [] }){
  return (
    <aside className="sv-achievements">
      <h3>Your Achievements</h3>
      <div className="sv-badges">
        {badges.map((name, idx) => (
          <div key={`${name}-${idx}`} className="badge">
            <div className="badge-icon">*</div>
            <div className="badge-name">{name}</div>
          </div>
        ))}
        {badges.length === 0 && <div className="badge-name">No badges earned yet.</div>}
      </div>
      <button className="sv-cta">View Portfolio</button>
    </aside>
  )
}
