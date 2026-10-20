const menu = document.querySelector('.menu-toggle')
const navigation = document.querySelector('#navigation')
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true'
  menu.setAttribute('aria-expanded', String(open))
  navigation.classList.toggle('is-open', open)
})
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menu.setAttribute('aria-expanded', 'false')
  navigation.classList.remove('is-open')
}))
document.querySelector('#year').textContent = new Date().getFullYear()
const dialog = document.querySelector('#action-dialog')
const title = document.querySelector('#dialog-title')
const description = document.querySelector('#dialog-description')
const body = document.querySelector('#dialog-body')
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close())
dialog.addEventListener('click', event => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close() } })
let actionVersion = 0
dialog.addEventListener('close', () => { actionVersion += 1 })
const config = fetch('/api/site-config', { signal: AbortSignal.timeout(5000) }).then(response => response.ok ? response.json() : {}).catch(() => ({}))
const details = {
  volunteer: ['Become a volunteer', 'Share your interests, skills and availability with the ministry.'],
  support: ['Request support', 'Tell the ministry what kind of support you are seeking. Please do not include sensitive medical or financial documents.'],
  training: ['Enquire about training', 'Tell us which practical skill you would like to learn.'],
  partner: ['Partner with the ministry', 'Explore how your organization or community can support GHACOE’s work.'],
  donate: ['Support our work', 'Help create opportunities for spiritual growth, practical learning and community care.'],
  privacy: ['Your information', 'We ask only for information needed to respond to your enquiry.'],
}
const facebook = '<a href="https://www.facebook.com/ghacoewomenministry/" target="_blank" rel="noopener noreferrer">Contact the ministry on Facebook ↗</a>'
function unavailable(message) {
  body.innerHTML = '<div class="notice"></div>'
  body.firstChild.append(document.createTextNode(message + ' '))
  body.firstChild.insertAdjacentHTML('beforeend', facebook)
}
async function openAction(kind, prefill = '') {
  const version = ++actionVersion
  if (!details[kind]) return
  title.textContent = details[kind][0]
  description.textContent = details[kind][1]
  body.textContent = 'Loading…'
  if (!dialog.open) dialog.showModal()
  const settings = await config
  if (version !== actionVersion || !dialog.open) return
  if (kind === 'privacy') {
    body.innerHTML = '<div class="notice">Forms are available only after the ministry’s connection is enabled. Connected applications are sent to GHACOE’s Sedifex workspace for review and follow-up. Contact details, enquiry details and your consent are included. Donations continue to Paystack for payment; this website does not collect card details. Do not send emergency requests or sensitive documents through these forms. To ask about access, correction or deletion, contact the ministry through its published contact channel.</div>'
    return
  }
  if (kind === 'partner') return unavailable('Partnership enquiries are currently handled directly by the ministry.')
  const endpoint = kind === 'donate' ? 'donations' : kind === 'volunteer' ? 'volunteer' : 'support'
  const connected = Boolean(settings[endpoint])
  body.innerHTML = '<form class="form"><fieldset><label>Full name<input name="name" maxlength="140" autocomplete="name" required></label><label>Email<input name="email" type="email" maxlength="180" autocomplete="email" ' + (kind === 'donate' ? 'required' : '') + '></label><label>Phone<input name="phone" type="tel" maxlength="25" autocomplete="tel"></label>' +
    (kind === 'donate' ? '<label>Donation amount (GHS)<input name="amount" type="number" min="1" max="100000" step="0.01" required></label><p class="muted">Any applicable fees are shown by the payment provider before you pay.</p>' :
    kind === 'volunteer' ? '<label>Skills or interests<input name="skill" maxlength="180"></label><label>Availability<input name="availability" placeholder="For example: weekends" maxlength="180"></label>' :
    '<label>' + (kind === 'training' ? 'Training you are interested in' : 'Type of support') + '<input name="supportType" maxlength="160" required></label>') +
    '<label>Message<textarea name="message" maxlength="1000" rows="3"></textarea></label><label class="trap" aria-hidden="true">Leave empty<input name="website" tabindex="-1" autocomplete="off"></label><label class="check"><input name="consent" type="checkbox" required><span>I agree that GHACOE may use these details to process this request and contact me about it.</span></label><button class="button" type="submit">' + (kind === 'donate' ? 'Continue to Secure Payment ↗' : 'Send to the Ministry →') + '</button></fieldset><p class="form-status" role="status" aria-live="polite"></p></form>'
  const form = body.querySelector('form')
  if (!connected) {
    const notice = document.createElement('p')
    notice.className = 'preview-notice'
    notice.textContent = kind === 'donate'
      ? 'Giving preview — online donations are not open yet. No payment can be made here.'
      : 'Application preview — submissions are not open yet. These fields do not accept or save information.'
    form.before(notice)
    form.querySelector('fieldset').disabled = true
    form.querySelector('[type=submit]').textContent = kind === 'donate' ? 'Online giving opens soon' : 'Applications open soon'
    const contactLink = document.createElement('div')
    contactLink.className = 'notice'
    contactLink.innerHTML = facebook
    form.after(contactLink)
  }
  if (prefill && form.elements.supportType) form.elements.supportType.value = prefill
  if (kind === 'donate') {
    const choices = document.createElement('div')
    choices.className = 'amount-options'
    choices.setAttribute('aria-label', 'Suggested donation amounts in Ghana cedis')
    for (const amount of [50, 100, 200]) {
      const choice = document.createElement('button')
      choice.type = 'button'
      choice.textContent = 'GHS ' + amount
      choice.setAttribute('aria-pressed', 'false')
      choice.addEventListener('click', () => {
        form.elements.amount.value = amount
        choices.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button === choice)))
      })
      choices.append(choice)
    }
    form.elements.amount.parentElement.before(choices)
    form.elements.amount.addEventListener('input', () => {
      choices.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(Number(form.elements.amount.value) === Number(button.textContent.replace('GHS ', '')))))
    })
  }
  form.addEventListener('submit', async event => {
    event.preventDefault()
    if (!connected) return
    const status = form.querySelector('.form-status')
    const submit = form.querySelector('[type=submit]')
    const values = Object.fromEntries(new FormData(form))
    if (!values.email && !values.phone) { status.textContent = 'Please enter an email address or phone number.'; return }
    values.consent = form.elements.consent.checked
    if (kind === 'training') values.supportType = 'Training enquiry: ' + values.supportType
    values.needSummary = values.message
    values.notes = values.message
    submit.disabled = true
    status.textContent = kind === 'donate' ? 'Opening secure checkout…' : 'Sending your request…'
    try {
      const response = await fetch('/api/' + (kind === 'donate' ? 'donations' : 'applications'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, type: endpoint }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to send. Please try again.')
      if (kind === 'donate') {
        const checkout = new URL(data.authorizationUrl)
        if (checkout.protocol !== 'https:' || checkout.hostname !== 'checkout.paystack.com') throw new Error('The payment link could not be validated.')
        window.location.assign(checkout.href)
      } else {
        form.reset()
        status.textContent = 'Your request has been received. The ministry will review it and follow up.'
      }
    } catch (error) {
      status.textContent = error.message || 'Unable to send. Please try again.'
    } finally { submit.disabled = false }
  })
}
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => openAction(button.dataset.open)))
const params = new URLSearchParams(window.location.search)
if (params.get('donation') === 'return' && (params.get('reference') || params.get('trxref'))) {
  title.textContent = 'Checking your donation'
  description.textContent = 'Please wait while we verify the payment with the provider.'
  body.textContent = ''
  dialog.showModal()
  fetch('/api/donations', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'verify', reference: params.get('reference') || params.get('trxref') }),
  }).then(async response => {
    if (!response.ok) throw new Error()
    title.textContent = 'Thank you for your support'
    description.textContent = 'Your donation has been verified successfully.'
  }).catch(() => {
    title.textContent = 'Payment verification pending'
    description.textContent = 'We could not confirm the payment yet. Please keep your payment reference and contact the ministry before attempting another payment.'
  })
}

