import './style.css';
import {EditorView, basicSetup} from 'codemirror'
import {StreamLanguage} from '@codemirror/language'
import {lua} from '@codemirror/legacy-modes/mode/lua'
import {generate} from 'lean-qr'
import {Engine, Game} from './engine.js'

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
  setSpritePos(math.floor(88.5+math.sin(radians)*45), math.floor(120.5+math.cos(radians*1.618)*45))
  f = f + FRAME_TIME
end`;

// Script Editor
const params = new URLSearchParams(window.location.search);
const importedScript = params.get("s");
let scriptInput = new EditorView({
    doc: importedScript !== null ? importedScript : INITIAL_SCRIPT,
    extensions: [basicSetup, StreamLanguage.define(lua)],
    parent: mainElement
})
function createGameFromEditor() {
    return new Game(scriptInput.state.doc.toString());
}

// Engine
const engine = new Engine(gameCanvas);
engine.play(createGameFromEditor());

// Buttons
reloadButton.onclick = function(){
    engine.play(createGameFromEditor());
    if (qrCodeVisible) {
        generate(engine.game.asURL()).toCanvas(qrCanvas);
    }
};
copyButton.onclick = function(){
    navigator.clipboard.writeText(engine.game.asURL());
};
let qrCodeVisible = false;
qrButton.onclick = async function() {
    qrCodeVisible = !qrCodeVisible
    if (qrCodeVisible) {
        generate(engine.game.asURL()).toCanvas(qrCanvas);
        qrCanvas.style.display = "block"
    } else {
        qrCanvas.style.display = "none"
    }
}
