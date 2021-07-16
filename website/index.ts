import * as L from "leaflet";
import { Browser } from "leaflet";
import "leaflet-imageoverlay-rotated";
import { PlaybackIterator } from "./playback_machine";
import { animate } from "./streaming_animator";

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

interface VehicleHistory {
    timestamp: number;
    latitude: number;
    longitude: number;
}

export function rootapiurl(str) {
    return "http://localhost:5000" + str;
}

const map = L.map("mapid").setView([49.25, -123], 14);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

let headsigns = undefined;

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

function append_transform(layer: any, transform: string) {
    layer._custom.transform += transform;
    layer._image.style.transform += layer._custom.transform;
}

// LiveReloader.init(map)
//     .then(() => download_positions_data())
//     .then((d) => LiveReloader.register_live_reloading(20000000))
//     .catch((error) => {
//         console.log(error);
//         debugger;
//     });

let canvas_inner_offset = new L.Point(0, 0);
let canvas_outer_offset = new L.Point(0, 0);

function move_canvas_to_viewport() {
    canvas_ctx.clearRect(0, 0, canvas.width, canvas.height);

    canvas_inner_offset = canvas_inner_offset.add(canvas_outer_offset);
    canvas_outer_offset = new L.Point(0, 0);
    canvas.style.transform = "";
}

map.on("moveend", move_canvas_to_viewport);

function create_canvas(map: L.Map) {
    const pane = document.getElementById("mapid");
    const size = map.getSize();
    const canvas = document.createElement("canvas");
    canvas.id = "canvas";
    canvas.width = size.x;
    canvas.height = size.y;

    canvas.style.border = "5px solid";
    canvas.style.position = "absolute";

    pane.appendChild(canvas);

    map.on("move", (evt) => {
        const offset = map
            .getPixelOrigin()
            .subtract(map.getPixelBounds().min)
            .subtract(canvas_inner_offset);
        canvas_outer_offset = offset;
        canvas.style.transform = `translate(${canvas_outer_offset.x}px, ${canvas_outer_offset.y}px`;
    });

    return { canvas_ctx: canvas.getContext("2d"), canvas: canvas };
}

const { canvas_ctx, canvas } = create_canvas(map);
const canvas_bounds = new L.Bounds([
    L.point(0, 0),
    L.point(canvas.width, canvas.height),
]);

const windglob = window as any;
windglob.pause = false;
windglob.angle = 0;

export function draw_image_to_canvas(
    image: HTMLImageElement,
    position: L.Point,
    angle: number
) {
    const predicted_pt = position.add(
        L.point(canvas_inner_offset.x, canvas_inner_offset.y)
    );
    if (!canvas_bounds.contains(predicted_pt)) return;


    canvas_ctx.save();
    // canvas_ctx.translate(canvas_inner_offset.x, canvas_inner_offset.y);
    canvas_ctx.translate(
        predicted_pt.x + image.width / 2,
        predicted_pt.y + image.height / 2
    );
    canvas_ctx.rotate(Math.PI + angle);
    canvas_ctx.translate(-image.width / 2, -image.height / 2);
    canvas_ctx.drawImage(image, 0, 0, image.width, image.height);
    canvas_ctx.restore();
}

async function start() {
    const it = await PlaybackIterator.construct(
        {
            min: Math.round(new Date().getTime() / 1000) - 3600 * 30,
            max: Math.round(new Date().getTime() / 1000 - 3000 * 29.998),
        },
        map
    );

    function sleep(time) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }

    animate(it, map, () => {
        canvas_ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
}

start();
//@ts-ignore
window.map = map;
