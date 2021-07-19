import {AnimSubscriber} from "./index";

const timeelem = document.getElementById("time");
export const subscr: AnimSubscriber = (drawables, sim_time) => {
    const time = new Date(sim_time*1000).toLocaleString();
    const num_vehicles = drawables.length.toString();
    timeelem.innerText = `${time} ${num_vehicles} vehicles`;
}