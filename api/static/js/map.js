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


// Initialize
onLoadMap();
document.getElementById("view-btn").style.color = "#000";  // default mode

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

const openrailwaymap = new L.TileLayer('./api/tile/{s}/{z}/{x}/{y}', {
  attribution: 'Style: <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA 2.0</a> <a href="http://www.openrailwaymap.org/">OpenRailwayMap</a> and OpenStreetMap',
  minZoom: 2,
  maxZoom: 19,
  tileSize: 256,
}).addTo(map);

const highlightLayer = L.polyline(highlightLines, HIGHLIGHT_SETTINGS);
highlightLayer.addTo(map);

streetmap.getContainer().classList.add('streetmap-container');
openrailwaymap.getContainer().classList.add('railmap-container');
highlightLayer.getPane().classList.add('highlight-container');


// Events
map.on("mousemove", onMouseMove);
map.on("mousedown", onMouseDown);
map.on("mouseup", onMouseUp);
map.on("mouseout", onMouseUp);

function onMouseMove(e) {
  let lat = e.latlng.lat;
  let lng = e.latlng.lng;
  let zoom = e.target._zoom;

  if (mode === MODES.view) {
  } else if (mode === MODES.draw) {
    if (isDrawing) { // Drawing Control
      if (isRailTrack(lat, lng, zoom)) {
        currentLine.push([lat, lng]);
        let tmpLines = highlightLines.concat([]);
        tmpLines.push(currentLine);
        highlightLayer.setLatLngs(tmpLines);
      } else {
        if (currentLine.length > 0) highlightLines.push(currentLine);
        currentLine = [];
      }
    }
  } else if (mode === MODES.erase) {
    if (isDrawing) {
      deleteLines(lat, lng);
      highlightLayer.setLatLngs(highlightLines);
    }
  }
}

function onMouseDown(e) {
  if (mode === MODES.view) {
  } else {
    isDrawing = true;
    currentLine = [];
  }
}

function onMouseUp(e) {
  isDrawing = false;
  if (currentLine.length > 0) highlightLines.push(currentLine);
  currentLine = [];
}


function latlngToXY(lat, lng, zoom) {
  let xtile = parseInt(Math.floor((lng + 180) / 360 * (1 << zoom)));
  let ytile = parseInt(Math.floor((1 - Math.log(Math.tan(lat*Math.PI/180) + 1 / Math.cos(lat*Math.PI/180)) / Math.PI) / 2 * (1 << zoom)));
  return {x: xtile, y: ytile, z: zoom};
}
function xyToLatlng(x, y, z) {
  var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
  let lng = (x/Math.pow(2,z)*360-180);
  let lat = (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
  return {lat: lat, lng: lng, zoom: z};
}
function isRailTrack(lat, lng, zoom) {
  let xyz = latlngToXY(lat, lng, zoom);
  let tileurl = openrailwaymap.getTileUrl(xyz);
  let tileLatlng = xyToLatlng(xyz.x, xyz.y, xyz.z);

  let tile = document.getElementsByClassName("railmap-container")[0].querySelector(`[src='${tileurl}']`);
  let tileSize = 512;

  let canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  let context = canvas.getContext('2d');

  context.drawImage(tile, 0, 0);
  let dx = parseInt(Math.floor(tileSize * (lng - tileLatlng.lng) / (xyToLatlng(xyz.x+1, xyz.y, xyz.z).lng - tileLatlng.lng)));
  let dy = parseInt(Math.floor(tileSize * (tileLatlng.lat - lat) / (tileLatlng.lat - xyToLatlng(xyz.x, xyz.y+1, xyz.z).lat)));
  let rad = 30;
  dx -= rad/2;
  dy -= rad/2;
  dx = Math.max(0, Math.min(dx, tileSize-rad));
  dy = Math.max(0, Math.min(dy, tileSize-rad));
  let pixels = context.getImageData(dx, dy, rad, rad).data;

  let isTrack = false;
  for (var i=0; i < pixels.length; i+=4) {
    let a = pixels[i+3];
    if (a > 0) {
      isTrack = true;
      break;
    }
  }

  // console.log(tileurl, dx, dy, isTrack);

  canvas.remove();
  return isTrack;
}



function selectMode(newMode) {
  mode = newMode;
  if (mode === MODES.view) {
    map.dragging.enable();
    document.getElementById("rail-map").style.cursor = "grab";
    document.getElementById("view-btn").style.color = "#000";
    document.getElementById("draw-btn").style.color = "#555";
    document.getElementById("erase-btn").style.color = "#555";
  } else if (mode === MODES.draw) {
    map.dragging.disable();
    document.getElementById("rail-map").style.cursor = "crosshair";
    document.getElementById("view-btn").style.color = "#555";
    document.getElementById("draw-btn").style.color = "#000";
    document.getElementById("erase-btn").style.color = "#555";
  } else if (mode === MODES.erase) {
    map.dragging.disable();
    document.getElementById("rail-map").style.cursor = "no-drop";
    document.getElementById("view-btn").style.color = "#555";
    document.getElementById("draw-btn").style.color = "#555";
    document.getElementById("erase-btn").style.color = "#000";
  }
}


function deleteLines(lat, lng) {
  let x1 = map.latLngToContainerPoint([lat, lng]).x;
  let y1 = map.latLngToContainerPoint([lat, lng]).y;
  let eraserSize = 30;
  let newLines = [];
  highlightLines.forEach(line => {
    let tmp = [];
    line.forEach(latlng => {
      let x2 = map.latLngToContainerPoint(latlng).x;
      let y2 = map.latLngToContainerPoint(latlng).y;

      let dist = Math.pow(x1-x2, 2) + Math.pow(y1-y2, 2); // in pixels
      if (dist > Math.pow(eraserSize, 2)) { // Outside radius
        tmp.push(latlng);
      }
    });
    if (tmp.length > 0) newLines.push(tmp);
  });
  highlightLines = newLines.concat([]);
}

function onSaveMap() {
  localStorage.setItem("trkhl_lines", JSON.stringify(highlightLines));
}

function onLoadMap() {
  let lines = localStorage.getItem("trkhl_lines");
  highlightLines = lines==null ? [] : JSON.parse(lines);
}
