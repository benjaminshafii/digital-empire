/**
 * marketplace-tracker core
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

// Paths
export {
  CONFIG_DIR,
  SEARCHES_DIR,
  getSearchDir,
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
