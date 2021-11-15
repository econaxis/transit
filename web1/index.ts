console.log("Index start");
import * as PIXI from "pixi.js";
import * as L from "leaflet";
import { LatLng } from "leaflet";
import { transit } from "./protos/proto";
import { g_ours, g_theirs, Segments } from "./Splines";
import BusInfoCol = transit.BusInfoCol;

console.log(transit);
export var map = L.map("mapid", {
    zoomSnap: 0.1,
    // wheelPxPerZoomLevel: 170
    keyboardPanDelta: 5,
    zoomDelta: 0.1,
}).setView([43.723351, -79.339274], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

export var app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundAlpha: 0,
    antialias: true,
});
app.ticker.stop();
PIXI.Ticker.shared.stop();
PIXI.Ticker.system.stop();
app.stage.addChild(g_ours, g_theirs);

function convcol(str: string) {
    return PIXI.utils.string2hex(str);
}

// app.renderer.plugins.interaction.autoPreventDefault = false;
let obj = new PIXI.Graphics();
obj.beginFill(convcol("#576ac7"))
    .drawRoundedRect(0, 0, 27, 18, 5)
    .endFill()
    .beginFill(convcol("#282e49"))
    .drawRoundedRect(27 - 8, 1, 4, 16, 3)
    .endFill();
var texture = app.renderer.generateTexture(obj);

class RectSprite {
    static instance_list: PIXI.Container = new PIXI.Container();
    static center = map.getCenter();
    static zoom = map.getZoom();
    inner: PIXI.Sprite;
    rotation: number;
    target_rotation: number;
    position: L.LatLng;
    container_pos: L.Point;

    constructor(position: LatLng) {
        this.inner = new PIXI.Sprite(texture);
        this.inner.pivot.set(texture.width / 2, texture.height / 2);
        this.inner.interactive = true;
        this.rotation = 0;
        this.inner.zIndex = 1;
        this.position = position;
        this.target_rotation = 0;
        this.update();
        RectSprite.instance_list.addChild(this.inner);
    }

    static optimal_direction(current, target) {
        const diff = target - current;

        if (Math.abs(diff) > Math.PI) return Math.sign(-diff);
        else return Math.sign(diff);
    }

    static angle_diff(current, target) {
        const diff = Math.abs(target - current);
        return Math.min(Math.abs(2 * Math.PI - diff), diff);
    }

    on_callback(evt_type: string, callback: any) {
        this.inner.on(evt_type, callback);
    }

    update(position?: L.LatLng) {
        if (position == undefined) position = this.position;
        else {
            let angle = Math.atan2(
                position.lat - this.position.lat,
                position.lng - this.position.lng
            );
            angle = angle % (Math.PI * 2);
            this.position = position;
            this.rotation = -angle;
        }
        this.container_pos = map.latLngToContainerPoint(this.position);
        this.inner.rotation = this.rotation;
        this.inner.position.set(this.container_pos.x, this.container_pos.y);
    }
}

class Stop {
    stop_id: number;
    arrival_time: number;
    shape_dist_traveled: number;
}

class Bus {
    rect: RectSprite;
    private readonly shapes: Segments;
    private trip_id: number;

    constructor(trip_id: number, segments: Segments) {
        this.trip_id = trip_id;
        this.shapes = segments;

        this.rect = new RectSprite(this.shapes.interpolate(0));
        this.rect.on_callback("mousedown", () => {
            if (this.rect == follow) {
                follow = undefined;
            } else if (this.rect.position != undefined) {
                follow = this.rect;
            }
        });
    }

    static interp(x1, x2, y1, y2, a) {
        return ((a - x1) * (y2 - y1)) / (x2 - x1) + y1;
    }

    update() {
        this.rect.update();
    }

    travel(dist: number) {
        const pos = this.shapes.interpolate(dist);
        this.rect.update(pos);
    }
}

app.view.id = "pixi-canvas";
app.view.classList.add("leaflet-zoom-animated", "leaflet-zoom-anim");
// document.querySelector("#mapid>.leaflet-map-pane>.leaflet-overlay-pane").prepend(app.view);
document.querySelector("#mapid").prepend(app.view);

