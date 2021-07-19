import { PlaybackIterator } from "./playback_machine";
import * as L from "leaflet";
import { AnimSubscriber } from "./index";

const FRAMEINTERVAL = 1000 / 30;

export function animate(
    it: PlaybackIterator,
    draw_func: Function,
    check_in_viewport: (pos: L.LatLng) => boolean,
    subscribers: Array<AnimSubscriber>,
    last_run_time = 0,
    created_new = false
) {
    if (!it.check_valid()) {
        return;
    }

    if (Date.now() - last_run_time >= FRAMEINTERVAL) {
        const drawable = it.next(check_in_viewport);
        if (it.get_proportion_left() < 0.1 && !created_new) {
            created_new = true;
            console.log("Creating new because time short", it.cur_time);
            new_iterator(it).then((itnew) => {
                it.stop = true;
                console.log("Stopping");
                animate(itnew, draw_func, check_in_viewport, subscribers);
            });
        }
        draw_func(drawable);
        last_run_time = Date.now();
        subscribers.forEach((subscr) => subscr(drawable, it.cur_time));
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

async function new_iterator(
    oldit: PlaybackIterator
): Promise<PlaybackIterator> {
    const desired_max = Math.round(oldit.cur_time) + 5000;
    const it = await PlaybackIterator.construct({
        min: Math.round(oldit.cur_time) - 50,
        max: desired_max,
    });

    it.cur_time = oldit.cur_time - 1;
    return it;
}
