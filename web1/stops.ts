import { transit } from "./protos/proto";
import IStopPosition = transit.IStopPosition;

export class Stops {
    readonly stops: Stop[] = [];
    next: Stop;

    constructor(stops: IStopPosition[]) {
        for (let i = stops.length - 1; i >= 0; i--) {
            this.stops.push(
                new Stop(stops[i], this.stops[this.stops.length - 1])
            );
        }
        this.stops.reverse();
        this.next = this.stops[0];
    }

    last_passed_time(): number {
        return this.next.arrival_time;
    }

    update(time: number): [string, number] | number {
        const result = this.next.update(time);

        if (typeof result == "string") {
            return [result, this.next.shape_dist_traveled];
        } else {
            let [res, next] = result;
            if (next !== this.next) this.next = next;
            return res;
        }
    }

    get_stop_eta(time: number, count = 0): [number, number] | null {
        let this_next = this.next;

        while (count > 0 && this_next.next !== undefined) {
            this_next = this_next.next;
            count--;
        }

        if (this_next.next !== undefined) {
            return [this_next.next.arrival_time - time, this_next.next.stop_id];
        }
    }
}

class Stop {
    readonly stop_id: number;
    readonly arrival_time: number;
    readonly shape_dist_traveled: number;
    readonly next?: Stop;

    constructor(s: IStopPosition, next?: Stop) {
        this.stop_id = s.stopId;
        this.arrival_time = s.stopTime;
        this.shape_dist_traveled = s.shapeDistTraveled;
        if (next) {
            console.assert(this.arrival_time <= next.arrival_time);
        }
        this.next = next;
    }

    update(time: number): [number, Stop] | string {
        if (!this.next) return "end";
        if (time < this.arrival_time) return "too-early";

        if (time >= this.next.arrival_time) {
            return this.next.update(time);
        }
        const tscaled =
            (time - this.arrival_time) /
            (this.next.arrival_time - this.arrival_time);
        return [
            this.shape_dist_traveled * (1 - tscaled) +
                this.next.shape_dist_traveled * tscaled,
            this,
        ];
    }
}
