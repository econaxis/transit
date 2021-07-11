import * as L from "leaflet";
import { rootapiurl, Positions } from "./index";
import { render_history } from "./render_history";

let g_map_ref: L.Map = undefined;
const NEWLY_UPDATED_CLASS = "none";

function get_bus_image() {
    const bus_image_html = new Image(100, 200);
    bus_image_html.src = "bus.png";
    return bus_image_html;
}

namespace BusesMapView {
    let buses = new Map<number, L.Layer>();
    let buses_last_updated = new Map<number, number>();

    export function set_bus(id: number, layer: L.Layer, last_updated: number) {
        pop_pus(id);

        layer.addTo(g_map_ref);

        //@ts-ignore
        if (layer._custom) {
            //@ts-ignore
            console.log("Setting transform, ", layer._custom.transform);
            //@ts-ignore
            layer._image.style.transform += " " + layer._custom.transform;
        }
        buses.set(id, layer);

        buses_last_updated.set(id, last_updated);
    }

    export function check_is_new(id: number, last_updated: number) {
        return buses_last_updated.get(id) !== last_updated;
    }

    export function get_bus(id: number) {
        return buses.get(id);
    }

    function pop_pus(id: number) {
        const bus = buses.get(id);
        if (buses.delete(id)) g_map_ref.removeLayer(bus);
        return bus;
    }
}

export namespace LiveReloader {
    let headsigns = undefined;

    export async function init(map: L.Map) {
        headsigns = await fetch(rootapiurl("/headsigns")).then((r) => r.json());
        g_map_ref = map;
    }

    export async function register_live_reloading(interval: number) {
        const repeat = async (last_timestamp) => {
            console.log("Repeating...");
            let veldata = await (await fetch(rootapiurl("/velocities"))).json();
            let positions = await (
                await fetch(rootapiurl("/positions-updates"))
            ).json();

            await fill_map(positions, veldata, "newly-updated");
        };

        let veldata = await (await fetch(rootapiurl("/velocities"))).json();
        let positions = await (await fetch(rootapiurl("/positions"))).json();

        await fill_map(positions, veldata, null);
        setInterval(repeat, interval);
    }

    /**
     * Fills each Position element with its headsign, like "33 UBC"
     * @param data
     * @return {Array<Positions>} with embedded headsigns information
     */
    function add_headsigns_to_positions_list(data: Array<Positions>) {
        return data.map((elem) => {
            return Object.assign(elem, {
                headsign: headsigns[elem.route_id].join(" "),
            });
        });
    }

    /**
     * @return Leaflet overlay type
     */
    function create_bus_overlay(position: L.LatLng, velocity: L.LatLng) {
        const angle = Math.atan2(velocity.lat, velocity.lng);

        const image = new Image(30, 30);
        image.src = "bus.png";
        image.className = "bus-image";
        image.style.position = "absolute";

        g_map_ref.getPane("overlayPane").appendChild(image);

        let update_transforms = () => {
            let offset = g_map_ref.latLngToLayerPoint(position);

            offset = offset.subtract(
                new L.Point(image.width / 2, image.height / 2)
            );

            image.style.transform = `translate(${offset.x}px, ${offset.y}px) rotate(${angle}rad) rotate(180deg)`;
        };

        g_map_ref.on("zoom", update_transforms);
        update_transforms();
    }

    /**
     * Fills global "g_map_ref" with positions data for all buses, as dots.
     * @param data {Array.<Positions>} API response
     * @param veldata Keyed by vehicle id, value is tuple (latitude, longitude)
     * @param class_name_updated class name to use for showing buses with new positions reported
     */
    export async function fill_map(
        data: Array<Positions>,
        veldata: Object,
        class_name_updated: String | undefined
    ) {
        let veldatalatlng = Object();
        for (const vehicle_id in veldata) {
            veldatalatlng[vehicle_id] = L.latLng(
                veldata[vehicle_id][0],
                veldata[vehicle_id][1]
            );
        }

        data = data.filter((elem) => {
            return elem.latitude !== 0 && elem.longitude !== 0;
        });
        data = add_headsigns_to_positions_list(data);

        for (const bus of data) {
            if (!veldatalatlng.hasOwnProperty(bus.vehicle_id)) {
                veldatalatlng[bus.vehicle_id] = L.latLng(0, 0);
            }

            create_bus_overlay(L.latLng(bus.latitude, bus.longitude), veldatalatlng[bus.vehicle_id]);
            // let bus_layer: L.Layer = create_bus_overlay(
            //     L.latLng(bus.latitude, bus.longitude),
            //     veldatalatlng[bus.vehicle_id]
            // )
            //     .bindPopup(bus.headsign)
            //     .on("click", (e) => {
            //         render_history(bus.vehicle_id, g_map_ref);
            //     });

            if (BusesMapView.check_is_new(bus.vehicle_id, bus.timestamp)) {
                if (class_name_updated) {
                    // @ts-ignore
                    // Access internal API to edit class name.
                    // bus_layer._rawImage.className += class_name_updated;
                }
                // BusesMapView.set_bus(bus.vehicle_id, bus_layer, bus.timestamp);
            }

            //@ts-ignore
            // bus_layer._rawImage.className += " bus-image";
        }
    }

    function normalize_latlng_vec(vec: L.LatLng, desired_mag: number) {
        const magnitude = Math.sqrt(vec.lat * vec.lat + vec.lng * vec.lng);

        if (magnitude == 0) return vec;
        return L.latLng(
            (vec.lat * desired_mag) / magnitude,
            (vec.lng * desired_mag) / magnitude
        );
    }

    function add_latlng(one: L.LatLng, two: L.LatLng) {
        return L.latLng(one.lat + two.lat, one.lng + two.lng);
    }

    function matrixmultiply(mat: Array<number>, pt: Array<number>) {
        if (pt.length !== 3 || mat.length !== 9) {
            throw Error("Incorrect matrix");
        }

        return [
            pt[0] * mat[0] + pt[1] * mat[1] + pt[2] * mat[2],
            pt[0] * mat[3] + pt[1] * mat[4] + pt[2] * mat[5],
            pt[0] * mat[6] + pt[1] * mat[7] + pt[2] * mat[8],
        ];
    }
}
