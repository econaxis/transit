import * as L from "leaflet";
import { FeatureCollection } from "geojson";
import { Positions, rootapiurl } from "./index";

let prevhistory: L.GeoJSON = undefined;

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
 * @param map map to apply history onto
 */
export async function render_history(vehicleid: number, map: L.Map) {
    if (render_history_running) return;

    render_history_running = true;
    if (map.hasLayer(prevhistory)) map.removeLayer(prevhistory);

    let historydata = await (
        await fetch(rootapiurl("/history?vehicleid=") + vehicleid)
    ).json();
    let gjsonlines = parse_history_data(historydata);

    let gjsoninvis = gjsonlines.map((elem) => {
        const copy = JSON.parse(JSON.stringify(elem));
        copy.properties.invis = true;
        return copy;
    });

    // Draw the last lines first, so the most recent lines go on top of the least recent lines.
    gjsonlines.reverse();

    let mintimestamp = historydata[historydata.length - 1].timestamp;
    let maxtimestamp = historydata[0].timestamp;
    let col: FeatureCollection = {
        type: "FeatureCollection",
        features: [...gjsoninvis, ...gjsonlines],
    };

    console.log(col);

    prevhistory = L.geoJSON(col, {
        style: (feature) => {
            if (feature.properties.invis) {
                return {
                    weight: 60,
                    opacity: 0,
                    fillOpacity: 0,
                };
            }

            return {
                color: calculate_linear_color(
                    mintimestamp,
                    maxtimestamp,
                    feature.properties.timestamp
                ),
                weight: 8,
            };
        },
        onEachFeature: (feature, layer) => {
            if (feature.properties.invis)
                layer.bindTooltip(
                    new Date(
                        feature.properties.timestamp * 1000
                    ).toLocaleTimeString(),
                    { className: "overlay" }
                );
        },
    });

    console.log(gjsonlines.length);
    prevhistory.addTo(map);
    render_history_running = false;
}
