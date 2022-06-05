// Config
const defaultLoc = [52.4560, -1.5270];  // [lat, lon]
const defaultZoom = 7;  // 0-18
const MODES = {
  view: "view",
  draw: "draw",
  erase: "erase",
};

const HIGHLIGHT_SETTINGS = {
  color: '#ffff00',
  weight: 10,
  opacity: 0.6,
  smoothFactor: 1.0,
};

// Global Variables
var mode = MODES.view;
var isDrawing = false;
var currentLine = [];
var highlightLines = [];

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
  attribution: 'Style: <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA 2.0</a> <a href="http://www.openrailwaymap.org/">OpenRailwayMap</a> and OpenStreetMap',
  minZoom: 2,
  maxZoom: 19,
  tileSize: 256,
}).addTo(map);

const highlightLayer = L.polyline(highlightLines, HIGHLIGHT_SETTINGS);
highlightLayer.addTo(map);

streetmap.getContainer().classList.add('streetmap-container');
openrailwaymap.getContainer().classList.add('railmap-container');

// Events
map.on('moveend', onMapMove);
map.on('click', onMapClick);

function onMapMove(e) {
    let lat = map.getCenter()["lat"];
    let lng = map.getCenter()["lng"];
}

function onMapClick(e) {
  //console.log(e);
  let lat = e.latlng.lat;
  let lng = e.latlng.lng;

  if (mode === MODES.view) {
  } else if (mode === MODES.draw) {
    //console.log(`Draw: ${lat} ${lng}`);
  } else if (mode === MODES.erase) {
  }
}

const Coordinates = L.Control.extend({
  onAdd: map => {
    const container = L.DomUtil.create("div");
    map.addEventListener("mousemove", e => {
      let lat = e.latlng.lat;
      let lng = e.latlng.lng;

      if (mode === MODES.view) {
      } else {
        if (isDrawing) {
          console.log(`Drawing at: ${lat} ${lng}`);
          currentLine.push([lat, lng]);
          let tmpLines = highlightLines.concat([]);
          tmpLines.push(currentLine);
          highlightLayer.setLatLngs(tmpLines);
        }
      }
    });
    map.addEventListener("mousedown", e => {
      if (mode === MODES.view) {
      } else {
        isDrawing = true;
        currentLine = [];
      }
    });
    map.addEventListener("mouseup", e => {
      isDrawing = false;
      highlightLines.push(currentLine);
    });

    return container;
  }
});
map.addControl(new Coordinates({ position: "bottomleft" }));



function selectMode(newMode) {
  mode = newMode;
  if (mode === MODES.view) {
    map.dragging.enable();
    document.getElementById("rail-map").style.cursor = "grab";
  } else if (mode === MODES.draw) {
    map.dragging.disable();
    document.getElementById("rail-map").style.cursor = "crosshair";
  } else if (mode === MODES.erase) {
    map.dragging.disable();
    document.getElementById("rail-map").style.cursor = "no-drop";
  }
}
