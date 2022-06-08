// Config
const defaultLoc = [52.4560, -1.5270];  // [lat, lon]
const defaultZoom = 7;  // 0-18
const MODES = {
  view: "view",
  draw: "draw",
  erase: "erase",
};
const PEN_RAD = 50;

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



// Initialize
onLoadMap();
document.getElementById("view-btn").style.color = "#000";  // default mode


// Events
map.on("mousemove", onMouseMove);
map.on("mousedown", onMouseDown);
map.on("mouseup", onMouseUp);
map.on("mouseout", onMouseUp);

// Mobile Support
const railMapDiv = document.getElementById("rail-map");
railMapDiv.addEventListener("touchstart", touchToMouse, true);
railMapDiv.addEventListener("touchend", touchToMouse, true);
railMapDiv.addEventListener("touchmove", touchToMouse, true);

function touchToMouse(e) {
  let type = "";
  let touch = e.changedTouches[0];
  let tmpEvent = document.createEvent("MouseEvent");

  if (e.type === "touchstart") type = "mousedown";
  else if (e.type === "touchend") type = "mouseup";
  else if (e.type === "touchmove") type = "mousemove";
  
  tmpEvent.initMouseEvent(type, true, true, window, 1,
    touch.screenX, touch.screenY, touch.clientX, touch.clientY,
    false, false, false, false, 0, null);

  touch.target.dispatchEvent(tmpEvent);
  e.preventDefault();
}

function onMouseMove(e) {
  let lat = e.latlng.lat;
  let lng = e.latlng.lng;
  let zoom = e.target._zoom;

  if (mode === MODES.view) {
  } else if (mode === MODES.draw) {
    if (isDrawing) { // Drawing Control
      let trackData = isRailTrack(lat, lng, zoom);
      if (trackData.isTrack) {
        currentLine.push([trackData.lat, trackData.lng]);
        let tmpLines = highlightLines.concat([]);
        tmpLines.push(currentLine);
        highlightLayer.setLatLngs(tmpLines);
      } else {  // Pen up if not on track
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
  let tileLatlng = xyToLatlng(xyz.x, xyz.y, xyz.z); // latlng of the top left pixel

  let tile = document.getElementsByClassName("railmap-container")[0].querySelector(`[src='${tileurl}']`);
  let tileSize = 512;

  let canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  let context = canvas.getContext('2d');

  context.drawImage(tile, 0, 0);
  let dTileLng = xyToLatlng(xyz.x+1, xyz.y, xyz.z).lng - tileLatlng.lng;
  let dTileLat = tileLatlng.lat - xyToLatlng(xyz.x, xyz.y+1, xyz.z).lat;
  let dx = parseInt(Math.floor(tileSize * (lng - tileLatlng.lng) / dTileLng));
  let dy = parseInt(Math.floor(tileSize * (tileLatlng.lat - lat) / dTileLat));
  dx -= PEN_RAD/2;
  dy -= PEN_RAD/2;
  dx = Math.max(0, Math.min(dx, tileSize-PEN_RAD));
  dy = Math.max(0, Math.min(dy, tileSize-PEN_RAD));
  let pixels = context.getImageData(dx, dy, PEN_RAD, PEN_RAD).data;

  let isTrack = false;
  let trackLat, trackLng, trackDist = Number.POSITIVE_INFINITY;
  for (var i=0; i < pixels.length; i+=4) {
    let a = pixels[i+3];
    if (a > 0) {
      isTrack = true;

      let px = dx + (i / 4) % PEN_RAD;
      let py = dy + parseInt(Math.floor((i / 4) / PEN_RAD));
      let tmpLng = tileLatlng.lng + dTileLng * (px / tileSize);
      let tmpLat = tileLatlng.lat - dTileLat * (py / tileSize);

      let dist = Math.pow(tmpLng - lng, 2) + Math.pow(tmpLat - lat, 2);
      if (dist < trackDist) {  // Get the closest track
        trackLat = tmpLat;
        trackLng = tmpLng;
        trackDist = dist;
      }
    }
  }

  
  //console.log(lat, lng, " | ", trackLat, trackLng);

  canvas.remove();
  return {
    isTrack: isTrack,
    lat: trackLat,
    lng: trackLng,
  };
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
    let before = [];
    let after = [];
    let isAfter = false;
    line.forEach(latlng => {
      let x2 = map.latLngToContainerPoint(latlng).x;
      let y2 = map.latLngToContainerPoint(latlng).y;

      let dist = Math.pow(x1-x2, 2) + Math.pow(y1-y2, 2); // in pixels
      if (dist > Math.pow(eraserSize, 2)) { // Outside radius
        if (isAfter) {
          after.push(latlng);
        } else {
          before.push(latlng);
        }
      } else {
        isAfter = true;
      }
    });
    if (before.length > 0) newLines.push(before);
    if (after.length > 0) newLines.push(after);
  });
  highlightLines = newLines.concat([]);
}

function onSaveMap() {
  localStorage.setItem("trkhl_lines", JSON.stringify(highlightLines));
}

function onLoadMap() {
  let lines = localStorage.getItem("trkhl_lines");
  highlightLines = lines==null ? [] : JSON.parse(lines);
  highlightLayer.setLatLngs(highlightLines);
}
