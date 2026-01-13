import { useEffect } from 'react'
import posthog from 'posthog-js'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Resume from './Resume'
import * as data from './data-raw'

function PostHogPageView() {
  const location = useLocation()

  useEffect(() => {
    posthog.capture('$pageview')
  }, [location])

  return null
}

function ScrollToHash() {
  const { hash } = useLocation()

  useEffect(() => {
    if (!hash) return
    const id = hash.replace('#', '')
    const scrollToTarget = () => {
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'auto' })
      }
    }
    scrollToTarget()
    const timeout = window.setTimeout(scrollToTarget, 200)
    return () => window.clearTimeout(timeout)
  }, [hash])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <PostHogPageView />
      <ScrollToHash />
      <Routes>
        <Route path="/" element={<Resume data={data} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
