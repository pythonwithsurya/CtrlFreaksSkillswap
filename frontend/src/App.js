import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Authentication Context
const AuthContext = React.createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token } = response.data;
      setToken(access_token);
      localStorage.setItem('token', access_token);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API}/auth/register`, userData);
      const { access_token } = response.data;
      setToken(access_token);
      localStorage.setItem('token', access_token);
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Components
const LoginForm = ({ onSwitch }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(email, password);
    if (!success) {
      alert('Login failed. Please check your credentials.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <input
            type="password"
            placeholder="Password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p className="text-center mt-4 text-gray-600">
        Don't have an account?{' '}
        <button onClick={onSwitch} className="text-blue-600 hover:underline">
          Register
        </button>
      </p>
    </div>
  );
};

const RegisterForm = ({ onSwitch }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    location: '',
    skills_offered: '',
    skills_wanted: '',
    availability: '',
    is_public: true
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const userData = {
      ...formData,
      skills_offered: formData.skills_offered.split(',').map(s => s.trim()).filter(s => s),
      skills_wanted: formData.skills_wanted.split(',').map(s => s.trim()).filter(s => s)
    };
    
    const success = await register(userData);
    if (!success) {
      alert('Registration failed. Please try again.');
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Register</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-4">
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-4">
          <input
            type="text"
            name="location"
            placeholder="Location (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.location}
            onChange={handleChange}
          />
        </div>
        <div className="mb-4">
          <input
            type="text"
            name="skills_offered"
            placeholder="Skills you can offer (comma-separated)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.skills_offered}
            onChange={handleChange}
          />
        </div>
        <div className="mb-4">
          <input
            type="text"
            name="skills_wanted"
            placeholder="Skills you want to learn (comma-separated)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.skills_wanted}
            onChange={handleChange}
          />
        </div>
        <div className="mb-4">
          <input
            type="text"
            name="availability"
            placeholder="Availability (e.g., weekends, evenings)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.availability}
            onChange={handleChange}
          />
        </div>
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_public"
              checked={formData.is_public}
              onChange={handleChange}
              className="mr-2"
            />
            <span className="text-gray-700">Make profile public</span>
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <p className="text-center mt-4 text-gray-600">
        Already have an account?{' '}
        <button onClick={onSwitch} className="text-blue-600 hover:underline">
          Login
        </button>
      </p>
    </div>
  );
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('browse');
  const [users, setUsers] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'browse') {
      fetchUsers();
    } else if (activeTab === 'my-requests') {
      fetchMyRequests();
    } else if (activeTab === 'incoming') {
      fetchIncomingRequests();
    }
  }, [activeTab]);

  const authHeaders = {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/users`, authHeaders);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
    setLoading(false);
  };

  const fetchMyRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/swap-requests/my-requests`, authHeaders);
      setMyRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    }
    setLoading(false);
  };

  const fetchIncomingRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/swap-requests/incoming`, authHeaders);
      setIncomingRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch incoming requests:', error);
    }
    setLoading(false);
  };

  const searchBySkill = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API}/users/search/${searchTerm}`, authHeaders);
      setUsers(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    }
    setLoading(false);
  };

  const createSwapRequest = async (targetUserId, requestedSkill, offeredSkill) => {
    try {
      await axios.post(`${API}/swap-requests`, {
        target_user_id: targetUserId,
        requested_skill: requestedSkill,
        offered_skill: offeredSkill
      }, authHeaders);
      alert('Swap request sent successfully!');
    } catch (error) {
      console.error('Failed to create swap request:', error);
      alert('Failed to send swap request');
    }
  };

  const updateSwapRequest = async (requestId, status) => {
    try {
      await axios.put(`${API}/swap-requests/${requestId}`, { status }, authHeaders);
      if (activeTab === 'incoming') {
        fetchIncomingRequests();
      } else {
        fetchMyRequests();
      }
    } catch (error) {
      console.error('Failed to update swap request:', error);
    }
  };

  const deleteSwapRequest = async (requestId) => {
    try {
      await axios.delete(`${API}/swap-requests/${requestId}`, authHeaders);
      fetchMyRequests();
    } catch (error) {
      console.error('Failed to delete swap request:', error);
    }
  };

  const UserCard = ({ user: targetUser }) => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">{targetUser.name}</h3>
          {targetUser.location && (
            <p className="text-gray-600">📍 {targetUser.location}</p>
          )}
          {targetUser.availability && (
            <p className="text-gray-600">🕒 {targetUser.availability}</p>
          )}
        </div>
      </div>
      
      <div className="mb-4">
        <h4 className="font-medium text-gray-700 mb-2">Skills Offered:</h4>
        <div className="flex flex-wrap gap-2">
          {targetUser.skills_offered.map((skill, index) => (
            <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
              {skill}
            </span>
          ))}
        </div>
      </div>
      
      <div className="mb-4">
        <h4 className="font-medium text-gray-700 mb-2">Skills Wanted:</h4>
        <div className="flex flex-wrap gap-2">
          {targetUser.skills_wanted.map((skill, index) => (
            <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
              {skill}
            </span>
          ))}
        </div>
      </div>
      
      <button
        onClick={() => {
          const requestedSkill = prompt('Which skill do you want to learn from them?');
          const offeredSkill = prompt('Which skill will you offer in return?');
          if (requestedSkill && offeredSkill) {
            createSwapRequest(targetUser.id, requestedSkill, offeredSkill);
          }
        }}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
      >
        Request Skill Swap
      </button>
    </div>
  );

  const SwapRequestCard = ({ request, type }) => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {type === 'outgoing' ? `Request to ${request.target_user_id}` : `Request from ${request.requester_id}`}
          </h3>
          <p className="text-gray-600">
            Skill Requested: <span className="font-medium">{request.requested_skill}</span>
          </p>
          <p className="text-gray-600">
            Skill Offered: <span className="font-medium">{request.offered_skill}</span>
          </p>
          <p className="text-sm text-gray-500">
            Created: {new Date(request.created_at).toLocaleDateString()}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          request.status === 'accepted' ? 'bg-green-100 text-green-800' :
          request.status === 'rejected' ? 'bg-red-100 text-red-800' :
          request.status === 'completed' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
        </span>
      </div>
      
      <div className="flex gap-2">
        {type === 'incoming' && request.status === 'pending' && (
          <>
            <button
              onClick={() => updateSwapRequest(request.id, 'accepted')}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Accept
            </button>
            <button
              onClick={() => updateSwapRequest(request.id, 'rejected')}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Reject
            </button>
          </>
        )}
        
        {type === 'outgoing' && request.status === 'pending' && (
          <button
            onClick={() => deleteSwapRequest(request.id)}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Cancel Request
          </button>
        )}
        
        {request.status === 'accepted' && (
          <button
            onClick={() => updateSwapRequest(request.id, 'completed')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Mark as Completed
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Skill Swap Platform</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">Welcome, {user?.name}</span>
              {user?.role === 'admin' && (
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm">
                  Admin
                </span>
              )}
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <aside className="w-64">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('browse')}
                className={`w-full text-left px-4 py-2 rounded-md ${
                  activeTab === 'browse' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Browse Users
              </button>
              <button
                onClick={() => setActiveTab('my-requests')}
                className={`w-full text-left px-4 py-2 rounded-md ${
                  activeTab === 'my-requests' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                My Requests
              </button>
              <button
                onClick={() => setActiveTab('incoming')}
                className={`w-full text-left px-4 py-2 rounded-md ${
                  activeTab === 'incoming' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Incoming Requests
              </button>
              {user?.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`w-full text-left px-4 py-2 rounded-md ${
                    activeTab === 'admin' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Admin Panel
                </button>
              )}
            </nav>
          </aside>

          <main className="flex-1">
            {activeTab === 'browse' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Browse Users</h2>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search by skill..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button
                      onClick={searchBySkill}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      Search
                    </button>
                    <button
                      onClick={fetchUsers}
                      className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                    >
                      Show All
                    </button>
                  </div>
                </div>
                
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : (
                  <div>
                    {users.filter(u => u.id !== user?.id).map(targetUser => (
                      <UserCard key={targetUser.id} user={targetUser} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'my-requests' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">My Requests</h2>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : (
                  <div>
                    {myRequests.map(request => (
                      <SwapRequestCard key={request.id} request={request} type="outgoing" />
                    ))}
                    {myRequests.length === 0 && (
                      <p className="text-gray-600 text-center py-8">No requests sent yet.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'incoming' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Incoming Requests</h2>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : (
                  <div>
                    {incomingRequests.map(request => (
                      <SwapRequestCard key={request.id} request={request} type="incoming" />
                    ))}
                    {incomingRequests.length === 0 && (
                      <p className="text-gray-600 text-center py-8">No incoming requests.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'admin' && user?.role === 'admin' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Admin Panel</h2>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <p className="text-gray-600">Admin features coming soon...</p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Skill Swap Platform</h1>
          <p className="text-gray-600">Connect, Learn, and Grow Together</p>
        </div>
        {isLogin ? (
          <LoginForm onSwitch={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onSwitch={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  );
};

function App() {
  const { user, token } = useAuth();

  return (
    <div className="App">
      {user && token ? <Dashboard /> : <AuthScreen />}
    </div>
  );
}

export default function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}