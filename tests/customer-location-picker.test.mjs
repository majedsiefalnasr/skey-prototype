import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mountLocationPicker} from '../concepts/app/pages/customers/location-picker.js'

function fixture({latitude = '', longitude = '', readOnly = false, connected = true} = {}) {
  const previous = {L: globalThis.L, requestAnimationFrame: globalThis.requestAnimationFrame}
  const lat = Object.assign(new EventTarget(), {value: latitude})
  const lng = Object.assign(new EventTarget(), {value: longitude})
  const status = {remove() {}, textContent: ''}
  const map = {events: {}, pans: [], removed: false, zoom: 5, getZoom() { return this.zoom }, setView(point, zoom) { this.initial ||= {point, zoom}; this.zoom = zoom; this.pans.push(point); return this }, on(name, handler) { this.events[name] = handler; return this }, panTo(point) { this.pans.push(point) }, invalidateSize() {}, remove() { this.removed = true }}
  const pins = []
  const L = {map() { return map }, tileLayer() { return {addTo() {}} }, marker(point, options) {
    const pin = {point, options, events: {}, remove() { this.removed = true }, addTo() { return this }, on(name, handler) { this.events[name] = handler; return this }, setLatLng(point) { this.point = point; return this }, getLatLng() { return {lat: this.point[0], lng: this.point[1]} }}
    pins.push(pin)
    return pin
  }}
  globalThis.L = L
  globalThis.requestAnimationFrame = callback => callback()
  const controls = {'[data-location-latitude]': lat, '[data-location-longitude]': lng, '[data-location-map]': {}, '[data-location-status]': status}
  const host = {dataset: {locationReadOnly: String(readOnly)}, isConnected: connected, querySelector: selector => controls[selector]}
  return {host, map, pins, lat, lng, restore() { globalThis.L = previous.L; globalThis.requestAnimationFrame = previous.requestAnimationFrame }}
}
const ready = () => Promise.resolve()
const input = control => control.dispatchEvent(new Event('input', {bubbles: true}))

test('manual complete valid pairs move the same pin; incomplete/invalid input preserves it', async () => {
  const f = fixture({latitude: '30', longitude: '31'})
  try {
    const unmount = mountLocationPicker(f.host)
    await ready()
    assert.deepEqual(f.map.initial, {point: [30, 31], zoom: 13})
    assert.equal(f.pins.length, 1)
    f.lat.value = ''; input(f.lat)
    f.lat.value = '91'; input(f.lat)
    f.lat.value = '-'; input(f.lat)
    assert.deepEqual(f.pins[0].point, [30, 31])
    assert.equal(f.map.pans.length, 2)
    f.lat.value = '0'; f.lng.value = '-180'; input(f.lng)
    assert.deepEqual(f.pins[0].point, [30, 31])
    await new Promise(resolve => setTimeout(resolve, 330))
    assert.deepEqual(f.pins[0].point, [0, -180])
    assert.equal(f.pins.length, 1)
    assert.deepEqual(f.map.pans.at(-1), [0, -180])
    f.lat.value = ''; f.lng.value = '  '
    f.lng.dispatchEvent(new Event('change'))
    assert.equal(f.pins[0].removed, true)
    assert.deepEqual(f.map.pans.at(-1), [0, -180])
    unmount()
    const count = f.map.pans.length
    f.lat.value = '10'; input(f.lat)
    assert.equal(f.map.pans.length, count)
    assert.equal(f.map.removed, true)
  } finally { f.restore() }
})

test('map clicks and pin drag update both fields and dispatch persistence events', async () => {
  const f = fixture()
  const changes = []
  try {
    const unmount = mountLocationPicker(f.host, (...pair) => changes.push(pair))
    await ready()
    assert.equal(f.pins.length, 0)
    const seen = []
    f.lat.addEventListener('input', () => seen.push([f.lat.value, f.lng.value]))
    f.map.events.click({latlng: {lat: 30.04442, lng: 31.235712}})
    assert.deepEqual(seen, [['30.044420', '31.235712']])
    assert.equal(f.pins[0].options.draggable, true)
    assert.equal(f.map.zoom, 13)
    f.map.zoom = 17
    f.lat.value = '30.1'; input(f.lat)
    f.lat.dispatchEvent(new Event('change'))
    assert.deepEqual(f.pins[0].point, [30.1, 31.235712])
    assert.equal(f.map.zoom, 17)
    f.pins[0].point = [29.5, 32.5]
    f.pins[0].events.dragend()
    assert.deepEqual(changes.at(-1), ['29.500000', '32.500000'])
    assert.deepEqual([f.lat.value, f.lng.value], changes.at(-1))
    assert.equal(f.pins.length, 1)
    unmount()
  } finally { f.restore() }
})

test('read-only saved locations are visible but cannot change via map or synthetic inputs', async () => {
  const f = fixture({latitude: '30', longitude: '31', readOnly: true})
  try {
    const unmount = mountLocationPicker(f.host)
    await ready()
    assert.equal(f.pins[0].options.draggable, false)
    assert.equal(f.map.events.click, undefined)
    f.lat.value = '10'; input(f.lat)
    assert.deepEqual(f.pins[0].point, [30, 31])
    unmount()
  } finally { f.restore() }
})

test('unmount before Leaflet resolves does not create a map', async () => {
  const f = fixture()
  try {
    mountLocationPicker(f.host)()
    await ready()
    assert.equal(f.map.initial, undefined)
  } finally { f.restore() }
})
