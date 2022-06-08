var isCloudPopupShowing = false;

function toggleCloudPopup() {
  const popup = document.getElementById("cloud-popup");
  const overlay = document.getElementsByClassName("popup-overlay")[0];

  if (isCloudPopupShowing) {
    popup.style.display = "none";
    overlay.style.display = "none";
    resetErrMessage();
  } else {
    popup.style.display = "block";
    overlay.style.display = "block";
  }
  isCloudPopupShowing = !isCloudPopupShowing;
}

function loadCloud() {
  resetErrMessage();
  let pphrs = document.getElementById("cloud-passphrase").value;
  httpGet("/api/loadcloud", {
    passphrase: hash(pphrs),
  }).then(response => {
    if (response.status === 200) return response.json();
    else console.log("HTTP Error", response.status);
  }).then(data => {
    if (data.status === "success") {
      localStorage.setItem("trkhl_lines", data.lines);
      onLoadMap();
      showErrMessage("Data loaded successfully");
    } else {
      showErrMessage("Failed to load from cloud: " + data.status);
    }
  });
}

function saveCloud() {
  onSaveMap();
  resetErrMessage();
  let pphrs = document.getElementById("cloud-passphrase").value;
  let lines = localStorage.getItem("trkhl_lines");
  httpPost("/api/savecloud", {
    passphrase: hash(pphrs),
    lines: lines,
  }).then(response => {
    if (response.status === 200) return response.json();
    else console.log("HTTP Error", response.status);
  }).then(data => {
    if (data.status === "success") {
      showErrMessage("Data saved successfully");
    } else {
      showErrMessage("Failed to save to cloud: " + data.status);
    }
  });
}

function hash(key) {
  let hash = new jsSHA("SHA-256", "TEXT", { encoding: "UTF8" });
  hash.update(key);
  let hashed = hash.getHash("HEX");
  return hashed;
}

// Error Message
function showErrMessage(msg) {
  const errmsg = document.getElementById("cloud-err-msg");
  const msgbox = errmsg.parentElement;
  errmsg.innerText = msg;
  msgbox.style.display = "block";
}

function resetErrMessage() {
  const errmsg = document.getElementById("cloud-err-msg");
  const msgbox = errmsg.parentElement;
  errmsg.innerText = "";
  msgbox.style.display = "none";
}



// Http functions
async function httpGet(url, data) {
  let newUrl = new URL("/trackhighlighter" + url, location.origin);
  for (let key in data) {
    newUrl.searchParams.append(key, data[key]);
  }
  return await fetch(newUrl, {
    method: 'GET',
    headers: {},
  });
}

async function httpPost(url, data) {
  return await fetch("/trackhighlighter" + url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=utf-8'
    },
    body: JSON.stringify(data),
  });
}
