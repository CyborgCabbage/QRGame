import {LuaFactory} from 'wasmoon'
import Matter from 'matter-js'
import { SpriteDragConstraint } from './spriteDragConstraint.js'
import { Game } from './game.js'
import charRenderer from './render.js'

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
    draw(context) {
        charRenderer.draw(context, this.char, this.#getSpriteX(), this.#getSpriteY(), PALETTE[this.color], this.wrap, this.compact)
    }
}

export class Engine {
    constructor(gameCanvas) {
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
                sprite.draw(this.ctx)
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