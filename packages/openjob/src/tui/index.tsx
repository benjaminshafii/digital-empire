#!/usr/bin/env node
/**
 * openjob TUI - Terminal User Interface
 * Built with Ink (React for CLI)
 */

import React, { useState, useEffect, useMemo } from "react"
import { render, Box, Text, useInput, useApp } from "ink"
import { join } from "path"
import { execSync } from "child_process"
import { readdirSync, existsSync, readFileSync } from "fs"

// Core imports
import {
  listSearches,
  listJobsForSearch,
  getRunningJob,
  startJob,
  cancelJob,
  createSearch,
  updateSearch,
  slugify,
  searchExists,
  getSearch,
  getPrompt,
  getJobLog,
  getJob,
  ensureDataDirs,
  setDataDir,
  getTmuxSessionName,
  describeSchedule,
  findProjectRoot,
  type Search,
  type Job,
} from "../core"

// Set data directory
setDataDir(join(process.cwd(), "data"))
ensureDataDirs()

// Agent type
interface Agent {
  name: string
  description: string
  path: string
}

// Load agents from .opencode/agent/*.md and ~/.config/opencode/agent/*.md
function loadAgents(): Agent[] {
  const agents: Agent[] = []
  
  // Project-local agents
  try {
    const projectRoot = findProjectRoot()
    const localDir = join(projectRoot, ".opencode", "agent")
    if (existsSync(localDir)) {
      for (const file of readdirSync(localDir)) {
        if (file.endsWith(".md")) {
          const name = file.replace(".md", "")
          const content = readFileSync(join(localDir, file), "utf-8")
          // Extract description from frontmatter if present
          const descMatch = content.match(/^---[\s\S]*?description:\s*(.+?)[\r\n]/m)
          agents.push({
            name,
            description: descMatch ? descMatch[1].trim() : "Local agent",
            path: join(localDir, file),
          })
        }
      }
    }
  } catch {}
  
  // Global agents from ~/.config/opencode/agent/
  try {
    const homeDir = process.env.HOME || process.env.USERPROFILE || ""
    const globalDir = join(homeDir, ".config", "opencode", "agent")
    if (existsSync(globalDir)) {
      for (const file of readdirSync(globalDir)) {
        if (file.endsWith(".md")) {
          const name = file.replace(".md", "")
          // Skip if we already have this agent from project
          if (agents.some(a => a.name === name)) continue
          const content = readFileSync(join(globalDir, file), "utf-8")
          const descMatch = content.match(/^---[\s\S]*?description:\s*(.+?)[\r\n]/m)
          agents.push({
            name,
            description: descMatch ? descMatch[1].trim() : "Global agent",
            path: join(globalDir, file),
          })
        }
      }
    }
  } catch {}
  
  return agents
}

// ASCII Logo for "openjob"
const LOGO = [
  { id: "1", text: "█▀▀█ █▀▀█ █▀▀█ █▀▀▄   ▀█ █▀▀█ █▀▀▄" },
  { id: "2", text: "█░░█ █░░█ █▀▀▀ █░░█    █ █░░█ █▀▀█" },
  { id: "3", text: "▀▀▀▀ █▀▀▀ ▀▀▀▀ ▀  ▀ ▀▀▀  ▀▀▀▀ ▀▀▀▀" },
]

// Schedule options
const SCHEDULE_OPTIONS = [
  { label: "Every 30 minutes", value: "30m" },
  { label: "Every hour", value: "1h" },
  { label: "Every 2 hours", value: "2h" },
  { label: "Every 6 hours", value: "6h" },
  { label: "Every 12 hours", value: "12h" },
  { label: "Daily", value: "24h" },
]

type Screen = "input" | "running" | "list" | "job-detail" | "schedule" | "logs"

