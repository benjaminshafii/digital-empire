/**
 * @cool-website/job-runner core
 */

// Types
export type {
  Search,
  Job,
  QueueState,
  JobResult,
  CreateSearchOptions,
  RunJobOptions,
} from "./types";

// Paths - configuration
export {
  setDataDir,
  getDataDir,
  getSearchesDir,
  getSearchDir,
  getSearchPromptPath,
  getJobDir,
  getJobLogPath,
  getJobReportPath,
  findOpencodeBinary,
  findProjectRoot,
  ensureDir,
  ensureDataDirs,
} from "./paths";

// Search store
export {
  slugify,
  createSearch,
  getSearch,
  listSearches,
  updateSearch,
  deleteSearch,
  searchExists,
  getPrompt,
  updatePrompt,
} from "./search-store";

// Job store
export {
  createJob,
  getJob,
  updateJob,
  listJobsForSearch,
  listAllJobs,
  getJobLog,
  getJobReport,
  saveJobReport,
  deleteJob,
  getLatestJob,
  getQueueState,
  addToQueue,
  removeFromQueue,
  setCurrentJob,
  clearQueue,
} from "./job-store";

// Job runner
export {
  isTmuxAvailable,
  getTmuxSessionName,
  tmuxSessionExists,
  listTmuxSessions,
  getAttachCommand,
  startJob,
  attachToJob,
  cancelJob,
  getRunningJob,
} from "./job-runner";
