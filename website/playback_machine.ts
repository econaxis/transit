import { rootapiurl, draw_image_to_canvas } from "./index";
import {
    MyImageOverlay,
    HistoricalPosition,
    update_image,
} from "./MyImageOverlay";
import * as L from "leaflet";
import { point } from "leaflet";

function from_json_list(json, headsigns) {
    const ret = new Map<number, Array<HistoricalPosition>>();
    for (const elem of json) {
        const to_insert: HistoricalPosition = {
            position: L.latLng(elem.latitude, elem.longitude),
            timestamp: elem.timestamp,
        };

        if (ret.has(elem.vehicle_id)) {
            ret.get(elem.vehicle_id).push(to_insert);
        } else {
            ret.set(elem.vehicle_id, [to_insert]);
        }
    }
    return ret;
}

export class PlaybackIterator {
    private min: number;
    public max: number;
    public cur_time: number;
    public stop: boolean;
    private buses: Map<number, MyImageOverlay>;

    private constructor(time_range: { min: number; max: number }) {
        this.min = time_range.min;
        this.max = time_range.max;
        this.stop = false;
        this.cur_time = this.min;
        this.buses = new Map();
    }

    // TODO: remove dependency on map
    static async construct(
        time_range: { min: number; max: number },
        map: L.Map
    ) {
        const instance = new PlaybackIterator(time_range);

        const history_data = await fetch(
            rootapiurl(
                `/positions-range?min-time=${time_range.min}&max-time=${time_range.max}`
            )
        ).then((r) => r.json());

        const headsigns = await fetch(rootapiurl("/headsigns")).then((r) =>
            r.json()
        );
        instance.buses = new Map();

        from_json_list(history_data, headsigns).forEach((value, key) => {
            const overlay = new MyImageOverlay(value, headsigns[key], map);
            instance.buses.set(key, overlay);
        });

        return instance;
    }

    next(map: L.Map) {
        if (this.stop) return false;

        this.cur_time += 1;
        const to_remove = Array<number>();
        const bounds = map.getBounds();
        this.buses.forEach((value, key) => {
            if (!value.show_to(this.cur_time)) {
                to_remove.push(key);
            }
        });

        this.buses.forEach((value, key) => {
            let offset = map.latLngToLayerPoint(value.curpos);

            const position = offset.subtract(
                new L.Point(value.image.width / 2, value.image.height / 2)
            );

            draw_image_to_canvas(value.image, position, value.angle);
            // update_image(value.image, value.curpos, value.angle, map);
        });

        to_remove.forEach((key) => this.buses.delete(key));

        return this.cur_time <= this.max;
    }
}
