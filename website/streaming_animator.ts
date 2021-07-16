import { PlaybackIterator } from "./playback_machine";

export let images_rendered = 0;

export function animate(
    it: PlaybackIterator,
    map: L.Map,
    clear_func: Function
) {
    animate_recurse(it, map, false, clear_func);
}

function animate_recurse(
    it: PlaybackIterator,
    map: L.Map,
    called_new_it: boolean,
    clear_func: Function
) {
    clear_func();
    const should_continue = it.next(map);
    if (Math.random() < 0.05) {
        console.log((new Date(it.cur_time * 1000)).toString());
    }
    images_rendered = 0;

    if (it.max - it.cur_time < 200 && !called_new_it) {
        new_iterator(it.cur_time, map, clear_func).then(() => {
            // Stop the current one.
        });
        it.stop = true;
        called_new_it = true;
    }

    if (should_continue)
        window.requestAnimationFrame(() => {
            animate_recurse(it, map, called_new_it, clear_func);
        });
    else {
        console.log("ended");
    }
}

async function new_iterator(
    cur_time: number,
    map: L.Map,
    clear_func: Function
) {
    const it = await PlaybackIterator.construct(
        {
            min: Math.round(cur_time) - 100,
            max: Math.round(cur_time) + 5000,
        },
        map
    );

    it.cur_time = cur_time - 1;

    console.log("Starting new iterator");
    animate_recurse(it, map, false, clear_func);
}