const programmeDetails = {
  fellowship: {
    title: 'Faith & Fellowship',
    intro: 'Space to grow in faith and walk alongside one another.',
    copy: 'Spiritual growth is at the heart of the ministry. Christian fellowship, conferences and sharing forums give women opportunities to worship, learn and connect.',
    points: ['Spiritual growth and Christian fellowship', 'Conferences and sharing forums', 'A shared commitment to service'],
    action: 'See gatherings', href: '#gatherings',
  },
  skills: {
    title: 'Skills for Independence',
    intro: 'Practical learning. New possibilities.',
    copy: 'The Ideal Womanhood Project brings together entrepreneurial skills and personal development. Explore a training area, then ask the ministry about current opportunities and arrangements.',
    points: ['Soap making, batik and tie-dye, and bead making', 'Catering, fashion and cosmetology', 'Enquire about availability, location and participation details'],
    action: 'Explore training areas', href: '#ideal',
  },
  outreach: {
    title: 'Care & Outreach',
    intro: 'A wider circle of support.',
    copy: 'The ministry’s outreach supports the holistic development of women, young people and vulnerable groups. Its work includes community engagement, partnerships and social advocacy.',
    points: ['Women, young people and vulnerable communities', 'Support through outreach and partnerships', 'Community and social awareness'],
    action: 'Explore ways to get involved', href: '#involved',
  },
}
document.querySelectorAll('[data-programme]').forEach(button => button.addEventListener('click', () => {
  actionVersion += 1
  const programme = programmeDetails[button.dataset.programme]
  title.textContent = programme.title
  description.textContent = programme.intro
  body.replaceChildren()
  const copy = document.createElement('p')
  copy.className = 'programme-dialog-copy'
  copy.textContent = programme.copy
  const list = document.createElement('ul')
  list.className = 'programme-dialog-list'
  programme.points.forEach(point => {
    const item = document.createElement('li')
    item.textContent = point
    list.append(item)
  })
  const action = document.createElement('a')
  action.className = 'button'
  action.href = programme.href
  action.textContent = programme.action + ' →'
  action.addEventListener('click', () => dialog.close())
  body.append(copy, list, action)
  if (!dialog.open) dialog.showModal()
}))
document.querySelectorAll('[data-skill]').forEach(button => button.addEventListener('click', () => openAction('training', button.dataset.skill)))
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    menu.setAttribute('aria-expanded', 'false')
    navigation.classList.remove('is-open')
  }
})
if ('IntersectionObserver' in window) {
  const links = [...navigation.querySelectorAll('a[href^="#"]')]
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
    if (!visible) return
    links.forEach(link => {
      if (link.hash === '#' + visible.target.id) link.setAttribute('aria-current', 'location')
      else link.removeAttribute('aria-current')
    })
  }, { rootMargin: '-15% 0px -45% 0px', threshold: [0, 0.2, 0.5] })
  links.forEach(link => { const section = document.querySelector(link.hash); if (section) observer.observe(section) })
}
