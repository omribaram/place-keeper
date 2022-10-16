'use strict'

const STORAGE_KEY_PLACE = 'placeDB'
const gPlaces = loadFromStorage(STORAGE_KEY_PLACE) || []

function getPlaces() {
  return gPlaces
}

function addPlace({ lat, lng }, name) {
  const place = {
    id: makeId(),
    lat,
    lng,
    name,
    date: Date.now(),
  }
  gPlaces.push(place)
  saveToStorage(STORAGE_KEY_PLACE, gPlaces)
  return place
}

function deletePlace(id) {
  const idx = gPlaces.findIndex((place) => place.id === id)
  gPlaces.splice(idx, 1)
  saveToStorage(STORAGE_KEY_PLACE, gPlaces)
}