function App() {
  const { exit } = useApp()

  // State
  const [screen, setScreen] = useState<Screen>("input")
  const [input, setInput] = useState("")
  const [message, setMessage] = useState("")

  // Running job state
  const [currentJob, setCurrentJob] = useState<{ search: Search; job: Job } | null>(null)
  const [runningJob, setRunningJob] = useState<{ searchSlug: string; job: Job } | null>(null)

  // List state
  const [searches, setSearches] = useState<Search[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Schedule state
  const [scheduleIndex, setScheduleIndex] = useState(0)
  const [pendingSchedule, setPendingSchedule] = useState<Search | null>(null)

  // Job detail state
  const [selectedSearch, setSelectedSearch] = useState<Search | null>(null)
  
  // Logs state
  const [logScrollOffset, setLogScrollOffset] = useState(0)
  
  // Autocomplete state
  const [agents] = useState<Agent[]>(() => loadAgents())
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [autocompleteIndex, setAutocompleteIndex] = useState(0)
  const [inputKey, setInputKey] = useState(0) // Force TextInput remount to reset cursor
  
  // Compute filtered agents based on input
  const filteredAgents = useMemo(() => {
    const atMatch = input.match(/@(\S*)$/)
    if (!atMatch) return []
    const query = atMatch[1].toLowerCase()
    return agents.filter(a => 
      a.name.toLowerCase().includes(query) ||
      a.description.toLowerCase().includes(query)
    ).slice(0, 8)
  }, [input, agents])
  
  // Show autocomplete when typing @
  useEffect(() => {
    const hasAtTrigger = /@\S*$/.test(input)
    setShowAutocomplete(hasAtTrigger && filteredAgents.length > 0)
    if (hasAtTrigger) {
      setAutocompleteIndex(0)
    }
  }, [input, filteredAgents.length])

  // Refresh data
  const refresh = () => {
    setSearches(listSearches())
    const running = getRunningJob()
    setRunningJob(running)
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 2000)
    return () => clearInterval(interval)
  }, [])

  // Show temporary message
  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(""), 3000)
  }

  // Attach to tmux
  const attachToTmux = (jobId: string) => {
    const sessionName = getTmuxSessionName(jobId)
    try {
      execSync(`tmux attach-session -t ${sessionName}`, { stdio: "inherit" })
    } catch {
      // User detached
    }
    refresh()
    const running = getRunningJob()
    if (running) {
      setCurrentJob({ search: getSearch(running.searchSlug)!, job: running.job })
    } else {
      setCurrentJob(null)
      setScreen("input")
    }
  }

  // Run a job
  const runJob = async (prompt: string, background = false) => {
    if (!prompt.trim()) return

    try {
      const name = prompt.split(/\s+/).slice(0, 3).join(" ").substring(0, 30) || "job"
      let slug = slugify(name)
      let counter = 2
      while (searchExists(slug)) slug = `${slugify(name)}-${counter++}`

      const search = createSearch({ name, prompt: prompt.trim() })
      showMessage(`Created: ${search.name}`)

      const job = await startJob(search.slug)
      setCurrentJob({ search, job })
      setInput("")

      if (background) {
        showMessage(`Running in background: ${search.name}`)
        setScreen("input")
      } else {
        setScreen("running")
        attachToTmux(job.id)
      }
    } catch (err) {
      showMessage(`Error: ${err instanceof Error ? err.message : "Unknown"}`)
    }
  }

  // Handle input submission
  const handleSubmit = (value: string) => {
    const text = value.trim()
    if (text === "/list" || text === "/ls") {
      setInput("")
      refresh()
      setScreen("list")
    } else if (text === "/quit" || text === "/q") {
      exit()
    } else if (text.startsWith("/")) {
      showMessage(`Unknown command: ${text}`)
      setInput("")
    } else if (text) {
      runJob(text)
    }
  }

  // Keyboard input
  useInput((char, key) => {
    if (key.ctrl && char === "c") {
      exit()
      return
    }

    if (screen === "input") {
      // Handle autocomplete navigation and selection
      if (showAutocomplete && filteredAgents.length > 0) {
        if (key.upArrow) {
          setAutocompleteIndex((i) => Math.max(0, i - 1))
          return
        } else if (key.downArrow) {
          setAutocompleteIndex((i) => Math.min(filteredAgents.length - 1, i + 1))
          return
        } else if (key.tab) {
          // Insert the selected agent into input
          const selected = filteredAgents[autocompleteIndex]
          if (selected) {
            // Replace the @partial with @agentname
            const newValue = input.replace(/@\S*$/, `@${selected.name} `)
            setInput(newValue)
            setShowAutocomplete(false)
            // Force TextInput remount to reset cursor position to end
            setInputKey(k => k + 1)
          }
          return
        } else if (key.escape) {
          setShowAutocomplete(false)
          return
        }
      }
      
      if (key.ctrl && char === "b" && input.trim()) {
        runJob(input, true)
      } else if (key.ctrl && char === "s" && input.trim()) {
        const prompt = input.trim()
        const name = prompt.split(/\s+/).slice(0, 3).join(" ").substring(0, 30) || "job"
        let slug = slugify(name)
        let counter = 2
        while (searchExists(slug)) slug = `${slugify(name)}-${counter++}`
        const search = createSearch({ name, prompt })
        setPendingSchedule(search)
        setScheduleIndex(0)
        setScreen("schedule")
        setInput("")
      }
    } else if (screen === "running") {
      if (key.escape || char === "q") {
        setScreen("input")
      } else if (char === "a" || key.return) {
        if (currentJob) attachToTmux(currentJob.job.id)
      } else if (char === "c") {
        if (currentJob) {
          cancelJob(currentJob.search.slug, currentJob.job.id)
          showMessage("Job cancelled")
          setCurrentJob(null)
          setScreen("input")
          refresh()
        }
      } else if (key.ctrl && char === "b") {
        showMessage("Running in background")
        setScreen("input")
      }
    } else if (screen === "list") {
      if (key.escape || char === "q") {
        setScreen("input")
      } else if (key.upArrow || char === "k") {
        setSelectedIndex((i) => Math.max(0, i - 1))
      } else if (key.downArrow || char === "j") {
        setSelectedIndex((i) => Math.min(searches.length - 1, i + 1))
      } else if (key.return) {
        const selected = searches[selectedIndex]
        if (selected) {
          setSelectedSearch(selected)
          setScreen("job-detail")
        }
      } else if (char === "r") {
        const selected = searches[selectedIndex]
        if (selected) {
          startJob(selected.slug).then((job) => {
            setCurrentJob({ search: selected, job })
            setScreen("running")
            attachToTmux(job.id)
          })
        }
      }
    } else if (screen === "job-detail") {
      if (key.escape || char === "q") {
        setScreen("list")
      } else if (char === "r" && selectedSearch) {
        startJob(selectedSearch.slug).then((job) => {
          setCurrentJob({ search: selectedSearch, job })
          setScreen("running")
          attachToTmux(job.id)
        })
      } else if (char === "l" && selectedSearch) {
        setLogScrollOffset(0)
        setScreen("logs")
      }
    } else if (screen === "logs") {
      if (key.escape || char === "q") {
        setScreen("job-detail")
      } else if (key.upArrow || char === "k") {
        setLogScrollOffset((o) => Math.max(0, o - 5))
      } else if (key.downArrow || char === "j") {
        setLogScrollOffset((o) => o + 5)
      }
    } else if (screen === "schedule") {
      if (key.escape) {
        setPendingSchedule(null)
        setScreen("input")
      } else if (key.upArrow || char === "k") {
        setScheduleIndex((i) => Math.max(0, i - 1))
      } else if (key.downArrow || char === "j") {
        setScheduleIndex((i) => Math.min(SCHEDULE_OPTIONS.length - 1, i + 1))
      } else if (key.return && pendingSchedule) {
        const option = SCHEDULE_OPTIONS[scheduleIndex]
        updateSearch(pendingSchedule.slug, { schedule: option.value })
        showMessage(`Scheduled: ${option.label}`)
        setPendingSchedule(null)
        setScreen("input")
        refresh()
      }
    }
  })

  return (
    <Box flexDirection="column" padding={1}>
      {screen === "input" && (
        <InputScreen
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          message={message}
          runningJob={runningJob}
          searches={searches}
          showAutocomplete={showAutocomplete}
          filteredAgents={filteredAgents}
          autocompleteIndex={autocompleteIndex}
          inputKey={inputKey}
        />
      )}

      {screen === "running" && currentJob && (
        <RunningScreen job={currentJob} message={message} />
      )}

      {screen === "list" && (
        <ListScreen
          searches={searches}
          selectedIndex={selectedIndex}
          message={message}
        />
      )}

      {screen === "job-detail" && selectedSearch && (
        <JobDetailScreen search={selectedSearch} message={message} />
      )}

      {screen === "logs" && selectedSearch && (
        <LogsScreen search={selectedSearch} scrollOffset={logScrollOffset} />
      )}

      {screen === "schedule" && pendingSchedule && (
        <ScheduleScreen
          search={pendingSchedule}
          options={SCHEDULE_OPTIONS}
          selectedIndex={scheduleIndex}
        />
      )}
    </Box>
  )
}

