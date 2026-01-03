export class Game {
    constructor(script, tiles) {
        this.script = script;
        this.tiles = tiles;
    }
    toData() {
        return new TextEncoder().encode(JSON.stringify(this));
    }
    static fromData(data) {
        if (data === null) return null;
        const string = new TextDecoder().decode(data);
        if (string.length === 0) return null;
        const parsed = JSON.parse(string);
        return new Game(parsed.script, parsed.tiles);
    }
}