import * as L from "leaflet";
import * as C from "./CanvasInteractionHandler";
import "leaflet-imageoverlay-rotated";
import { PlaybackIterator } from "./playback_machine";
import { animate } from "./streaming_animator";
import {
    DrawableObject,
    OffsetCalculator,
    render_objects,
} from "./canvas_renderer";
import check_in_view = OffsetCalculator.check_in_view;
import { subscr as TimeSubscriber } from "./AnimationTimeDisplay";
import { StreamingSubscriber } from "./StreamingSubscriber";

// C.test.test_handler();

export type AnimSubscriber = (
    iterator: PlaybackIterator,
    drawables: Array<DrawableObject>,
    sim_time: number
) => void | boolean;

export interface Positions {
    veldata: L.LatLng;
    vehicle_id: number;
    latitude: number;
    longitude: number;
    timestamp: number;
    trip_id: number;
    cur_stop_sequence: number;
    route_id: number;
    headsign?: string;
}

export function rootapiurl(str) {
    return "http://localhost:5000" + str;
}

/**
 * Downloads the initial positions data of all the buses from API.
 * @returns {Array.<Positions>}
 */
async function download_positions_data() {
    const datecutoff = new Date().getTime() / 1000 - 3600;

    return (await fetch(
        rootapiurl("/positions?last-timestamp=" + datecutoff.toString())
    ).then((r) => r.json())) as Array<Positions>;
}

// LiveReloader.init(map)
//     .then(() => download_positions_data())
//     .then((d) => LiveReloader.register_live_reloading(20000000))
//     .catch((error) => {
//         console.log(error);
//         debugger;
//     });

function create_canvas(map: L.Map) {
    const size = map.getSize();
    const canvas = document.createElement("canvas");
    canvas.id = "canvas";
    canvas.width = size.x;
    canvas.height = size.y;

    canvas.style.border = "5px solid";
    canvas.style.position = "absolute";

    return { canvas_ctx: canvas.getContext("2d"), canvas: canvas };
}

let canvas_ctx: CanvasRenderingContext2D;
let canvas_bounds: L.Bounds;
let map: L.Map;

async function start() {
    map = L.map("mapid").setView([49.25, -123], 14);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    const { canvas_ctx: cc, canvas } = create_canvas(map);
    canvas_ctx = cc;
    document.getElementById("mapid").appendChild(canvas);

    OffsetCalculator.register_canvas_move_handlers(map, canvas);

    const canvas_margin = 1 / 5;
    canvas_bounds = new L.Bounds([
        L.point(-canvas.width * canvas_margin, -canvas.height * canvas_margin),
        L.point(
            canvas.width * (1 + canvas_margin),
            canvas.height * (1 + canvas_margin)
        ),
    ]);

    const it = await PlaybackIterator.construct({
        min: Math.round(new Date().getTime() / 1000 - 3600 * 5.5),
        max: Math.round(new Date().getTime() / 1000),
    });

    animate_with_default_canvas(it);
}


export function draw_func(map: L.Map) {

    return (objects) => render_objects(canvas_ctx, map, objects);
}

export function animate_with_default_canvas(it: PlaybackIterator) {
    animate(
        it,
        draw_func(map),
        (pos) => {
            return check_in_view(map, pos, canvas_bounds);
        },
        [TimeSubscriber, StreamingSubscriber.handler]
    );
}

start();

//@ts-ignore
window.map = map;
