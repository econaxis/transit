import * as L from "leaflet";

export function diff_latlng(a: L.LatLng, b: L.LatLng) {
    return L.latLng(a.lat - b.lat, a.lng - b.lng);
}

export interface HistoricalPosition {
    position: L.LatLng;
    timestamp: number;
}

export function create_image(position: L.LatLng, angle: number, map: L.Map) {
    const image = new Image(30, 20);
    image.src = "bus.png";
    image.className = "bus-image";
    image.style.position = "absolute";
    // map.getPane("overlayPane").appendChild(image);

    // update_image(image, position, angle, map);
    return image;
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

export class MyImageOverlay {
    private headsign: string;
    private positions: Array<HistoricalPosition>;
    private curindex: number;
    public curpos: L.LatLng;
    public angle: number;
    public image: HTMLImageElement;

    constructor(
        positions: Array<HistoricalPosition>,
        headsign: string,
        map: L.Map
    ) {
        this.positions = positions;
        this.curindex = 0;
        this.headsign = headsign;

        this.curpos = this.positions[0].position;
        this.angle = 0;
        this.image = create_image(this.curpos, this.angle, map);

        map.on("zoom", () => {
            update_image(this.image, this.curpos, this.angle, map);
        });
    }

    update(map: L.Map) {
        update_image(this.image, this.curpos, this.angle, map);
    }

    private advance_curindex_to_timestamp(timestamp: number) {
        let index = this.curindex;
        while (
            index + 1 < this.positions.length &&
            this.positions[index + 1].timestamp <= timestamp
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
        // Velocity should be less than 20m/s (80km/h), if its more, then render only discrete points, don't interp.
        if (pos1.distanceTo(pos2) / (time2 - time1) > 20) {
            if (timestamp - time1 < time2 - timestamp) return pos1;
            else return pos2;
        }

        const newlat = pos1.lat + alpha * (pos2.lat - pos1.lat);
        const newlng = pos1.lng + alpha * (pos2.lng - pos1.lng);

        return L.latLng(newlat, newlng);
    }

    show_to(timestamp: number) {
        console.assert(
            this.curindex <= 1 ||
                this.positions[this.curindex - 1].timestamp <= timestamp
        );

        this.curindex = this.advance_curindex_to_timestamp(timestamp);

        if (this.curindex >= this.positions.length) return false;

        if (this.positions[this.curindex].timestamp > timestamp) return true;

        const new_position = this.run_interpolation(this.curindex, timestamp);

        if (!new_position.equals(this.curpos))
            this.angle = get_angle(this.curpos, new_position);
        this.curpos = new_position;
        return true;
    }
}
