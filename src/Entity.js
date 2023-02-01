
"use strict";

const { Viewer } = require('./View');
const { DijkstraMap } = require('./DijkstraMap');
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
        this.point = pos;
        this.render = render;

        const blocked = game.grid.blocked;
        !blocked[pos] && (blocked[pos] = []);
        blocked[pos].push(this);
    }
    update() { };

    draw() {
        const game = this.game;
        const grid = game.grid;
        const context = game.context;
        const render = this.render;

        let [x, y] = grid.Point.to2D(this.point);
        context.render(x, y, render.glyph, render.fg, render.bg);
    }
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

    draw() {
        !this.inInventory && super.draw();
    }
}

class Moveable extends Entity {

    canOverlap(blocked) {
        return !blocked || blocked.reduce((can, e) => can && (e instanceof Item), true);
    }

    tryMove(x, y) {
        const entity = this;
        const game = this.game;
        const grid = game.grid;
        const blocked = grid.blocked;

        let [ox, oy] = grid.Point.to2D(entity.point);
        let dest = grid.Point.from(x + ox, y + oy);
        if (grid.Point.is2DValid(x + ox, y + oy) && !game.isOpaque(dest)) {
            if (this.canOverlap(blocked[dest])) {
                !blocked[dest] && (blocked[dest] = []);

                blocked[entity.point] = blocked[entity.point].filter(e => e !== this);
                blocked[dest].push(this);
                entity.point = dest;
                entity.viewer.center = dest;
                entity.viewer.isDirty = true;
            }
        } else {
            entity.viewer.isDirty = false;
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
        let neighborhood = (p) => game.neighborhood(p).filter(p => this.canOverlap(game.grid.blocked[p]));
        this.viewer = new Viewer(6, pos, game.grid.Point, game.isOpaque.bind(game), 'circle');
        this.heatMap = new DijkstraMap(new Map(), game.rand, neighborhood, game.moveCost.bind(game));
    }

    processDamage() {
        if (this.idDead) { return; }

        const game = this.game;
        const grid = game.grid;
        const blocked = grid.blocked;
        this.damage.forEach(de => {
            this.combatStatus.hp -= de.force
            game.ui.printLog(`The ${this.name} Suffers ${de.force} Points of Damage! `);
        });
        this.damage = [];
        if (this.combatStatus.hp <= 0) {
            game.ui.printLog(`The ${this.name} Dies!`);
            blocked[this.point] = blocked[this.point].filter(e => e !== this);
            this.isDead = true;
        }
    }

    processPick() {
        const game = this.game;
        const grid = game.grid;
        const point = this.point;
        const blocked = grid.blocked;
        if (blocked[point].length > 1) {
            blocked[point].filter(x => x instanceof Item).forEach(item => {
                item.inInventory = true;
                this.inventory.push(item);
                game.ui.printLog(`The ${this.name} picked up: ${item.name}`);
            });
            blocked[point] = blocked[point].filter(x => x instanceof Item);
        }
    }

    processView() {
        const viewer = this.viewer;
        if (viewer.isDirty) {
            viewer.calculate(pos => this.revealed[pos] = pos);
            viewer.isDirty = false;
        }
    }

    processMotion(withRange = -1.2, withFlee = -1.2) {
        const viewer = this.viewer;
        const heatMap = this.heatMap;
        heatMap.calculate(this.revealed);
        withRange && heatMap.makeRangeMap(-1.2, viewer.radius);
        withFlee && heatMap.makeFleeMap(-1.2);
    }
}

class Player extends Unit {
    constructor(game, pos) {
        super('Player', game, pos);
        this.render.glyph = '@';
        this.render.fg = 'yellow';
    }

    canOverlap(blocked) {
        if (blocked) {
            blocked.filter(e => e instanceof Monster)
                .forEach(e => e.damage.push(new CombatEvent(this, 8)));
        }
        return super.canOverlap(blocked);
    }

    update() {
        const game = this.game;
        const player = this;
        const grid = game.grid;

        this.processDamage(); if (this.idDead) { return; }
        this.processPick();

        if (player.viewer.isDirty) {
            game.hasFog && (grid.visible = []);
            player.viewer.calculate((pos, light) => {
                if (light > 0) {
                    game.hasFog && (grid.visible[pos] = pos);
                    grid.revealed[pos] = pos;
                }
            });
        }
    }

    draw() {
        super.draw();
        const player = this;
        const game = this.game;
        const grid = game.grid;
        const heatMap = this.heatMap;
        if (game.lit && false) {

            player.viewer.calculate((pos, light) => {
                if (light > 0) {
                    game.hasFog && (grid.visible[pos] = pos);
                    grid.revealed[pos] = pos;
                }
            });

            heatMap.sources = new Map([[player.point, 0]]);
            heatMap.calculate(grid.visible);
            heatMap.makeFleeMap(-1.2);
            heatMap.makeRangeMap(-1.2, 4);

            const context = game.context;
            heatMap.rangeMap.dist.forEach((val, p) => {
                //val = Math.abs(val);
                if (val < 9) {
                    let str = val.toFixed(0);
                    let [x, y] = grid.Point.to2D(p);
                    context.render(x, y, str);
                } else {
                    let [x, y] = grid.Point.to2D(p);
                    context.render(x, y, '.', 'red');
                }
            });
        }

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
        this.processView();

        const game = this.game;
        const grid = game.grid;
        const player = game.player;
        const viewer = this.viewer;
        const heatMap = this.heatMap;

        if (player.viewer.lightMap.get(this.point) > 0) {
            this.heatMap.sources = new Map([[game.player.point, 0]]);
            this.processMotion();

            let moveIndex = heatMap.fleeMap.chase(this.point);
            if (this.inContact().includes(player)) {
                player.damage.push(new CombatEvent(this, 5));
                game.ui.printLog(`The ${this.name} Attacks!`);
            } else {
                let [dx, dy] = grid.Point.to2D(moveIndex);
                let [x, y] = grid.Point.to2D(this.point);
                this.tryMove(dx - x, dy - y);
                game.rand.nextDouble() < 1 && game.ui.printLog(`${this.name} shouts a insult!`);
            }
        }
    }

    inContact() {
        const game = this.game;
        const grid = game.grid;
        const blocked = grid.blocked;
        let entities = [];
        game.neighborhood(this.point).forEach(n => blocked[n] && entities.push(...blocked[n]));
        return entities;
    }

    draw() {
        const game = this.game;
        const grid = game.grid;

        if (grid.visible[this.point] || !game.hasFog) {
            super.draw(game);
        }

        if (game.lit && this.heatMap.rangeMap) {
            const viewer = this.viewer;
            const heatMap = this.heatMap;
            const player = game.player;

            viewer.calculate(pos => this.revealed[pos] = pos);
            heatMap.sources = new Map([[player.point, 0]]);
            heatMap.calculate(this.revealed);
            heatMap.makeRangeMap(-1.2, viewer.radius);
            heatMap.makeFleeMap(-1.2);

            this.heatMap.fleeMap.dist.forEach((val, p) => {
                val = Math.abs(val);
                if (val < 9) {
                    let str = val.toFixed(0);
                    let [x, y] = grid.Point.to2D(p);
                    game.context.render(x, y, str);
                } else {
                    let [x, y] = grid.Point.to2D(p);
                    game.context.render(x, y, '.', 'red');
                }
            });
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
