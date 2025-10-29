import {LuaFactory} from 'wasmoon'
import Chars from './chars.png';

const FRAME_TIME = 1.0 / 60.0
const FRAME_TIME_MS = FRAME_TIME * 1000.0;

export class Game {
    constructor(script) {
        this.script = script;
    }
    asURL() {
        return window.location.origin+window.location.pathname+"?s="+encodeURIComponent(this.script);
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
        engine.ctx.drawImage(engine.spriteSheet, (this.char % 4) * 16, Math.floor(this.char / 4) * 16, 16, 16, this.x, this.y, 16, 16);
    }
}

export class Engine {
    constructor(gameCanvas) {
        this.spriteSheet = new Image();
        this.spriteSheet.src = Chars;
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