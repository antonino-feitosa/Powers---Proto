
import { Context, Render } from './Context';
import { Player } from './Entity';
import { Game } from './Main';
import { Point } from './Point';

const UIState = { Idle: 0, Log: 1, Invetory: 2, Cursor: 3, TextInput: 4, Messages: 5, ToolTip: 6 };

export class UIMessage {
    current: number = 0;
    sequence: string[] = [];
    call: () => void = () => { };
}

export class UITooltip {
    title: string = '';
    text: string = '';
    x: number = 0;
    y: number = 0
    call: () => void = () => { };
}

export class UIInput {
    text: string = '';
    call = (text: string) => { };
}

export class UICursorSelect {
    x = 0;
    y = 0;
    canMoveTo = (x: number, y: number) => true;
    call = (x: number, y: number) => { }
}

export class UIMessageSelect {
    title: string = '';
    options: string[] = [];
    index: number = -1;
    call: (index: number) => void = () => { };
}

export class UILog {
    messages: string[] = [];
    index: number = 0;
    processed: number = 0;
}

export class UI {
    game: Game;
    context: Context;

    state = UIState.Idle;
    numColsRight: number;
    numLinesBottom: number;

    alertMessage = '';
    messages = new UIMessage();
    tooltip = new UITooltip();
    textInput = new UIInput();
    cursorSelect = new UICursorSelect();
    selection = new UIMessageSelect();
    log = new UILog();

    constructor(game: Game, numLinesBottom = 4, numColsRight = 15) {
        this.game = game;
        this.context = game.context;
        this.numColsRight = numColsRight;
        this.numLinesBottom = numLinesBottom;
    }

    nextTurn(): void {
        this.alertMessage = '';
        this.log.index = this.log.processed;
    }

    input(player: Player, key: string): string { // TODO
        switch (this.state) {
            case UIState.Idle:
                switch (key) {
                    case "'": this.state = UIState.Log; break;
                    case '1':
                        let options = player.inventory.map(item => item.name);
                        this.selection = { title: 'Use Item', options: options, index: 0, call: player.actionUseItem.bind(this.game) };
                        this.state = UIState.Invetory;
                        break;
                    default:
                        if (!player.isDead)
                            return this.inputActions(player, key);
                }
                return 'draw';
            case UIState.Log:
                key === "'" && (this.state = UIState.Idle);
                return 'draw';
            case UIState.Invetory:
                switch (key) {
                    case 'y':
                        this.selection.call(this.selection.index);
                        this.state = UIState.Idle;
                        this.selection = { title: 'select', options: [], index: 0, call: () => 0 };
                        break;
                    case 'escape':
                        this.selection.call(-1);
                        this.state = UIState.Idle;
                        this.selection = { title: 'select', options: [], index: 0, call: () => 0 };
                        break;
                    case 'j':
                        let maxOption = this.selection.options.length - 1;
                        this.selection.index = Math.min(maxOption, this.selection.index + 1);
                        break;
                    case 'k':
                        this.selection.index = Math.max(0, this.selection.index - 1);
                        break;
                }
                return 'draw';
            case UIState.Cursor:
                let x = this.cursorSelect.x;
                let y = this.cursorSelect.y;
                switch (key) {
                    case 'a': this.cursorSelect.canMoveTo(x - 1, y + 0); this.cursorSelect.x -= 1; break;
                    case 'w': this.cursorSelect.canMoveTo(x + 0, y - 1); this.cursorSelect.y -= 1; break;
                    case 'x': this.cursorSelect.canMoveTo(x + 0, y + 1); this.cursorSelect.y += 1; break;
                    case 'd': this.cursorSelect.canMoveTo(x + 1, y + 0); this.cursorSelect.x += 1; break;
                    case 's': this.cursorSelect.call(x, y); this.state = UIState.Idle; break;
                    case 'escape': this.state = UIState.Idle; break;
                }
                return 'draw';
            case UIState.TextInput:
                if (key === 'enter') {
                    this.textInput.call(this.textInput.text);
                    this.textInput.text = '';
                    this.state = UIState.Idle;
                } else if (key === 'backspace') {
                    this.textInput.text = this.textInput.text.substring(0, this.textInput.text.length - 1);
                } else if (key === 'escape') {
                    this.textInput.text = '';
                    this.state = UIState.Idle;
                } else if (key === 'space') {
                    this.textInput.text += ' ';
                } else {
                    this.textInput.text += key;
                }
                return 'draw';
            case UIState.Messages:
                if (key === 's') {
                    this.messages.current += 1;
                    if (this.messages.current >= this.messages.sequence.length) {
                        this.messages.call();
                        this.state = UIState.Idle;
                        return 'draw';
                    }
                } else if (key === 'escape') {
                    this.messages.current = Math.max(0, this.messages.current - 1);
                    return 'draw';
                }
                return '';
            case UIState.ToolTip:
                if (key === 's' || key === 'escape') {
                    this.tooltip.call();
                    this.state = UIState.Idle;
                    return 'draw';
                }
                return '';
        }
        return '';
    }

