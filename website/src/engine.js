import {LuaFactory} from 'wasmoon'
import Chars from './chars.png';
import CharsText from './chars.txt?raw'

const FRAME_TIME = 1.0 / 60.0
const FRAME_TIME_MS = FRAME_TIME * 1000.0;
const CHAR_WIDTH = 16;

const PALETTE = [
    (0, 0, 1),
    (0, 1, 0),
    (0, 1, 1),
    (1, 0, 0),
    (1, 0, 1),
    (1, 1, 0),
    (1, 1, 1),
]

export class Game {
    constructor(script) {
        this.script = script;
    }
    toData() {
        return new TextEncoder().encode(this.script);
    }
    static fromData(data) {
        if (data === null) return null;
        const script = new TextDecoder().decode(data);
        if (script.length === 0) return null;
        return new Game(script);
    }
}

class Sprite {
    constructor(char, x, y) {
        this.char = char;
        this.x = x;
        this.y = y;
    }
    draw(engine) {
        engine.ctx.fillStyle = "white";
        var index = engine.spriteIndices[this.char];
        var spriteSheetWidth = engine.spriteSheet.width / 16;
        var x = (index % spriteSheetWidth);
        var y = Math.floor(index / spriteSheetWidth);
        engine.ctx.drawImage(engine.spriteSheet, x * CHAR_WIDTH, y * CHAR_WIDTH, CHAR_WIDTH, CHAR_WIDTH, this.x, this.y, CHAR_WIDTH, CHAR_WIDTH);
    }
}

export class Engine {
    constructor(gameCanvas) {
        this.spriteSheet = new Image();
        this.spriteSheet.src = Chars;
        this.spriteIndices = {};
        var lines = CharsText.split('\n');
        for (let i = 0; i < lines.length; i++)
        {
            var l = lines[i];
            this.spriteIndices[parseInt(l)] = i;
        }
        this.luaFactory = new LuaFactory();
        this.gameCanvas = gameCanvas;
        this.ctx = gameCanvas.getContext('2d');
    }
    async play(game) {
        // Setup (should override any existing values)
        this.game = game;
        this.sprites = [new Sprite(0, 0, 16)];
        // Setup Lua Environment
        this.lua = await this.luaFactory.createEngine()
        this.lua.global.set('FRAME_TIME', FRAME_TIME);
        this.lua.global.set('setSpritePos', (x, y) => {
            this.sprites[0].x = x;
            this.sprites[0].y = y;
        });
        this.lua.global.set('setSpriteChar', (s) => {
            if (typeof s === 'string')
            {
                this.sprites[0].char = s.codePointAt(0);
            }
            else if (typeof s === 'number')
            {
                this.sprites[0].char = s;
            }
        });
        // Load Script
        this.lua.doStringSync(this.game.script);
        // Get Lua References
        this.luaFrame = this.lua.global.get('frame');
        // Start
        requestAnimationFrame(this.#mainLoop.bind(this));
    }
    #mainLoop(timestamp) {
        if (this.#previousTimestamp === undefined) {
            this.#previousTimestamp = timestamp;
        }
        const elapsed = timestamp - this.#previousTimestamp;
        if (elapsed > FRAME_TIME_MS) {
            this.luaFrame();
            this.ctx.beginPath();
            // Fill Background
            this.ctx.fillStyle = "black";
            this.ctx.fillRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
            // Draw Sprites
            for (let sprite of this.sprites) {
                sprite.draw(this)
            }
            if (elapsed > FRAME_TIME_MS * 5) {
                console.log("Elapsed time is large, skipping frames")
                this.#previousTimestamp = timestamp;
            } else {
                this.#previousTimestamp += FRAME_TIME_MS;
            }
        }
        requestAnimationFrame((t) => this.#mainLoop(t));
    }
    #previousTimestamp;
}