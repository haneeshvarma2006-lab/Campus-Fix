/**
 * Collects the reasons the app cannot serve requests properly.
 *
 * Nothing in here throws. A misconfigured deployment must still boot far enough
 * to answer /api/health and say what is wrong — throwing during module load
 * takes the whole serverless function down and leaves nothing to diagnose.
 */

const checks = []

/** Registers a function returning a problem string, or null when healthy. */
export function registerCheck(fn) {
  checks.push(fn)
}

let startupProblem = null

/** Recorded by the serverless entry point when migration fails. */
export function setStartupProblem(message) {
  startupProblem = message || null
}

export function configProblems() {
  const problems = []
  if (startupProblem) problems.push(startupProblem)

  for (const check of checks) {
    try {
      const problem = check()
      if (problem) problems.push(problem)
    } catch (err) {
      problems.push(`Health check failed: ${err.message}`)
    }
  }
  return problems
}
