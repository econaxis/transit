let rootapiurl = function (str) {
    return "http://localhost:5000" + str;
}

var map = L.map('mapid').setView([49.1, -123], 12);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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

async function fill_map(data) {
    clear_layers_from_map();
    let layergroup = L.layerGroup([]);
    for (const bus of data) {
        bus.headsign = headsigns[bus.route_id].join(" ");
        L.circleMarker(L.latLng(bus.latitude, bus.longitude), {radius: 8, fill:true, stroke:true, fillOpacity: 0.8}).bindPopup(bus.headsign).on("click", (e) => {
            render_history(bus.vehicle_id);
        }).addTo(layergroup);
    }
    g_layergroups.push(layergroup);
    layergroup.addTo(map);
}

async function download_data() {
    let data = await fetch(rootapiurl("/positions")).then(r => r.json());
    return data;
}

render_history_running = false;

async function render_history(vehicleid) {
    if (render_history_running) return;

    render_history_running = true;
    if (history) map.removeLayer(history);
    let gjsontemplate = {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": []
        },
    };
    let gjsonpoints = [];
    let historydata = await (await fetch(rootapiurl("/history?vehicleid=") + vehicleid)).json();
    let lastbus = historydata[0];
    for (const d of historydata) {
        if (d.longitude - lastbus.longitude >= 0.1 || d.latitude - lastbus.latitude >= 0.1) {
            console.log("distance errror", d, lastbus);
            continue;
        }
        if (d.timestamp - lastbus.timestamp >= 10 * 60) {
            break;
        } else {
            lastbus = d;
        }


        gjsontemplate.geometry.coordinates.push([d.longitude, d.latitude]);
        gjsonpoints.push({
            type: "Feature",
            geometry: {
                "type": "Point",
                coordinates: [d.longitude, d.latitude]
            }
        })
    }
    history = L.geoJSON([gjsontemplate, ...gjsonpoints], {
        style: {
            "color": "#ff7800",
            "weight": 3,
            "opacity": 0.5
        },
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 5,
                fillColor: "#ff7800",
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });
        }
    });
    history.addTo(map);
    render_history_running = false;
}

fetch(rootapiurl("/headsigns")).then(r => r.json()).then(r => headsigns = r)
    .then(() => download_data().then(d => fill_map(d)));