import { ZoomHandler } from "./zoom_handler";
import * as PIXI from "pixi.js";
import * as L from "leaflet";
import { LatLng } from "leaflet";
import { transit } from "./protos/proto";
import { g_ours, g_theirs, Segments } from "./Splines";
import { Stops } from "./stops";

console.log("Index start");
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
ZoomHandler.init();

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
        if (position == undefined) {
        } else {
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

class Bus {
    rect: RectSprite;
    private readonly shapes: Segments;
    private stops: Stops;
    private trip_id: number;

    constructor(trip_id: number, segments: Segments, stops: Stops) {
        this.trip_id = trip_id;
        this.shapes = segments;
        this.stops = stops;

        this.rect = new RectSprite(this.shapes.interpolate(0));
        this.rect.on_callback("mousedown", () => {
            if (this.rect == follow) {
                follow = undefined;
            } else if (this.rect.position != undefined) {
                follow = this.rect;
            }
            console.log(this);
        });
    }

    static interp(x1, x2, y1, y2, a) {
        return ((a - x1) * (y2 - y1)) / (x2 - x1) + y1;
    }

    update() {
        this.rect.update();
    }

    travel_distance(dist: number) {
        const pos = this.shapes.interpolate(dist);
        this.rect.update(pos);
    }

    travel_time(time: number) {
        const dist = this.stops.update(time);
        this.travel_distance(dist);
    }
}

app.view.id = "pixi-canvas";
app.view.classList.add("leaflet-zoom-animated", "leaflet-zoom-anim");
// document.querySelector("#mapid>.leaflet-map-pane>.leaflet-overlay-pane").prepend(app.view);
document.querySelector("#mapid").prepend(app.view);

export function fix() {
    for (const s of sprites) {
        s.update();
    }
}

export let sprites: Bus[] = [];

async function main() {
    let conn = await fetch("a.data");
    const arr = await conn.arrayBuffer();
    const arru8 = new Uint8Array(arr);
    const buses = BusInfoCol.decode(arru8).bi;
    for (const bus in buses) {
        sprites.push(new Bus(parseInt(bus), new Segments(buses[bus].shapes), new Stops(buses[bus].stops)));
    }
    app.stage.sortChildren();
    console.log("Done loading");
    app.stage.addChild(RectSprite.instance_list);
}

let time = 11 * 3600;
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
let follow = undefined;

export function set_follow(new_follow) {
    follow = new_follow;
}

function animate() {
    time += 1/60 * 10;
    const date = Date.now();
    const update_all = date - prev_date > 3000;
    for (const s of sprites) {
        if (in_view(s.rect.container_pos) || update_all)
            s.travel_time(time);
    }
    if (!app.view.classList.contains("leaflet-zoom-animated"))
        ZoomHandler.rescale();
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
