
"use strict";

const { Context } = require('./Context');
const { Monster, Player, Item, Render } = require('./Entity');
const { Grid, Tile } = require('./Grid');
const { Random } = require('./Random');
const { TurnControl } = require('./Turn');
const { range } = require('./Utils');
const { UI } = require('./UI');

class Game {

    constructor(width, height, seed = 1, hasFog = true) {
        this.clearBuffer = true;

        this.width = width;
        this.height = height;
        this.rand = new Random(seed);
        this.hasFog = hasFog;
        this.depth = 1;
        this.turnCount = 0;

        this.turnControl = new TurnControl();
        this.passiveEntities = [];
        this.context = new Context(this.width + 20, this.height + 4);
        this.ui = new UI(this, 4, 15);
        this.start();
    }

    isOpaque(p) { return this.grid.tiles[p] === Tile.Wall; }
    moveCost(u, v) {
        let [x1, y1] = this.grid.Point.to2D(u);
        let [x2, y2] = this.grid.Point.to2D(v);
        //return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
        return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
    }
    neighborhood(p) {
        let ne = this.grid.Point.neighborhood(p);
        ne = ne.filter(n => !this.isOpaque(n));
        return ne;
    }

    start() {
        //this.grid = Grid.fromBernoulli(30, 20, rand);
        //this.grid = Grid.fromRandom(this.width, this.height, this.rand, 100);
        this.grid = Grid.fromEmpty(20, 20);

        !this.hasFog && (this.grid.visible = [... this.tiles.keys()]);

        let startRoom = this.rand.pick(this.grid.rooms);
        let startPosition = startRoom.center();
        let startIndex = this.grid.Point.from(startPosition[0], startPosition[1]);

        const player = this.player = new Player(this, startIndex);

        let potion = new Item(this, startIndex - 2, new Render('i', 'white', 'green'), 'Heal Potion');
        this.turnControl.push(player);
        this.passiveEntities.push(potion);
        //this.addMonsters(startRoom);
        this.addMonsters(null);

        this.context.clearBuffer = this.clearBuffer;
        this.context.start();
        this.context.listenInput((unicode, name) => {
            if (this.turnControl.peek() !== player) return;

            let key = name ? name : unicode;
            let res = this.ui.input(player, key);
            if (res === 'draw') {
                this.draw();
            } else if (res === 'action') {
                this.loop();
            }
        });
    }

    addMonsters(startRoom) {
        const grid = this.grid;
        const Point = grid.Point;
        const rand = this.rand;
        let names = ['orc', 'dwarf', 'human', 'elf', 'goblin', 'troll'];
        grid.rooms.filter(r => r !== startRoom).forEach(room => {
            let maxMonsters = Math.ceil((room.x1 - room.x2) * (room.y1 - room.y2) / 16);
            range(0, rand.nextInt(maxMonsters), () => {
                let [rx, ry] = room.randPos(rand);
                let pos = Point.from(rx, ry);
                if (!grid.blocked[pos]) {
                    let monster = new Monster(rand.pick(names) + ' #' + this.turnControl.length(), this, pos);
                    this.turnControl.push(monster);
                }
            });
        });
    }

    loop() {
        this.turnCount++;
        this.turnControl.nextTurn();
        this.ui.nextTurn();

        const turnControl = this.turnControl;
        const player = this.player;

        let current = turnControl.peek();
        while (current !== player && !current.update()) {
            if (current.isDead) {
                turnControl.del(current);
                current = turnControl.peek();
            } else {
                current = turnControl.nextTurn();
            }
        }
        if (current !== player) {
            nextTurn();
        }
        player.update();
        this.draw();
    }

    nextTurn() {
        setTimeout(this.loop.bind(this), 300);
    }

    useItem(index) {
        if (index !== null) {
            const player = this.player;
            let item = player.inventory[index];
            player.inventory = player.inventory.filter(i => i !== item);
            item.process(player);
            this.loop();
        }
    }

    draw() {
        const player = this.player;
        const context = this.context;

        context.clear();
        this.drawGrid();
        this.passiveEntities.forEach(p => p.draw());
        this.turnControl.values.forEach(m => m.draw());
        player.draw();

        this.ui.draw();
        context.build();
    }

    drawGrid() {
        if (this.hasFog) {
            this.grid.revealed.forEach((index) => {
                let [x, y] = this.grid.Point.to2D(index);
                let glyph = this.grid.tiles[index];
                this.context.render(x, y, glyph, 'grey', 'black');
            });

            this.grid.visible.forEach((index) => {
                let [x, y] = this.grid.Point.to2D(index);
                let glyph = this.grid.tiles[index];
                this.context.render(x, y, glyph, 'green', 'black');
            });
        }
    }
}

new Game(80, 20).loop();
