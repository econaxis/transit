import * as L from "leaflet";
import { rootapiurl, render_history, Positions } from "./index";

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
    import check_is_new = BusesMapView.check_is_new;
    import get_bus = BusesMapView.get_bus;
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

    /**
     * @return Leaflet overlay type
     */
    function create_bus_overlay(position: L.LatLng, velocity: L.LatLng) {
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

        const bounds = g_map_ref.getBounds();
        const sizex = bounds.getNorthEast().distanceTo(bounds.getSouthWest()) * 0.00000012;
        const sizey = sizex / 1.5;

        console.log(sizex);
        const point0 = matrixmultiply(matrix, [-sizex, sizey, 1]);
        const point1 = matrixmultiply(matrix, [sizex, sizey, 1]);
        const point2 = matrixmultiply(matrix, [-sizex, -sizey, 1]);
        const point0_latlng = L.latLng(point0[1], point0[0]);
        const point1_latlng = L.latLng(point1[1], point1[0]);
        const point2_latlng = L.latLng(point2[1], point2[0]);

        return L.imageOverlay.rotated(
            get_bus_image(),
            point0_latlng,
            point1_latlng,
            point2_latlng,
            {
                alt: "Bus image",
                interactive: true,
                className: "bus",
            }
        );
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

            let bus_layer: L.Layer = create_bus_overlay(
                L.latLng(bus.latitude, bus.longitude),
                veldatalatlng[bus.vehicle_id]
            )
                .bindPopup(bus.headsign)
                .on("click", (e) => {
                    console.log("Clicked", bus.vehicle_id);
                    render_history(bus.vehicle_id);
                });

            if (check_is_new(bus.vehicle_id, bus.timestamp)) {
                // @ts-ignore
                if(class_name_updated) bus_layer._rawImage.className += class_name_updated;
                BusesMapView.set_bus(bus.vehicle_id, bus_layer, bus.timestamp);
            }
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

    function generate_bounds(position: L.LatLng, velocity: L.LatLng) {
        velocity = normalize_latlng_vec(velocity, 0.01);
        const othercoord = add_latlng(position, velocity);
        return L.latLngBounds(position, othercoord);
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
