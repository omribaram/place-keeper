'use strict'

function loadFromStorage(key) {
  const json = localStorage.getItem(key)
  return JSON.parse(json)
}

function saveToStorage(key, data) {
  const json = JSON.stringify(data)
  localStorage.setItem(key, json)
}
