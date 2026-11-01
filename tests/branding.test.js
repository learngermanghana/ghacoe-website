import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

test('GHACOE palette uses proposed red, blue and white colours', () => {
  for (const token of ['--blue:#163e75', '--red:#b42332', '--white:#ffffff']) {
    assert.ok(css.includes(token), `Missing brand token: ${token}`)
  }
  assert.match(css, /\.button\{[^}]*background:var\(--red\)/)
  assert.match(css, /\.next-steps\{[^}]*background:var\(--pale-blue\)/)
  assert.match(css, /\.hero h1 em\{[^}]*color:var\(--red\)/)
  assert.match(html, /<meta name="theme-color" content="#163e75">/)
  assert.match(html, /class="accent-line"/)
  assert.doesNotMatch(css, /--plum|--gold|--lavender|#482641|#321c30/i)
})
test('Primary red and blue maintain readable contrast on white', () => {
  function luminance(hex) {
    const rgb = hex.match(/\w\w/g).map(value => parseInt(value, 16) / 255)
    const corrected = rgb.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    return corrected[0] * 0.2126 + corrected[1] * 0.7152 + corrected[2] * 0.0722
  }
  const white = luminance('ffffff')
  for (const dark of ['163e75', 'b42332']) {
    const contrast = (white + 0.05) / (luminance(dark) + 0.05)
    assert.ok(contrast >= 4.5, `Contrast ${contrast.toFixed(2)} below WCAG AA text threshold for ${dark}`)
  }
})

test('Homepage presents only essential information with clear navigation', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8')
  assert.equal((html.match(/<section\b/g) || []).length, 5)
  for (const id of ['about', 'work', 'gatherings', 'involved', 'contact', 'ideal', 'questions']) {
    assert.ok(html.includes('id="' + id + '"'), 'Missing section or detail: ' + id)
  }
  const primaryNav = html.match(/<nav id="navigation"[^>]*>[\s\S]*?<\/nav>/)?.[0]
  assert.ok(primaryNav, 'Missing primary navigation')
  for (const id of ['about', 'work', 'gatherings', 'contact']) {
    assert.ok(primaryNav.includes('href="#' + id + '"'), 'Missing navigation: ' + id)
  }
  for (const key of ['fellowship', 'skills', 'outreach']) {
    assert.match(html, new RegExp('data-programme="' + key + '"'))
  }
  for (const action of ['volunteer', 'partner', 'donate', 'training', 'support', 'privacy']) {
    assert.match(html, new RegExp('data-open="' + action + '"'))
  }
  assert.match(html, /id="ideal" class="training-details"/)
  assert.match(html, /id="questions" class="compact-faq"/)
  assert.match(html, /id="action-dialog"/)
  assert.match(html, /Website design preview · Content pending ministry approval/)
  assert.doesNotMatch(html, /class="(?:pillars|pathways|ideal-art|gathering-card)"/)
  assert.match(app, /programme.href === '#ideal'/)
})
