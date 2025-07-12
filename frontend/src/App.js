import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Default profile images
const DEFAULT_AVATARS = [
  "https://images.unsplash.com/photo-1628157588553-5eeea00af15c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwxfHxwcm9maWxlJTIwYXZhdGFyfGVufDB8fHxibHVlfDE3NTIzMDI5NjR8MA&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1611724712140-e6cb8f44308d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwyfHxwcm9maWxlJTIwYXZhdGFyfGVufDB8fHxibHVlfDE3NTIzMDI5NjR8MA&ixlib=rb-4.1.0&q=85",
  "https://images.pexels.com/photos/30231456/pexels-photo-30231456.jpeg"
];

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
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h2>
        <p className="text-gray-600">Sign in to continue your skill journey</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <input
            type="email"
            placeholder="Email address"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-gray-50 focus:bg-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="relative">
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-gray-50 focus:bg-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 transform hover:scale-105"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Signing in...
            </div>
          ) : (
            'Sign In'
          )}
        </button>
      </form>
      
      <div className="text-center mt-6">
        <p className="text-gray-600">
          New to SkillSwap?{' '}
          <button onClick={onSwitch} className="text-blue-600 hover:text-blue-700 font-semibold">
            Create Account
          </button>
        </p>
      </div>
    </div>
  );
};

