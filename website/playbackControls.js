//some units
function vh(v) {
    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    return (v * h) / 100;
}

function vw(v) {
    var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    return (v * w) / 100;
}

function vmin(v) {
    return Math.min(vh(v), vw(v));
}

function vmax(v) {
    return Math.max(vh(v), vw(v));
}

const bottomBar = document.querySelector("#bottom-controls");
const buttonCtrls = document.querySelector("#button-controls");
var buttonCtrlsShown = false;
const picker = document.getElementsByClassName("picker")[0];
const expandableControl = document.querySelectorAll(".expandable-control");

var windowIsSkinny = window.matchMedia("(max-width: " + em(42) + "px)").matches;


window.addEventListener("mousemove", (event) => {
    if (!windowIsSkinny) {
        if (event.clientY > vh(65)) {
            buttonCtrls.style.maxHeight = "100%";
            buttonCtrls.style.display = "flex";
        } else {
            buttonCtrls.style.maxHeight = 0;
            buttonCtrls.style.display = "none";
        }
    }
    console.log("moved!")
    console.log(windowIsSkinny)
});

window.addEventListener("resize", () => {
    windowIsSkinny = window.matchMedia("(max-width: 42em)").matches;
})

var dragging = false;
window.addEventListener("touchstart", (event) => {
    dragging = false;
});

window.addEventListener("touchmove", (event) => {
    dragging = true;
});

window.addEventListener("touchend", (event) => {
    if (!dragging && !event.path.includes(bottomBar)) {
        if (buttonCtrlsShown) {
            buttonCtrls.style.maxHeight = 0;
            buttonCtrls.style.display = "none";
            console.log("touch", event.target);
            console.log("touch", event.target.tagName);
        } else {
            buttonCtrls.style.maxHeight = "100%";
            buttonCtrls.style.display = "flex";
            console.log("touch", event.target);
        }
        buttonCtrlsShown = !buttonCtrlsShown;
    }

    if (windowIsSkinny) {
        if (event.target.tagName == "CANVAS") {
            document.querySelector(".picker").classList.add("hidden");
        }

        if (!event.path.includes(picker) && !event.path.includes(expandableControl[0])) {
            document.querySelector(".picker").classList.add("hidden");
        }
        console.log(event.path)
    }
});

console.log(picker);
const pickerItems = document.querySelectorAll(".picker > *:not(#picker-highlight)");
const pickerSize = pickerItems.length;
const pickerHighlight = document.querySelector("#picker-highlight");

expandableControl.forEach((c) => {
    c.addEventListener("mouseenter", (event) => {
        console.log(event.target);
        let expandingElements = c.children;
        if (!windowIsSkinny) {
            for (let i = 1; i < expandingElements.length; i++) {
                expandingElements[i].classList.remove("hidden");
            }
            console.log("enter")
        }
    });
    c.addEventListener("touchend", (event) => {
        let expandingElements = c.children;
        if (windowIsSkinny && !event.path.includes(picker)) {
            for (let i = 1; i < expandingElements.length; i++) {
                expandingElements[i].classList.toggle("hidden");
            }
        }
    })
    /*c.addEventListener("focus", (event) => {
        let expandingElements = c.children;
        for (let i = 1; i < expandingElements.length; i++) {
            expandingElements[i].classList.remove("hidden");
        }
        console.log("focused")
    });
    c.addEventListener("blur", (event) => {
        let expandingElements = c.children;
        for (let i = 1; i < expandingElements.length; i++) {
            expandingElements[i].classList.add("hidden");
        }
        console.log("blurred")
    });
    c.children[0].addEventListener("click", (event) => {let expandingElements = c.children;
        for (let i = 1; i < expandingElements.length; i++) {
            expandingElements[i].classList.toggle("hidden");
        }
    })*/
});


//  TODO fallback for narrow screen width
/*
for (let i = 0; i < pickerSize; i++) {
    let item = pickerItems[i];
    //console.log(item);
    item.addEventListener("click", (event) => {
        console.log(event);
        event.stopPropagation();
        event.preventDefault();
        let x1 = 60 * i;
        let x2 = 60 * (pickerSize - i - 1);
        let strX = pickerHighlight.style.left || "60px";
        strX = parseFloat(strX);
        if (strX <= x1) {
            pickerHighlight.style.transition = "right 0.5s, left 0.5s ease-out 0.35s";
            pickerHighlight.style.right = x2 + "px";
            pickerHighlight.style.left = x1 + "px";
        } else {
            pickerHighlight.style.transition = "left 0.5s, right 0.5s ease-out 0.35s";
            pickerHighlight.style.left = x1 + "px";
            pickerHighlight.style.right = x2 + "px";
        }
        //console.log(pickerHighlight.style.transition);
        pickerItems.forEach((i) => {
            i.classList.remove("selected");
        });
        event.target.classList.add("selected");
        event.target.parentElement.nextElementSibling.innerHTML = event.target.innerHTML; //ideally check if nextsib is ctrl value
        setTimeout(function(){ event.target.parentElement.classList.add("hidden"); }, 1500);
    });


    item.addEventListener("touchend", (event) => {
        let x1 = 60 * i;
        let x2 = 60 * (pickerSize - i - 1);
        let strX = pickerHighlight.style.left || "60px";
        strX = parseFloat(strX);
        if (strX <= x1) {
            pickerHighlight.style.transition = "right 0.5s, left 0.5s ease-out 0.35s";
            pickerHighlight.style.right = x2 + "px";
            pickerHighlight.style.left = x1 + "px";
        } else {
            pickerHighlight.style.transition = "left 0.5s, right 0.5s ease-out 0.35s";
            pickerHighlight.style.left = x1 + "px";
            pickerHighlight.style.right = x2 + "px";
        }
        console.log(pickerHighlight.style.transition);
        pickerItems.forEach((i) => {
            i.classList.remove("selected");
        });
        event.target.classList.add("selected");
    });
}
*/

