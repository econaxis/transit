import { FeatureCollection } from "geojson";
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

const map = L.map("mapid").setView([49.25, -123], 12);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

let poshistory: L.GeoJSON = undefined;
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

/**
 * Linearly interpolates a value and returns an appropriate color representing how close that value is to "max"
 * @param {number} min
 * @param {number} max
 * @param {number} value
 * @returns {string} HSL color
 */
function calculate_linear_color(min: number, max: number, value: number) {
    let saturation: number = ((value - min) / (max - min)) * 0.8 + 0.2;
    let hue = (1 - saturation) * 70;
    return `hsl(${hue}, ${saturation * 100}%, 70%)`;
}

/**
 * Converts the JSON response of history data (containing GTFS formatted positions information) into a geojson array
 * of LineStrings, suitable for display on a map
 * @param historydata
 * @returns Array<GeoJSON>
 */
function parse_history_data(historydata: Array<Positions>) {
    let gjsonlines = [];
    let lastbus = historydata[0];
    let lastcoord = L.latLng(0, 0);
    for (const d of historydata) {
        if (
            d.longitude - lastbus.longitude >= 0.1 ||
            d.latitude - lastbus.latitude >= 0.1
        ) {
            console.log("distance errror", d, lastbus);
            continue;
        }
        if (d.timestamp - lastbus.timestamp >= 10 * 60) {
            break;
        }

        const curcoord = L.latLng(lastbus.latitude, lastbus.longitude);
        gjsonlines.push({
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: [
                    [lastbus.longitude, lastbus.latitude],
                    [d.longitude, d.latitude],
                ],
            },
            properties: {
                timestamp: d.timestamp,
                location: curcoord,
                should_show_popup: curcoord.distanceTo(lastcoord) > 600,
            },
        });
        lastcoord = curcoord;
        lastbus = d;
    }

    return gjsonlines;
}

// indicates whether the function is already running, to prevent two instances of that function from running concurrently.
let render_history_running = false;

/**
 * Renders the location history for a particular vehicle, from it's starting station.
 * @param vehicleid TransLink provided vehicleid
 */
export async function render_history(vehicleid: number) {
    if (render_history_running) return;

    render_history_running = true;
    if (poshistory) map.removeLayer(poshistory);

    let historydata = await (
        await fetch(rootapiurl("/history?vehicleid=") + vehicleid)
    ).json();
    let gjsonlines = parse_history_data(historydata);
    console.log("History: ", gjsonlines);

    // Draw the last lines first, so the most recent lines go on top of the least recent lines.
    gjsonlines.reverse();

    let features = [],
        layers = [];

    let mintimestamp = historydata[historydata.length - 1].timestamp;
    let maxtimestamp = historydata[0].timestamp;
    let col: FeatureCollection = {
        type: "FeatureCollection",
        features: gjsonlines,
    };

    poshistory = L.geoJSON(col, {
        style: (feature) => {
            return {
                color: calculate_linear_color(
                    mintimestamp,
                    maxtimestamp,
                    feature.properties.timestamp
                ),
                weight: 6,
            };
        },
        onEachFeature: (feature, layer) => {
            layer.bindTooltip(
                new Date(
                    feature.properties.timestamp * 1000
                ).toLocaleTimeString(),
                { className: "overlay" }
            );
            features.push(feature);

            if (feature.properties.should_show_popup) layers.push(layer);

        },
    });

    poshistory
        .on("mouseover", (e) => {
            layers.forEach((elem) => {
                elem.openTooltip();
            });
        })
        .on("mouseout", (e) => {
            layers.forEach((elem) => {
                elem.closeTooltip();
            });
        });

    poshistory.addTo(map);
    render_history_running = false;
}

LiveReloader.init(map)
    .then(() => download_positions_data())
    .then((d) => LiveReloader.register_live_reloading(20000))
    .catch((error) => {
        console.log(error);
        debugger;
    });

//@ts-ignore
window.map = map;