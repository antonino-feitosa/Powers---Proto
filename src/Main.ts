
import { Context, Render } from "./Context";
import { Monster, Player, Item, Entity } from "./Entity";
import { Point } from "./Point";
import { Grid } from "./Grid";
import { MapBuilder } from "./GridBuild";
import { DijkstraMap } from "./DijkstraMap";
import { Random } from "./Random";
import { Viewer } from "./View";
import { UI } from "./UI";

export class Game {
    clearBuffer = true;

    width: number;
    height: number;
    rand: Random;
    hasFog: boolean;
    grid: Grid;
    player: Player;
    heatMap: DijkstraMap;
    viewer: Viewer;
    visibleEntities: Entity[];

    depth = 1;
    viewRange = 6;
    turnCount = 0;
    camera = { x: 0, y: 0 };

    context: Context;
    ui: UI;

    constructor(width: number, height: number, seed = 1, hasFog = false) {
        this.width = width;
        this.height = height;
        this.rand = new Random(seed);
        this.hasFog = hasFog;

        this.context = new Context(this.width, this.height);
        this.ui = new UI(this, 4, 15);
    }

    isOpaque(p: number): boolean { return !this.grid.floor.has(p) }
    canOverlap(positionList: Entity[]): boolean { return !positionList || positionList.reduce((can, e) => can && (e instanceof Item), true); }
    moveCost(u: number, v: number): number { return Point.distance(u, v); }
    neighborhood(p: number): number[] { return Point.neighborhood(p).filter(n => !this.isOpaque(n)); }

    start(): void {
        const builder = new MapBuilder(this.rand);
        this.grid = builder.fromRandomWalk();

        this.player = new Player(this, this.grid.start);

        this.viewer = new Viewer(this.viewRange, this.player.pos, this.isOpaque.bind(this));
        let neighborhood = (p: number) => this.neighborhood(p).filter(p => this.canOverlap(this.grid.pointToEntity.get(p) || []));
        this.heatMap = new DijkstraMap(this.rand, neighborhood, this.moveCost.bind(this));

        //new Item('Heal Potion', this, startIndex - 2);

        //this.addMonsters();
        this.startContext();
    }

    startContext(): void {
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

    addMonsters(): void {
        const grid = this.grid;
        const rand = this.rand;
        const player = this.player;
        let names = ['orc', 'dwarf', 'human', 'elf', 'goblin', 'troll'];
        grid.rooms.forEach(room => {
            let maxMonsters = Math.ceil(room.size / 16);
            let numOfMonster = rand.nextInt(maxMonsters);
            for (let id = 0; id < numOfMonster; id++) {
                let positions = Array.from(room.keys());
                let pos = rand.pick(positions);
                if (Point.distance(pos, player.pos) > this.viewRange && !grid.pointToEntity.has(pos)) {
                    new Monster(rand.pick(names) + ' #' + id, this, pos);
                }
            }
        });
    }

    loop(): void {
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

    processView(): void {
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

    processMotion(withRange = -1.2, withFlee = -1.2): void {
        const grid = this.grid;
        const heatMap = this.heatMap;
        const player = this.player;
        heatMap.clear();
        heatMap.addAttractionPoint(player.pos);
        heatMap.calculate(grid.visible);
        heatMap.makeRangeMap(withRange);
        heatMap.makeFleeMap(withFlee);

        //console.log(heatMap.fleeMap.dist);
    }

    processTurn(): void {
        const grid = this.grid;
        const pointToEntity = grid.pointToEntity;
        this.visibleEntities = [];
        const visibleEntities = this.visibleEntities;
        if (this.hasFog) {
            const visible = grid.visible;
            visible.forEach(pos =>
                pointToEntity.has(pos) && visibleEntities.push(...(pointToEntity.get(pos) || [])));
        } else {
            const floor = grid.floor;
            Array.from(floor.keys())
                .forEach(pos => pointToEntity.has(pos) && visibleEntities.push(...(pointToEntity.get(pos) || [])));
        }
        visibleEntities.forEach(current => current.update());
    }

    useItem(index: number): boolean {
        if (index !== null) {
            const player = this.player;
            let item = player.inventory[index];
            player.inventory = player.inventory.filter(i => i !== item);
            item.process(player);
            this.loop();
            return true;
        }
        return false;
    }

    draw(): void {
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
            if (m.isVisible) {
                let [x, y] = Point.to2D(m.pos);
                if (x >= camera.x && y >= camera.y && x < camera.x + context.width && y < camera.y + context.height)
                    context.render(x - camera.x, y - camera.y, m.render);
            }
        });

        //this.drawHeatMap(camera.x, camera.y);

        game.ui.draw();
        context.build();
    }

    drawGrid(xoff: number, yoff: number) {
        const game = this;
        const grid = game.grid;
        const context = game.context;

        const renderRevealed = new Render(' ', 'grey', 'black');
        const renderVisible = new Render(' ', 'green', 'black');
        for (let y = 0; y < context.height; y++) {
            for (let x = 0; x < context.width; x++) {
                let pos = Point.from(xoff + x, yoff + y);
                if(!this.hasFog || grid.visible.has(pos)){
                    if(grid.floor.has(pos)){
                        renderVisible.glyph = grid.floor.get(pos) || '';
                        context.render(x, y, renderVisible);
                    } else if(grid.walls.has(pos)){
                        renderVisible.glyph = grid.walls.get(pos) || '';
                        context.render(x, y, renderVisible);
                    }
                } else if(this.hasFog && grid.revealed.has(pos)){
                    if(grid.floor.has(pos)){
                        renderRevealed.glyph = grid.floor.get(pos) || '';
                        context.render(x, y, renderRevealed);
                    } else if(grid.walls.has(pos)){
                        renderRevealed.glyph = grid.walls.get(pos) || '';
                        context.render(x, y, renderRevealed);
                    }
                }
            }
        }
    }

    drawHeatMap(xoff: number, yoff: number) {
        const game = this;
        const context = game.context;
        const heatMap = game.heatMap;
        const render = new Render(' ', 'green', 'black');
        for (let y = 0; y < context.height; y++) {
            for (let x = 0; x < context.width; x++) {
                let pos = Point.from(xoff + x, yoff + y);
                let val = heatMap.dist.get(pos);
                if (val !== undefined) {
                    render.glyph = val.toFixed(1);
                    context.render(x, y, render);
                }
            }
        }
    }
}

const game = new Game(80, 20, 0, false);
game.clearBuffer = false;
game.start();
game.loop();
