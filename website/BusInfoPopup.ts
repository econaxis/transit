import * as L from "leaflet";
import {SingleBusSimulator} from "./SingleBusSimulator";
export function get_popup(location: [number, number], bus: SingleBusSimulator) : HTMLDivElement {
    const bus_number = 49;
    const headsign = bus.headsign;
    const vehicle_id = bus.id;
    const htmlstring = `
        <span>${bus_number}</span>
        <!--    <div style = "display: inline-block; width: 0; height: 20px; border: 2px solid black;"></div>-->
        <div style="width: 2px; margin: 10px 0 10px 0; background-color: black;">&nbsp;</div>
        <span>${headsign}</span>`;
    const div = document.createElement("div");
    div.className = "popup-prototype";
    div.innerHTML = htmlstring;
    div.style.position = "absolute";
    div.style.top = `${location[1]}px`;
    div.style.zIndex = "100";
    div.style.left = `${location[0]}px`;
    div.id = `bus-${vehicle_id}`;

    document.querySelectorAll(`#${div.id}`).forEach((a) => {
        a.remove();
    })

    let div_childed = document.body.appendChild(div);

    setTimeout(() => {div_childed.remove();}, 2000);




    return div;
}