const RegisterForm = ({ onSwitch }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    location: '',
    bio: '',
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
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Join SkillSwap</h2>
        <p className="text-gray-600">Start your learning journey today</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-gray-50 focus:bg-white"
          value={formData.name}
          onChange={handleChange}
          required
        />
        
        <input
          type="email"
          name="email"
          placeholder="Email Address"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-gray-50 focus:bg-white"
          value={formData.email}
          onChange={handleChange}
          required
        />
        
        <input
          type="password"
          name="password"
          placeholder="Password"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-gray-50 focus:bg-white"
          value={formData.password}
          onChange={handleChange}
          required
        />
        
        <input
          type="text"
          name="location"
          placeholder="Location (optional)"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-gray-50 focus:bg-white"
          value={formData.location}
          onChange={handleChange}
        />
        
        <textarea
          name="bio"
          placeholder="Tell us about yourself (optional)"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-gray-50 focus:bg-white h-20 resize-none"
          value={formData.bio}
          onChange={handleChange}
        />
        
        <input
          type="text"
          name="skills_offered"
          placeholder="Skills you can teach (comma-separated)"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-gray-50 focus:bg-white"
          value={formData.skills_offered}
          onChange={handleChange}
        />
        
        <input
          type="text"
          name="skills_wanted"
          placeholder="Skills you want to learn (comma-separated)"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-gray-50 focus:bg-white"
          value={formData.skills_wanted}
          onChange={handleChange}
        />
        
        <input
          type="text"
          name="availability"
          placeholder="When are you available? (e.g., weekends, evenings)"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-gray-50 focus:bg-white"
          value={formData.availability}
          onChange={handleChange}
        />
        
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            name="is_public"
            checked={formData.is_public}
            onChange={handleChange}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
          />
          <span className="text-gray-700 font-medium">Make my profile public</span>
        </label>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-blue-700 disabled:opacity-50 transition-all duration-200 transform hover:scale-105"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Creating Account...
            </div>
          ) : (
            'Create Account'
          )}
        </button>
      </form>
      
      <div className="text-center mt-4">
        <p className="text-gray-600">
          Already have an account?{' '}
          <button onClick={onSwitch} className="text-blue-600 hover:text-blue-700 font-semibold">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, fetchUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    bio: '',
    skills_offered: '',
    skills_wanted: '',
    availability: '',
    is_public: true
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        location: user.location || '',
        bio: user.bio || '',
        skills_offered: user.skills_offered?.join(', ') || '',
        skills_wanted: user.skills_wanted?.join(', ') || '',
        availability: user.availability || '',
        is_public: user.is_public ?? true
      });
    }
  }, [user]);

  const authHeaders = {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
      } else {
        alert('Please select an image file.');
      }
    }
  };

  const handlePhotoUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      await axios.post(`${API}/users/upload-photo`, formData, {
        headers: {
          ...authHeaders.headers,
          'Content-Type': 'multipart/form-data'
        }
      });

      await fetchUser();
      setSelectedFile(null);
      alert('Profile photo updated successfully!');
    } catch (error) {
      console.error('Failed to upload photo:', error);
      alert('Failed to upload photo. Please try again.');
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData = {
        ...formData,
        skills_offered: formData.skills_offered.split(',').map(s => s.trim()).filter(s => s),
        skills_wanted: formData.skills_wanted.split(',').map(s => s.trim()).filter(s => s)
      };

      await axios.put(`${API}/users/me`, updateData, authHeaders);
      await fetchUser();
      alert('Profile updated successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    }
    setSaving(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Profile Photo Section */}
          <div className="text-center mb-6">
            <div className="relative inline-block">
              <img
                src={user?.profile_photo ? `${BACKEND_URL}${user.profile_photo}` : DEFAULT_AVATARS[0]}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
              />
              <div className="absolute -bottom-2 -right-2">
                <label className="bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>
            {selectedFile && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Selected: {selectedFile.name}</p>
                <button
                  onClick={handlePhotoUpload}
                  disabled={uploading}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                </button>
              </div>
            )}
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                value={formData.name}
                onChange={handleChange}
                required
              />
              
              <input
                type="text"
                name="location"
                placeholder="Location"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                value={formData.location}
                onChange={handleChange}
              />
            </div>

            <textarea
              name="bio"
              placeholder="Tell us about yourself"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors h-24 resize-none"
              value={formData.bio}
              onChange={handleChange}
            />

            <input
              type="text"
              name="skills_offered"
              placeholder="Skills you can teach (comma-separated)"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              value={formData.skills_offered}
              onChange={handleChange}
            />

            <input
              type="text"
              name="skills_wanted"
              placeholder="Skills you want to learn (comma-separated)"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              value={formData.skills_wanted}
              onChange={handleChange}
            />

            <input
              type="text"
              name="availability"
              placeholder="When are you available?"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              value={formData.availability}
              onChange={handleChange}
            />

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_public"
                checked={formData.is_public}
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
              />
              <span className="text-gray-700 font-medium">Make my profile public</span>
            </label>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
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
  const [showProfileModal, setShowProfileModal] = useState(false);

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

  const getAvatarUrl = (profilePhoto) => {
    if (profilePhoto) {
      return profilePhoto.startsWith('http') ? profilePhoto : `${BACKEND_URL}${profilePhoto}`;
    }
    return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
  };

  const UserCard = ({ user: targetUser }) => (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-blue-200">
      <div className="flex items-start space-x-4 mb-4">
        <img
          src={getAvatarUrl(targetUser.profile_photo)}
          alt={targetUser.name}
          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
        />
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-800 mb-1">{targetUser.name}</h3>
          {targetUser.location && (
            <p className="text-gray-600 flex items-center mb-1">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {targetUser.location}
            </p>
          )}
          {targetUser.availability && (
            <p className="text-gray-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {targetUser.availability}
            </p>
          )}
        </div>
        <div className="text-right">
          {targetUser.rating_average > 0 && (
            <div className="flex items-center text-yellow-500 mb-1">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-medium">{targetUser.rating_average}</span>
            </div>
          )}
          {targetUser.total_swaps > 0 && (
            <p className="text-xs text-gray-500">{targetUser.total_swaps} swaps</p>
          )}
        </div>
      </div>

      {targetUser.bio && (
        <p className="text-gray-700 mb-4 text-sm leading-relaxed">{targetUser.bio}</p>
      )}
      
      <div className="mb-4">
        <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
          <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Skills Offered
        </h4>
        <div className="flex flex-wrap gap-2">
          {targetUser.skills_offered.map((skill, index) => (
            <span key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              {skill}
            </span>
          ))}
        </div>
      </div>
      
      <div className="mb-6">
        <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
          <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Skills Wanted
        </h4>
        <div className="flex flex-wrap gap-2">
          {targetUser.skills_wanted.map((skill, index) => (
            <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
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
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
      >
        Request Skill Swap
      </button>
    </div>
  );

  const SwapRequestCard = ({ request, type }) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'accepted': return 'bg-green-100 text-green-800';
        case 'rejected': return 'bg-red-100 text-red-800';
        case 'completed': return 'bg-blue-100 text-blue-800';
        case 'cancelled': return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:border-blue-200 transition-all">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              {type === 'outgoing' ? `Request to ${request.target_user_id}` : `Request from ${request.requester_id}`}
            </h3>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-medium">Skill Requested:</span> 
                <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">{request.requested_skill}</span>
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Skill Offered:</span> 
                <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded text-sm">{request.offered_skill}</span>
              </p>
              {request.message && (
                <p className="text-gray-600 italic">"{request.message}"</p>
              )}
              <p className="text-sm text-gray-500">
                Created: {new Date(request.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </span>
        </div>
        
        <div className="flex gap-3">
          {type === 'incoming' && request.status === 'pending' && (
            <>
              <button
                onClick={() => updateSwapRequest(request.id, 'accepted')}
                className="flex-1 bg-green-500 text-white py-2 px-4 rounded-xl hover:bg-green-600 transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => updateSwapRequest(request.id, 'rejected')}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-xl hover:bg-red-600 transition-colors"
              >
                Reject
              </button>
            </>
          )}
          
          {type === 'outgoing' && request.status === 'pending' && (
            <button
              onClick={() => deleteSwapRequest(request.id)}
              className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-xl hover:bg-gray-600 transition-colors"
            >
              Cancel Request
            </button>
          )}
          
          {request.status === 'accepted' && (
            <button
              onClick={() => updateSwapRequest(request.id, 'completed')}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-xl hover:bg-blue-600 transition-colors"
            >
              Mark as Completed
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SkillSwap
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center space-x-3 bg-white rounded-full px-4 py-2 shadow-md hover:shadow-lg transition-all"
              >
                <img
                  src={getAvatarUrl(user?.profile_photo)}
                  alt={user?.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="text-gray-700 font-medium">{user?.name}</span>
              </button>
              
              {user?.role === 'admin' && (
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                  Admin
                </span>
              )}
              
              <button
                onClick={logout}
                className="bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64">
            <nav className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 space-y-2">
              <button
                onClick={() => setActiveTab('browse')}
                className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'browse' 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Browse Users
              </button>
              
              <button
                onClick={() => setActiveTab('my-requests')}
                className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'my-requests' 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                My Requests
              </button>
              
              <button
                onClick={() => setActiveTab('incoming')}
                className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'incoming' 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                Incoming Requests
              </button>
              
              {user?.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all ${
                    activeTab === 'admin' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin Panel
                </button>
              )}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {activeTab === 'browse' && (
              <div>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-6">
                  <h2 className="text-3xl font-bold text-gray-800 mb-6">Discover Amazing People</h2>
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Search by skill (e.g., JavaScript, Design, Marketing)..."
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors pl-12"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <svg className="w-5 h-5 text-gray-400 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <button
                      onClick={searchBySkill}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-semibold"
                    >
                      Search
                    </button>
                    <button
                      onClick={fetchUsers}
                      className="bg-gray-500 text-white px-6 py-3 rounded-xl hover:bg-gray-600 transition-colors font-semibold"
                    >
                      Show All
                    </button>
                  </div>
                </div>
                
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading amazing people...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users.filter(u => u.id !== user?.id).map(targetUser => (
                      <UserCard key={targetUser.id} user={targetUser} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'my-requests' && (
              <div>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-6">
                  <h2 className="text-3xl font-bold text-gray-800">My Requests</h2>
                  <p className="text-gray-600 mt-2">Track your outgoing skill swap requests</p>
                </div>
                
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your requests...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {myRequests.map(request => (
                      <SwapRequestCard key={request.id} request={request} type="outgoing" />
                    ))}
                    {myRequests.length === 0 && (
                      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-12 text-center">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-gray-600 text-lg">No requests sent yet</p>
                        <p className="text-gray-500 mt-2">Start browsing users to send your first skill swap request!</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'incoming' && (
              <div>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-6">
                  <h2 className="text-3xl font-bold text-gray-800">Incoming Requests</h2>
                  <p className="text-gray-600 mt-2">Review and respond to skill swap requests</p>
                </div>
                
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading incoming requests...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {incomingRequests.map(request => (
                      <SwapRequestCard key={request.id} request={request} type="incoming" />
                    ))}
                    {incomingRequests.length === 0 && (
                      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-12 text-center">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-gray-600 text-lg">No incoming requests</p>
                        <p className="text-gray-500 mt-2">Make your profile public to receive skill swap requests!</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'admin' && user?.role === 'admin' && (
              <div>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6">
                  <h2 className="text-3xl font-bold text-gray-800 mb-6">Admin Panel</h2>
                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6">
                    <p className="text-gray-700 text-lg">🚧 Admin features coming soon...</p>
                    <p className="text-gray-600 mt-2">User management, content moderation, and analytics dashboard will be available here.</p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </div>
  );
};

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-white opacity-10 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-yellow-200 opacity-10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-200 opacity-10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mx-auto mb-6 flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">SkillSwap</h1>
          <p className="text-xl text-white/90 drop-shadow">Connect, Learn, and Grow Together</p>
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