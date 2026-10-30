import { mkdir, copyFile, rm } from 'node:fs/promises'
await rm('dist', { recursive: true, force: true })
await mkdir('dist', { recursive: true })
for (const file of ['index.html', 'styles.css', 'app.js', '_headers', '_routes.json']) {
  await copyFile(file, 'dist/' + file)
}
console.log('Static website built in dist/ with Cloudflare Pages routes and headers')
