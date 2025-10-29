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

// Import/Export
function urlToGame() {
    const params = new URLSearchParams(window.location.search);
    const importedScript = params.get("s");
    if (importedScript !== null) {
        return new Game(importedScript);
    }
    return null;
}
function gameToUrl(game) {
    return window.location.origin+window.location.pathname+"?s="+encodeURIComponent(game.script);
}

// Script Editor
let scriptInput = new EditorView({
    extensions: [basicSetup, StreamLanguage.define(lua)],
    parent: mainElement
})
function gameToEditor(game) {
    const transaction = scriptInput.state.update({changes: {
        from: 0, 
        to: scriptInput.state.doc.length, 
        insert: game.script
    }});
    scriptInput.update([transaction]);
}
function editorToGame() {
    return new Game(scriptInput.state.doc.toString());
}

// Engine
const engine = new Engine(gameCanvas);
let game = urlToGame();
if (game === null) {
    game = new Game(INITIAL_SCRIPT);
}
gameToEditor(game);
// (could load the game directly here but want to make sure the editor works properly)
engine.play(editorToGame());

// Buttons
reloadButton.onclick = function(){
    engine.play(editorToGame());
    if (qrCodeVisible) {
        generate(gameToUrl(engine.game)).toCanvas(qrCanvas);
    }
};
copyButton.onclick = function(){
    navigator.clipboard.writeText(gameToUrl(engine.game));
};
let qrCodeVisible = false;
qrButton.onclick = async function() {
    qrCodeVisible = !qrCodeVisible
    if (qrCodeVisible) {
        generate(gameToUrl(engine.game)).toCanvas(qrCanvas);
        qrCanvas.style.display = "block"
    } else {
        qrCanvas.style.display = "none"
    }
}
