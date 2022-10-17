'use strict'

let map,
  marker,
  markers = [],
  infoWindow

function onInit() {
  const user = getUser()
  if (user?.firstName) applyPrefs()
}

function onSavePrefs(ev) {
  ev.preventDefault()
  const { elements } = ev.target
  let startLocation

  if (+elements['start-option'].value >= 1 && +elements['start-option'].value <= 4) {
    if (+elements['start-option'].value !== 1 && !getPlaces()?.length) return _alertMsg('You have no saved locations.')
    startLocation = +elements['start-option'].value
  } else {
    const [lat, lng] = elements['start-location'].value.split(',')
    if ((!lat, !lng)) return _alertMsg('Please enter coordinates seperated by a comma. (XX,XX)')
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return _alertMsg('Please enter valid coordinates - Lat (-90 < 90) and Lng (-180 < 180).')
    startLocation = { lat: +lat, lng: +lng }
  }

  const user = {
    firstName: elements['first-name'].value,
    bgColor: elements['bg-color'].value,
    txtColor: elements['txt-color'].value,
    zoomFactor: +elements['zoom-factor'].value,
    startLocation,
  }

  saveUserPrefs(user)
  applyPrefs(user)
}

function applyPrefs() {
  document.querySelector('.name span').innerText = user.firstName
  document.body.style.backgroundColor = user.bgColor
  document.body.style.color = user.txtColor

  if (window.location.pathname.includes('user-prefs')) {
    document.querySelector('[name="first-name"]').value = user.firstName
    document.querySelector('[name="bg-color"]').value = user.bgColor
    document.querySelector('[name="txt-color"]').value = user.txtColor
    document.querySelector('[name="zoom-factor"]').value = user.zoomFactor
    document.querySelector('.zoom-factor').innerText = user.zoomFactor
    const { startLocation = 1 } = user
    document.querySelector('[name="start-location"]').value =
      typeof startLocation === 'object' ? `${startLocation.lat},${startLocation.lng}` : document.querySelector(`[data-value="${startLocation}"]`)?.value
    document.querySelector('[name="start-option"]').value = startLocation
  }
}

function previewInput({ name, type, value }) {
  if (type === 'color') {
    document.body.style[name === 'bg-color' ? 'background-color' : 'color'] = value
  } else document.querySelector(`.${name}`).innerText = value
}

function initMap() {
  const user = getUser()

  map = new google.maps.Map(document.querySelector('.map-container'), {
    center: typeof user?.startLocation === 'object' ? user?.startLocation : { lat: 29.549, lng: 34.954 },
    zoom: user?.zoomFactor || 16,
    disableDefaultUI: true,
    zoomControl: true,
  })

  renderPlaces()

  if (user?.startLocation === 1) getUserPos()
  else if (user?.startLocation >= 2 && user?.startLocation <= 4) {
    const id = getPosIdByPref(user)
    onPanToPlace(id)
  }

  infoWindow = new google.maps.InfoWindow()
  infoWindow.addListener('closeclick', () => _hideMarker())

  marker = new google.maps.Marker({ map })

  const locationButton = document.createElement('button')
  locationButton.classList.add('my-location')
  locationButton.innerHTML = `<img src="img/my-location.png" />`
  map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(locationButton)

  map.addListener('click', ({ latLng: { lat, lng } }) => {
    const pos = {
      lat: lat(),
      lng: lng(),
    }

    addMarker(pos)
  })

  locationButton.addEventListener('click', getUserPos)
}

function renderPlaces() {
  const places = getPlaces()

  const strHTML = places
    .map(
      ({ id, name, date }) => `<article data-id="${id}" class="place${getUser()?.selectedPlaceId === id ? ' selected' : ''}">
                  <div class="name ${isRTL(name) ? 'rtl' : ''}" onclick="onPanToPlace('${id}')">${name}</div>
                  <div class="date">Saved: ${getDateStr('il', date, 'day', 'month', 'year', 'hour', 'minute')}</div>
                  <button class="close" onclick="onDeletePlace('${id}')">✖</button>
                </article>`
    )
    .join('')

  document.querySelector('.places').innerHTML = strHTML
  renderMarkers()
}

