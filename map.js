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

map.on('load', () => { 
    const bikeLaneStyle = {
        'line-width': 5,
        'line-opacity': 0.6
    };

    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson?...'
    });

    // Boston Bike Lanes
    map.addLayer({
        id: 'bike-lanes-boston',
        type: 'line',
        source: 'boston_route',
        paint: {
            ...bikeLaneStyle,
          'line-color': '#32D400'
        }
    });

    // Cambridge Bike Lanes
    map.addSource('cambridge_route', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
    });

    map.addLayer({
        id: 'bike-lanes-cambridge',
        type: 'line',
        source: 'cambridge_route',
        paint: {
            ...bikeLaneStyle,
          'line-color': '#32D400'
        }
    });
});

map.on('load', () => {
    // Load the nested JSON file
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json'
    d3.json(jsonurl).then(jsonData => {
        console.log('Loaded JSON Data:', jsonData);
        let stations = jsonData.data.stations;
        console.log('Stations Array:', stations);
        
        const svg = d3.select('#map').select('svg');

        function getCoords(station) {
            const point = new mapboxgl.LngLat(+station.lon, +station.lat);
            const { x, y } = map.project(point);
            return { cx: x, cy: y };
        }

        const circles = svg.selectAll('circle')
            .data(stations)
            .enter()
            .append('circle')
            .attr('r', 5)
            .attr('fill', 'steelblue')
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .attr('opacity', 0.8);
        
        function updatePositions() {
            circles
                .attr('cx', d => getCoords(d).cx)
                .attr('cy', d => getCoords(d).cy);
        }
        
        updatePositions();

        map.on('move', updatePositions);     // Update during map movement
        map.on('zoom', updatePositions);     // Update during zooming
        map.on('resize', updatePositions);   // Update on window resize
        map.on('moveend', updatePositions);  // Final adjustment after movement ends

        const csvurl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';
        d3.csv(csvurl).then(trips => {
            console.log('Loaded Traffic Daihta:', trips);

            let departures = d3.rollup(
                trips,
                v => v.length,
                d => d.start_station_id
            );

            let arrivals = d3.rollup(
                trips,
                v => v.length,
                d => d.end_station_id
            );

            for (let trip of trips) {

                trip.started_at = new Date(trip.started_at);
                trip.ended_at = new Date(trip.ended_at);
            }

            console.log('🚲 Converted Date Objects:', trips);
            console.log('Departures:', departures);
            console.log('Arrivals:', arrivals);

            stations = stations.map((station) => {
                let id = station.short_name;

                station.arrivals = arrivals.get(id) ?? 0;
                station.departures = departures.get(id) ?? 0;
                station.totalTraffic = station.arrivals + station.departures;

                return station;
            });

            console.log('Updated Stations with Traffic Data:', stations);

            const radiusScale = d3
            .scaleSqrt()
            .domain([0, d3.max(stations, (d) => d.totalTraffic)])
            .range([0, 25]);

            svg.selectAll('circle')
                .data(stations)
                .transition()
                .duration(500)
                .attr('r', d => radiusScale(d.totalTraffic || 1))
                .attr('fill', 'steelblue')
                .attr('fill-opacity', 0.6)
                .attr('stroke', 'white')
                .attr('stroke-width', 1.5)
                .each(function(d) {
                    d3.select(this)
                      .append('title')
                      .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
                });


        }).catch(error => {
            console.error('Error loading traffic data:', error);
        });

    }).catch(error => {
      console.error('Error loading JSON:', error);
    });
});

// Initialize the filter variable
let timeFilter = -1;

// Select the slider and display elements
const timeSlider = document.getElementById('time-slider');
const selectedTime = document.getElementById('time-display');
const anyTimeLabel = document.getElementById('any-time-label');

// Helper function: Convert minutes since midnight to HH:MM AM/PM
function formatTime(minutes) {
    const date = new Date(0, 0, 0, 0, minutes);  // Set hours & minutes
    return date.toLocaleString('en-US', { timeStyle: 'short' }); // Format as HH:MM AM/PM
}

// Function to update UI when slider moves
function updateTimeDisplay() {
    timeFilter = Number(timeSlider.value);  // Get slider value

    if (timeFilter === -1) {
        selectedTime.textContent = '';  // Clear time display
        anyTimeLabel.style.display = 'block';  // Show "(any time)"
    } else {
        selectedTime.textContent = formatTime(timeFilter);  // Display formatted time
        anyTimeLabel.style.display = 'none';  // Hide "(any time)"
    }

    // 🔥 Future step: Trigger data filtering logic here
}

// Listen for slider movement and update the UI
timeSlider.addEventListener('input', updateTimeDisplay);

// Set initial state (ensures correct UI when page loads)
updateTimeDisplay();

