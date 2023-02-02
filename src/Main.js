
"use strict";

const { Context } = require('./Context');
const { Monster, Player, Item, Render } = require('./Entity');
const { Point } = require('./Point');
const { Grid, Tile } = require('./Grid');
const { DijkstraMap } = require('./DijkstraMap');
const { Random } = require('./Random');
const { Viewer } = require('./View');
const { range } = require('./Utils');
const { UI } = require('./UI');

class Game {

    constructor(width, height, seed = 1, hasFog = false) {
        this.clearBuffer = false;

        this.width = width;
        this.height = height;
        this.rand = new Random(seed);
        this.hasFog = hasFog;
        this.depth = 1;
        this.viewRange = 6;
        this.turnCount = 0;
        this.camera = { x: 0, y: 0 };

        this.visibleEntities = [];
        this.context = new Context(this.width, this.height);
        this.ui = new UI(this, 4, 15);

        this.start();
    }

    isOpaque(p) { return !this.grid.floor.has(p) }
    canOverlap(positionList) { return !positionList || positionList.reduce((can, e) => can && (e instanceof Item), true); }
    moveCost(u, v) { return Point.distance(u, v); }
    neighborhood(p) { return Point.neighborhood(p).filter(n => !this.isOpaque(n)); }

    start() {
        //this.grid = Grid.fromBernoulli(30, 20, rand);
        //this.grid = Grid.fromRandom(this.width, this.height, this.rand, 100);
        this.grid = Grid.fromRoomEmpty(Point.from(0, 0), 20, 20);

        let startRoom = this.rand.pick(this.grid.rooms);
        let positions = Array.from(startRoom.keys());
        let startIndex = this.rand.pick(positions);
        this.player = new Player(this, startIndex);

        let neighborhood = (p) => this.neighborhood(p).filter(p => this.canOverlap(this.grid.pointToEntity.get(p)));
        this.viewer = new Viewer(this.viewRange, startIndex, Point, this.isOpaque.bind(this), 'circle');
        this.heatMap = new DijkstraMap(new Map(), this.rand, neighborhood, this.moveCost.bind(this));

        let item = new Item(this, startIndex - 2, new Render('i', 'white', 'green'), 'Heal Potion');
        console.log(Point.to2D(this.player.pos));

        //this.addMonsters(startRoom);
        this.addMonsters(null);

        this.startContext();
    }

    startContext() {
        const player = this.player;
        this.context.clearBuffer = this.clearBuffer;
        this.context.start();
        this.context.listenInput((unicode, name) => {
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
        const rand = this.rand;
        let names = ['orc', 'dwarf', 'human', 'elf', 'goblin', 'troll'];
        grid.rooms.filter(r => r !== startRoom).forEach(room => {
            let maxMonsters = Math.floor(room.size / 16);
            range(0, rand.nextInt(maxMonsters), (id) => {
                let positions = Array.from(room.keys());
                let pos = rand.pick(positions);
                if (!grid.pointToEntity.has(pos)) {
                    new Monster(rand.pick(names) + ' #' + id, this, pos);
                }
            });
        });
    }

    loop() {
        const game = this;
        const player = game.player;
        game.turnCount++;
        game.ui.nextTurn();
        player.update();
        game.processView();
        game.processMotion();
        game.processTurn();
        game.draw();
    }

    processView() {
        const game = this;
        const grid = game.grid;
        const viewer = game.viewer;
        const player = game.player;
        viewer.isDirty = viewer.isDirty || viewer.center != player.pos;
        if (viewer.isDirty) {
            viewer.center = player.pos;
            viewer.radius = game.viewRange;

            grid.visible = new Map();
            viewer.calculate((pos, light) => {
                if (light > 0) {
                    grid.visible.set(pos, pos);
                    grid.revealed.set(pos, pos);
                }
            });
            viewer.isDirty = false;
        }
    }

    processMotion(withRange = -1.2, withFlee = -1.2) {
        const grid = this.grid;
        const viewer = this.viewer;
        const heatMap = this.heatMap;
        const player = this.player;
        heatMap.sources = new Map([[player.pos, 0]]);
        heatMap.calculate(grid.visible);
        heatMap.makeRangeMap(withRange, viewer.radius);
        heatMap.makeFleeMap(withFlee);
    }

    processTurn() {
        const grid = this.grid;
        const pointToEntity = grid.pointToEntity;
        const visible = grid.visible;
        this.visibleEntities = [];
        const visibleEntities = this.visibleEntities;
        visible.forEach(pos => pointToEntity.has(pos) && visibleEntities.push(...pointToEntity.get(pos)));
        visibleEntities.forEach(current => current.update());
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
        const game = this;
        const player = game.player;
        const context = game.context;
        const camera = game.camera;
        let [cx, cy] = Point.to2D(player.pos);
        camera.x = cx - Math.floor(context.width / 2);
        camera.y = cy - Math.floor(context.height / 2);

        context.clear();
        game.drawGrid(camera.x, camera.y);
        game.visibleEntities.forEach(m => {
            let [x, y] = Point.to2D(m.pos);
            context.render(x - camera.x, y - camera.y, m.render.glyph, m.render.fg, m.render.bg);
        });

        game.ui.draw();
        context.build();
    }

    drawGrid(xoff, yoff) {
        const game = this;
        const grid = game.grid;
        const context = game.context;

        for (let y = 0; y < context.height; y++) {
            for (let x = 0; x < context.width; x++) {
                let pos = Point.from(xoff + x, yoff + y);
                if (this.hasFog) {
                    if (grid.revealed.has(pos)) {
                        grid.floor.has(pos) && context.render(x, y, grid.floor.get(pos), 'grey', 'black');
                        grid.walls.has(pos) && context.render(x, y, grid.walls.get(pos), 'grey', 'black');
                    }
                    if (grid.visible.has(pos)) {
                        grid.floor.has(pos) && context.render(x, y, grid.floor.get(pos), 'green', 'black');
                        grid.walls.has(pos) && context.render(x, y, grid.walls.get(pos), 'green', 'black');
                    }
                } else {
                    grid.floor.has(pos) && context.render(x, y, grid.floor.get(pos), 'green', 'black');
                    grid.walls.has(pos) && context.render(x, y, grid.walls.get(pos), 'green', 'black');
                }
            }
        }
    }
}

new Game(80, 20).loop();
