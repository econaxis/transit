import { PlaybackIterator } from "./playback_machine";
import * as L from "leaflet";
import { AnimSubscriber } from "./index";

const FRAMEINTERVAL = 1000 / 80;

export function animate_with_defaults(it: PlaybackIterator) {
    const empty = (...args) => true;
    animate(it, empty, empty, [], 0, false);
}

export function animate(
    it: PlaybackIterator,
    draw_func: Function,
    check_in_viewport: (pos: L.LatLng) => boolean,
    subscribers: Array<AnimSubscriber> = [],
    last_run_time = 0,
    created_new = false
) {
    if (!it.check_valid()) {
        return;
    }

    if (Date.now() - last_run_time >= FRAMEINTERVAL) {
        const drawable = it.next(check_in_viewport);
        draw_func(drawable);
        last_run_time = Date.now();
        subscribers = subscribers.filter((subscr) => {
            if (subscr(it, drawable, it.cur_time) === true) {
                // Should remove.
                return false;
            }
            return true;
        });
    }

    window.requestAnimationFrame(() => {
        animate(
            it,
            draw_func,
            check_in_viewport,
            subscribers,
            last_run_time,
            created_new
        );
    });
}
