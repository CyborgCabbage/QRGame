import './style.css';
import {EditorView, basicSetup} from 'codemirror'
import {StreamLanguage} from '@codemirror/language'
import {lua} from '@codemirror/legacy-modes/mode/lua'
import {correction, generate, ImageDataOptions} from 'lean-qr'
import {Game} from './game.js'
import {Engine} from './engine.js'
import {Editor} from './editor.js'
import * as fflate from 'fflate'
import brotliPromise from 'brotli-wasm';
const brotli = await brotliPromise;

// DOM

const gameCanvas = document.getElementById('game-canvas');
const editorCanvas = document.getElementById('editor-canvas');
const codeContent = document.getElementById('tab-content-code');
const reloadButton = document.getElementById('reload-button');
const urlButton = document.getElementById('url-button');
const qrButton = document.getElementById('qr-button');
const qrCanvas = document.getElementById('qr-canvas');

// Constants
const INITIAL_SCRIPT = `function utf8.sub(s,i,j)
    i=utf8.offset(s,i)
    j=utf8.offset(s,j+1)-1
    return string.sub(s,i,j)
end

local sprs = {}
for i = 1, 16 do
    local c = utf8.sub('🍕🍔🍟🌭🍿🧂🥓🥚🍳🧇🥞🧈🍞🥐🥨🥯', i, i)
    sprs[i] = createSprite(c, i-1, 0, 0)
end

local text = createSprite('🍕', 8, 0, 0)
text.drag = true

local f = 0
function frame()
  for i = 1, 16 do
    local radians = f * math.pi * 0.5 + (math.pi * 2) * (i / 16)
    sprs[i].x = math.floor(88.5+math.sin(radians)*45)
    sprs[i].y = math.floor(120.5+math.cos(radians)*45)
  end
  f = f + FRAME_TIME
end`;

const LUA_KEYWORDS = `andbreakdoelseelseifendfalseforfunctionifinlocalnilnotorrepeatreturnthentrueuntilwhile`;

class StreamCompressor {
    constructor(algorithm) {
        this.#algorithm = algorithm;
    }
    async compress(data) {
        const stream = new Blob([data]).stream();
        const compressedStream = stream.pipeThrough(new CompressionStream(this.#algorithm));
        return await new Response(compressedStream).bytes();
    }
    async decompress(data) {
        const stream = new Blob([data]).stream();
        const decompressedStream = stream.pipeThrough(new DecompressionStream(this.#algorithm));
        return await new Response(decompressedStream).bytes();
    }
    toString() {
        return "web " + this.#algorithm;
    }
    #algorithm
}

const compressors = [
    new StreamCompressor("deflate-raw"),
    new StreamCompressor("gzip"),
    new StreamCompressor("deflate"),
];

// Import/Export
//Compression Stream: https://evanhahn.com/javascript-compression-streams-api-with-strings/
function urlToData() {
    const params = new URLSearchParams(window.location.search);
    const base64 = params.get("s");
    if (base64 === null) return null;
    const compressed = Uint8Array.fromBase64(base64, { alphabet: "base64url", omitPadding: true });
    if (compressed.length === 0) return null;
    return compressed;
}
function dataToUrl(data) {
    const base64 = data.toBase64({ alphabet: "base64url", omitPadding: true });
    const params = new URLSearchParams();
    params.set("s", base64);
    return window.location.origin+window.location.pathname+"?"+params;
}
function urlToGame() {
    return Game.fromData(urlToData());
}
function gameToUrl(game) {
    return dataToUrl(game.toData());
}

// Script Editor
let scriptInput = new EditorView({
    extensions: [basicSetup, StreamLanguage.define(lua)],
    parent: codeContent
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
    return new Game(scriptInput.state.doc.toString(), "testing");
}

// Engine
const engine = new Engine(gameCanvas);
let game = urlToGame();
if (game === null) {
    game = new Game(INITIAL_SCRIPT, "testing");
}
gameToEditor(game);
// (could load the game directly here but want to make sure the editor works properly)
engine.play(editorToGame());
const qrGenerateOptions = {
    minCorrectionLevel: correction.L
}
const qrImageOptions = {
    on: [0, 0, 0, 255],
    off: [255, 255, 255, 255]
}
generate(gameToUrl(engine.game), qrGenerateOptions).toCanvas(qrCanvas, qrImageOptions);

// Buttons
reloadButton.onclick = async function(){
    engine.play(editorToGame());
    generate(gameToUrl(engine.game), qrGenerateOptions).toCanvas(qrCanvas, qrImageOptions);
    console.log("Compression Results");
    const gameData = engine.game.toData();
    const results = {};
    results["raw"] = gameData.length;
    for (const c of compressors) {
        const compressed = await c.compress(gameData);
        results[c.toString()] = compressed.length;
    }
    const fflateOpts = {level: 9, mem: 8};
    const fflateOptsDict = {level: 9, mem: 8, dictionary: new TextEncoder().encode(LUA_KEYWORDS)};
    results["fflate gzip"] = fflate.gzipSync(gameData, fflateOpts).length;
    results["fflate gzip w/dict"] = fflate.gzipSync(gameData, fflateOptsDict).length;
    results["fflate zip"] = fflate.zipSync(gameData, fflateOpts).length;
    results["fflate zip w/dict"] = fflate.zipSync(gameData, fflateOptsDict).length;
    results["fflate zlib"] = fflate.zlibSync(gameData, fflateOpts).length;
    results["fflate zlib w/dict"] = fflate.zlibSync(gameData, fflateOptsDict).length;
    results["fflate deflate"] = fflate.deflateSync(gameData, fflateOpts).length;
    results["fflate deflate w/dict"] = fflate.deflateSync(gameData, fflateOptsDict).length;
    results["brotli"] = brotli.compress(gameData, {quality: 11}).length;
    console.table(results);
};
urlButton.onclick = async function(){
    navigator.clipboard.writeText(gameToUrl(engine.game));
};
qrButton.onclick = async function(){
    qrCanvas.toBlob(function(blob) { 
        const item = new ClipboardItem({ "image/png": blob });
        navigator.clipboard.write([item]); 
    });
}