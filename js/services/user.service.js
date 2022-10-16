'use strict'

const STORAGE_KEY_USER = 'userData'

let gUser = loadFromStorage(STORAGE_KEY_USER) || {}

function getUser() {
  return gUser
}

function saveUserPrefs(user) {
  gUser = { ...gUser, ...user }
  saveToStorage(STORAGE_KEY_USER, gUser)
}

function saveSelectedPlace(id) {
  gUser.selectedPlaceId = id
  saveToStorage(STORAGE_KEY_USER, gUser)
}
