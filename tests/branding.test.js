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

test('Homepage stays short and directs visitors to dedicated pages', () => {
  assert.equal((html.match(/<section\\b/g) || []).length, 4)
  assert.match(html, /Growing in faith/)
  assert.match(html, /Faith & Fellowship/)
  assert.match(html, /Skills & Empowerment/)
  assert.match(html, /Care & Outreach/)
  assert.match(html, /href="\/programmes\/#empowerment"/)
  assert.match(html, /href="\/contact\/#involved"/)
  assert.doesNotMatch(html, /class="(?:pillars|pathways|ideal-art|gathering-card)"/)
})

test('All five pages have accessible navigation and shared action dialogs', () => {
  const pages = {
    '/': html,
    '/about/': readFileSync(new URL('../about/index.html', import.meta.url), 'utf8'),
    '/programmes/': readFileSync(new URL('../programmes/index.html', import.meta.url), 'utf8'),
    '/events/': readFileSync(new URL('../events/index.html', import.meta.url), 'utf8'),
    '/contact/': readFileSync(new URL('../contact/index.html', import.meta.url), 'utf8'),
  }
  for (const [path, page] of Object.entries(pages)) {
    assert.match(page, /<main id="main">/, 'Missing main content: ' + path)
    assert.match(page, /class="skip" href="#main"/, 'Missing skip link: ' + path)
    assert.match(page, /id="navigation"/, 'Missing navigation: ' + path)
    assert.match(page, /id="action-dialog"/, 'Missing action dialog: ' + path)
    assert.match(page, /src="\/app\.js"/, 'Missing JS: ' + path)
    assert.match(page, /href="\/styles\.css"/, 'Missing stylesheet: ' + path)
    assert.match(page, /data-open="donate"/, 'Missing donation action: ' + path)
    assert.match(page, /data-open="privacy"/, 'Missing privacy action: ' + path)
    assert.match(page, /Content pending ministry approval/, 'Missing prelaunch notice: ' + path)
    for (const url of Object.keys(pages)) {
      assert.ok(page.includes('href="' + url + '"'), path + ' missing nav link ' + url)
    }
    assert.equal((page.match(/aria-current="page"/g) || []).length, 1, 'Active navigation state: ' + path)
  }
  assert.match(pages['/programmes/'], /id="ideal"/)
  assert.match(pages['/programmes/'], /data-skill="Soap making"/)
  assert.match(pages['/contact/'], /data-open="volunteer"/)
  assert.match(pages['/contact/'], /data-open="training"/)
  assert.match(pages['/contact/'], /data-open="partner"/)
  assert.match(pages['/contact/'], /data-open="support"/)
  assert.match(pages['/events/'], /Dates to be announced/)
  assert.doesNotMatch(pages['/events/'], /[0-9]{1,2} November 2026/)
})

test('Build copies each page and form config is fetched only when needed', () => {
  const build = readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8')
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8')
  for (const page of ['about', 'programmes', 'events', 'contact']) {
    assert.ok(build.includes("'"+page+"'"), 'Build missing ' + page)
  }
  assert.match(build, /dist\/.*index\.html/)
  assert.match(app, /const settings = await getConfig\(\)/)
  assert.match(app, /action: 'See gatherings', href: '\/events\/'/)
  assert.match(app, /action: 'Explore ways to get involved', href: '\/contact\/#involved'/)
})
