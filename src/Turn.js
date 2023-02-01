
class TurnControl {

    constructor() {
        this.values = [];
        this.turn = 0;
        this.insertCount = 0;
    }

    compare(x, y){
        let cmp = x.scheduling - y.scheduling;
        if(cmp === 0){
            cmp = x.insertOrder - y.insertOrder;
        }
        return cmp;
    }

    length() { return this.values.length; }

    del(element) {
        if (this.length() <= 0) { throw new Error('The heap is empty!'); }

        const values = this.values;
        let index = values.findIndex(e => e === element);
        if (index >= 0) {
            let e = values[index];
            values[index] = values[values.length - 1];
            values.length -= 1;
            if (values.length > index) {
                this._down(index);
            }
            return e;
        }
        return null;
    }

    nextTurn(){
        this.turn += this.peek().scheduling - this.turn;
        let element = this.pop();
        this.push(element);
        return this.peek();
    }

    push(element) {
        if (!element.initiative) { throw new Error('The element does not have initiative!'); }
        element.scheduling = element.initiative + this.turn;
        !element.insertOrder && (element.insertOrder = this.insertCount++);
        this.values.push(element);
        this._up(this.values.length - 1);
        return this;
    }

    pop() {
        if (this.length() <= 0) { throw new Error('The heap is empty!'); }
        let element = this.values[0];
        this.values[0] = this.values[this.values.length - 1];
        this.values.length -= 1;
        if (this.values.length > 0) {
            this._down(0);
        }
        element.scheduling = null;
        return element;
    }

    peek() {
        if (this.length <= 0) { throw new Error('The heap is empty!'); }
        return this.values[0];
    }

    _up(index) {
        if (index > 0) {
            let upindex = Math.floor((index - 1) / 2);
            if (this.compare(this.values[index], this.values[upindex]) < 0) {
                this._swap(index, upindex);
                this._up(upindex);
            }
        }
    }

    _swap(a, b) {
        const values = this.values;
        [values[a], values[b]] = [values[b], values[a]];
    }

    _down(index) {
        const values = this.values;
        let left = index * 2 + 1;
        let right = index * 2 + 2;
        if (right < values.length) {
            if (this.compare(values[right], values[left]) < 0) {
                left = right;
            }
        }
        if (left < values.length && this.compare(values[index], values[left]) > 0) {
            this._swap(index, left);
            this._down(left);
        }
    }
}

module.exports = {
    TurnControl
}
