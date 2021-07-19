import * as L from "leaflet";
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

export type AnimSubscriber = (
    drawables: Array<DrawableObject>,
    sim_time: number
) => void;

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

const map = L.map("mapid").setView([49.25, -123], 14);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

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

const { canvas_ctx, canvas } = create_canvas(map);
document.getElementById("mapid").appendChild(canvas);

OffsetCalculator.register_canvas_move_handlers(map, canvas_ctx, canvas);


const canvas_margin = 1/5;
const canvas_bounds = new L.Bounds([
    L.point(-canvas.width* canvas_margin, -canvas.height* canvas_margin),
    L.point(canvas.width * (1+canvas_margin), canvas.height * (1+canvas_margin)),
]);

(window as any).pause = false;

async function start() {
    const it = await PlaybackIterator.construct({
        min: Math.round(new Date().getTime() / 1000) - 3600 * 3,
        max: Math.round(new Date().getTime() / 1000 - 3600 * 2.8),
    });

    animate(
        it,
        (objects) => {
            canvas_ctx.resetTransform();
            canvas_ctx.clearRect(0, 0, canvas.width, canvas.height);
            render_objects(canvas_ctx, map, objects);
        },
        (pos) => {
            return check_in_view(map, pos, canvas_bounds);
        },
        [TimeSubscriber]
    );
}

start();
//@ts-ignore
window.map = map;
