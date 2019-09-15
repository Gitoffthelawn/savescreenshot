/*
    Firefox addon "Save Screenshot"
    Copyright (C) 2019  Manuel Reimer <manuel.reimer@gmx.de>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

async function OnMessage(request, sender, sendResponse) {
  const prefs = await(browser.storage.local.get());
  let format = request.format || prefs.format || "png";
  let region = request.region || prefs.region || "full";

  if (region == "full")
    SaveScreenshot(
      0,
      0,
      window.innerWidth + window.scrollMaxX,
      window.innerHeight + window.scrollMaxY,
      format
    );
  else
    SaveScreenshot(
      document.documentElement.scrollLeft,
      document.documentElement.scrollTop,
      window.innerWidth,
      window.innerHeight,
      format
    );
}

function SaveScreenshot(aLeft, aTop, aWidth, aHeight, aFormat) {
  // Maximum size is limited!
  // https://dxr.mozilla.org/mozilla-central/source/dom/canvas/CanvasRenderingContext2D.cpp#5517
  // https://dxr.mozilla.org/mozilla-central/source/gfx/2d/Factory.cpp#316
  if (aHeight > 32767) aHeight = 32767;
  if (aWidth > 32767) aWidth = 32767;

  var canvas = document.createElementNS("http://www.w3.org/1999/xhtml", "html:canvas");
  canvas.height = aHeight;
  canvas.width = aWidth;

  var ctx = canvas.getContext("2d");
  ctx.drawWindow(window, aLeft, aTop, aWidth, aHeight, "rgb(0,0,0)");

  let imgdata;
  if (aFormat == "jpg")
    imgdata = canvas.toDataURL("image/jpeg", 0.8);
  else
    imgdata = canvas.toDataURL("image/png");

  TriggerDownload(imgdata, aFormat);
}


// Triggers a download for the content aContent named as aFilename.
async function TriggerDownload(aContent, aFormat) {
  if (aFormat == "copy") {
    const port = browser.runtime.connect();
    port.postMessage({content: aContent, action: "copy"});
    port.disconnect();
    return;
  }

  const prefs = await browser.storage.local.get();
  const method = prefs.savemethod || "open";
  const filenameformat= prefs.filenameformat || "%y%m%d_%H%M%S_%h"; //%y%m%d_%H%M%S_%h_%t_%5_%u
  const filename = GetDefaultFileName("saved_page", filenameformat) + "." + aFormat;

  // Trigger the firefox "open file" dialog.
  if (method == "open") {
    const a = document.createElement("a");
    a.href = aContent;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  // All other cases have to be communicated to our "background script" as
  // content scripts can't access the "downloads" API.
  else {
    const port = browser.runtime.connect();
    port.postMessage({content: aContent, filename: filename});
    port.disconnect();
  }
}

// Gets the default file name, used for saving the screenshot
function GetDefaultFileName(aDefaultFileName, aFilenameFormat) {
  //prioritize formatted variant
  let formatted = ApplyFilenameFormat(aFilenameFormat);
  if (formatted)
    return formatted;

  // If possible, base the file name on document title
  let title = ValidateFileName(document.title);
  if (title)
    return title;

  // Otherwise try to use the actual HTML filename
  let path = window.location.pathname;
  if (path) {
    let filename = ValidateFileName(path.substring(path.lastIndexOf('/')+1));
    if (filename)
      return filename;
  }

  // Finally use the provided default name
  return aDefaultFileName;
}

Number.prototype.pad = function (len) {
    return (new Array(len+1).join("0") + this).slice(-len);
}

function ApplyFilenameFormat(prefixFormat) {
  //--datetime prefix
  var currentdate = new Date();
  if (prefixFormat.lastIndexOf("%y")>=0 ){
    console.log("ApplyPrefixFormat: "+prefixFormat);
    prefixFormat = prefixFormat.replace(/%y/,currentdate.getFullYear());
    console.log("ApplyPrefixFormat: "+prefixFormat);
  }
  if (prefixFormat.lastIndexOf("%Y")>=0 ){
    console.log("ApplyPrefixFormat: "+prefixFormat);
    prefixFormat = prefixFormat.replace(/%Y/,currentdate.getFullYear());
    console.log("ApplyPrefixFormat: "+prefixFormat);
  }
  if (prefixFormat.lastIndexOf("%m")>=0){
    console.log("ApplyPrefixFormat: "+prefixFormat);
    prefixFormat = prefixFormat.replace(/%m/,(currentdate.getMonth()+1).pad(2));
    console.log("ApplyPrefixFormat: "+prefixFormat);
  }
  if (prefixFormat.lastIndexOf("%d")>=0){
    console.log("ApplyPrefixFormat: "+prefixFormat);
    prefixFormat = prefixFormat.replace(/%d/,currentdate.getDate().pad(2));
    console.log("ApplyPrefixFormat: "+prefixFormat);
  }
  if (prefixFormat.lastIndexOf("%H")>=0){
    console.log("ApplyPrefixFormat: "+prefixFormat);
    prefixFormat = prefixFormat.replace(/%H/,currentdate.getHours().pad(2));
    console.log("ApplyPrefixFormat: "+prefixFormat);
  }
  if (prefixFormat.lastIndexOf("%M")>=0){
    console.log("ApplyPrefixFormat: "+prefixFormat);
    prefixFormat = prefixFormat.replace(/%M/,currentdate.getMinutes().pad(2));
    console.log("ApplyPrefixFormat: "+prefixFormat);
  }
  if (prefixFormat.lastIndexOf("%S")>=0){
    console.log("ApplyPrefixFormat: "+prefixFormat);
    prefixFormat = prefixFormat.replace(/%S/,currentdate.getSeconds().pad(2));
    console.log("ApplyPrefixFormat: "+prefixFormat);
  }
  //--rest
  if (prefixFormat.lastIndexOf("%t")>=0 ){
    console.log("ApplyPrefixFormat: "+prefixFormat);
    prefixFormat = prefixFormat.replace(/%t/,ValidateFileName(document.title));
    console.log("ApplyPrefixFormat: "+prefixFormat);
  }
  if (prefixFormat.lastIndexOf("%u")>=0 ){
    console.log("ApplyPrefixFormat: "+prefixFormat);
    prefixFormat = prefixFormat.replace(/%u/,ValidateFileName(document.URL));
    console.log("ApplyPrefixFormat: "+prefixFormat);
  }
  if (prefixFormat.lastIndexOf("%h")>=0 ){
    console.log("ApplyPrefixFormat: "+prefixFormat);
    prefixFormat = prefixFormat.replace(/%h/,ValidateFileName(window.location.hostname));
    console.log("ApplyPrefixFormat: "+prefixFormat);
  }
  return prefixFormat;
}

// "Sanitizes" given string to be used as file name.
function ValidateFileName(aFileName) {
  // http://www.mtu.edu/umc/services/digital/writing/characters-avoid/
  aFileName = aFileName.replace(/[<\{]+/g, "(");
  aFileName = aFileName.replace(/[>\}]+/g, ")");
  aFileName = aFileName.replace(/[#$%!&*\'?\"\/:\\@|]/g, "");
  // Remove leading "." and "-"
  aFileName = aFileName.replace(/^[\s-.]+/, "");
  // Remove trailing "."
  aFileName = aFileName.replace(/[\s.]+$/, "");
  return aFileName;
}

// Register message event listener
browser.runtime.onMessage.addListener(OnMessage);
