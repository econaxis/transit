import * as L from "leaflet";
import "leaflet-imageoverlay-rotated";
import { LiveReloader } from "./live_reloader";

export interface Positions {
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
    return (await fetch(rootapiurl("/positions")).then((r) =>
        r.json()
    )) as Array<Positions>;
}

function append_transform(layer: any, transform: string) {
    layer._custom.transform += transform;
    layer._image.style.transform += layer._custom.transform;
}

map.on("zoomend", (evt) => {
    console.log("view reset", evt);

    evt.target.eachLayer((layer) => {
        if (
            layer.hasOwnProperty("_custom")
        ) {
            console.log(layer);
            //@ts-ignore
            append_transform(layer, " scale(1.2, 1.2)");
        }
    });
});


LiveReloader.init(map)
    .then(() => download_positions_data())
    .then((d) => LiveReloader.register_live_reloading(20000000))
    .catch((error) => {
        console.log(error);
        debugger;
    });

//@ts-ignore
window.map = map;
