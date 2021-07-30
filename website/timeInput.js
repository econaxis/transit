//could consider converting to .ts
// considering splitting the render js and the js that controls the map into two files and the render being ran at the beginning and control added at the end

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

const timeSlider = document.querySelector('#time-slider');
var timeSliderWidth = timeSlider.clientWidth - Math.min(vmax(3), 35) / 2; //real slider range is slider width minus thumb width
var timeSliderMargin = Math.min(vmax(6), 70);

const bump = document.querySelector('#bump');
bump.style.left = timeSlider.value + "%";

const timeTooltip = document.querySelector("#slider-pos");
timeTooltip.innerHTML=timeSlider.value;

timeSlider.addEventListener('resize', (event)=> {
  timeSliderWidth = timeSlider.clientWidth;
  timeSliderMargin = Math.min(vmax(6), 70);

})
// should we render/fetch data whenever/whereever the user drags or should we do it only when user releases the knob
timeSlider.addEventListener('change', (event) => {
  //const result = document.querySelector('.result');
  //result.textContent = `You like ${event.target.value}`;
 
  timeTooltip.style.display="none";
  console.log();
  // do a delay for disappearing?
});

timeSlider.addEventListener('input', (event) => {
    //const result = document.querySelector('.result');
    //result.textContent = `You like ${event.target.value}`;
    let target = event.target;
    bump.style.left = target.value + "%";
    timeTooltip.style.display="flex";
    timeTooltip.innerHTML=target.value;
    let tooltipX = Math.min(Math.max(0, target.value*timeSliderWidth/100 +timeSliderMargin - 75 - 14), vw(100) - 150 - 20) + "px";
    timeTooltip.style.left = tooltipX;

});

timeSlider.addEventListener('mouseenter', (event) => {
  timeTooltip.style.display="flex";
});

timeSlider.addEventListener('mouseleave', (event) => {
  timeTooltip.style.display="none";
});
