import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import Navbar from '../components/Navbar';
import { trackingAPI } from '../services/api';
import socketService from '../services/socket';

// Set your Mapbox access token here - get yours at https://mapbox.com
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN 

const StudentDashboard = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef({});
  
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busLocations, setBusLocations] = useState({});

  // Initialize map
  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [78.0322, 30.3165], // Dehradun coordinates
      zoom: 12
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Fetch routes on mount
  useEffect(() => {
    fetchRoutes();
    socketService.connect();

    // Listen for real-time location updates
    socketService.onReceiveLocation((data) => {
      setBusLocations(prev => ({
        ...prev,
        [data.busId]: {
          lat: data.lat,
          lng: data.lng,
          availableSeats: data.availableSeats,
          timestamp: data.timestamp
        }
      }));

      // Update marker on map
      updateBusMarker(data.busId, data.lat, data.lng);
    });

    // Listen for bus status changes
    socketService.onBusStatusChanged((data) => {
      setBuses(prev => prev.map(bus => 
        bus._id === data.busId ? { ...bus, isActive: data.isActive } : bus
      ));
    });

    return () => {
      socketService.off('receiveLocation');
      socketService.off('busStatusChanged');
      socketService.disconnect();
    };
  }, []);

  // Fetch buses when route changes
  useEffect(() => {
    if (selectedRoute) {
      fetchBusesByRoute(selectedRoute);
    } else {
      setBuses([]);
      clearMarkers();
    }
  }, [selectedRoute]);

  const fetchRoutes = async () => {
    try {
      const response = await trackingAPI.getRoutes();
      setRoutes(response.data);
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
    setLoading(false);
  };

  const fetchBusesByRoute = async (routeId) => {
    try {
      const response = await trackingAPI.getBusesByRoute(routeId);
      setBuses(response.data);
      
      // Add markers for all buses
      clearMarkers();
      response.data.forEach(bus => {
        if (busLocations[bus._id]) {
          addBusMarker(bus, busLocations[bus._id].lat, busLocations[bus._id].lng);
        }
      });

      // Draw route if stops exist
      const selectedRouteData = routes.find(r => r._id === routeId);
      if (selectedRouteData) {
        fetchAndDrawRoute(routeId);
      }
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const fetchAndDrawRoute = async (routeId) => {
    try {
      const response = await trackingAPI.getRouteDetails(routeId);
      const route = response.data;
      
      if (route.stops && route.stops.length > 0) {
        drawRouteOnMap(route.stops);
        
        // Fit map to show all stops
        const bounds = new mapboxgl.LngLatBounds();
        route.stops.forEach(stop => {
          bounds.extend([stop.lng, stop.lat]);
        });
        map.current.fitBounds(bounds, { padding: 50 });
      }
    } catch (error) {
      console.error('Error fetching route details:', error);
    }
  };

  const drawRouteOnMap = (stops) => {
    // Remove existing route layer
    if (map.current.getLayer('route')) {
      map.current.removeLayer('route');
    }
    if (map.current.getSource('route')) {
      map.current.removeSource('route');
    }

    // Remove existing stop markers
    document.querySelectorAll('.stop-marker').forEach(el => el.remove());

    // Add stop markers
    stops.forEach((stop, index) => {
      const el = document.createElement('div');
      el.className = 'stop-marker';
      el.style.cssText = `
        width: 24px;
        height: 24px;
        background-color: ${index === 0 ? '#22c55e' : index === stops.length - 1 ? '#ef4444' : '#3b82f6'};
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: bold;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      `;
      el.innerHTML = stop.order;

      new mapboxgl.Marker(el)
        .setLngLat([stop.lng, stop.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`<strong>${stop.name}</strong>`))
        .addTo(map.current);
    });

    // Draw route line
    const coordinates = stops.map(stop => [stop.lng, stop.lat]);

    map.current.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates
        }
      }
    });

    map.current.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 4,
        'line-dasharray': [2, 1]
      }
    });
  };

  const addBusMarker = (bus, lat, lng) => {
    const el = document.createElement('div');
    el.className = 'bus-marker';
    el.style.cssText = `
      width: 40px;
      height: 40px;
      background-color: ${bus.isActive ? '#22c55e' : '#6b7280'};
      border: 3px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    el.innerHTML = `<svg width="24" height="24" fill="white" viewBox="0 0 24 24">
      <path d="M17 20H7V21C7 21.5523 6.55228 22 6 22H5C4.44772 22 4 21.5523 4 21V20H3V12H2V8H3V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V8H22V12H21V20H20V21C20 21.5523 19.5523 22 19 22H18C17.4477 22 17 21.5523 17 21V20ZM5 5V14H19V5H5ZM5 16V18H9V16H5ZM15 16V18H19V16H15Z"/>
    </svg>`;

    el.addEventListener('click', () => {
      setSelectedBus(bus);
    });

    const marker = new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .addTo(map.current);

    markers.current[bus._id] = marker;
  };

  const updateBusMarker = (busId, lat, lng) => {
    if (markers.current[busId]) {
      markers.current[busId].setLngLat([lng, lat]);
    } else {
      // Find the bus and create marker
      const bus = buses.find(b => b._id === busId);
      if (bus) {
        addBusMarker(bus, lat, lng);
      }
    }
  };

  const clearMarkers = () => {
    Object.values(markers.current).forEach(marker => marker.remove());
    markers.current = {};
  };

  const getSelectedRouteName = () => {
    const route = routes.find(r => r._id === selectedRoute);
    return route ? route.routeName : '';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <div className="w-full lg:w-96 bg-white shadow-lg overflow-y-auto">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold text-gray-800 mb-4">Track Buses</h1>
            
            {/* Route Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Route
              </label>
              <select
                value={selectedRoute}
                onChange={(e) => {
                  setSelectedRoute(e.target.value);
                  setSelectedBus(null);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="">-- Select a Route --</option>
                {routes.map(route => (
                  <option key={route._id} value={route._id}>
                    {route.routeNumber} - {route.routeName}
                  </option>
                ))}
              </select>
            </div>

            {selectedRoute && (
              <p className="text-sm text-gray-500">
                Route: {getSelectedRouteName()}
              </p>
            )}
          </div>

          {/* Bus List */}
          {selectedRoute && (
            <div className="p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Buses on this Route ({buses.length})
              </h2>
              
              {buses.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No buses on this route</p>
              ) : (
                <div className="space-y-3">
                  {buses.map(bus => (
                    <div
                      key={bus._id}
                      onClick={() => setSelectedBus(bus)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedBus?._id === bus._id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-800">{bus.busNumber}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          bus.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {bus.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <p>Driver: {bus.driverId?.name}</p>
                        <p>Seats: {busLocations[bus._id]?.availableSeats ?? bus.availableSeats}/{bus.totalSeats}</p>
                      </div>

                      {busLocations[bus._id] && (
                        <p className="text-xs text-green-600 mt-2">
                          Live tracking active
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Bus Details */}
          {selectedBus && (
            <div className="p-4 border-t bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Bus Details</h3>
              
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bus Number</span>
                    <span className="font-semibold">{selectedBus.busNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Driver Name</span>
                    <span className="font-semibold">{selectedBus.driverId?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone</span>
                    <a 
                      href={`tel:${selectedBus.driverId?.phoneNumber}`}
                      className="font-semibold text-primary-600 hover:underline"
                    >
                      {selectedBus.driverId?.phoneNumber}
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Available Seats</span>
                    <span className="font-semibold">
                      {busLocations[selectedBus._id]?.availableSeats ?? selectedBus.availableSeats} / {selectedBus.totalSeats}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={`font-semibold ${selectedBus.isActive ? 'text-green-600' : 'text-gray-600'}`}>
                      {selectedBus.isActive ? 'On Trip' : 'Not Active'}
                    </span>
                  </div>
                </div>

                {selectedBus.driverId?.phoneNumber && (
                  <a
                    href={`tel:${selectedBus.driverId.phoneNumber}`}
                    className="mt-4 w-full block text-center py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Call Driver
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapContainer} className="absolute inset-0" />
          
          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4">
            <h4 className="text-sm font-semibold mb-2">Legend</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                <span>Start / Active Bus</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
                <span>End Point</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
                <span>Intermediate Stop</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-gray-500 mr-2"></div>
                <span>Inactive Bus</span>
              </div>
            </div>
          </div>

          {!selectedRoute && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p className="text-gray-600">Select a route to view buses</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
