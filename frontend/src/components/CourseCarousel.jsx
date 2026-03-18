import React from 'react'

import { API_BASE } from '../lib/apiBase'

export default function CourseCarousel({ courses: providedCourses = null }){
  const [courses, setCourses] = React.useState(Array.isArray(providedCourses) ? providedCourses : [])
  const [loading, setLoading] = React.useState(providedCourses === null)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (Array.isArray(providedCourses)) {
      setCourses(providedCourses)
      setLoading(false)
      setError('')
      return
    }

    let mounted = true

    async function loadCourses(){
      try{
        setLoading(true)
        setError('')
        const res = await fetch(`${API_BASE}/courses?page=1&limit=20`)
        const data = await res.json()
        if(!res.ok) throw new Error(data.error || 'Failed to load courses')
        if(mounted) setCourses(Array.isArray(data.items) ? data.items : [])
      }catch(err){
        if(mounted) setError(err.message)
      }finally{
        if(mounted) setLoading(false)
      }
    }

    loadCourses()
    return () => { mounted = false }
  }, [providedCourses])

  if(loading){
    return <div className="sv-carousel"><p>Loading courses...</p></div>
  }

  if(error){
    return <div className="sv-carousel"><p>Could not load courses: {error}</p></div>
  }

  if(courses.length === 0){
    return <div className="sv-carousel"><p>No courses available yet.</p></div>
  }

  return (
    <div className="sv-carousel">
      {courses.map((c) => (
        <div className="sv-course" key={c._id || c.id}>
          <div
            className="thumb"
            style={c.thumbnailUrl ? { backgroundImage: `url(${c.thumbnailUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          />
          <h4>{c.title}</h4>
          <div className="meta">
            {c.level || 'Beginner'} | {c.category || 'General'}
          </div>
          <div className="small-progress"><div style={{width:`${c.progress || 0}%`}}/></div>
          <button
            className="sv-cta"
            onClick={() => {
              const courseId = c._id || c.id;
              if (courseId) window.location.href = `/courses/${courseId}`;
            }}
          >
            {(c.progress || 0) > 0 ? 'Continue' : 'Start Course'}
          </button>
        </div>
      ))}
    </div>
  )
}