    inputActions(player: Player, key: string): string {
        switch (key) {
            case 'a': player.actionMove(Point.left(player.pos)); break;
            case 'w': player.actionMove(Point.up(player.pos)); break;
            case 'x': player.actionMove(Point.down(player.pos)); break;
            case 'd': player.actionMove(Point.right(player.pos)); break;
            case 'q': player.actionMove(Point.upLeft(player.pos)); break;
            case 'e': player.actionMove(Point.upRight(player.pos)); break;
            case 'z': player.actionMove(Point.downLeft(player.pos)); break;
            case 'c': player.actionMove(Point.downRight(player.pos)); break;
            default: return '';
        }
        return 'action';
    }

    inputText(call: () => void): void {
        this.textInput.text = '';
        this.textInput.call = call;
        this.state = UIState.TextInput;
    }

    inputCursor(cursorSelect: UICursorSelect) {
        this.cursorSelect = cursorSelect;
    }

    printMessage(messages: UIMessage) {
        this.messages = messages;
        this.state = UIState.Messages;
    }

    printToolTip(tooltip: UITooltip) {
        this.tooltip = tooltip;
        this.state = UIState.ToolTip;
    }

    printAlertMessage(message: string) {
        this.alertMessage = message;
    }

    printLog(message: string) {
        let index = this.formatNumber(this.game.turnCount, 4);
        this.log.messages.push(` Turn ${index}: ` + message);
    }

    printSelection(selection: UIMessageSelect): void {
        this.selection = selection;
    }

    draw(): void {
        if (this.state === UIState.Log) {
            this.context.clear();
            this.drawLog();
        } else {
            this.drawRightBar();
            this.drawBottomBar();
            if (this.state === UIState.Invetory) {
                this.drawSelect();
            } else if (this.state === UIState.Cursor) {
                this.drawCursorSelect();
            } else if (this.state === UIState.TextInput) {
                this.drawInputText();
            } else if (this.state === UIState.Messages) {
                this.drawMessage();
            } else if (this.state === UIState.ToolTip) {
                this.drawToolTip();
            }
        }
    }

    drawLog(): void {
        const context = this.context;
        const messages = this.log.messages;
        let numToDisplay = Math.min(messages.length, context._height);
        for (let i = 0, index = messages.length - 1; i < numToDisplay; i++, index--) {
            let dy = numToDisplay < this.numLinesBottom - 1 ? numToDisplay - this.numLinesBottom - 1 : 0;
            this.fillMessage(messages[index], 0, context._height - 1 - i + dy, 'irish green');
        }
    }

    drawBottomBar(): void {
        const context = this.context;
        let start = '\u250D\u2501';
        let middle = this.alertMessage ? ' ' + this.alertMessage + ' ' : '';
        let end = '\u2501'.repeat(context._width - start.length - middle.length - 1) + '\u2511';

        let index = 0;
        index = this.fillMessage(start, index, context._height - 4);
        index = this.fillMessage(middle, index, context._height - 4, 'yellow');
        index = this.fillMessage(end, index, context._height - 4);

        const messages = this.log.messages;
        const count = this.log.index;
        let numToDisplay = messages.length - count;

        if (numToDisplay > this.numLinesBottom - 1) {
            let num = numToDisplay - this.numLinesBottom + 1;
            let textnum = this.formatNumber(num, 2);
            let str = ` more ${textnum} ... `;
            this.fillMessage(str, context._width - (str.length + 2), context._height - 4);
            numToDisplay = this.numLinesBottom - 1;
        }
        for (let i = 0, index = messages.length - 1; i < numToDisplay; i++, index--) {
            let dy = numToDisplay < 3 ? numToDisplay - 3 : 0;
            this.fillMessage(messages[index], 0, context._height - 1 - i + dy, 'white');
        }
        this.log.processed = messages.length;
    }

