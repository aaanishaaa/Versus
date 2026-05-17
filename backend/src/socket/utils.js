import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const find_match = (queue) => {
  if (!Array.isArray(queue) || queue.length < 2) {
    return null;
  }

  const now = Date.now();
  let bestPair = null;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (let i = 0; i < queue.length - 1; i += 1) {
    for (let j = i + 1; j < queue.length; j += 1) {
      const player1 = queue[i];
      const player2 = queue[j];
      const ratingDiff = Math.abs(player1.rating - player2.rating);

      const waitedLongEnough =
        now - player1.joinedAt >= 30000 || now - player2.joinedAt >= 30000;
      const threshold = waitedLongEnough ? 500 : 200;

      if (ratingDiff <= threshold && ratingDiff < bestDiff) {
        bestDiff = ratingDiff;
        bestPair = [player1, player2];
      }
    }
  }

  return bestPair;
};

const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'http://localhost:2000/api/v2/execute'
const LOCAL_EXECUTION_TIMEOUT_MS = 10000

const buildExecutionResult = ({ stdout = '', stderr = '', signal = null, statusDescription = 'Accepted', statusId = 3 }) => {
  const normalizedOutput = stdout || stderr || ''

  return {
    run: {
      stdout,
      stderr,
      output: normalizedOutput,
      signal,
      status: {
        description: statusDescription,
        id: statusId,
      },
    },
  }
}

const runProcess = (command, args, { cwd, input, timeoutMs }) => {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })

    let stdout = ''
    let stderr = ''
    let settled = false

    const settle = (payload) => {
      if (settled) {
        return
      }

      settled = true
      resolve(payload)
    }

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      settle({
        code: null,
        signal: 'SIGKILL',
        stdout,
        stderr: `${stderr}${stderr ? '\n' : ''}timed out`,
        timedOut: true,
      })
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      clearTimeout(timer)
      settle({ error, stdout, stderr })
    })

    child.on('close', (code, signal) => {
      clearTimeout(timer)
      settle({ code, signal, stdout, stderr })
    })

    if (input) {
      child.stdin.write(input)
    }

    child.stdin.end()
  })
}

const runCommandCandidates = async (candidates, argsFactory, options) => {
  let lastError = null

  for (const candidate of candidates) {
    const result = await runProcess(candidate.command, argsFactory(candidate), options)

    if (result.error && result.error.code === 'ENOENT') {
      lastError = result.error
      continue
    }

    return result
  }

  if (lastError) {
    throw lastError
  }

  return null
}

