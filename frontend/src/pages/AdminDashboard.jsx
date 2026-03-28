import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { adminAPI } from '../services/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('bulk');
  const [bulkData, setBulkData] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    fetchStats();
    if (activeTab === 'buses') fetchBuses();
    if (activeTab === 'drivers') fetchDrivers();
    if (activeTab === 'routes') fetchRoutes();
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchBuses = async () => {
    try {
      const response = await adminAPI.getBuses();
      setBuses(response.data);
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await adminAPI.getDrivers();
      setDrivers(response.data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const fetchRoutes = async () => {
    try {
      const response = await adminAPI.getRoutes();
      setRoutes(response.data);
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!bulkData.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await adminAPI.bulkEntry(bulkData);
      setResult(response.data);
      fetchStats();
      setBulkData('');
    } catch (error) {
      setResult({
        error: true,
        message: error.response?.data?.message || 'Failed to process bulk entry'
      });
    }

    setLoading(false);
  };

  const sampleData = `UK07PA1696 | Sunil Kumar | 7060226291 | Clock Tower- Darshanlal Chowk- ISBT- GEU
UK07PA1691 | Pramod Chand Ramola | 7535860889 | Ballupur- IT Park- Pacific Mall- GEU
UK07PA1692 | Rajesh Singh | 9876543210 | Rajpur Road- Survey Chowk- Clock Tower- GEU`;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">Total Drivers</p>
              <p className="text-2xl font-bold text-primary-600">{stats.totalDrivers}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">Total Buses</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalBuses}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">Total Routes</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalRoutes}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">Active Buses</p>
              <p className="text-2xl font-bold text-orange-600">{stats.activeBuses}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">Students</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalStudents}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">Parents</p>
              <p className="text-2xl font-bold text-pink-600">{stats.totalParents}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
            <nav className="flex -mb-px">
              {['bulk', 'buses', 'drivers', 'routes'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 text-sm font-medium capitalize ${
                    activeTab === tab
                      ? 'border-b-2 border-primary-600 text-primary-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'bulk' ? 'Bulk Entry' : tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Bulk Entry Tab */}
            {activeTab === 'bulk' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Bulk Data Entry</h2>
                  <p className="text-gray-600 mb-4">
                    Enter bus data in the format: <code className="bg-gray-100 px-2 py-1 rounded">RegNo | DriverName | Phone | Route</code>
                  </p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800 font-medium mb-2">Input Format:</p>
                    <p className="text-sm text-blue-600 font-mono">RegNo | DriverName | Phone | Route</p>
                    <p className="text-xs text-blue-500 mt-2">Route stops should be separated by "-"</p>
                  </div>

                  <button
                    onClick={() => setBulkData(sampleData)}
                    className="text-sm text-primary-600 hover:text-primary-700 underline mb-4"
                  >
                    Load Sample Data
                  </button>
                </div>

                <form onSubmit={handleBulkSubmit}>
                  <textarea
                    value={bulkData}
                    onChange={(e) => setBulkData(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-mono text-sm"
                    placeholder="UK07PA1696 | Sunil Kumar | 7060226291 | Clock Tower- Darshanlal Chowk- ISBT- GEU"
                  />
                  
                  <button
                    type="submit"
                    disabled={loading || !bulkData.trim()}
                    className="mt-4 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Processing...' : 'Process Bulk Entry'}
                  </button>
                </form>

                {/* Results */}
                {result && (
                  <div className={`mt-6 p-4 rounded-lg ${result.error ? 'bg-red-50' : 'bg-green-50'}`}>
                    {result.error ? (
                      <p className="text-red-600">{result.message}</p>
                    ) : (
                      <div>
                        <h3 className="font-semibold text-green-800 mb-2">Processing Complete</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Total Lines</p>
                            <p className="text-lg font-bold text-gray-800">{result.results.total}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Successful</p>
                            <p className="text-lg font-bold text-green-600">{result.results.success}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Failed</p>
                            <p className="text-lg font-bold text-red-600">{result.results.failed.length}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="bg-white p-3 rounded">
                            <p className="text-xs text-gray-500">Drivers Created</p>
                            <p className="text-lg font-bold text-primary-600">{result.results.created.drivers}</p>
                          </div>
                          <div className="bg-white p-3 rounded">
                            <p className="text-xs text-gray-500">Routes Created</p>
                            <p className="text-lg font-bold text-blue-600">{result.results.created.routes}</p>
                          </div>
                          <div className="bg-white p-3 rounded">
                            <p className="text-xs text-gray-500">Buses Created</p>
                            <p className="text-lg font-bold text-green-600">{result.results.created.buses}</p>
                          </div>
                        </div>

                        {result.results.failed.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium text-red-700 mb-2">Failed Entries:</h4>
                            <div className="max-h-40 overflow-y-auto">
                              {result.results.failed.map((fail, index) => (
                                <div key={index} className="text-sm text-red-600 mb-1">
                                  Line {fail.line}: {fail.error}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Buses Tab */}
            {activeTab === 'buses' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">All Buses</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seats</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {buses.map((bus) => (
                        <tr key={bus._id}>
                          <td className="px-6 py-4 whitespace-nowrap font-medium">{bus.busNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{bus.driverId?.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{bus.driverId?.phoneNumber}</td>
                          <td className="px-6 py-4">{bus.routeId?.routeName}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{bus.availableSeats}/{bus.totalSeats}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              bus.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {bus.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Drivers Tab */}
            {activeTab === 'drivers' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">All Drivers</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {drivers.map((driver) => (
                        <tr key={driver._id}>
                          <td className="px-6 py-4 whitespace-nowrap font-medium">{driver.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{driver.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{driver.phoneNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(driver.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Routes Tab */}
            {activeTab === 'routes' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">All Routes</h2>
                <div className="space-y-4">
                  {routes.map((route) => (
                    <div key={route._id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-primary-600">{route.routeNumber}</span>
                        <span className="text-sm text-gray-500">{route.stops?.length || 0} stops</span>
                      </div>
                      <p className="text-gray-700 mb-2">{route.routeName}</p>
                      <div className="flex flex-wrap gap-2">
                        {route.stops?.map((stop, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-sm rounded flex items-center">
                            <span className="w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center mr-1">
                              {stop.order}
                            </span>
                            {stop.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
