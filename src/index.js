import './style.css';
import Chars from './chars.png';
const gameCanvas = document.querySelector('canvas');
const scriptInput = document.querySelector('textarea');
const scriptButton = document.querySelector('button');
const ctx = gameCanvas.getContext('2d');

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
    await lua.doString(scriptInput.value)
    return {
        'lua': lua, 
        'frame': lua.global.get('frame'),
    };
}

let luaEngine = await getEngine();
scriptButton.onclick = async function(){ luaEngine = await getEngine() };

function mainLoop() {
    luaEngine.frame();
    ctx.beginPath();
    // Fill Background
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    // Draw Sprites
    for (let sprite of sprites) {
        sprite.draw()
    }
    requestAnimationFrame(mainLoop);
}

mainLoop()