function fix() {
    for (const s of sprites) {
        s.update();
    }
}

let target_scale = 1;
let start_scale = 1;
let anim_progress = 0;

// Copied with modifications from easings.net/#easeInOutCubic
function ease_cubic(progress: number, start: number, end: number): number {
    const scale =
        progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    return (1 - scale) * start + scale * end;
}

function rescale(scale?, immediate = false) {
    if (scale !== undefined) {
        anim_progress = 0;
        start_scale = sprites[0].rect.inner.scale.x;
        target_scale = scale;
    }
    if (anim_progress >= 1) {
        return;
    }
    anim_progress += 0.12;
    if (immediate) anim_progress = 1;
    const to_set = ease_cubic(anim_progress, start_scale, target_scale);
    for (const s of sprites) {
        s.rect.inner.scale.set(to_set, to_set);
    }
}

var center = map.getCenter();
var zoom = map.getZoom();
map.on("zoomend", () => {
    console.log("Setting scale", scale);
    app.view.classList.remove("leaflet-zoom-animated");
    for (const s of sprites) {
        s.rect.inner.scale.set(scale, scale);
    }
    app.render();
    app.view.style.transform = "";
    rescale(1);
});
map.on("move", (evt) => {
    fix();
    app.render();
});
var in_animation = false;
var scale = 1;
map.on("zoomanim", (e) => {
    in_animation = true;
    zoom = map.getZoom();
    center = map.getCenter();
    const zoom1 = e.zoom;
    const center1 = e.center;
    scale = map.getZoomScale(zoom1, zoom);
    // This part derived, with modifications, from https://github.com/manubb/Leaflet.PixiOverlay/blob/master/L.PixiOverlay.js#L206
    const currentCenterPoint = map
        .project(center, zoom1)
        // @ts-ignore
        .subtract(map._getNewPixelOrigin(center1, zoom1));
    const translate_offset = map
        .getPixelBounds()
        .min.subtract(map.getPixelOrigin());
    const viewhalf = map
        .getSize()
        .multiplyBy(scale * -0.5)
        .add(currentCenterPoint)
        .subtract(translate_offset);

    app.view.classList.add("leaflet-zoom-animated");
    app.view.style.transform = `translate3d(${viewhalf.x}px, ${viewhalf.y}px, 0px) scale(${scale}) `;
    in_animation = false;
    // L.DomUtil.setTransform(app.view, viewhalf, scale);
});

let sprites: Bus[] = [];

async function main() {
    let conn = await fetch("a.data");
    const arr = await conn.arrayBuffer();
    const arru8 = new Uint8Array(arr);
    const buses = BusInfoCol.decode(arru8).bi.slice(0, 100000);
    for (const bus in buses) {
        sprites.push(new Bus(parseInt(bus), new Segments(buses[bus].shapes)));
    }
    app.stage.sortChildren();
    console.log("Done loading");
    app.stage.addChild(RectSprite.instance_list);
    app.render();
}

let distance = 0.03;
const size = map.getSize();

function in_view(point: L.Point, padding = -20) {
    return (
        point.x >= padding &&
        point.x <= size.x - padding &&
        point.y >= padding &&
        point.y <= size.y - padding
    );
}

let prev_date = Date.now();
export let follow = undefined;

function animate() {
    distance += 0.001;
    const date = Date.now();
    const update_all = date - prev_date > 3000;
    for (const s of sprites) {
        if (in_view(s.rect.container_pos) || update_all) s.travel(distance);
    }
    if (!app.view.classList.contains("leaflet-zoom-animated")) rescale();
    if (
        follow != undefined &&
        !app.view.classList.contains("leaflet-zoom-animated")
    ) {
        map.setView(follow.position);
    }
    app.render();
    if (update_all) prev_date = date;
    window.requestAnimationFrame(animate);
}

main().then(animate);
window["map"] = map;
window["app"] = app;
