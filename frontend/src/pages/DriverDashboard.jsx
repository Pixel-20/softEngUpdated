import { useState, useEffect, useRef } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import Navbar from '../components/Navbar';
import { driverAPI } from '../services/api';
import socketService from '../services/socket';

const DriverDashboard = () => {
  // State Management
  const [bus, setBus] = useState(null);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [availableSeats, setAvailableSeats] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Store intervals/watches so we can clear them when the trip ends
  const watchIdRef = useRef(null);
  const [simulationInterval, setSimulationInterval] = useState(null);

  // Load Google Maps specifically for the simulation feature
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  // Initialization
  useEffect(() => {
    fetchDriverDetails();
    socketService.connect();

    // Cleanup intervals if the driver leaves the page
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (simulationInterval) clearInterval(simulationInterval);
      socketService.disconnect();
    };
  }, []);

  const fetchDriverDetails = async () => {
    try {
      const response = await driverAPI.getDashboard(); // Adjust this if your exact API call is named differently
      setBus(response.data.bus);
      setCurrentRoute(response.data.route);
      setIsActive(response.data.bus?.isActive || false);
      setAvailableSeats(response.data.bus?.availableSeats || 0);
    } catch (error) {
      console.error('Error fetching driver details:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- FEATURE 1: REAL WORLD GPS TRACKING ---
  const startRealTrip = async () => {
    try {
      // 1. Tell the backend the bus is active
      await driverAPI.updateStatus({ isActive: true });
      setIsActive(true);
      socketService.emit('busStatusChanged', { busId: bus._id, isActive: true });

      // 2. Start streaming real GPS coordinates from the phone hardware
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const currentLat = position.coords.latitude;
          const currentLng = position.coords.longitude;

          socketService.emit('updateLocation', {
            busId: bus._id,
            lat: currentLat,
            lng: currentLng,
            availableSeats: availableSeats
          });
        },
        (error) => {
          console.error("GPS Error:", error);
          alert("Please enable GPS permissions for this app in your browser/phone settings.");
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    } catch (error) {
      console.error('Error starting real trip:', error);
    }
  };

  // --- FEATURE 2: LAPTOP SIMULATION TOOL ---
  const simulateTrip = async () => {
    if (!isLoaded) {
      alert("Google Maps is not loaded yet. Please wait a second.");
      return;
    }
    if (!currentRoute || !currentRoute.stops || currentRoute.stops.length < 2) {
      alert("Invalid route data. Cannot simulate.");
      return;
    }

    try {
      // 1. Set bus to active
      await driverAPI.updateStatus({ isActive: true });
      setIsActive(true);
      socketService.emit('busStatusChanged', { busId: bus._id, isActive: true });

      // 2. Ask Google for the exact road path
      const directionsService = new window.google.maps.DirectionsService();
      
      const getStopString = (stop) => {
        const text = stop.name || stop.stopName || (typeof stop === 'string' ? stop : null);
        return text ? `${text}, Dehradun, India` : null;
      };

      const origin = getStopString(currentRoute.stops[0]);
      const destination = getStopString(currentRoute.stops[currentRoute.stops.length - 1]);
      
      const waypoints = currentRoute.stops.slice(1, -1)
        .map(stop => ({ location: getStopString(stop), stopover: true }))
        .filter(wp => wp.location !== null);

      const results = await directionsService.route({
        origin, destination, waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING,
      });

      // 'overview_path' is an array of hundreds of LatLng objects making up the road
      const roadPath = results.routes[0].overview_path; 
      let currentIndex = 0;

      alert("Simulation Started! Open the Student Dashboard in another window to watch the bus move.");

      // 3. Pretend to drive by emitting a new coordinate every 1.5 seconds
      const driveInterval = setInterval(() => {
        if (currentIndex >= roadPath.length) {
          endTrip(); // Stop the bus when it reaches the destination
          alert("Simulation Complete! Bus arrived at destination.");
          return;
        }

        const currentPosition = roadPath[currentIndex];
        
        socketService.emit('updateLocation', {
          busId: bus._id,
          lat: currentPosition.lat(),
          lng: currentPosition.lng(),
          availableSeats: availableSeats
        });
        
        currentIndex++; 
      }, 1500);

      setSimulationInterval(driveInterval);

    } catch (error) {
      console.error("Simulation failed to calculate route:", error);
      alert("Simulation failed. Google Maps couldn't find a valid driving path between your stops.");
    }
  };

  // --- END TRIP LOGIC ---
  const endTrip = async () => {
    try {
      // Update backend
      await driverAPI.updateStatus({ isActive: false });
      setIsActive(false);
      socketService.emit('busStatusChanged', { busId: bus._id, isActive: false });

      // Stop real GPS
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      
      // Stop Simulation
      if (simulationInterval) {
        clearInterval(simulationInterval);
        setSimulationInterval(null);
      }
    } catch (error) {
      console.error('Error ending trip:', error);
    }
  };

  const handleSeatUpdate = async (change) => {
    const newSeats = Math.max(0, Math.min(availableSeats + change, bus.totalSeats));
    setAvailableSeats(newSeats);
    
    // Note: If you have a specific driverAPI.updateSeats(newSeats) endpoint, call it here
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading Driver Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          
          {/* Header Section */}
          <div className="bg-primary-600 p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">Driver Dashboard</h1>
            {bus && <p className="text-primary-100">Bus: {bus.busNumber}</p>}
            {currentRoute && <p className="text-primary-100">Route: {currentRoute.routeName}</p>}
          </div>

          <div className="p-6 md:p-8">
            
            {/* Status & Seat Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
                <p className="text-gray-500 mb-2">Current Status</p>
                <div className={`inline-block px-4 py-2 rounded-full font-bold ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {isActive ? 'ON TRIP' : 'OFF DUTY'}
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
                <p className="text-gray-500 mb-4">Available Seats</p>
                <div className="flex items-center justify-center space-x-4">
                  <button 
                    onClick={() => handleSeatUpdate(-1)}
                    disabled={!isActive || availableSeats === 0}
                    className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xl font-bold hover:bg-red-200 disabled:opacity-50"
                  >
                    -
                  </button>
                  <span className="text-3xl font-bold text-gray-800 w-16">{availableSeats}</span>
                  <button 
                    onClick={() => handleSeatUpdate(1)}
                    disabled={!isActive || availableSeats === bus?.totalSeats}
                    className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xl font-bold hover:bg-green-200 disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              {!isActive ? (
                <>
                  <button
                    onClick={startRealTrip}
                    className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg text-lg transition-colors shadow-md flex items-center justify-center"
                  >
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Start Real Trip (GPS)
                  </button>

                  <button
                    onClick={simulateTrip}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-lg transition-colors shadow-md flex items-center justify-center"
                  >
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    Simulate Trip (Test on Laptop)
                  </button>
                </>
              ) : (
                <button
                  onClick={endTrip}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-lg transition-colors shadow-md flex items-center justify-center"
                >
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                  End Trip
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;