    drawRightBar(): void {
        const context = this.context;
        const barX = context._width - this.numColsRight;
        const render = new Render('\u2503', 'white', 'black');
        context.render(barX, 0, render);
        for (let i = 1; i < context._height - this.numLinesBottom; i++) {
            context.render(barX, i, render);
        }

        let turnMessage = 'Turn: ' + this.formatNumber(this.game.turnCount, 6)
        this.fillMessage(turnMessage, barX + 2, 1);
        let depthMessage = 'Depth: ' + this.formatNumber(this.game.depth, 5);
        this.fillMessage(depthMessage, barX + 2, 2);

        const player = this.game.player;
        let hp = player.combatStatus.hp;
        let maxHP = player.combatStatus.maxHP;
        let hpMessage = 'HP:  ' + this.formatNumber(hp, 3) + '/' + this.formatNumber(maxHP, 3);
        this.fillMessage(hpMessage, barX + 2, 4);
    }

    drawToolTip(): void {
        let text = this.tooltip.text.split('\n');
        let max = text.reduce((max, cur) => cur.length > max ? cur.length : max, 0);
        const title = this.tooltip.title;
        const x = this.tooltip.x;
        const y = this.tooltip.y;
        this.drawBox(title, x, y, max + 2, text.length + 2);
        for (let i = 0; i < text.length; i++) {
            this.fillMessage(text[i], x + 1, y + 1 + i);
        }
        this.fillMessage('(s)', x + 1, y + text.length + 1);
    }

    drawMessage(): void {
        let text = this.messages.sequence[this.messages.current].split('\n');
        this.drawBox('Message', 5, 5, 45, text.length + 2);
        for (let i = 0; i < text.length; i++) {
            this.fillMessage(text[i], 6, 6 + i);
        }
        this.fillMessage('(s) Next  (esc) Previous', 6, 6 + text.length);
    }

    drawInputText(): void {
        this.drawBox('Input Text', 5, 5, 45, 3);
        this.fillMessage(this.textInput.text, 6, 6);
    }

    drawCursorSelect(): void {
        let x = this.cursorSelect.x;
        let y = this.cursorSelect.y;
        let render = new Render(' ', 'white', 'green');
        this.context.render(x, y, render);
    }

    drawSelect(): void {
        const numDisplay = 5;
        const index = this.selection.index;
        const options = this.selection.options;
        const height = Math.min(8, options.length + 3);
        const x = 5;
        const y = 5;
        this.drawBox(this.selection.title, x, y, 20, height);
        if (index < 2) {
            for (let i = 0; i < Math.min(options.length, numDisplay); i++) {
                this.fillMessage(options[i], x + 1, y + i + 1, index === i ? 'green' : 'white');
            }
        } else if (index >= options.length - 3) {
            for (let i = options.length - numDisplay, count = y + 1; i < options.length; i++, count++) {
                this.fillMessage(options[i], x + 1, count, index === i ? 'green' : 'white');
            }
        } else {
            for (let i = index - 2, count = y + 1; i < index + 3; i++, count++) {
                this.fillMessage(options[i], x + 1, count, index === i ? 'green' : 'white');
            }
        }
        this.fillMessage('(y) OK  (esc) Cancel', x + 1, y + height - 2);
    }

    drawBox(title: string, x: number, y: number, width: number, height: number): void {
        const context = this.context;
        width = Math.max(title.length + 6, width);
        let str = '\u250C\u2500 ' + title + ' ';
        str += '\u2500'.repeat(width - str.length) + '\u2510';
        this.fillMessage(str, x, y);
        str = '\u2514' + '\u2500'.repeat(width - 1) + '\u2518';
        this.fillMessage(str, x, y + height - 1);
        const render = new Render('\u2502', 'white', 'black');
        for (let i = 1; i < height - 1; i++) {
            context.render(x, y + i, render);
            this.fillMessage(' '.repeat(width - 2), x + 1, y + i);
            context.render(x + width, y + i, render);
        }
    }

    fillMessage(msg: string, index: number, height: number, fg = 'white', bg = 'black'): number {
        let width = Math.min(this.context._width, msg.length);
        const render = new Render('', fg, bg);
        for (let c = 0; c < width; c++) {
            render.glyph = msg[c];
            this.context.render(c + index, height, render);
        }
        return index + width;
    }

    formatNumber(number: number, numPlaces: number): string {
        let str = ' '.repeat(numPlaces - 1) + number;
        return str.substring(str.length - numPlaces);
    }
}

module.exports = {
    UI
}