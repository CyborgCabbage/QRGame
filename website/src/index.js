import './style.css';
import Chars from './chars.png';
import {EditorView, basicSetup} from 'codemirror'
import {StreamLanguage} from '@codemirror/language'
import {lua} from '@codemirror/legacy-modes/mode/lua'
import {generate} from 'lean-qr'
import {LuaFactory} from 'wasmoon'

// DOM
const mainElement = document.querySelector('main');
const gameCanvas = document.querySelector('canvas');
const reloadButton = document.getElementById('reload-button');
const copyButton = document.getElementById('copy-button');
const qrButton = document.getElementById('qr-button');
const qrCanvas = document.getElementById('qr-canvas');

// Constants
const INITIAL_SCRIPT = `local f = 0
function frame()
  local radians = f * math.pi * 2
  setSpritePos(math.floor(88.5+math.sin(radians)*45), math.floor(120.5+math.cos(radians)*45))
  f = f + FRAME_TIME
end`;
const FRAME_TIME = 1.0 / 60.0
const FRAME_TIME_MS = FRAME_TIME * 1000.0;

// Factories and Contexts
const factory = new LuaFactory()
const ctx = gameCanvas.getContext('2d');

// Script Editor
const params = new URLSearchParams(window.location.search);
const importedScript = params.get("s");
let scriptInput = new EditorView({
    doc: importedScript !== null ? importedScript : INITIAL_SCRIPT,
    extensions: [basicSetup, StreamLanguage.define(lua)],
    parent: mainElement
})

// Engine
var spriteSheet = new Image();
spriteSheet.src = Chars;
class Sprite {
    constructor(char, x, y) {
        this.char = char;
        this.x = x;
        this.y = y;
    }
    draw() {
        ctx.fillStyle = "white";
        ctx.drawImage(spriteSheet, (this.char % 4) * 16, Math.floor(this.char / 4) * 16, 16, 16, this.x, this.y, 16, 16);
    }
}

var sprites = []
sprites.push(new Sprite(0, 0, 16));

// QR code
let qrCodeVisible = false;
qrButton.onclick = async function() {
    qrCodeVisible = !qrCodeVisible
    if (qrCodeVisible) {
        generate(getLoadedScriptAsURL()).toCanvas(qrCanvas);
        qrCanvas.style.display = "block"
    } else {
        qrCanvas.style.display = "none"
    }
}

// Load/Reload
let loadedScript;
function getLoadedScriptAsURL() {
    return window.location.origin+window.location.pathname+"?s="+encodeURIComponent(loadedScript)
}
let luaEngine;
async function reloadGame() {
    // Cache code
    loadedScript = scriptInput.state.doc.toString()
    // Lua
    const lua = await factory.createEngine()
    lua.global.set('FRAME_TIME', FRAME_TIME);
    lua.global.set('setSpritePos', (x, y) => {
        sprites[0].x = x;
        sprites[0].y = y;
    });
    await lua.doString(loadedScript)
    luaEngine = {
        'lua': lua, 
        'frame': lua.global.get('frame'),
    };
    // QR code
    if (qrCodeVisible) {
        generate(getLoadedScriptAsURL()).toCanvas(qrCanvas);
    }
}
await reloadGame();
reloadButton.onclick = reloadGame;

// Copy Button
copyButton.onclick = function(){
    navigator.clipboard.writeText(getLoadedScriptAsURL());
};

// Loop
let previousTimestamp;
requestAnimationFrame(firstFrame);
function firstFrame(timestamp) {
  previousTimestamp = timestamp;
  mainLoop(timestamp);
}
function mainLoop(timestamp) {
    const elapsed = timestamp - previousTimestamp;
    if (elapsed > FRAME_TIME_MS) {
        luaEngine.frame();
        ctx.beginPath();
        // Fill Background
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
        // Draw Sprites
        for (let sprite of sprites) {
            sprite.draw()
        }
        if (elapsed > FRAME_TIME_MS * 5) {
            console.log("Elapsed time is large, skipping frames")
            previousTimestamp = timestamp;
        } else {
            previousTimestamp += FRAME_TIME_MS;
        }
    }
    requestAnimationFrame((t) => mainLoop(t));
}