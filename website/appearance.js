if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark'); // could use local storage to make this reload less
} else {
    document.documentElement.setAttribute('data-theme', ''); // could use local storage to make this reload less
}