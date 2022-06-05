// Config
const defaultLoc = [52.4560, -1.5270];  // [lat, lon]
const defaultZoom = 7;  // 0-18

// Create Map
const map = L.map('rail-map', {
  center: defaultLoc,
  zoom: defaultZoom,
});
map.setMaxBounds([[90, -200], [-90, 200]]);

// Add Layers
const streetmap = new L.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>',
  minZoom: 2,
  maxZoom: 19,
  tileSize: 256,
}).addTo(map);

const openrailwaymap = new L.TileLayer('http://{s}.tiles.openrailwaymap.org/signals/{z}/{x}/{y}.png', {
  attribution: '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>, Style: <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA 2.0</a> <a href="http://www.openrailwaymap.org/">OpenRailwayMap</a> and OpenStreetMap',
  minZoom: 2,
  maxZoom: 19,
  tileSize: 256,
}).addTo(map);

streetmap.getContainer().classList.add('streetmap-container');
openrailwaymap.getContainer().classList.add('railmap-container');

// Events
map.on('moveend', onMapMove);

function onMapMove(e) {
    let lat = map.getCenter()["lat"];
    let lon = map.getCenter()["lng"];
    console.log(lat, lon);
}

