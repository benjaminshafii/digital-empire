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

function App() {
  return (
    <BrowserRouter>
      <PostHogPageView />
      <Routes>
        <Route path="/" element={<Resume data={data} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
