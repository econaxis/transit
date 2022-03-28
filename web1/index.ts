import { ZoomHandler } from "./zoom_handler";
import * as PIXI from "pixi.js";
import * as L from "leaflet";
import { LatLng } from "leaflet";
import { transit } from "./protos/proto";
import { g_ours, g_theirs, Segments } from "./Splines";
import { Stops } from "./stops";

console.log("Index start");
import BusInfoCol = transit.BusInfoCol;
import IBusInfo = transit.IBusInfo;

PIXI.utils.skipHello();
export var map = L.map("mapid", {
    zoomSnap: 0.1,
    // wheelPxPerZoomLevel: 170
    keyboardPanDelta: 5,
    zoomDelta: 0.1,
}).setView([43.723351, -79.339274], 14);
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

let obj = new PIXI.Graphics();
obj.beginFill(convcol("#576ac7"))
    .drawRoundedRect(0, 0, 27, 18, 5)
    .endFill()
    .beginFill(convcol("#282e49"))
    .drawRoundedRect(27 - 8, 1, 4, 16, 3)
    .setTransform(0, 0, 0.6, 0.6, 0, 0, 0, 0, 0)
    .endFill();
obj.cacheAsBitmap = true;
const texture = app.renderer.generateTexture(obj);
obj = new PIXI.Graphics();
obj.clear()
    .beginFill(convcol("#bdc2c7"))
    .lineStyle(0.75, 0x888888, 0.5, 1, true)
    .drawRoundedRect(0, 0, 27, 18, 5)
    .endFill()
    .lineStyle()
    .beginFill(convcol("#878ca8"))
    .drawRoundedRect(27 - 8, 1, 4, 16, 3)
    .setTransform(0, 0, 0.6, 0.6, 0, 0, 0, 0, 0)
    .endFill();
const grey_texture = app.renderer.generateTexture(obj);

class RectSprite {
    static instance_list: PIXI.Container = new PIXI.Container();
    static center = map.getCenter();
    static zoom = map.getZoom();
    inner: PIXI.Sprite;
    rotation: number;
    position: L.LatLng;
    container_pos: L.Point;
    private is_grey: boolean = false;

    constructor(position: LatLng) {
        this.inner = new PIXI.Sprite(texture);
        this.inner.pivot.set(texture.width / 2, texture.height / 2);
        this.inner.interactive = true;
        this.rotation = 0;
        this.position = position;
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

    set_grey() {
        if (!this.is_grey) {
            this.is_grey = true;
            this.inner.texture = grey_texture;
        }
    }

    clear_grey() {
        if (this.is_grey) {
            this.is_grey = false;
            this.inner.texture = texture;
        }
    }

    on_callback(evt_type: string, callback: any) {
        this.inner.on(evt_type, callback);
    }

    set_pos(position: L.LatLng) {
        let angle = Math.atan2(
            position.lat - this.position.lat,
            position.lng - this.position.lng
        );
        angle = angle % (Math.PI * 2);
        this.position = position;
        this.rotation = -angle;
    }

    set_pos_simple(position: L.LatLng) {
        this.position = position;
    }

    update() {
        this.container_pos = map.latLngToContainerPoint(this.position);
        this.inner.rotation = this.rotation;
        this.inner.position.set(this.container_pos.x, this.container_pos.y);
    }
}

const grayscale_filter = new PIXI.filters.ColorMatrixFilter();
grayscale_filter.desaturate();
grayscale_filter.greyscale(0.5, true);
let override = false;

function put_template(
    trip_name: string,
    stops: Array<[number, any]>,
    pos: L.Point
) {
    let existing = document.getElementById("popup-container");
    if (existing == null) {
        const template = document
            .getElementById("popup-template")
            .content.cloneNode(true).firstElementChild;
        existing = document
            .querySelector(".leaflet-popup-pane")
            .appendChild(template);
    }
    existing.querySelector(".tripname").innerText = trip_name;
    existing.querySelector(".time1").innerText = Math.round(stops[0][0]);
    existing.querySelector(".time2").innerText = Math.round(stops[1][0]);
    existing.querySelector(".time3").innerText = Math.round(stops[2][0]);
    existing.querySelector(".name1").innerText = stops[0][1];
    existing.querySelector(".name2").innerText = stops[1][1];
    existing.querySelector(".name3").innerText = stops[2][1];

    if (override) {
        existing.querySelector(".tripname").innerText =
            "btw,looking for internships";
        existing.querySelector(".time1").innerText = "may2022";
        existing.querySelector(".name1").innerText = "your company?";
    }

    place_template(pos);
}

function place_template(pos: L.Point) {
    let existing = document.getElementById("popup-container");
    if (existing != null) {
        existing.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    }
}

class Bus {
    rect: RectSprite;
    readonly stops: Stops;
    readonly trip_id: number;
    private readonly shapes: Segments;

    constructor(trip_id: number, segments: Segments, stops: Stops) {
        this.trip_id = trip_id;
        this.shapes = segments;
        this.stops = stops;

        this.rect = new RectSprite(this.shapes.interpolate(0, true));
        this.rect.on_callback("mousedown", (evt) => {
            if (this.rect.position != undefined) {
                follow = this;
            }
        });
    }

    static interp(x1, x2, y1, y2, a) {
        return ((a - x1) * (y2 - y1)) / (x2 - x1) + y1;
    }

    update() {
        this.rect.update();
    }

    get_pos(): L.LatLng {
        return this.rect.position;
    }

    travel_distance(dist: number, simple) {
        const pos = this.shapes.interpolate(dist, simple);
        if (!simple) this.rect.set_pos(pos);
        else this.rect.set_pos_simple(pos);
    }

