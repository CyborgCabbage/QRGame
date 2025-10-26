// Code mirror
import {EditorView, basicSetup} from "codemirror"
import {StreamLanguage} from "@codemirror/language"
import {lua} from "@codemirror/legacy-modes/mode/lua"

const initialCode = `i = 0
function frame()
  r = math.rad(i)
  setSpritePos(math.floor(88.5+math.sin(r)*45), math.floor(120.5+math.cos(r)*45))
  i = i + 1
end`;

const params = new URLSearchParams(window.location.search);
const loadedScript = params.get("s");
let scriptInput = new EditorView({
    doc: loadedScript !== null ? loadedScript : initialCode,
    extensions: [basicSetup, StreamLanguage.define(lua)],
    parent: document.body
})

import './style.css';
import Chars from './chars.png';
const gameCanvas = document.querySelector('canvas');
const recompileButton = document.getElementById('recompile-button');
const copyButton = document.getElementById('copy-button');
const ctx = gameCanvas.getContext('2d');
copyButton.onclick = function(){
    navigator.clipboard.writeText(window.location.origin+window.location.pathname+"?s="+encodeURIComponent(scriptInput.state.doc.toString()));
};
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

const { LuaFactory } = require('wasmoon')
const factory = new LuaFactory()
async function getEngine(script_input) {
    const lua = await factory.createEngine()
    lua.global.set('setSpritePos', (x, y) => {
        sprites[0].x = x;
        sprites[0].y = y;
    });
    await lua.doString(scriptInput.state.doc.toString())
    return {
        'lua': lua, 
        'frame': lua.global.get('frame'),
    };
}

let luaEngine = await getEngine();
recompileButton.onclick = async function(){ luaEngine = await getEngine() };

const targetFrameTime = 1.0 / 120.0 * 1000.0;
let previousTimestamp;
requestAnimationFrame(firstFrame);
function firstFrame(timestamp) {
  previousTimestamp = timestamp;
  mainLoop(timestamp);
}
function mainLoop(timestamp) {
    const elapsed = timestamp - previousTimestamp;
    if (elapsed > targetFrameTime) {
        luaEngine.frame();
        ctx.beginPath();
        // Fill Background
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
        // Draw Sprites
        for (let sprite of sprites) {
            sprite.draw()
        }
        if (elapsed > targetFrameTime * 5) {
            console.log("Elapsed time is large, skipping frames")
            previousTimestamp = timestamp;
        } else {
            previousTimestamp += targetFrameTime;
        }
    }
    requestAnimationFrame((t) => mainLoop(t));
}