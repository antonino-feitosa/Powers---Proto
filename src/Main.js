
"use strict";

const { Context } = require('./Context');
const { Monster, Player, Item, Render } = require('./Entity');
const { Grid, Tile } = require('./Grid');
const { DijkstraMap } = require('./DijkstraMap');
const { Random } = require('./Random');
const { Viewer } = require('./View');
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
        this.viewRange = 6;
        this.turnCount = 0;

        this.visibleEntities = [];
        this.context = new Context(this.width + 20, this.height + 4);
        this.ui = new UI(this, 4, 15);

        this.start();
    }

    isOpaque(p) { return this.grid.tiles[p] === Tile.Wall; }
    canOverlap(positionList) { return !positionList || positionList.reduce((can, e) => can && (e instanceof Item), true); }
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

        let startRoom = this.rand.pick(this.grid.rooms);
        let startPosition = startRoom.center();
        let startIndex = this.grid.Point.from(startPosition[0], startPosition[1]);
        this.player = new Player(this, startIndex);

        let neighborhood = (p) => this.neighborhood(p).filter(p => this.canOverlap(this.grid.pointToEntity[p]));
        this.viewer = new Viewer(this.viewRange, startIndex, this.grid.Point, this.isOpaque.bind(this), 'circle');
        this.heatMap = new DijkstraMap(new Map(), this.rand, neighborhood, this.moveCost.bind(this));

        new Item(this, startIndex - 2, new Render('i', 'white', 'green'), 'Heal Potion');
        
        //this.addMonsters(startRoom);
        this.addMonsters(null);

        this.startContext();
    }

    startContext(){
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
        const Point = grid.Point;
        const rand = this.rand;
        let names = ['orc', 'dwarf', 'human', 'elf', 'goblin', 'troll'];
        grid.rooms.filter(r => r !== startRoom).forEach(room => {
            let maxMonsters = Math.ceil((room.x1 - room.x2) * (room.y1 - room.y2) / 16);
            let count = 1;
            range(0, rand.nextInt(maxMonsters), () => {
                let [rx, ry] = room.randPos(rand);
                let pos = Point.from(rx, ry);
                if (!grid.pointToEntity[pos]) {
                    new Monster(rand.pick(names) + ' #' + count++, this, pos);
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
        viewer.isDirty = viewer.isDirty || viewer.center != player.point;
        if (viewer.isDirty) {
            viewer.center = player.point;
            viewer.radius = game.viewRange;
            
            grid.visible = [];
            viewer.calculate((pos, light) => {
                if (light > 0) {
                    grid.visible[pos] = pos;
                    grid.revealed[pos] = pos;
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
        heatMap.sources = new Map([[player.point, 0]]);
        heatMap.calculate(grid.visible);
        heatMap.makeRangeMap(withRange, viewer.radius);
        heatMap.makeFleeMap(withFlee);
    }

    processTurn(){
        const grid = this.grid;
        const pointToEntity = grid.pointToEntity;
        const visible = grid.visible;
        this.visibleEntities = [];
        visible.forEach(pos => pointToEntity[pos] != null && this.visibleEntities.push(... pointToEntity[pos]));
        this.visibleEntities.forEach(current => current.update());
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
        this.visibleEntities.forEach(m => m.draw());
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
        } else {
            this.grid.tiles.forEach((glyph, index) => {
                let [x, y] = this.grid.Point.to2D(index);
                this.context.render(x, y, glyph, 'green', 'black');
            });
        }
    }
}

new Game(80, 20).loop();
