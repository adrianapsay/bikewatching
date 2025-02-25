mapboxgl.accessToken = 'pk.eyJ1IjoiNGRyaWFuIiwiYSI6ImNtN2RyOTEwbDA2OGwya3B3c2l2OGd1c20ifQ.abAT8eoTsXXBpRmIazUP7Q';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-71.0959457, 42.3612026],
    zoom: 12,
    minZoom: 5,
    maxZoom: 18
});

function formatTime(minutes) {
    const date = new Date(0, 0, 0, 0, minutes);
    return date.toLocaleString('en-US', { timeStyle: 'short' });
}

function minutesSinceMidnight(date) {
    return date.getHours() * 60 + date.getMinutes();
}

function filterTripsbyTime(trips, timeFilter) {
    return timeFilter === -1 
        ? trips
        : trips.filter((trip) => {
            const startedMinutes = minutesSinceMidnight(trip.started_at);
            const endedMinutes = minutesSinceMidnight(trip.ended_at);
            
            return (
                Math.abs(startedMinutes - timeFilter) <= 60 ||
                Math.abs(endedMinutes - timeFilter) <= 60
            );
        });
}

function computeStationTraffic(stations, trips) {
    const departures = d3.rollup(
        trips,
        (v) => v.length,
        (d) => d.start_station_id
    );

    const arrivals = d3.rollup(
        trips,
        (v) => v.length,
        (d) => d.end_station_id
    );

    return stations.map((station) => {
        let id = station.short_name;
        station.arrivals = arrivals.get(id) ?? 0;
        station.departures = departures.get(id) ?? 0;
        station.totalTraffic = station.arrivals + station.departures;
        return station;
    });
}

function getCoords(station) {
    const point = new mapboxgl.LngLat(+station.lon, +station.lat);
    const { x, y } = map.project(point);
    return { cx: x, cy: y };
}

const bikeLayerStyle = {
    'line-color': '#32D400',
    'line-width': 3,
    'line-opacity': 0.7
};

map.on("load", async () => {
    d3.select('#map')
        .append('svg')
        .style('position', 'absolute')
        .style('z-index', 1)
        .style('width', '100%')
        .style('height', '100%');

    map.addSource("boston_route", {
        type: "geojson",
        data: "https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson"
    });

    map.addSource("cambridge_route", {
        type: "geojson",
        data: "https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson"
    });

    map.addLayer({
        id: 'boston-bike-lanes',
        type: 'line',
        source: 'boston_route',
        paint: bikeLayerStyle
    });

    map.addLayer({
        id: 'cambridge-bike-lanes',
        type: 'line',
        source: 'cambridge_route',
        paint: bikeLayerStyle
    });

    try {
        const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
        const jsonData = await d3.json(jsonurl);
        let stations = jsonData.data.stations;

        const csvUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';
        const trips = await d3.csv(csvUrl, (trip) => {
            trip.started_at = new Date(trip.started_at);
            trip.ended_at = new Date(trip.ended_at);
            return trip;
        });

        stations = computeStationTraffic(stations, trips);

        const radiusScale = d3
            .scaleSqrt()
            .domain([0, d3.max(stations, d => d.totalTraffic)])
            .range([0, 25]);

        let stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);

        const svg = d3.select('#map').select('svg');

        const circles = svg.selectAll('circle')
            .data(stations, d => d.short_name)
            .enter()
            .append('circle')
            .attr('r', d => radiusScale(d.totalTraffic))
            .attr('fill', 'steelblue')
            .attr('fill-opacity', 0.6)
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .attr('class', 'station-marker')
            .each(function(d) {
                d3.select(this)
                    .append('title')
                    .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
            })
            .style("--departure-ratio", d => stationFlow(d.departures / d.totalTraffic));

        function updatePositions() {
            circles
                .attr('cx', d => getCoords(d).cx)
                .attr('cy', d => getCoords(d).cy);
        }

        updatePositions();

        map.on('move', updatePositions);
        map.on('zoom', updatePositions);
        map.on('resize', updatePositions);
        map.on('moveend', updatePositions);

        const timeSlider = document.getElementById('time-slider');
        const selectedTime = document.getElementById('time-display');
        const anyTimeLabel = document.getElementById('any-time-label');

        function updateScatterPlot(timeFilter) {
            const filteredTrips = filterTripsbyTime(trips, timeFilter);
            const filteredStations = computeStationTraffic(stations, filteredTrips);
            
            timeFilter === -1
              ? radiusScale.range([0, 25])
              : radiusScale.range([3, 50]);
            
            circles
                .data(filteredStations, d => d.short_name)
                .join('circle')
                .attr('r', d => radiusScale(d.totalTraffic))
                .style('--departure-ratio', (d) =>
                    stationFlow(d.departures / d.totalTraffic),
                  );
        }

        function updateTimeDisplay() {
            let timeFilter = Number(timeSlider.value);

            if (timeFilter === -1) {
                selectedTime.style.display = 'none';
                anyTimeLabel.style.display = 'block';
            } else {
                selectedTime.style.display = 'block';
                selectedTime.textContent = formatTime(timeFilter);
                anyTimeLabel.style.display = 'none';
            }
            
            updateScatterPlot(timeFilter);
        }

        timeSlider.addEventListener('input', updateTimeDisplay);
        updateTimeDisplay();

    } catch (error) {
        console.error('Error loading data:', error);
    }
});