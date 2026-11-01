import { mkdir, copyFile, rm } from 'node:fs/promises'
await rm('dist', { recursive: true, force: true })
await mkdir('dist', { recursive: true })
for (const file of ['index.html', 'styles.css', 'app.js', '_headers', '_routes.json']) {
  await copyFile(file, 'dist/' + file)
}
for (const page of ['about', 'programmes', 'events', 'contact']) {
  await mkdir('dist/' + page, { recursive: true })
  await copyFile(page + '/index.html', 'dist/' + page + '/index.html')
}
console.log('Built GHACOE home and four pages in dist/, with Cloudflare Pages routes and headers')
