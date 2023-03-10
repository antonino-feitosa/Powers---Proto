

export class Render {
    glyph: string;
    fg: string;
    bg: string;

    constructor(glyph: string, fg = 'white', bg = 'black') {
        this.glyph = glyph;
        this.fg = fg;
        this.bg = bg;
    }
}

export class Context {

    width: number;
    height: number;
    _width: number;
    _height: number;
    background: string;
    foreground: string;
    clearBuffer: boolean;
    matrix: string[][];

    constructor(width = 80, height = 50) {
        this.width = width;
        this.height = height;
        this._width = width + 20;
        this._height = height + 4;

        this.background = 'black';
        this.foreground = 'white';
        this.clearBuffer = true;

        let bg = Context._applyColor(' ', this.foreground, this.background);
        this.matrix = new Array<string[]>(this._height).fill([]);
        this.matrix.forEach((_, index) => this.matrix[index] = new Array<string>(this._width).fill(bg));
    }

    start(): void {
        this.clearBuffer && process.stdout.write('\u001b[?1049h'); // enable alternative buffer
        this.clearBuffer && process.stdout.write('\u001b[?25l'); // hide cursor
    }

    render(x: number, y: number, render: Render): void {
        this.matrix[y][x] = Context._applyColor(render.glyph, render.fg, render.bg);
    }

    build(): void {
        this.clearBuffer && process.stdout.write(`\x1b[${this._height + 1}A`); // move to start
        this.matrix.forEach(row => console.log(row.join('')));
        this.clear();
    }

    clear(): void {
        let back = Context._applyColor(' ', this.foreground, this.background);
        this.matrix.forEach(row => row.fill(back));
    }

    dispose(): void {
        process.stdin.pause();
        process.stdout.write('\u001b[0m'); // reset colors and modes
        process.stdout.write('\u001b[?25h'); // restore cursor (ANSI escape sequence)
    }

    listenInput(call: (key: string, name: string) => void): void {
        if (process.stdin.isTTY) {
            const dispose = this.dispose.bind(this);
            process.stdin.on('data', function (key) {
                if (typeof key === 'string') {
                    let name = Context.CodeToName.get(key);
                    if (name === 'ctrl+c') {
                        dispose();
                    } else if (!name) {
                        name = "";
                    }
                    call(key, name);
                }
            });
            process.stdin.setEncoding('utf8');
            process.stdin.setRawMode(true); // input whitout enter
            process.stdin.resume(); // waiting input (process.exit() or process.pause())
        } else {
            console.error('Can not start listen input! It requires TTY console.')
        }
    }

    static Color = new Map([
        ['black', '000000'],
        ['white', 'FFFFFF'],
        ['yellow', 'FFFF00'],
        ['green', '00FF00'],
        ['blue', '0000FF'],
        ['red', 'FF0000'],
        ['grey', '808080'],
        ['silver', 'ADADC9'],
        ['ash', '5654C4D'],
        ['shadow', '373737'],
        ['office green', '008000'],
        ['irish green', '13A10E']
    ]);

    static CodeToName = new Map([
        ['\u0003', 'ctrl+c'],
        ['\u000D', 'enter'],
        ['\u001B', 'escape'],
        ['\u0008', 'backspace'],
        ['\u0020', 'space'],
        ['\u0009', 'tab'],
        ['\u000F', 'shift-in'],
        ['\u000E', 'shift-out'],
        ['\u0020', 'space'],
        ['\u001B\u005B\u0041', 'up'],
        ['\u001B\u005B\u0042', 'down'],
        ['\u001B\u005B\u0043', 'right'],
        ['\u001B\u005B\u0044', 'left']
    ]);

    static _applyColor = function (text: string, fg = 'white', bg = 'black') {
        let fgColor = Context.Color.get(fg);
        let bgColor = Context.Color.get(bg);
        let convert = (c: string) => {
            let r = parseInt(c.substring(0, 2), 16);
            let g = parseInt(c.substring(2, 4), 16);
            let b = parseInt(c.substring(4, 6), 16);
            return r + ';' + g + ';' + b;
        };
        fgColor = convert(fgColor ? fgColor : '000000');
        bgColor = convert(bgColor ? bgColor : '000000');
        return `\u001b[38;2;${fgColor}m\u001b[48;2;${bgColor}m` + text;
    }
}
