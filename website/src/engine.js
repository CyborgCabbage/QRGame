import {LuaFactory} from 'wasmoon'
import Chars from './chars.png';
import CharsText from './chars.txt?raw'

const FRAME_TIME = 1.0 / 60.0
const FRAME_TIME_MS = FRAME_TIME * 1000.0;
const CHAR_WIDTH = 16;

// https://lospec.com/palette-list/shmupy-16
const PALETTE = [
    '#101020',
    '#222244',
    '#334455',
    '#556666',
    '#664455',
    '#887766',
    '#999988',
    '#ccccaa',
    '#ffffee',
    '#cc5544',
    '#ff8822',
    '#ffcc33',
    '#88cc44',
    '#449944',
    '#44aaff',
    '#3377dd',
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
    constructor(char, color, x, y) {
        this.char = char;
        this.color = color;
        this.x = x;
        this.y = y;
        this.wrap = 0;
        this.compact = false;
    }
    draw(engine) {
        engine.ctx.fillStyle = "white";
        const array = Array.from(this.char);
        let offsetX = 0;
        let offsetY = 0;
        for (let i = 0; i < array.length; i++) {
            const codepoint = array[i].codePointAt(0);
            const data = engine.spriteSheetData[codepoint];
            const spriteSheetWidth = engine.spriteSheet.width / CHAR_WIDTH;
            const x = (data.index % spriteSheetWidth);
            const y = Math.floor(data.index / spriteSheetWidth);
            const isFullWidth = !this.compact || data.isFullWidth;
            const width = isFullWidth ? CHAR_WIDTH : CHAR_WIDTH / 2;
            if (this.wrap > 0 && offsetX + width > this.wrap * CHAR_WIDTH)
            {
                offsetX = 0;
                offsetY += CHAR_WIDTH;
            }
            // https://stackoverflow.com/a/4231508
            engine.dbctx.fillStyle = PALETTE[this.color];
            engine.dbctx.globalCompositeOperation = "source-over";
            engine.dbctx.fillRect(0, 0, engine.drawBuffer.width, engine.drawBuffer.height);
            engine.dbctx.globalCompositeOperation = "destination-atop";
            if (isFullWidth)
            {
                engine.dbctx.drawImage(engine.spriteSheet, x * CHAR_WIDTH, y * CHAR_WIDTH, CHAR_WIDTH, CHAR_WIDTH, 0, 0, CHAR_WIDTH, CHAR_WIDTH);
            }
            else
            {
                engine.dbctx.drawImage(engine.spriteSheet, x * CHAR_WIDTH + CHAR_WIDTH / 4, y * CHAR_WIDTH, CHAR_WIDTH / 2, CHAR_WIDTH, 0, 0, CHAR_WIDTH / 2, CHAR_WIDTH);
            }
            engine.ctx.drawImage(engine.drawBuffer, this.x + offsetX, this.y + offsetY);
            // Update offset
            offsetX += width
        }
    }
}

export class Engine {
    constructor(gameCanvas) {
        this.drawBuffer = document.createElement('canvas');
        this.drawBuffer.width = CHAR_WIDTH;
        this.drawBuffer.height = CHAR_WIDTH;
        this.dbctx = this.drawBuffer.getContext('2d');
        this.spriteSheet = new Image();
        this.spriteSheet.src = Chars;
        this.spriteSheetData = {};
        let lines = CharsText.split('\n');
        for (let i = 0; i < lines.length; i++)
        {
            let l = lines[i].split(',');
            this.spriteSheetData[parseInt(l[0])] = {
                index: i,
                isFullWidth: l[1] > 0
            }
        }
        this.luaFactory = new LuaFactory();
        this.gameCanvas = gameCanvas;
        this.ctx = gameCanvas.getContext('2d');
        gameCanvas.addEventListener('pointerdown', (event) => {
            if (this.luaTap)
            {
                this.luaTap();
            }
        });
    }
    async play(game) {
        // Setup (should override any existing values)
        this.game = game;
        this.sprites = [];
        // Setup Lua Environment
        this.lua = await this.luaFactory.createEngine()
        this.lua.global.set('FRAME_TIME', FRAME_TIME);
        this.lua.global.set('createSprite', (char, color, x, y) => {
            let newSprite = new Sprite(char, color, x, y);
            this.sprites.push(newSprite);
            return newSprite;
        });
        this.lua.global.set('destroySprite', (sprite) => {
            this.sprites = this.sprites.filter(s => s !== sprite);
        });
        // Load Script
        this.lua.doStringSync(this.game.script);
        // Get Lua References
        this.luaFrame = this.lua.global.get('frame');
        this.luaTap = this.lua.global.get('tap');
        // Start
        requestAnimationFrame(this.#mainLoop.bind(this));
    }
    #mainLoop(timestamp) {
        if (this.#previousTimestamp === undefined) {
            this.#previousTimestamp = timestamp;
        }
        const elapsed = timestamp - this.#previousTimestamp;
        if (elapsed > FRAME_TIME_MS) {
            // Frame
            if (this.luaFrame)
            {
                this.luaFrame();
            }
            // Rendering
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