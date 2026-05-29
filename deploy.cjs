const { execSync, spawnSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts })

const distDir = path.resolve(__dirname, 'dist')
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-pages-'))

try {
  const remote = execSync('git remote get-url origin').toString().trim()

  // Check if gh-pages branch exists on remote
  const result = spawnSync('git', ['ls-remote', '--heads', remote, 'gh-pages'], { encoding: 'utf8' })
  const branchExists = result.stdout && result.stdout.trim().length > 0

  if (branchExists) {
    run(`git clone --depth 1 --branch gh-pages "${remote}" "${tmpDir}"`)
    run(`git -C "${tmpDir}" rm -rf .`, { stdio: 'pipe' })
  } else {
    // Init a fresh repo and create an orphan gh-pages branch
    run(`git -C "${tmpDir}" init`)
    run(`git -C "${tmpDir}" checkout --orphan gh-pages`)
    run(`git -C "${tmpDir}" remote add origin "${remote}"`)
  }

  // Copy dist contents into the working tree
  fs.cpSync(distDir, tmpDir, { recursive: true })
  // Ensure .nojekyll so GitHub Pages serves all files
  fs.writeFileSync(path.join(tmpDir, '.nojekyll'), '')

  run(`git -C "${tmpDir}" add -A`)
  try {
    run(`git -C "${tmpDir}" commit -m "deploy"`)
  } catch {
    console.log('Nothing to commit, already up to date.')
    process.exit(0)
  }

  if (branchExists) {
    run(`git -C "${tmpDir}" push origin gh-pages`)
  } else {
    run(`git -C "${tmpDir}" push -u origin gh-pages`)
  }

  console.log('Deployed successfully.')
} catch (err) {
  console.error(err.message)
  process.exit(1)
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true })
}
