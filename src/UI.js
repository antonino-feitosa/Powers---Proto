
const UIState = { Idle: 0, Log: 1, Invetory: 2, Cursor: 3, TextInput: 4, Messages: 5, ToolTip: 6 };

class UI {
    constructor(game, numLinesBottom = 4, numColsRight = 15) {
        this.game = game;
        this.context = game.context;
        this.state = UIState.Idle;
        this.numColsRight = numColsRight;
        this.numLinesBottom = numLinesBottom;

        this.alertMessage = '';
        this.messages = { current: 0, sequence: [], call: () => 0 };
        this.tooltip = { title: '', text: '', x: 0, y: 0, call: () => 0 }
        this.textInput = { text: '', call: () => 0 };
        this.cursorSelect = { x: 0, y: 0, canMoveTo: () => true, call: () => 0 };
        this.selection = { title: 'select', options: [], index: 0, call: () => 0 };
        this.log = { messages: [], index: 0, processed: 0 };
    }

    nextTurn() {
        this.alertMessage = '';
        this.log.index = this.log.processed;
    }

    input(player, key) {
        switch (this.state) {
            case UIState.Idle:
                switch (key) {
                    case "'": this.state = UIState.Log; break;
                    case '1':
                        let options = player.inventory.map(item => item.name);
                        this.selection = { title: 'Use Item', options: options, index: 0, call: this.game.useItem.bind(this.game) };
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
                    case 'b':
                    case '1':
                        this.selection.call(null);
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
                    case 'h': this.cursorSelect.canMoveTo(x - 1, y + 0); this.cursorSelect.x -= 1; break;
                    case 'k': this.cursorSelect.canMoveTo(x + 0, y - 1); this.cursorSelect.y -= 1; break;
                    case 'j': this.cursorSelect.canMoveTo(x + 0, y + 1); this.cursorSelect.y += 1; break;
                    case 'l': this.cursorSelect.canMoveTo(x + 1, y + 0); this.cursorSelect.x += 1; break;
                    case 'y': this.cursorSelect.call(x, y); this.state = UIState.Idle; break;
                    case 'b': this.state = UIState.Idle; break;
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
                if (key === 'y') {
                    this.messages.current += 1;
                    if (this.messages.current >= this.messages.sequence.length) {
                        this.messages.call();
                        this.state = UIState.Idle;
                    }
                    return 'draw';
                } else if (key === 'b') {
                    this.messages.current = Math.max(0, this.messages.current - 1);
                    return 'draw';
                }
            case UIState.ToolTip:
                if (key === 'y' || key === 'b') {
                    this.tooltip.call();
                    this.state = UIState.Idle;
                    return 'draw';
                }
        }
    }

    inputActions(player, key) {
        switch (key) {
            case 'h': player.tryMove(-1, +0); break;
            case 'k': player.tryMove(+0, -1); break;
            case 'j': player.tryMove(+0, +1); break;
            case 'l': player.tryMove(+1, +0); break;
            case 'y': player.tryMove(-1, -1); break;
            case 'u': player.tryMove(+1, -1); break;
            case 'b': player.tryMove(-1, +1); break;
            case 'n': player.tryMove(+1, +1); break;
            default: return null;
        }
        return 'action';
    }

    inputText(call) {
        this.textInput.text = '';
        this.textInput.call = call;
        this.state = UIState.TextInput;
    }

    inputCursor(x, y, canMoveTo, call) {
        this.cursorSelect.x = x;
        this.cursorSelect.y = y;
        this.cursorSelect.canMoveTo = canMoveTo;
        this.cursorSelect.call = call;
    }

    printMessage(messages, call) {
        this.messages.current = 0;
        this.messages.sequence = messages;
        this.messages.call = call;
        this.state = UIState.Messages;
    }

    printToolTip(title, x, y, text, call) {
        this.tooltip.title = title;
        this.tooltip.x = x;
        this.tooltip.y = y;
        this.tooltip.text = text;
        this.tooltip.call = call;
        this.state = UIState.ToolTip;
    }

    printAlertMessage(message) {
        this.alertMessage = message;
    }

    printLog(message) {
        let index = this.formatNumber(this.game.turnCount, 4);
        this.log.messages.push(` Turn ${index}: ` + message);
    }

    printSelection(title, options, call) {
        this.selection.title = title;
        this.selection.index = 0;
        this.selection.options = options;
        this.selection.call = call;
    }

    draw() {
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

    drawLog() {
        const context = this.context;
        const messages = this.log.messages;
        let numToDisplay = Math.min(messages.length, context.height);
        for (let i = 0, index = messages.length - 1; i < numToDisplay; i++, index--) {
            let dy = numToDisplay < this.numLinesBottom - 1 ? numToDisplay - this.numLinesBottom - 1 : 0;
            this.fillMessage(messages[index], 0, context.height - 1 - i + dy, 'irish green');
        }
    }

    drawBottomBar() {
        const context = this.context;
        let start = '\u250D\u2501';
        let middle = this.alertMessage ? ' ' + this.alertMessage + ' ' : '';
        let end = '\u2501'.repeat(context.width - start.length - middle.length - 1) + '\u2511';

        let index = 0;
        index = this.fillMessage(start, index, context.height - 4);
        index = this.fillMessage(middle, index, context.height - 4, 'yellow');
        index = this.fillMessage(end, index, context.height - 4);

        const messages = this.log.messages;
        const count = this.log.index;
        let numToDisplay = messages.length - count;

        if (numToDisplay > this.numLinesBottom - 1) {
            let num = numToDisplay - this.numLinesBottom + 1;
            num = this.formatNumber(num, 2);
            let str = ` more ${num} ... `;
            this.fillMessage(str, context.width - (str.length + 2), context.height - 4);
            numToDisplay = this.numLinesBottom - 1;
        }
        for (let i = 0, index = messages.length - 1; i < numToDisplay; i++, index--) {
            let dy = numToDisplay < 3 ? numToDisplay - 3 : 0;
            this.fillMessage(messages[index], 0, context.height - 1 - i + dy, 'white');
        }
        this.log.processed = messages.length;
    }

    drawRightBar() {
        const context = this.context;
        const barX = context.width - this.numColsRight;
        context.render(barX, 0, '\u2503');
        for (let i = 1; i < context.height - this.numLinesBottom; i++) {
            context.render(barX, i, '\u2503');
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

    drawToolTip() {
        let text = this.tooltip.text.split('\n');
        let max = text.reduce((max, cur) => cur.length > max ? cur.length : max, 0);
        const title = this.tooltip.title;
        const x = this.tooltip.x;
        const y = this.tooltip.y;
        this.drawBox(title, x, y, max + 2, text.length + 2);
        for (let i = 0; i < text.length; i++) {
            this.fillMessage(text[i], x + 1, y + 1 + i);
        }
        this.fillMessage('(y)', x + 1, y + text.length + 1);
    }

    drawMessage() {
        let text = this.messages.sequence[this.messages.current].split('\n');
        this.drawBox('Message', 5, 5, 45, text.length + 2);
        for (let i = 0; i < text.length; i++) {
            this.fillMessage(text[i], 6, 6 + i);
        }
        this.fillMessage('(y) Next  (b) Previous', 6, 6 + text.length);
    }

    drawInputText() {
        this.drawBox('Input Text', 5, 5, 45, 3);
        this.fillMessage(this.textInput.text, 6, 6);
    }

    drawCursorSelect() {
        let x = this.cursorSelect.x;
        let y = this.cursorSelect.y;
        this.context.render(x, y, ' ', 'white', 'green');
    }

    drawSelect() {
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
        this.fillMessage('(y) OK  (b) Cancel', x + 1, y + height - 2);
    }

    drawBox(title, x, y, width, height) {
        const context = this.context;
        width = Math.max(title.length + 6, width);
        let str = '\u250C\u2500 ' + title + ' ';
        str += '\u2500'.repeat(width - str.length) + '\u2510';
        this.fillMessage(str, x, y);
        str = '\u2514' + '\u2500'.repeat(width - 1) + '\u2518';
        this.fillMessage(str, x, y + height - 1);
        for (let i = 1; i < height - 1; i++) {
            context.render(x, y + i, '\u2502', 'white', 'black');
            this.fillMessage(' '.repeat(width - 2), x + 1, y + i);
            context.render(x + width, y + i, '\u2502', 'white', 'black');
        }
    }

    fillMessage(msg, index, height, fg = 'white', bg = 'black') {
        let width = Math.min(this.context.width, msg.length);
        for (let c = 0; c < width; c++) {
            this.context.render(c + index, height, msg[c], fg, bg);
        }
        return index + width;
    }

    formatNumber(number, numPlaces) {
        let str = ' '.repeat(numPlaces - 1) + number;
        return str.substring(str.length - numPlaces);
    }
}

module.exports = {
    UI
}