   // Set your Mapbox access token here
   mapboxgl.accessToken = 'pk.eyJ1IjoiNGRyaWFuIiwiYSI6ImNtN2RyOTEwbDA2OGwya3B3c2l2OGd1c20ifQ.abAT8eoTsXXBpRmIazUP7Q';

   // Initialize the map
   const map = new mapboxgl.Map({
     container: 'map', // ID of the div where the map will render
     style: 'mapbox://styles/mapbox/streets-v12', // Map style
     center: [-71.0959457, 42.3612026], // [longitude, latitude]
     zoom: 12, // Initial zoom level
     minZoom: 5, // Minimum allowed zoom
     maxZoom: 18 // Maximum allowed zoom
   });