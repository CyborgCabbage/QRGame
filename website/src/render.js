import Chars from './chars.png';
import CharsText from './chars.txt?raw'

const CHAR_WIDTH = 16;

class CharRenderer {
   constructor() {
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
    }
   draw(context, chars, posX, posY, color, wrap, compact) {
        context.fillStyle = "white";
        const array = Array.from(chars);
        let offsetX = 0;
        let offsetY = 0;
        let roundedX = Math.round(posX);
        let roundedY = Math.round(posY);
        for (let i = 0; i < array.length; i++) {
            const codepoint = array[i].codePointAt(0);
            const data = this.spriteSheetData[codepoint];
            const spriteSheetWidth = this.spriteSheet.width / CHAR_WIDTH;
            const x = (data.index % spriteSheetWidth);
            const y = Math.floor(data.index / spriteSheetWidth);
            const isFullWidth = !compact || data.isFullWidth;
            const width = isFullWidth ? CHAR_WIDTH : CHAR_WIDTH / 2;
            if (wrap > 0 && offsetX + width > wrap * CHAR_WIDTH)
            {
                offsetX = 0;
                offsetY += CHAR_WIDTH;
            }
            // https://stackoverflow.com/a/4231508
            this.dbctx.fillStyle = color;
            this.dbctx.globalCompositeOperation = "source-over";
            this.dbctx.fillRect(0, 0, this.drawBuffer.width, this.drawBuffer.height);
            this.dbctx.globalCompositeOperation = "destination-atop";
            if (isFullWidth)
            {
                this.dbctx.drawImage(this.spriteSheet, x * CHAR_WIDTH, y * CHAR_WIDTH, CHAR_WIDTH, CHAR_WIDTH, 0, 0, CHAR_WIDTH, CHAR_WIDTH);
            }
            else
            {
                this.dbctx.drawImage(this.spriteSheet, x * CHAR_WIDTH + CHAR_WIDTH / 4, y * CHAR_WIDTH, CHAR_WIDTH / 2, CHAR_WIDTH, 0, 0, CHAR_WIDTH / 2, CHAR_WIDTH);
            }
            context.drawImage(this.drawBuffer, roundedX + offsetX, roundedY + offsetY);
            // Update offset
            offsetX += width
        }
    }
}

export default new CharRenderer();