    travel_time(time: number, simple) {
        const dist = this.stops.update(time);
        if (dist instanceof Array) {
            this.rect.set_grey();
            this.travel_distance(dist[1], simple);
        } else {
            this.rect.clear_grey();
            this.travel_distance(dist, simple);
        }
    }
}

let g_simple = false;
window["g_simple"] = g_simple;

export function set_simple(b) {
    if (!g_simple && b) {
        for (const s of sprites) {
            s.rect.inner.interactive = false;
        }
    } else if (!b && g_simple) {
        for (const s of sprites) {
            s.rect.inner.interactive = true;
        }
    }
    g_simple = b;
}

app.view.id = "pixi-canvas";
app.view.classList.add("leaflet-zoom-animated", "leaflet-zoom-anim");
// document.querySelector("#mapid>.leaflet-map-pane>.leaflet-overlay-pane").prepend(app.view);
document.querySelector("#mapid").prepend(app.view);

namespace TripInfo {
    let routes, trips, stops;

    export function get_trip_name(trip_id: number): string {
        const route_id = trips[trip_id];
        return routes[route_id];
    }

    export function get_stop_name(stop_id: number): string {
        return stops[stop_id];
    }

    export async function init() {
        let resp = await fetch("trips.json");
        trips = await resp.json();
        resp = await fetch("routes.json");
        routes = await resp.json();
        resp = await fetch("stops.json");
        stops = await resp.json();
    }
}

function viewable_sprites(): Bus[] {
    let viewable = [];
    const bounds = map.getBounds().pad(0.2);
    for (const s of sprites) {
        if (bounds.contains(s.get_pos())) {
            s.rect.inner.visible = true;
            s.rect.inner.interactive = true;
            viewable.push(s);
        } else {
            s.rect.inner.visible = false;
            s.rect.inner.interactive = false;
        }
    }
    return viewable;
}

export function fix() {
    const viewable = viewable_sprites();
    for (const s of viewable) {
        s.update();
    }
}

export let sprites: Bus[] = [];

function read_chunk(buffer: DataView): [DataView | undefined, IBusInfo[]] {
    const length = buffer.getUint32(0, true);
    const arru8 = new Uint8Array(buffer.buffer, 4 + buffer.byteOffset, length);

    let new_view = undefined;
    if (buffer.byteOffset + 4 + length < buffer.byteLength) {
        new_view = new DataView(buffer.buffer, length + 4 + buffer.byteOffset);
    }
    return [new_view, BusInfoCol.decode(arru8).bi];
}

function read_all(buf: ArrayBuffer) {
    let dataview = new DataView(buf);
    let iters = 0;
    while (true) {
        iters++;
        let [next_view, buses] = read_chunk(dataview);
        if (next_view === undefined) break;
        dataview = next_view;
        for (const bus of buses) {
            sprites.push(
                new Bus(
                    bus.tripId,
                    new Segments(bus.shapes),
                    new Stops(bus.stops)
                )
            );
        }
    }

    console.log(`Parsed ${iters} chunks, got ${sprites.length} buses`);
}

async function main() {
    await TripInfo.init();
    let conn = await fetch("73800.data");
    const arr = await conn.arrayBuffer();

    read_all(arr);

    app.stage.addChild(RectSprite.instance_list);
}
const date = new Date();

let time = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
time = 73800;
let delta_time = (1 / 60) * 5;
console.log("Playing at 8x speed");
const size = map.getSize();

let last_update = Date.now();
let follow: Bus | undefined = undefined;

export function force_update_all() {
    last_update = 0;
}

export function set_follow(new_follow) {
    follow = new_follow;

    if (follow == undefined) {
        const a = document.getElementById("popup-container");
        if (a) a.remove();
    }
}

let averages = [];

function avg() {
    let sum = 0;
    for (const x of averages) sum += x;
    return sum / averages.length;
}

function animate() {
    time += delta_time;
    const date = Date.now();
    const update_all = date - last_update > 5000;
    const update_time = performance.now();

    if (update_all) {
        for (const s of sprites) s.travel_time(time, true);
    } else {
        for (const s of viewable_sprites()) {
            s.travel_time(time, g_simple);
            s.update();
        }
    }

    if (!app.view.classList.contains("leaflet-zoom-animated"))
        // Just run the animation
        ZoomHandler.rescale();
    if (
        follow != undefined
        // !app.view.classList.contains("leaflet-zoom-animated")
    ) {
        const animate = map.getZoom() > 12.5;
        map.setView(follow.rect.position, undefined, { animate: animate });
        place_template(map.latLngToLayerPoint(follow.get_pos()));
    }
    if (follow != undefined && Math.round(time / delta_time) % 40 == 0) {
        const pos = map.latLngToLayerPoint(follow.get_pos());

        const trip_name = TripInfo.get_trip_name(follow.trip_id);

        const stops_arr = [];
        for (let i = 0; i < 3; i++) {
            const res = follow.stops.get_stop_eta(time, i);
            if (res !== undefined) {
                const [next_time, stop_id] = res;
                const id_str = TripInfo.get_stop_name(stop_id);
                stops_arr.push([next_time, id_str]);
            } else {
                stops_arr.push([0, "Terminus"]);
            }
        }
        put_template(trip_name, stops_arr, pos);
    }
    app.render();
    if (update_all) last_update = date;
    window.requestAnimationFrame(animate);
}

main().then(force_update_all).then(animate);

document.addEventListener("keydown", (evt) => {
    if (evt.key == "F2") {
        override = true;
    }
});
window["map"] = map;
window["app"] = app;
