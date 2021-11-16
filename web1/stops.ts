import {transit} from "./protos/proto";
import IStopPosition = transit.IStopPosition;

export class Stops {
    readonly stops: Stop[] = [];
    private next: Stop;

    constructor(stops: IStopPosition[]) {
        for (let i = stops.length - 1; i >= 0; i--) {
            this.stops.push(
                new Stop(stops[i], this.stops[this.stops.length - 1])
            );
        }
        this.stops.reverse();
        this.next = this.stops[0];
    }

    update(time: number) {
        const [result, next] = this.next.update(time);
        if (next != undefined) this.next = next;
        return result;
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
        this.next = next;
    }

    // Stop that the bus has last passed
    update(time: number): [number, Stop | undefined] {
        if (!this.next || time < this.arrival_time)
            return [this.shape_dist_traveled, undefined];
        if (time >= this.next.arrival_time) {
            return this.next.update(time);
        }
        const tscaled =
            (time - this.arrival_time) /
            (this.next.arrival_time - this.arrival_time);
        return [
            this.shape_dist_traveled * (1 - tscaled) +
            this.next.shape_dist_traveled * tscaled,
            undefined,
        ];
    }
}
