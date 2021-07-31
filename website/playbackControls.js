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

window.addEventListener("mousemove", (event) => {
    if(event.clientY > vh(65)) {
        document.querySelector("#button-controls").style.maxHeight = "100%";
        document.querySelector("#button-controls").style.display = "flex";
    } else {
        document.querySelector("#button-controls").style.maxHeight = 0;
        document.querySelector("#button-controls").style.display = "none";
    }
});

const playPause = document.querySelector("#play-pause");

playPause.addEventListener("click", ()=> {
    playPause.classList.toggle("paused");
    playPause.classList.toggle("playing"); // probably not neccessary but who knows in the future
    if(playPause.classList.contains("playing")) {
        playPause.innerHTML=`<svg class="button-control-icon" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 45.5C15 46.6046 15.8954 47.5 17 47.5H23C24.1046 47.5 25 46.6046 25 45.5V14.5C25 13.3954 24.1046 12.5 23 12.5H17C15.8954 12.5 15 13.3954 15 14.5V45.5ZM37 12.5C35.8954 12.5 35 13.3954 35 14.5V45.5C35 46.6046 35.8954 47.5 37 47.5H43C44.1046 47.5 45 46.6046 45 45.5V14.5C45 13.3954 44.1046 12.5 43 12.5H37Z"/>
        </svg>`;
    } else {
        playPause.innerHTML=`<svg class="button-control-icon" viewBox="0 0 60 60" 
        xmlns="http://www.w3.org/2000/svg">
        <path d="M23.0738 14.456C21.7423 13.6087 20 14.5652 20 16.1433V43.8567C20 45.4348 21.7423 46.3913 23.0738 45.544L44.8485 31.6873C46.0835 30.9014 46.0835 29.0986 44.8485 28.3127L23.0738 14.456Z"/>
      </svg>`;
    }
    console.log("clicked");
})

const expandableControl = document.querySelectorAll(".expandable-control");
console.log(expandableControl)
expandableControl.forEach((c) => {
    c.addEventListener("mouseenter", (event) => {
        let expandingElements = event.target.children;
        for(let i = 1; i < expandingElements.length; i++){
            expandingElements[i].classList.remove("hidden");
        }
    });
    c.addEventListener("mouseleave", (event) => {
        let expandingElements = event.target.children;
        for(let i = 1; i < expandingElements.length; i++){
            expandingElements[i].classList.add("hidden");
        }
    });

    c.addEventListener("focus", (event) => {
        let expandingElements = event.target.children;
        for(let i = 1; i < expandingElements.length; i++){
            expandingElements[i].classList.remove("hidden");
        }
    });

    c.addEventListener("blur", (event) => {
        let expandingElements = event.target.children;
        for(let i = 1; i < expandingElements.length; i++){
            expandingElements[i].classList.add("hidden");
        }
    });
});

const pickerItems = document.querySelectorAll(".picker > *:not(#picker-highlight)");
const pickerSize = pickerItems.length;
const pickerHighlight = document.querySelector("#picker-highlight");

//  TODO fallback for narrow screen width

for(let i=0; i<pickerSize; i++){
    let item = pickerItems[i];
    console.log(item);
    item.addEventListener("click", (event) => {
        let x1 = 60*i;
        let x2 = 60*(pickerSize - i -1);
        console.log(pickerHighlight.style.left, x1);
        console.log(pickerHighlight.style.right, x2);
        console.log(i);
        let strX = pickerHighlight.style.left || "60px";
        strX = parseFloat(strX);
        console.log(strX);
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
            if (event.target = i) {
                event.target.classList.add("selected");
            } else {
                event.target.classList.remove("selected");
            }
        })
    });
}