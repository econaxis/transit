import * as L from "leaflet";
import "leaflet-imageoverlay-rotated";
import { PlaybackIterator } from "./playback_machine";

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


//@ts-ignore
window.pause = false;

async function start() {
    const it = await PlaybackIterator.construct({
        min:  Math.round(new Date().getTime() / 1000) - 3600 * 1,
        max:  Math.round(new Date().getTime() / 1000),
    }, map);

    function sleep(time) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }

    while (it.next(map)) {
        await sleep(50);

        //@ts-ignore
        while(window.pause) {
            await sleep(1000);
        }
    }
}

start();
//@ts-ignore
window.map = map;
