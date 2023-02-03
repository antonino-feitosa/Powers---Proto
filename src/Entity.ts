
import { Point } from './Point';
import { Game } from './Main';
import { Render } from './Context';

export class CombatStatus {
    maxHP: number;
    hp: number;
    force: number;

    constructor(maxHP: number = 10, force: number = 5) {
        this.maxHP = maxHP;
        this.hp = this.maxHP;
        this.force = force;
    }
}

export class CombatEvent {
    source: Entity;
    force: number;

    constructor(source: Entity, force: number) {
        this.source = source;
        this.force = force;
    }
}

export class Entity {
    game: Game;
    pos: number;
    render: Render;
    isVisible: boolean;

    constructor(game: Game, pos: number, render: Render) {
        this.game = game;
        this.pos = pos;
        this.render = render;
        this.isVisible = true;

        const pointToEntity = game.grid.pointToEntity;
        const list = pointToEntity.get(pos);
        if (!list) {
            pointToEntity.set(pos, [this])
        } else {
            list.push(this);
        }
    }
    update(): void { };
}

export class Item extends Entity {
    name: string;
    inInventory: boolean;

    constructor(name: string, game: Game, pos: number) {
        super(game, pos, new Render('I', 'white', 'green'));
        this.inInventory = false;
        this.name = name;
    }

    process(target: Unit): void {
        let inc = Math.min(target.combatStatus.hp + 2, target.combatStatus.maxHP);
        target.combatStatus.hp = inc;
        this.game.ui.printLog(`The ${target.name} was healed!`);
    }
}

class Unit extends Entity {
    name: string;
    damage: CombatEvent[];
    messages: string[];
    inventory: Item[];
    isDead: boolean;
    combatStatus: CombatStatus;

    constructor(name: string, game: Game, pos: number) {
        super(game, pos, new Render(name[0], 'white', 'black'));
        this.name = name;
        this.damage = [];
        this.messages = [];
        this.inventory = [];
        this.isDead = false;
        this.combatStatus = new CombatStatus();
    }

    override update(): void {
        this.processDamage(); if (this.isDead) { return; }
        this.processPick();
    }

    canOverlap(positionList: Entity[]): boolean {
        return !positionList || positionList.reduce((can: boolean, e: Entity) => can && (e instanceof Item), true);
    }

    tryMove(dest: number): boolean {
        const entity = this;
        const game = this.game;
        const grid = game.grid;
        const pointToEntity = grid.pointToEntity;

        if (!game.isOpaque(dest)) {
            let listCurrent = pointToEntity.get(this.pos) || [];
            let listDest = pointToEntity.get(dest) || [];
            !pointToEntity.has(dest) && pointToEntity.set(dest, listDest);
            if (this.canOverlap(listDest)) {
                pointToEntity.set(entity.pos, listCurrent.filter((e: Entity) => e !== this));
                listDest.push(this);
                entity.pos = dest;
                return true;
            }
        }
        return false;
    }

    processDamage(): void {
        if (this.isDead) { return; }

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
            let listCurrent = pointToEntity.get(this.pos) || [];
            pointToEntity.set(this.pos, listCurrent.filter(e => e !== this));
            this.isDead = true;
        }
    }

    processPick(): void {
        const game = this.game;
        const grid = game.grid;
        const point = this.pos;
        const pointToEntity = grid.pointToEntity;
        let listCurrent = pointToEntity.get(point) || [];
        if (listCurrent.length > 1) {
            listCurrent.filter((x: Entity) => x instanceof Item).forEach((item: Item) => {
                item.inInventory = true;
                item.isVisible = false;
                this.inventory.push(item);
                game.ui.printLog(`The ${this.name} picked up: ${item.name}`);
            });
            pointToEntity.set(point, listCurrent.filter(x => !(x instanceof Item)));
        }
    }

    inRange(pos: number, range = 0): boolean { return Point.distance(this.pos, pos) <= range; }
}

export class Player extends Unit {
    constructor(game: Game, pos: number) {
        super('Player', game, pos);
        this.render.glyph = '@';
        this.render.fg = 'yellow';
    }

    override canOverlap(positionList: Entity[]): boolean {
        if (positionList) {
            positionList.filter(e => e instanceof Monster)
                .forEach((e:Monster) => e.damage.push(new CombatEvent(this, 8)));
        }
        return super.canOverlap(positionList);
    }
}

export class Monster extends Unit {
    constructor(name: string, game: Game, pos: number) {
        super(name, game, pos);
        this.render.fg = 'red';
    }

    override update(): void {
        this.processDamage(); if (this.isDead) { return; }
        this.processPick();

        const game = this.game;
        const player = game.player;
        const heatMap = game.heatMap;

        if (this.inRange(player.pos)) {
            player.damage.push(new CombatEvent(this, 5));
            game.ui.printLog(`The ${this.name} Attacks!`);
        } else {
            let pos = heatMap.fleeMap.chase(this.pos);
            this.tryMove(pos);
            game.rand.nextDouble() < 0.3 && game.ui.printLog(`${this.name} shouts a insult!`);
        }
    }
}
