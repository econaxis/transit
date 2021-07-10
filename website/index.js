/**
 * A Positions element, taken directly from the Translink GTFS Realtime API.
 * @typedef {Object} Positions
 * @property {Number} vehicle_id
 * @property {Number} latitude
 * @property {Number} longitude
 * @property {Number} timestamp
 * @property {Number} trip_id
 * @property {Number} cur_stop_sequence
 * @property {Number} route_id
 * @property {?String} headsign
 */

let rootapiurl = function (str) {
    return "http://localhost:5000" + str;
};

var map = L.map("mapid").setView([49.25, -123], 12);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

let g_layergroups = [];
let history = undefined;
let headsigns = undefined;

function push_layer(layer) {
    g_layergroups.push(layer);
    layer.addTo(map);
}

function clear_layers_from_map() {
    g_layergroups.forEach((layer) => {
        map.removeLayer(layer);
    });
    g_layergroups = [];
}

/**
 * Fills each Position element with its headsign, like "33 UBC"
 * @param data {Array.<Positions>}
 * @return {Array.<Positions>}
 */
function add_headsigns_to_positions_list(data) {
    return data.map((elem) => {
        return Object.assign(elem, {
            headsign: headsigns[elem.route_id].join(" "),
        });
    });
}

function normalize_latlng_vec(vec, desired_mag) {
    const magnitude = Math.sqrt(vec.lat * vec.lat + vec.lng * vec.lng);

    if (magnitude == 0) return vec;
    return L.latLng(
        (vec.lat * desired_mag) / magnitude,
        (vec.lng * desired_mag) / magnitude
    );
}

function add_latlng(one, two) {
    return L.latLng(one.lat + two.lat, one.lng + two.lng);
}

function generate_bounds(position, velocity) {
    velocity = normalize_latlng_vec(velocity, 0.01);
    const othercoord = add_latlng(position, velocity);
    return L.latLngBounds(position, othercoord);
}

function matrixmultiply(mat, pt) {
    if (pt.length !== 3 || mat.length !== 9) {
        throw Error("Incorrect matrix");
    }

    return [
        pt[0] * mat[0] + pt[1] * mat[1] + pt[2] * mat[2],
        pt[0] * mat[3] + pt[1] * mat[4] + pt[2] * mat[5],
        pt[0] * mat[6] + pt[1] * mat[7] + pt[2] * mat[8],
    ];
}

/**
 *
 * @param {Object} position (LatLng coords)
 * @param {Object} velocity (LatLng coords)
 * @return Leaflet overlay type
 */
function create_bus_overlay(position, velocity) {
    const angle = Math.atan2(velocity.lat, velocity.lng);
    const costheta = Math.cos(angle);
    const sintheta = Math.sin(angle);
    const xpos = position.lng;
    const ypos = position.lat;

    //prettier-ignore
    const matrix = [
        costheta, -sintheta, xpos,
        sintheta, costheta, ypos,
        0, 0, 1
    ];
    const sizex = 0.004;
    const sizey = sizex/1.5;
    const point0 = matrixmultiply(matrix, [-sizex, sizey, 1]);
    const point1 = matrixmultiply(matrix, [sizex, sizey, 1]);
    const point2 = matrixmultiply(matrix, [-sizex, -sizey, 1]);
    const point0_latlng = L.latLng(point0[1], point0[0]);
    const point1_latlng = L.latLng(point1[1], point1[0]);
    const point2_latlng = L.latLng(point2[1], point2[0]);

    return L.imageOverlay.rotated(
        "bus.png",
        point0_latlng,
        point1_latlng,
        point2_latlng,
        {
            alt: "Bus image",
            interactive: true
        }
    );
}

/**
 * Fills global "map" with positions data for all buses, as dots.
 * @param data {Array.<Positions>} API response
 */
