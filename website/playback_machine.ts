import { rootapiurl } from "./index";
import { MyImageOverlay } from "./MyImageOverlay";
import * as L from "leaflet";

class HistoryEvent {
    readonly timestamp: number;
    readonly vehicle_id: number;
    readonly position: L.LatLng;

    static from_json(json: Array<any>) {
        const ret = Array<HistoryEvent>();

        for (const elem of json) {
            ret.push({
                position: L.latLng(elem.latitude, elem.longitude),
                timestamp: elem.timestamp,
                vehicle_id: elem.vehicle_id,
            });
        }
        return ret;
    }
}

export class PlaybackIterator {
    private min: number;
    private max: number;

    private positions_array: Array<HistoryEvent>;
    private curindex: number;
    private buses: Map<number, MyImageOverlay>;

    private constructor(time_range: { min: number; max: number }) {
        this.min = time_range.min;
        this.max = time_range.max;
        this.buses = new Map();
        this.curindex = 0;
    }

    static async construct(time_range: { min: number; max: number }) {
        const instance = new PlaybackIterator(time_range);

        // Fill positions array
        instance.positions_array = HistoryEvent.from_json(
            await fetch(
                rootapiurl(
                    `/positions-range?min-time=${time_range.min}&max-time=${time_range.max}`
                )
            ).then((r) => r.json())
        );

        console.log(instance.positions_array.length);
        return instance;
    }

    private iter_time(max_time: number) {
        if (++this.curindex < this.positions_array.length) {
            return this.positions_array[this.curindex].timestamp <= max_time;
        } else {
            return false;
        }
    }

    init(map: L.Map) {
        const zerotimestamp = this.positions_array[0].timestamp;
        const startingtime = zerotimestamp + 180;

        this.show_until(startingtime, map);
    }

    private show_until(curtimestamp: number, map: L.Map) {
        while (this.iter_time(curtimestamp)) {
            const elem = this.positions_array[this.curindex];
            if (!this.buses.has(elem.vehicle_id)) {
                this.buses.set(
                    elem.vehicle_id,
                    new MyImageOverlay(elem.position, 0, map)
                );
            } else {
                const this_bus = this.buses.get(elem.vehicle_id);
                this_bus.latlng = elem.position;
                this_bus.update(map);
                this_bus.className += "newly-updated";
            }
        }
    }

    next(map: L.Map) {
        const curtimestamp = this.positions_array[this.curindex].timestamp;
        if (this.curindex >= this.positions_array.length) return false;

        this.show_until(curtimestamp, map);

        return true;
    }
}