const runLocalPython = async (code, stdin) => {
  const tempDir = await mkdtemp(join(tmpdir(), 'versus-python-'))
  const scriptPath = join(tempDir, 'main.py')

  try {
    await writeFile(scriptPath, code, 'utf8')

    const result = await runCommandCandidates(
      [
        { command: 'py' },
        { command: 'python' },
        { command: 'python3' },
      ],
      (candidate) => (candidate.command === 'py' ? ['-3', scriptPath] : [scriptPath]),
      { cwd: tempDir, input: stdin, timeoutMs: LOCAL_EXECUTION_TIMEOUT_MS }
    )

    if (!result) {
      return null
    }

    if (result.timedOut) {
      return buildExecutionResult({
        stdout: result.stdout,
        stderr: result.stderr,
        signal: 'SIGKILL',
        statusDescription: 'Time Limit Exceeded',
        statusId: 5,
      })
    }

    if (result.error) {
      return buildExecutionResult({
        stderr: String(result.error.message || result.error),
        statusDescription: 'Runtime Error',
        statusId: 6,
      })
    }

    if (result.code !== 0) {
      return buildExecutionResult({
        stdout: result.stdout,
        stderr: result.stderr,
        statusDescription: 'Runtime Error',
        statusId: 6,
      })
    }

    return buildExecutionResult({
      stdout: result.stdout,
      stderr: result.stderr,
      statusDescription: 'Accepted',
      statusId: 3,
    })
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

const runLocalJavascript = async (code, stdin) => {
  const tempDir = await mkdtemp(join(tmpdir(), 'versus-node-'))
  const scriptPath = join(tempDir, 'main.js')

  try {
    await writeFile(scriptPath, code, 'utf8')

    const result = await runProcess('node', [scriptPath], {
      cwd: tempDir,
      input: stdin,
      timeoutMs: LOCAL_EXECUTION_TIMEOUT_MS,
    })

    if (result.timedOut) {
      return buildExecutionResult({
        stdout: result.stdout,
        stderr: result.stderr,
        signal: 'SIGKILL',
        statusDescription: 'Time Limit Exceeded',
        statusId: 5,
      })
    }

    if (result.error) {
      return buildExecutionResult({
        stderr: String(result.error.message || result.error),
        statusDescription: 'Runtime Error',
        statusId: 6,
      })
    }

    if (result.code !== 0) {
      return buildExecutionResult({
        stdout: result.stdout,
        stderr: result.stderr,
        statusDescription: 'Runtime Error',
        statusId: 6,
      })
    }

    return buildExecutionResult({
      stdout: result.stdout,
      stderr: result.stderr,
      statusDescription: 'Accepted',
      statusId: 3,
    })
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

const runLocalCpp = async (code, stdin) => {
  const tempDir = await mkdtemp(join(tmpdir(), 'versus-cpp-'))
  const sourcePath = join(tempDir, 'main.cpp')
  const binaryPath = join(tempDir, process.platform === 'win32' ? 'main.exe' : 'main')

  try {
    await writeFile(sourcePath, code, 'utf8')

    const compileResult = await runCommandCandidates(
      [
        { command: 'g++' },
        { command: 'c++' },
      ],
      () => [sourcePath, '-std=c++17', '-O2', '-o', binaryPath],
      { cwd: tempDir, input: '', timeoutMs: LOCAL_EXECUTION_TIMEOUT_MS }
    )

    if (!compileResult) {
      return null
    }

    if (compileResult.timedOut) {
      return buildExecutionResult({
        stdout: compileResult.stdout,
        stderr: compileResult.stderr,
        signal: 'SIGKILL',
        statusDescription: 'Time Limit Exceeded',
        statusId: 5,
      })
    }

    if (compileResult.error) {
      return buildExecutionResult({
        stderr: String(compileResult.error.message || compileResult.error),
        statusDescription: 'Compile Error',
        statusId: 6,
      })
    }

    if (compileResult.code !== 0) {
      return buildExecutionResult({
        stdout: compileResult.stdout,
        stderr: compileResult.stderr,
        statusDescription: 'Compile Error',
        statusId: 6,
      })
    }

    const runResult = await runProcess(binaryPath, [], {
      cwd: tempDir,
      input: stdin,
      timeoutMs: LOCAL_EXECUTION_TIMEOUT_MS,
    })

    if (runResult.timedOut) {
      return buildExecutionResult({
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        signal: 'SIGKILL',
        statusDescription: 'Time Limit Exceeded',
        statusId: 5,
      })
    }

    if (runResult.error) {
      return buildExecutionResult({
        stderr: String(runResult.error.message || runResult.error),
        statusDescription: 'Runtime Error',
        statusId: 6,
      })
    }

    if (runResult.code !== 0) {
      return buildExecutionResult({
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        statusDescription: 'Runtime Error',
        statusId: 6,
      })
    }

    return buildExecutionResult({
      stdout: runResult.stdout,
      stderr: runResult.stderr,
      statusDescription: 'Accepted',
      statusId: 3,
    })
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

export const executeCode = async (language, version, code, stdin) => {
  try {
    const res = await fetch(JUDGE0_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language,
        version,
        files: [{ content: code }],
        stdin,
        run_timeout: LOCAL_EXECUTION_TIMEOUT_MS,
      }),
    })

    if (res.ok) {
      return res.json()
    }
  } catch (_error) {
    // Fall back to local execution when the remote judge is unavailable.
  }

  if (language === 'python') {
    return runLocalPython(code, stdin)
  }

  if (language === 'javascript') {
    return runLocalJavascript(code, stdin)
  }

  if (language === 'c++') {
    return runLocalCpp(code, stdin)
  }

  throw new Error(`Unsupported language: ${language}`)
};

export const calculateELO = (winnerRating, loserRating, K = 32) => {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 - expectedWinner;
  return {
    newWinnerRating: Math.round(winnerRating + K * (1 - expectedWinner)),
    newLoserRating: Math.round(loserRating + K * (0 - expectedLoser)),
    winnerDelta: Math.round(K * (1 - expectedWinner)),
    loserDelta: Math.round(K * (0 - expectedLoser)),
  };
};

export const getLeague = (rating) => {
  if (rating >= 2000) return 'Diamond';
  if (rating >= 1700) return 'Platinum';
  if (rating >= 1400) return 'Gold';
  if (rating >= 1200) return 'Silver';
  return 'Bronze';
};
