let rootapiurl = function (str) {
    return "http://localhost:5000" + str;
}

var map = L.map('mapid').setView([49.25, -123], 12);

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
    data = data.filter((elem) => {
        return elem.latitude != 0 && elem.longitude != 0;
    });

    for (const bus of data) {
        bus.headsign = headsigns[bus.route_id].join(" ");
        L.circleMarker(L.latLng(bus.latitude, bus.longitude), {
            radius: 6,
            fill: true,
            stroke: true,
            fillOpacity: 0.8
        }).bindPopup(bus.headsign).on("click", (e) => {
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

let historypath = [];


function gjsontolatlng(arr) {
    return L.latLng(arr[1], arr[0]);
}



async function render_history(vehicleid) {
    if (render_history_running) return;

    render_history_running = true;
    if (history) map.removeLayer(history);

    let gjsonlines = [];
    let historydata = await (await fetch(rootapiurl("/history?vehicleid=") + vehicleid)).json();
    let lastbus = historydata[0];
    for (const d of historydata) {
        if (d.longitude - lastbus.longitude >= 0.1 || d.latitude - lastbus.latitude >= 0.1) {
            console.log("distance errror", d, lastbus);
            continue;
        }
        if (d.timestamp - lastbus.timestamp >= 10 * 60) {
            break;
        }
        gjsonlines.push({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [[lastbus.longitude, lastbus.latitude], [d.longitude, d.latitude]]
            },
            "properties": {
                "timestamp": d.timestamp,
                "location": L.latLng(lastbus.latitude, lastbus.longitude)
            }
        });
        lastbus = d;
    }
    let mintimestamp = lastbus.timestamp;
    let maxtimestamp = historydata[0].timestamp;

    // Draw the last lines first, so the most recent lines go on top of the least recent lines.
    gjsonlines.reverse();

    let features = [], layers= [];

    let lastcoord = undefined;
    history = L.geoJSON({type: "FeatureList", "features": gjsonlines}, {
        style: (feature) => {
            let saturation = ((feature.properties.timestamp - mintimestamp) / (maxtimestamp - mintimestamp) * 0.8 + 0.2).toFixed(5);
            let hue = (1 - saturation) * 70;
            let colorstr = `hsl(${hue}, ${saturation * 100}%, 70%)`;
            return {color: colorstr, weight: 6};
        },
        onEachFeature: (feature, layer) => {
            layer.bindTooltip(new Date(feature.properties.timestamp * 1000).toLocaleTimeString(), {className: "overlay"});
            features.push(feature);

            if(lastcoord === undefined || feature.properties.location.distanceTo(lastcoord) >= 300) layers.push(layer);

            lastcoord = feature.properties.location;
        }
    });

    historypath = features;

    history.on("mouseover", (e) => {
        layers.forEach((elem) => {
            elem.openTooltip();
        })
    }).on("mouseout", (e) => {
        layers.forEach((elem) => {
            elem.closeTooltip();
        });
    })


    console.log(history);

    history.addTo(map);
    render_history_running = false;
}

fetch(rootapiurl("/headsigns")).then(r => r.json()).then(r => headsigns = r)
    .then(() => download_data().then(d => fill_map(d)));