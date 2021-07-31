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
