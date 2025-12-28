import {LuaFactory} from 'wasmoon'
import Chars from './chars.png';
import CharsText from './chars.txt?raw'
import Matter from 'matter-js'
import { SpriteDragConstraint } from './spriteDragConstraint.js'

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
    #x;
    #y;
    #px;
    #py;
    #drag;
    constructor(char, color, x, y) {
        this.char = char;
        this.color = color;
        this.#x = x;
        this.#y = y;
        this.#px = 0.0;
        this.#py = 0.0;
        this.wrap = 0;
        this.compact = true;
        this.body = Matter.Bodies.rectangle(this.#getBodyX(), this.#getBodyY(), CHAR_WIDTH, CHAR_WIDTH);
        this.body.isSensor = true;
        this.drag = false;
       
    }
    #getBodyX() {
        return this.#x - CHAR_WIDTH * this.#px + CHAR_WIDTH * 0.5;
    }
    #getBodyY() {
        return this.#y - CHAR_WIDTH * this.#py + CHAR_WIDTH * 0.5;
    }
    #getSpriteX() {
        return this.#x - CHAR_WIDTH * this.#px;
    }
    #getSpriteY() {
        return this.#y - CHAR_WIDTH * this.#py;
    }
    #getEntityXFromBody() {
        return this.body.position.x + CHAR_WIDTH * this.#px - CHAR_WIDTH * 0.5;
    }
    #getEntityYFromBody() {
        return this.body.position.y + CHAR_WIDTH * this.#py - CHAR_WIDTH * 0.5;
    }
    set x(value) {
        this.#x = value;
        Matter.Body.setPosition(this.body, {x: this.#getBodyX(), y: this.#getBodyY()});
        //Matter.Body.setVelocity(this.body, {x: 0, y: 0})
    }
    get x() {
        return this.#x;
    }
    set y(value) {
        this.#y = value;
        Matter.Body.setPosition(this.body, {x: this.#getBodyX(), y: this.#getBodyY()});
        //Matter.Body.setVelocity(this.body, {x: 0, y: 0})
    }
    get y() {
        return this.#y;
    }
    set drag(value) {
        this.#drag = value;
        this.body.plugin.drag = value;
    }
    get drag() {
        return this.#drag;
    }
    postPhysicsUpdate() {
        this.#x = this.#getEntityXFromBody();
        this.#y = this.#getEntityYFromBody();
    }
    draw(engine) {
        engine.ctx.fillStyle = "white";
        const array = Array.from(this.char);
        let offsetX = 0;
        let offsetY = 0;
        let roundedX = Math.round(this.#getSpriteX());
        let roundedY = Math.round(this.#getSpriteY());
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
            engine.ctx.drawImage(engine.drawBuffer, roundedX + offsetX, roundedY + offsetY);
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
        this.gameCanvas = gameCanvas;
        this.luaFactory = new LuaFactory();
        this.matterEngine = Matter.Engine.create({});
        this.matterEngine.gravity.scale = 0;
        this.spriteDragConstraint = SpriteDragConstraint.create(this.matterEngine, this.gameCanvas);
        Matter.Composite.add(this.matterEngine.world, this.spriteDragConstraint.constraint);
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
            Matter.Composite.add(this.matterEngine.world, newSprite.body);
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
            // Physics
            Matter.Engine.update(this.matterEngine, FRAME_TIME_MS);
            for (let sprite of this.sprites) {
                sprite.postPhysicsUpdate(this)
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