// Logo Component
function Logo() {
  return (
    <Box flexDirection="column">
      {LOGO.map((line, i) => (
        <Text key={line.id} color={i === 0 ? "cyan" : "gray"}>
          {line.text}
        </Text>
      ))}
    </Box>
  )
}

// Styled text input - shows @mentions in magenta while typing
function StyledTextInput(props: {
  inputKey: number
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  placeholder: string
  showCursor?: boolean
}) {
  // Track cursor position
  const [cursorPos, setCursorPos] = useState(props.value.length)
  
  // Sync cursor to end when value changes externally (e.g., autocomplete)
  useEffect(() => {
    setCursorPos(props.value.length)
  }, [props.inputKey])
  
  // Clamp cursor position if value shrinks
  useEffect(() => {
    if (cursorPos > props.value.length) {
      setCursorPos(props.value.length)
    }
  }, [props.value.length, cursorPos])
  
  useInput((char, key) => {
    // Ignore navigation keys handled by parent for autocomplete
    if (key.upArrow || key.downArrow || key.tab || key.escape) return
    
    // Let parent handle specific ctrl combinations (ctrl+b, ctrl+s)
    if (key.ctrl && (char === "b" || char === "s")) return
    
    if (key.return) {
      props.onSubmit(props.value)
      return
    }
    
    let newValue = props.value
    let newCursor = cursorPos
    
    // Terminal-style keyboard shortcuts
    if (key.ctrl) {
      switch (char) {
        case "a": // Beginning of line
          newCursor = 0
          break
        case "e": // End of line
          newCursor = props.value.length
          break
        case "u": // Clear line (delete everything before cursor)
          newValue = props.value.slice(cursorPos)
          newCursor = 0
          break
        case "k": // Kill line (delete everything after cursor)
          newValue = props.value.slice(0, cursorPos)
          break
        case "w": // Delete word before cursor
          {
            const beforeCursor = props.value.slice(0, cursorPos)
            const match = beforeCursor.match(/(?:^|\s)(\S+)\s*$/)
            if (match) {
              const deleteFrom = cursorPos - match[0].length
              newValue = props.value.slice(0, deleteFrom) + props.value.slice(cursorPos)
              newCursor = deleteFrom
            }
          }
          break
        case "l": // Clear screen - we'll just ignore this
          break
        default:
          return // Unknown ctrl combo, ignore
      }
    } else if (key.leftArrow) {
      if (key.meta) {
        // Cmd+Left: go to beginning of line (macOS)
        newCursor = 0
      } else {
        newCursor = Math.max(0, cursorPos - 1)
      }
    } else if (key.rightArrow) {
      if (key.meta) {
        // Cmd+Right: go to end of line (macOS)
        newCursor = props.value.length
      } else {
        newCursor = Math.min(props.value.length, cursorPos + 1)
      }
    } else if (key.backspace || key.delete) {
      if (cursorPos > 0) {
        newValue = props.value.slice(0, cursorPos - 1) + props.value.slice(cursorPos)
        newCursor = cursorPos - 1
      }
    } else if (char && !key.ctrl && !key.meta) {
      newValue = props.value.slice(0, cursorPos) + char + props.value.slice(cursorPos)
      newCursor = cursorPos + char.length
    }
    
    if (newCursor !== cursorPos) {
      setCursorPos(newCursor)
    }
    if (newValue !== props.value) {
      props.onChange(newValue)
    }
  })
  
  // Render the styled text with cursor
  const renderValue = () => {
    const text = props.value
    
    if (!text) {
      // Show placeholder with cursor
      return (
        <Text>
          <Text inverse> </Text>
          <Text color="gray">{props.placeholder.slice(1)}</Text>
        </Text>
      )
    }
    
    // Build the display with colored @mentions and cursor
    const result: React.ReactNode[] = []
    let i = 0
    let partIndex = 0
    
    while (i < text.length) {
      // Check if we're at the start of an @mention
      if (text[i] === "@") {
        // Find the end of the @mention (next space or end of string)
        let j = i + 1
        while (j < text.length && !/\s/.test(text[j])) {
          j++
        }
        const mention = text.slice(i, j)
        
        // Render the mention with cursor if cursor is inside
        if (cursorPos >= i && cursorPos < j) {
          const localCursor = cursorPos - i
          result.push(
            <Text key={`p${partIndex++}`} color="magenta" bold>
              {mention.slice(0, localCursor)}
            </Text>
          )
          result.push(
            <Text key={`p${partIndex++}`} color="magenta" bold inverse>
              {mention[localCursor]}
            </Text>
          )
          result.push(
            <Text key={`p${partIndex++}`} color="magenta" bold>
              {mention.slice(localCursor + 1)}
            </Text>
          )
        } else {
          result.push(
            <Text key={`p${partIndex++}`} color="magenta" bold>
              {mention}
            </Text>
          )
        }
        i = j
      } else {
        // Regular character
        if (cursorPos === i) {
          result.push(<Text key={`p${partIndex++}`} inverse>{text[i]}</Text>)
        } else {
          result.push(<Text key={`p${partIndex++}`}>{text[i]}</Text>)
        }
        i++
      }
    }
    
    // Cursor at end
    if (cursorPos === text.length) {
      result.push(<Text key={`p${partIndex++}`} inverse> </Text>)
    }
    
    return <Text>{result}</Text>
  }
  
  return renderValue()
}

