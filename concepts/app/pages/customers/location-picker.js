import {encodeHtml, uiLocale} from '../../core/locale.js'

const t = value => uiLocale.t(value)
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
let leafletPromise

export function validateCoordinatePair(latitude, longitude) {
  const lat = String(latitude ?? '').trim()
  const lng = String(longitude ?? '').trim()
  if (!lat && !lng) return ''
  if (!lat || !lng) return t('Enter both latitude and longitude.')
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(lat) || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(lng) ||
      Number(lat) < -90 || Number(lat) > 90 || Number(lng) < -180 || Number(lng) > 180) {
    return t('Enter valid latitude (-90 to 90) and longitude (-180 to 180).')
  }
  return ''
}

export function renderLocationPicker({latitude = '', longitude = '', prefix, readOnly = false, error = '', fieldAttribute, fieldId = name => `${prefix}-${name}`}) {
  const input = (name, value, label) => `<label class="block min-w-0 text-xs text-muted">${encodeHtml(t(label))}<input id="${fieldId(name)}" class="mt-1 w-full rounded-md border border-line bg-surface p-2 text-ink disabled:bg-[var(--line-2)]" type="text" inputmode="decimal" autocomplete="off" data-location-${name} ${fieldAttribute(name)} value="${encodeHtml(value)}"${name === 'latitude' && error ? ` aria-invalid="true" aria-describedby="${fieldId(name)}-error"` : ''}${readOnly ? ' disabled' : ''}>${name === 'latitude' && error ? `<span id="${fieldId(name)}-error" class="customer-field-error block mt-1! text-xs font-semibold [color:var(--danger)]">${encodeHtml(error)}</span>` : ''}</label>`
  return `<div data-location-picker data-location-read-only="${readOnly}" class="[grid-column:1_/_-1] min-w-0">
    <p class="mb-2! text-xs font-medium text-muted">${encodeHtml(t('Pinpoint location on map'))}</p>
    <div data-location-map class="relative h-56 w-full overflow-hidden rounded-lg border border-line bg-[var(--line-2)]" role="img" aria-label="${encodeHtml(t('Location map'))}"><span data-location-status class="absolute inset-0 grid place-items-center p-3 text-center text-xs text-muted">${encodeHtml(t('Loading map… Coordinates remain available offline.'))}</span></div>
    <div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">${input('latitude', latitude, 'Latitude')}${input('longitude', longitude, 'Longitude')}</div>
    <p class="mt-2! text-xs text-muted">${encodeHtml(t(readOnly ? 'Map location is read-only.' : 'Click the map to place the pin, or enter coordinates.'))} ${encodeHtml(t('OpenStreetMap tiles require internet.'))}</p>
  </div>`
}

function loadLeaflet() {
  if (globalThis.L?.map) return Promise.resolve(globalThis.L)
  if (!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      const css = document.createElement('link')
      css.rel = 'stylesheet'
      css.href = LEAFLET_CSS
      const script = document.createElement('script')
      script.src = LEAFLET_JS
      script.onload = () => globalThis.L?.map ? resolve(globalThis.L) : reject(new Error('Leaflet unavailable'))
      script.onerror = () => reject(new Error('Leaflet unavailable'))
      document.head.append(css, script)
    }).catch(error => { leafletPromise = null; throw error })
  }
  return leafletPromise
}

export function mountLocationPicker(host, onChange = () => {}) {
  const latitude = host.querySelector('[data-location-latitude]')
  const longitude = host.querySelector('[data-location-longitude]')
  const mapElement = host.querySelector('[data-location-map]')
  const status = host.querySelector('[data-location-status]')
  const readOnly = host.dataset.locationReadOnly === 'true'
  let map
  let pin
  let disposed = false
  let syncTimer
  const coordinates = () => validateCoordinatePair(latitude.value, longitude.value) || !latitude.value.trim() ? null : [Number(latitude.value), Number(longitude.value)]
  const selectPoint = latlng => {
    if (disposed || readOnly) return
    latitude.value = latlng.lat.toFixed(6)
    longitude.value = latlng.lng.toFixed(6)
    latitude.dispatchEvent(new Event('input', {bubbles: true}))
    longitude.dispatchEvent(new Event('input', {bubbles: true}))
    onChange(latitude.value, longitude.value)
    sync()
  }
  const sync = () => {
    clearTimeout(syncTimer)
    if (!map || disposed) return
    const point = coordinates()
    if (!point) {
      if (!latitude.value.trim() && !longitude.value.trim()) {
        pin?.remove()
        pin = null
      }
      return
    }
    if (pin) pin.setLatLng(point)
    else {
      pin = globalThis.L.marker(point, {draggable: !readOnly}).addTo(map)
      if (!readOnly) pin.on('dragend', () => selectPoint(pin.getLatLng()))
    }
    map.setView(point, Math.max(map.getZoom(), 13))
  }
  const scheduleSync = () => {
    clearTimeout(syncTimer)
    syncTimer = setTimeout(sync, 300)
  }
  if (!readOnly) for (const control of [latitude, longitude]) {
    control.addEventListener('input', scheduleSync)
    control.addEventListener('change', sync)
  }
  loadLeaflet().then(L => {
    if (disposed || !host.isConnected) return
    map = L.map(mapElement).setView(coordinates() || [26.8206, 30.8025], coordinates() ? 13 : 5)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    status.remove()
    sync()
    if (!readOnly) map.on('click', ({latlng}) => selectPoint(latlng))
    requestAnimationFrame(() => { if (!disposed) map.invalidateSize() })
  }).catch(() => {
    if (!disposed && host.isConnected) status.textContent = t('Map unavailable. Enter coordinates below; they work offline.')
  })
  return () => {
    disposed = true
    clearTimeout(syncTimer)
    for (const control of [latitude, longitude]) {
      control.removeEventListener('input', scheduleSync)
      control.removeEventListener('change', sync)
    }
    map?.remove()
  }
}