async function fill_map(data) {
    clear_layers_from_map();

    let veldata = await (await fetch(rootapiurl("/velocities"))).json();
    let veldatalatlng = Object();
    for (const vehicle_id in veldata) {
        veldatalatlng[vehicle_id] = L.latLng(
            veldata[vehicle_id][0],
            veldata[vehicle_id][1]
        );
    }
    let layergroup = L.layerGroup([]);

    data = data.filter((elem) => {
        return elem.latitude !== 0 && elem.longitude !== 0;
    });

    data = add_headsigns_to_positions_list(data);

    for (const bus of data) {
        if (!veldatalatlng.hasOwnProperty(bus.vehicle_id)) {
            debugger;
        } else {
            console.log(veldatalatlng[bus.vehicle_id]);
        }

        create_bus_overlay(
            L.latLng(bus.latitude, bus.longitude),
            veldatalatlng[bus.vehicle_id]
        )
            .bindPopup(bus.headsign)
            .on("click", (e) => {
                render_history(bus.vehicle_id);
            })
            .addTo(layergroup);
    }
    g_layergroups.push(layergroup);
    layergroup.addTo(map);
}

/**
 * Downloads the initial positions data of all the buses from API.
 * @returns {Array.<Positions>}
 */
async function download_positions_data() {
    let data = await fetch(rootapiurl("/positions")).then((r) => r.json());
    return data;
}

/**
 * Linearly interpolates a value and returns an appropriate color representing how close that value is to "max"
 * @param {number} min
 * @param {number} max
 * @param {number} value
 * @returns {string} HSL color
 */
function calculate_linear_color(min, max, value) {
    let saturation = (((value - min) / (max - min)) * 0.8 + 0.2).toFixed(5);
    let hue = (1 - saturation) * 70;
    let colorstr = `hsl(${hue}, ${saturation * 100}%, 70%)`;
    return colorstr;
}

/**
 * Converts the JSON response of history data (containing GTFS formatted positions information) into a geojson array
 * of LineStrings, suitable for display on a map
 * @param historydata
 * @returns Array<GeoJSON>
 */
function parse_history_data(historydata) {
    let gjsonlines = [];
    let lastbus = historydata[0];
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
                location: L.latLng(lastbus.latitude, lastbus.longitude),
            },
        });
        lastbus = d;
    }

    return gjsonlines;
}

// indicates whether the function is already running, to prevent two instances of that function from running concurrently.
let render_history_running = false;

/**
 * Renders the location history for a particular vehicle, from it's starting station.
 * @param {number} vehicleid TransLink provided vehicleid
 */
async function render_history(vehicleid) {
    if (render_history_running) return;

    render_history_running = true;
    if (history) map.removeLayer(history);

    let historydata = await (
        await fetch(rootapiurl("/history?vehicleid=") + vehicleid)
    ).json();
    let gjsonlines = parse_history_data(historydata);

    // Draw the last lines first, so the most recent lines go on top of the least recent lines.
    gjsonlines.reverse();

    let features = [],
        layers = [];

    let lastcoord = L.latLng(0, 0);

    let mintimestamp = historydata[historydata.length - 1].timestamp;
    let maxtimestamp = historydata[0].timestamp;
    history = L.geoJSON(
        { type: "FeatureList", features: gjsonlines },
        {
            style: (feature) => {
                return {
                    color: calculate_linear_color(
                        feature.properties.timestamp,
                        mintimestamp,
                        maxtimestamp
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

                if (
                    lastcoord === undefined ||
                    feature.properties.location.distanceTo(lastcoord) >= 300
                )
                    layers.push(layer);

                lastcoord = feature.properties.location;
            },
        }
    );

    history
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

    history.addTo(map);
    render_history_running = false;
}

// Start the program.
fetch(rootapiurl("/headsigns"))
    .then((r) => r.json())
    .then((r) => (headsigns = r))
    .then(() => download_positions_data())
    .then((d) => fill_map(d));