function renderMarkers() {
  const places = getPlaces()

  if (markers.length) _deleteMarkers()

  places.forEach((place) => {
    const marker = new google.maps.Marker({
      position: { lat: place.lat, lng: place.lng },
      map,
      title: place.name,
      id: place.id,
    })
    const contentString = `<h4 ${isRTL(place.name) ? 'class="rtl"' : ''}>${escapeHTML(place.name)}</h4>`
    const tooltip = new google.maps.InfoWindow({ content: contentString })

    marker.addListener('click', () => tooltip.open(map, marker))
    markers.push(marker)
  })

  _setMapOnAllMarkers(map)
}

function addMarker(pos) {
  marker.setOptions({
    position: pos,
    visible: true,
  })
  map.setCenter(pos)

  const contentString = `
            <form onsubmit="onAddPlace(event)" class="add-place">
              <input name="pos" data-lat="${pos.lat}" data-lng="${pos.lng}" type="text" style="display: none"/>
              <input class="place-name" name="name" type="text" maxlength="25" placeholder="Place name" autocomplete="off" required />
              <h4>Do you want to save this location?</h4>
              <button class="save-place">Save</button>
            </form>
            `

  infoWindow.setContent(contentString)
  infoWindow.open(map, marker)
}

function onAddPlace(ev) {
  ev.preventDefault()
  const {
    pos: {
      dataset: { lat, lng },
    },
    name,
  } = ev.target.elements

  if (!name.value.trim()) return
  addPlace({ lat: +lat, lng: +lng }, name.value)
  _hideMarker()
  renderPlaces()
  saveSelectedPlace(markers[markers.length - 1]?.id)
  _renderSelectedPlace(markers[markers.length - 1]?.id)
}

function onDeletePlace(id) {
  const deletedPlace = deletePlace(id)
  renderPlaces()
  saveSelectedPlace(markers[markers.length - 1]?.id)
  _renderSelectedPlace(markers[markers.length - 1]?.id)
}

function onPanToPlace(id) {
  const idx = markers.findIndex((marker) => marker.id === id)
  map.panTo(markers[idx].position)
  google.maps.event.trigger(markers[idx], 'click')
  saveSelectedPlace(id)
  _renderSelectedPlace(id)
}

function getUserPos() {
  if (navigator.geolocation) navigator.geolocation.getCurrentPosition(({ coords: { latitude: lat, longitude: lng } }) => addMarker({ lat, lng }))
}

function getPosIdByPref(user) {
  const places = getPlaces()
  let idx

  if (user.startLocation === 2) idx = 0
  else if (user.startLocation === 3) idx = getRandomInt(0, places.length - 1)
  else if (user.startLocation === 4) idx = places.findIndex((place) => place.id === user.selectedPlaceId)
  return places[idx].id
}

function onExportToCSV() {
  let csvContent = ''

  const places = getPlaces().reduce((acc, place, idx) => {
    idx ? acc.push(Object.values(place)) : acc.push(Object.keys(place), Object.values(place))
    return acc
  }, [])
  if (!places.length) return _alertMsg('You have no saved locations.')
  places.forEach((place) => (csvContent += place.join(',') + '\n'))

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'File.csv'
  link.click()
}

function _hideMarker() {
  marker.setVisible(false)
  infoWindow.close()
}

function _setMapOnAllMarkers(map) {
  for (let i = 0; i < markers.length; i++) {
    markers[i].setMap(map)
  }
}

function _deleteMarkers() {
  _clearMarkers()
  markers = []
}

function _clearMarkers() {
  _setMapOnAllMarkers(null)
}

function _alertMsg(msg) {
  const elModalContainer = document.querySelector('.modal-container')
  const uniqueClass = `modal_${makeId()}`
  const strHTML = ` <div class="${uniqueClass}">
                      <div class="msg">${msg}</div>
                    </div>`
  elModalContainer.insertAdjacentHTML('beforeend', strHTML)
  if (elModalContainer.children.length > 1) {
    document.styleSheets[0].insertRule(`.modal-container .${uniqueClass}.shown { transform: translateY(calc(${elModalContainer.children.length - 1} * -65px)) translateX(-50%) }`)
  }
  const elModal = document.querySelector(`.${uniqueClass}`)
  requestAnimationFrame(() => elModal.classList.add('shown'))
  setTimeout(() => {
    elModal.ontransitionend = elModal.remove
    elModal.classList.remove('shown')
  }, 3000)
}

function _renderSelectedPlace(id) {
  const elms = document.querySelectorAll('.place')
  elms.forEach((el) => el.classList.toggle('selected', el.dataset.id === id))
}
