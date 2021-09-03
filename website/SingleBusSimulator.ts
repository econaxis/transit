import * as L from "leaflet";

export function diff_latlng(a: L.LatLng, b: L.LatLng) {
    return L.latLng(a.lat - b.lat, a.lng - b.lng);
}

export class HistoricalPosition {
    position: L.LatLng;
    timestamp: number;

    constructor(position, timestamp) {
        this.timestamp = timestamp;
        this.position = position;
    }
}

namespace ImageGenerator {
    let created = false;
    let image = new Image(30, 30);

    export function get() {
        if (!created) {
            image.src = "bus.png";
            image.className = "bus-image";
            image.style.position = "absolute";
            created = true;
        }
        return image;
    }
}

export function get_angle(old_pos: L.LatLng, new_pos: L.LatLng) {
    const vel = diff_latlng(new_pos, old_pos);
    return -Math.atan2(vel.lat, vel.lng);
}

export function update_image(
    image: HTMLImageElement,
    position: L.LatLng,
    angle: number,
    map: L.Map
) {
    let offset = map.latLngToLayerPoint(position);

    offset = offset.subtract(new L.Point(image.width / 2, image.height / 2));

    image.style.transform = `translate(${offset.x}px, ${offset.y}px) rotate(${angle}rad) rotate(180deg)`;
}

export enum SimulationIterResult {
    SHOW,
    NOSHOW,
    INVALID,
}

export class SingleBusSimulator {
    public headsign: string;
    private positions: Array<HistoricalPosition>;
    private curindex: number;
    public curpos: L.LatLng;
    public angle: number;
    public image: HTMLImageElement;

    constructor(positions: Array<HistoricalPosition>, headsign: string) {
        this.positions = positions;
        this.curindex = 0;
        this.headsign = headsign;

        this.curpos = this.positions[0].position;
        this.angle = 0;
        this.image = ImageGenerator.get();
    }

    private advance_curindex_to_timestamp(timestamp: number) {
        let index = this.curindex;
        while (
            index + 1 < this.positions.length &&
            this.positions[index + 1].timestamp < timestamp
        ) {
            index++;
        }
        return index;
    }

    private run_interpolation(old_index, timestamp) {
        if (old_index >= this.positions.length - 1)
            return this.positions[old_index].position;

        const time1 = this.positions[old_index].timestamp;
        const time2 = this.positions[old_index + 1].timestamp;

        if (timestamp < time1 || timestamp > time2) {
            throw Error("Timestamp not between two indexes");
        }

        const alpha = (timestamp - time1) / (time2 - time1);
        const pos1 = this.positions[old_index].position;
        const pos2 = this.positions[old_index + 1].position;

        // Check that velocity makes sense
        if (pos1.distanceTo(pos2)  >  800) {
            if (timestamp - time1 < time2 - timestamp) return pos1;
            else return pos2;
        }

        const newlat = pos1.lat + alpha * (pos2.lat - pos1.lat);
        const newlng = pos1.lng + alpha * (pos2.lng - pos1.lng);

        return L.latLng(newlat, newlng);
    }

    run_simulation_to(timestamp: number): SimulationIterResult {
        this.curindex = this.advance_curindex_to_timestamp(timestamp);

        if (this.curindex > this.positions.length)
            return SimulationIterResult.INVALID;

        // If we haven't reached the timestamp yet (bus appears later on), don't show.
        if (
            this.curindex === 0 &&
            this.positions[this.curindex].timestamp > timestamp
        )
            return SimulationIterResult.NOSHOW;

        // If it's been 3 minutes until the last update, don't update.
        // if (this.positions[this.curindex].timestamp + 180 < timestamp)
        //     return SimulationIterResult.SHOW;

        const new_position = this.run_interpolation(this.curindex, timestamp);

        if (!new_position.equals(this.curpos))
            this.angle = get_angle(this.curpos, new_position);
        this.curpos = new_position;
        return SimulationIterResult.SHOW;
    }
}
