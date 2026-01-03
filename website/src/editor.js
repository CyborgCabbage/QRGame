import { Game } from './game.js'

export class Editor {
    constructor(editorCanvas) {
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
}