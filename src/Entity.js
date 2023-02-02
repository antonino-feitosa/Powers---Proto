
"use strict";

const { CombatEvent, CombatStatus } = require('./Combat');

class Render {
    constructor(glyph, fg = 'white', bg = 'black') {
        this.glyph = glyph;
        this.fg = fg;
        this.bg = bg;
    }
};

class Entity {
    constructor(game, pos, render) {
        this.game = game;
        this.pos = pos;
        this.render = render;

        const pointToEntity = game.grid.pointToEntity;
        !pointToEntity[pos] && (pointToEntity[pos] = []);
        pointToEntity[pos].push(this);
    }
    update() { };
}

class Item extends Entity {
    constructor(game, pos, render, name) {
        super(game, pos, render);
        this.inInventory = false;
        this.name = name;
        this.initiative = 20;
    }

    process(target) {
        let inc = Math.min(target.combatStatus.hp + 2, target.combatStatus.maxHP);
        target.combatStatus.hp = inc;
        this.game.ui.printLog(`The ${target.name} was healed!`);
        this.game.passiveEntities = this.game.passiveEntities.filter(x => x !== this);
    }
}

class Moveable extends Entity {

    canOverlap(positionList) {
        return !positionList || positionList.reduce((can, e) => can && (e instanceof Item), true);
    }

    tryMove(dest) {
        const entity = this;
        const game = this.game;
        const grid = game.grid;
        const pointToEntity = grid.pointToEntity;

        if (!game.isOpaque(dest)) {
            if (this.canOverlap(pointToEntity[dest])) {
                pointToEntity[dest] === undefined && (pointToEntity[dest] = []);
                pointToEntity[entity.pos] = pointToEntity[entity.pos].filter(e => e !== this);
                pointToEntity[dest].push(this);
                entity.pos = dest;
            }
        }
    }
}

class Unit extends Moveable {
    constructor(name, game, pos) {
        super(game, pos, new Render(name[0], 'white', 'black'));
        this.name = name;
        this.damage = [];
        this.messages = [];
        this.inventory = [];
        this.revealed = [];
        this.isDead = false;
        this.initiative = 20;
        this.combatStatus = new CombatStatus();
    }

    update() {
        this.processDamage(); if (this.idDead) { return; }
        this.processPick();
    }

    processDamage() {
        if (this.idDead) { return; }

        const game = this.game;
        const grid = game.grid;
        const pointToEntity = grid.pointToEntity;
        this.damage.forEach(de => {
            this.combatStatus.hp -= de.force
            game.ui.printLog(`The ${this.name} Suffers ${de.force} Points of Damage! `);
        });
        this.damage = [];
        if (this.combatStatus.hp <= 0) {
            game.ui.printLog(`The ${this.name} Dies!`);
            pointToEntity[this.pos] = pointToEntity[this.pos].filter(e => e !== this);
            this.isDead = true;
        }
    }

    processPick() {
        const game = this.game;
        const grid = game.grid;
        const point = this.pos;
        const pointToEntity = grid.pointToEntity;
        if (pointToEntity[point].length > 1) {
            pointToEntity[point].filter(x => x instanceof Item).forEach(item => {
                item.inInventory = true;
                this.inventory.push(item);
                game.ui.printLog(`The ${this.name} picked up: ${item.name}`);
            });
            pointToEntity[point] = pointToEntity[point].filter(x => x instanceof Item);
        }
    }

    inRange(pos, range = 0) { return Point.distance(this.pos, pos) <= range; }
}

class Player extends Unit {
    constructor(game, pos) {
        super('Player', game, pos);
        this.render.glyph = '@';
        this.render.fg = 'yellow';
    }

    canOverlap(positionList) {
        if (positionList) {
            positionList.filter(e => e instanceof Monster)
                .forEach(e => e.damage.push(new CombatEvent(this, 8)));
        }
        return super.canOverlap(positionList);
    }
}

class Monster extends Unit {
    constructor(name, game, pos) {
        super(name, game, pos);
        this.render.fg = 'red';
    }

    update() {
        this.processDamage(); if (this.idDead) { return; }
        this.processPick();

        const game = this.game;
        const player = game.player;
        const heatMap = game.heatMap;

        if (this.inRange(player.point)) {
            player.damage.push(new CombatEvent(this, 5));
            game.ui.printLog(`The ${this.name} Attacks!`);
        } else {
            let pos = heatMap.fleeMap.chase(this.point);
            this.tryMove(pos);
            game.rand.nextDouble() < 0.3 && game.ui.printLog(`${this.name} shouts a insult!`);
        }
    }
}

module.exports = {
    Render,
    Entity,
    Monster,
    Player,
    Item
}