// Input Screen
function InputScreen(props: {
  input: string
  setInput: (v: string) => void
  onSubmit: (v: string) => void
  message: string
  runningJob: { searchSlug: string; job: Job } | null
  searches: Search[]
  showAutocomplete: boolean
  filteredAgents: Agent[]
  autocompleteIndex: number
  inputKey: number
}) {
  const recentSearches = props.searches.slice(0, 5)

  return (
    <Box flexDirection="column">
      <Logo />
      <Box marginTop={1} />

      {props.runningJob && (
        <Box>
          <Text color="yellow">● </Text>
          <Text dimColor>Running: </Text>
          <Text color="cyan">{props.runningJob.searchSlug}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="cyan">❯ </Text>
        <StyledTextInput
          inputKey={props.inputKey}
          value={props.input}
          onChange={props.setInput}
          onSubmit={props.onSubmit}
          placeholder="Enter a prompt... (use @agent for agents)"
        />
      </Box>

      {/* Agent Autocomplete Dropdown */}
      {props.showAutocomplete && props.filteredAgents.length > 0 && (
        <Box flexDirection="column" marginLeft={2} borderStyle="round" borderColor="cyan" paddingX={1}>
          <Text dimColor>Agents (Tab to select, ↑/↓ to navigate):</Text>
          {props.filteredAgents.map((agent, index) => {
            const isSelected = index === props.autocompleteIndex
            return (
              <Box key={agent.name}>
                <Text color={isSelected ? "cyan" : "gray"}>
                  {isSelected ? "▶ " : "  "}
                </Text>
                <Text color={isSelected ? "white" : "gray"} bold={isSelected}>
                  @{agent.name}
                </Text>
                <Text dimColor> - {agent.description.slice(0, 40)}{agent.description.length > 40 ? "..." : ""}</Text>
              </Box>
            )
          })}
        </Box>
      )}

      {props.message && (
        <Box marginTop={1}>
          <Text color="green">{props.message}</Text>
        </Box>
      )}

      {recentSearches.length > 0 && !props.showAutocomplete && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Recent:</Text>
          {recentSearches.map((search) => {
            const jobs = listJobsForSearch(search.slug)
            const lastJob = jobs[0]
            return (
              <Box key={search.slug} marginLeft={2}>
                <Text dimColor>• </Text>
                <Text>{search.name}</Text>
                {lastJob && <Text dimColor> [{lastJob.status}]</Text>}
                {search.schedule && <Text color="magenta"> ⏰</Text>}
              </Box>
            )
          })}
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          <Text color="cyan">enter</Text> run{"  "}
          <Text color="cyan">ctrl+b</Text> background{"  "}
          <Text color="cyan">ctrl+s</Text> schedule{"  "}
          <Text color="cyan">/list</Text> jobs{"  "}
          <Text color="cyan">/quit</Text> exit
        </Text>
      </Box>
    </Box>
  )
}

// Running Screen
function RunningScreen(props: { job: { search: Search; job: Job }; message: string }) {
  const { search, job } = props.job
  const sessionName = getTmuxSessionName(job.id)

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan" bold>Running: </Text>
        <Text>{search.name}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text color="green">● </Text>
          <Text dimColor>tmux: </Text>
          <Text color="cyan">{sessionName}</Text>
        </Box>
        <Box>
          <Text dimColor>ID: </Text>
          <Text>{job.id.slice(0, 8)}</Text>
        </Box>
        <Box>
          <Text dimColor>Status: </Text>
          <Text color="yellow">{job.status}</Text>
        </Box>
        {search.schedule && (
          <Box>
            <Text dimColor>Schedule: </Text>
            <Text color="magenta">{describeSchedule(search.schedule)}</Text>
          </Box>
        )}
      </Box>

      {props.message && (
        <Box marginTop={1}>
          <Text color="green">{props.message}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          <Text color="cyan">a/enter</Text> attach{"  "}
          <Text color="cyan">ctrl+b</Text> background{"  "}
          <Text color="cyan">c</Text> cancel{"  "}
          <Text color="cyan">q</Text> back
        </Text>
      </Box>
    </Box>
  )
}

// List Screen
function ListScreen(props: {
  searches: Search[]
  selectedIndex: number
  message: string
}) {
  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan" bold>Jobs</Text>
        <Text dimColor> ({props.searches.length})</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        {props.searches.length === 0 ? (
          <Text dimColor>No jobs yet. Press q to go back.</Text>
        ) : (
          props.searches.map((search, index) => {
            const isSelected = index === props.selectedIndex
            const jobs = listJobsForSearch(search.slug)
            const lastJob = jobs[0]

            return (
              <Box key={search.slug}>
                <Text color={isSelected ? "cyan" : "gray"}>
                  {isSelected ? "▶ " : "  "}
                </Text>
                <Text color={isSelected ? "white" : "gray"} bold={isSelected}>
                  {search.name}
                </Text>
                <Text dimColor> [{lastJob?.status || "never"}]</Text>
                {search.schedule && <Text color="magenta"> ⏰</Text>}
              </Box>
            )
          })
        )}
      </Box>

      {props.message && (
        <Box marginTop={1}>
          <Text color="green">{props.message}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          <Text color="cyan">↑/↓</Text> navigate{"  "}
          <Text color="cyan">enter</Text> view{"  "}
          <Text color="cyan">r</Text> run{"  "}
          <Text color="cyan">q</Text> back
        </Text>
      </Box>
    </Box>
  )
}

// Job Detail Screen
function JobDetailScreen(props: { search: Search; message: string }) {
  const jobs = listJobsForSearch(props.search.slug)
  const lastJob = jobs[0]
  const prompt = getPrompt(props.search.slug) || props.search.prompt
  
  // Get error info and log tail for failed jobs
  let errorInfo = ""
  let logTail = ""
  if (lastJob) {
    const fullJob = getJob(props.search.slug, lastJob.id)
    if (fullJob?.error) {
      errorInfo = fullJob.error
    }
    // Get last 10 lines of log
    const log = getJobLog(props.search.slug, lastJob.id, 10)
    if (log) {
      logTail = log
    }
  }

  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>{props.search.name}</Text>

      <Box marginTop={1} flexDirection="column">
        {props.search.schedule && (
          <Box>
            <Text dimColor>Schedule: </Text>
            <Text color="magenta">{describeSchedule(props.search.schedule)}</Text>
          </Box>
        )}
        <Box>
          <Text dimColor>Total runs: </Text>
          <Text>{jobs.length}</Text>
        </Box>
        {lastJob && (
          <>
            <Box>
              <Text dimColor>Last run: </Text>
              <Text>{new Date(lastJob.createdAt).toLocaleString()}</Text>
              <Text color={lastJob.status === "failed" ? "red" : lastJob.status === "completed" ? "green" : "yellow"}>
                {" "}[{lastJob.status}]
              </Text>
            </Box>
            {lastJob.duration && (
              <Box>
                <Text dimColor>Duration: </Text>
                <Text>{Math.round(lastJob.duration / 1000)}s</Text>
              </Box>
            )}
          </>
        )}
        
        {/* Error info for failed jobs */}
        {errorInfo && (
          <Box marginTop={1} flexDirection="column">
            <Text color="red" bold>Error:</Text>
            <Box marginLeft={2}>
              <Text color="red">{errorInfo}</Text>
            </Box>
          </Box>
        )}
        
        {/* Log output */}
        {logTail && (
          <Box marginTop={1} flexDirection="column">
            <Text dimColor bold>Log (last 10 lines):</Text>
            <Box marginLeft={2} flexDirection="column">
              {logTail.split("\n").slice(-10).map((line, i) => (
                <Text key={`log-${i}`} dimColor>{line.slice(0, 70)}{line.length > 70 ? "..." : ""}</Text>
              ))}
            </Box>
          </Box>
        )}

        <Box marginTop={1}>
          <Text dimColor>Prompt: </Text>
          <Text>{prompt.slice(0, 100)}{prompt.length > 100 ? "..." : ""}</Text>
        </Box>
      </Box>

      {props.message && (
        <Box marginTop={1}>
          <Text color="green">{props.message}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          <Text color="cyan">r</Text> run{"  "}
          <Text color="cyan">l</Text> full log{"  "}
          <Text color="cyan">q</Text> back
        </Text>
      </Box>
    </Box>
  )
}

// Schedule Screen
function ScheduleScreen(props: {
  search: Search
  options: typeof SCHEDULE_OPTIONS
  selectedIndex: number
}) {
  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan" bold>Schedule: </Text>
        <Text>{props.search.name}</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Select a schedule:</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        {props.options.map((option, index) => {
          const isSelected = index === props.selectedIndex
          return (
            <Box key={option.value}>
              <Text color={isSelected ? "cyan" : "gray"}>
                {isSelected ? "▶ " : "  "}
              </Text>
              <Text color={isSelected ? "white" : "gray"} bold={isSelected}>
                {option.label}
              </Text>
              <Text dimColor> ({option.value})</Text>
            </Box>
          )
        })}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          <Text color="cyan">↑/↓</Text> navigate{"  "}
          <Text color="cyan">enter</Text> confirm{"  "}
          <Text color="cyan">esc</Text> cancel
        </Text>
      </Box>
    </Box>
  )
}

// Logs Screen - Full log viewer
function LogsScreen(props: { search: Search; scrollOffset: number }) {
  const jobs = listJobsForSearch(props.search.slug)
  const lastJob = jobs[0]
  
  if (!lastJob) {
    return (
      <Box flexDirection="column">
        <Text color="cyan" bold>Logs: {props.search.name}</Text>
        <Box marginTop={1}>
          <Text dimColor>No jobs run yet</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor><Text color="cyan">q</Text> back</Text>
        </Box>
      </Box>
    )
  }
  
  const fullLog = getJobLog(props.search.slug, lastJob.id)
  const lines = fullLog.split("\n")
  const visibleLines = lines.slice(props.scrollOffset, props.scrollOffset + 20)
  
  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan" bold>Logs: </Text>
        <Text>{props.search.name}</Text>
        <Text dimColor> (job {lastJob.id.slice(0, 8)})</Text>
      </Box>
      
      <Box marginTop={1}>
        <Text dimColor>
          Lines {props.scrollOffset + 1}-{Math.min(props.scrollOffset + 20, lines.length)} of {lines.length}
        </Text>
      </Box>
      
      <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray" padding={1}>
        {visibleLines.length === 0 ? (
          <Text dimColor>(empty log)</Text>
        ) : (
          visibleLines.map((line, i) => (
            <Text key={`line-${props.scrollOffset + i}`} wrap="truncate">
              {line || " "}
            </Text>
          ))
        )}
      </Box>
      
      <Box marginTop={1}>
        <Text dimColor>
          <Text color="cyan">↑/↓</Text> scroll{"  "}
          <Text color="cyan">q</Text> back
        </Text>
      </Box>
    </Box>
  )
}

// Run the app
render(<App />)
