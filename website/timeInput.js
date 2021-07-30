//could consider converting to .ts
// considering splitting the render js and the js that controls the map into two files and the render being ran at the beginning and control added at the end

const timeSlider = document.querySelector('#time-slider');
const bump = document.querySelector('#bump')
bump.style.left = timeSlider.value + "%";

// should we render/fetch data whenever/whereever the user drags or should we do it only when user releases the knob
timeSlider.addEventListener('change', (event) => {
  //const result = document.querySelector('.result');
  //result.textContent = `You like ${event.target.value}`;
  console.log(event.target);
  console.log("released", event.target.value);
});

timeSlider.addEventListener('input', (event) => {
    //const result = document.querySelector('.result');
    //result.textContent = `You like ${event.target.value}`;
    const target = event.target;
    bump.style.left = target.value + "%";
});