picker.addEventListener("click", (event) => {
    console.log(event.target, "picker");
    console.log(event);
    event.stopPropagation();
    event.preventDefault();
    var i = 0;
    for (j = 0; j < pickerSize; j++) {
        if (pickerItems[j] == event.target) {
            i = j;
            break;
        }
    }
    let itemSize = windowIsSkinny ? 38 : 60;
    let buffer = windowIsSkinny ? 10 : 0; //vertical margin thing with the sliding knob
    let x1 = itemSize * i + buffer;
    let x2 = itemSize * (pickerSize - i - 1) + buffer;
    if (windowIsSkinny) {
        let strY = pickerHighlight.style.top || "38px";
        strY = parseFloat(strY);
        if (strY <= x1) {
            pickerHighlight.style.transition = "bottom 0.5s, top 0.5s ease-out 0.35s";
            pickerHighlight.style.bottom = x2 + "px";
            pickerHighlight.style.top = x1 + "px";
        } else {
            pickerHighlight.style.transition = "top 0.5s, bottom 0.5s ease-out 0.35s";
            pickerHighlight.style.top = x1 + "px";
            pickerHighlight.style.bottom = x2 + "px";
        }
    } else {
        let strX = pickerHighlight.style.left || "60px";
        strX = parseFloat(strX);
        if (strX <= x1) {
            pickerHighlight.style.transition = "right 0.5s, left 0.5s ease-out 0.35s";
            pickerHighlight.style.right = x2 + "px";
            pickerHighlight.style.left = x1 + "px";
        } else {
            pickerHighlight.style.transition = "left 0.5s, right 0.5s ease-out 0.35s";
            pickerHighlight.style.left = x1 + "px";
            pickerHighlight.style.right = x2 + "px";
        }
    }
    //console.log(pickerHighlight.style.transition);
    pickerItems.forEach((i) => {
        i.classList.remove("selected");
    });
    event.target.classList.add("selected");
    event.target.parentElement.nextElementSibling.innerHTML = event.target.innerHTML; //ideally check if nextsib is ctrl value
    setTimeout(function () { event.target.parentElement.classList.add("hidden"); }, (windowIsSkinny ? 1000 : 1500));
});

bottomBar.addEventListener("mouseleave", (event) => {
    if (!windowIsSkinny) {
        console.log("bottom bar out")
        console.log(document.elementFromPoint(event.clientX, event.clientY));
        document.querySelector(".picker").classList.add("hidden");
    }
});



const playPause = document.querySelector("#play-pause");

playPause.addEventListener("click", () => {
    playPause.classList.toggle("paused");
    playPause.classList.toggle("playing"); // probably not neccessary but who knows in the future
    if (playPause.classList.contains("playing")) {
        playPause.innerHTML = `<svg class="button-control-icon" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 45.5C15 46.6046 15.8954 47.5 17 47.5H23C24.1046 47.5 25 46.6046 25 45.5V14.5C25 13.3954 24.1046 12.5 23 12.5H17C15.8954 12.5 15 13.3954 15 14.5V45.5ZM37 12.5C35.8954 12.5 35 13.3954 35 14.5V45.5C35 46.6046 35.8954 47.5 37 47.5H43C44.1046 47.5 45 46.6046 45 45.5V14.5C45 13.3954 44.1046 12.5 43 12.5H37Z"/>
        </svg>`;
    } else {
        playPause.innerHTML = `<svg class="button-control-icon" viewBox="0 0 60 60" 
        xmlns="http://www.w3.org/2000/svg">
        <path d="M23.0738 14.456C21.7423 13.6087 20 14.5652 20 16.1433V43.8567C20 45.4348 21.7423 46.3913 23.0738 45.544L44.8485 31.6873C46.0835 30.9014 46.0835 29.0986 44.8485 28.3127L23.0738 14.456Z"/>
      </svg>`;
    }
    console.log("clicked");
})


// initial bottom chunk width
var sum = 0;
document.querySelectorAll("#button-controls > *").forEach((i) => sum += i.clientWidth);
//seems to stay consistent across screen sizes
//console.log(sum, vw(100));