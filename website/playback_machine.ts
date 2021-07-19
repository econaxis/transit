import { rootapiurl } from "./index";
import { HistoricalPosition, MyImageOverlay } from "./MyImageOverlay";
import * as L from "leaflet";
import { DrawableBus } from "./canvas_renderer";

function from_json_list(json): Array<[number, Array<HistoricalPosition>]> {
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
    return [...ret.entries()];
}

(window as any).UPDATE_INTERV = 1;

export class PlaybackIterator {
    private readonly min: number;
    private buses: Array<MyImageOverlay>;
    public readonly max: number;
    public cur_time: number;
    public stop: boolean;

    private constructor(
        time_range: { min: number; max: number },
        buses: Array<MyImageOverlay>
    ) {
        this.min = time_range.min;
        this.max = time_range.max;
        this.stop = false;
        this.cur_time = this.min;
        this.buses = buses;
    }

    static async construct(time_range: { min: number; max: number }) {
        const history_data = await fetch(
            rootapiurl(
                `/positions-range?min-time=${time_range.min}&max-time=${time_range.max}`
            )
        ).then((r) => r.json());

        const headsigns = await fetch(rootapiurl("/headsigns")).then((r) =>
            r.json()
        );

        const actual_timerange = { min: Infinity, max: 0 };
        const buses = from_json_list(history_data).map(([key, value]) => {
            const overlay = new MyImageOverlay(value, headsigns[key]);

            actual_timerange.max = Math.max(
                actual_timerange.max,
                value[value.length - 1].timestamp
            );
            actual_timerange.min = Math.min(
                actual_timerange.min,
                value[0].timestamp
            );

            return overlay;
        });

        console.log(
            "Actual range: ",
            actual_timerange.max - actual_timerange.min
        );

        return new PlaybackIterator(actual_timerange, buses);
    }

    check_valid(): boolean {
        if (this.stop) {
            console.log("Not valid because manual stop");
            return false;
        }

        if (this.cur_time > this.max) {
            console.log("Not valid because cur time past max");
            return false;
        }

        return true;
    }

    get_proportion_left() {
        return (this.max - this.cur_time) / (this.max - this.min);
    }

    next(check_in_viewport: (pos: L.LatLng) => boolean): Array<DrawableBus> {
        if (this.cur_time > this.max) {
            throw Error("Playback iterator is not valid anymore");
        }

        this.cur_time += (window as any).UPDATE_INTERV;
        const to_remove = Array<number>();

        const should_update = this.buses.filter((value) => {
            return check_in_viewport(value.curpos);
        });

        // todo: update to_remove properly in terms of should_continue
        const drawables = this.buses.map((bus) : null | DrawableBus => {
            if (check_in_viewport(bus.curpos)) {
                const should_continue = bus.run_simulation_to(this.cur_time);
                return new DrawableBus(bus.curpos, bus.angle, bus.image);
            } else{
                if (this.cur_time % (window as any).UPDATE_INTERV * 5 == 0) {
                    bus.run_simulation_to(this.cur_time);
                }
                return null;
            }
        });

        const drawables_nonnull = drawables.filter((bus) => bus != null);

        // to_remove.forEach((key) => this.buses.re(key));

        return drawables_nonnull;
    }
}
