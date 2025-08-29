import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function TracksManagement() {
    const [tracks, setTracks] = useState([]);
    const [weeks, setWeeks] = useState([]);
    const [selectedWeek, setSelectedWeek] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingTrack, setEditingTrack] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [filterPlaylist, setFilterPlaylist] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedWeeks, setExpandedWeeks] = useState([]);
    const [selectedTracks, setSelectedTracks] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [filterTags, setFilterTags] = useState([]);
    const [availableTags, setAvailableTags] = useState([]);
    const [showTagDropdown, setShowTagDropdown] = useState(false);

    // Form state for adding/editing tracks
    const [formData, setFormData] = useState({
        track_name: '',
        artists: '',
        album: '',
        spotify_url: '',
        album_art_url: '',
        popularity: 0,
        playlist_name: '',
        tags: []
    });

    useEffect(() => {
        fetchTracks();
        fetchWeeks();
        fetchAvailableTags();
    }, []);

    useEffect(() => {
        fetchTracks();
    }, [selectedWeek, filterPlaylist, searchTerm, showArchived, filterTags]);

    // Close tag dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showTagDropdown && !event.target.closest('.tag-dropdown')) {
                setShowTagDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showTagDropdown]);

    const fetchTracks = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('tracks')
                .select('*')
                .order('created_at', { ascending: false });

            // Filter by archived status
            if (!showArchived) {
                query = query.eq('archived', false);
            } else if (showArchived) {
                query = query.eq('archived', true);
            }

            if (selectedWeek) {
                query = query.eq('week_start', selectedWeek);
            }
            if (filterPlaylist) {
                query = query.eq('playlist_name', filterPlaylist);
            }
            if (searchTerm) {
                query = query.or(`track_name.ilike.%${searchTerm}%,artists.ilike.%${searchTerm}%`);
            }
            if (filterTags.length > 0) {
                // Filter tracks that contain any of the selected tags
                query = query.overlaps('tags', filterTags);
            }

            const { data, error } = await query;
            if (error) throw error;
            setTracks(data || []);
        } catch (error) {
            console.error('Error fetching tracks:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWeeks = async () => {
        try {
            const { data, error } = await supabase
                .from('tracks')
                .select('week_start')
                .order('week_start', { ascending: false });
            
            if (error) throw error;
            const uniqueWeeks = [...new Set(data.map(t => t.week_start))];
            setWeeks(uniqueWeeks);
        } catch (error) {
            console.error('Error fetching weeks:', error);
        }
    };

    const fetchAvailableTags = async () => {
        try {
            const { data, error } = await supabase
                .from('tracks')
                .select('tags');
            
            if (error) throw error;
            
            // Extract all unique tags from all tracks
            const allTags = data
                .filter(track => track.tags && Array.isArray(track.tags))
                .flatMap(track => track.tags)
                .filter(tag => tag && tag.trim() !== '');
            
            const uniqueTags = [...new Set(allTags)].sort();
            setAvailableTags(uniqueTags);
        } catch (error) {
            console.error('Error fetching available tags:', error);
        }
    };

    const handleAddTrack = async (e) => {
        e.preventDefault();
        
        // Validate Spotify URL if provided
        if (formData.spotify_url && !formData.spotify_url.startsWith('https://open.spotify.com/track/')) {
            alert('Please enter a valid Spotify track URL (must start with https://open.spotify.com/track/)');
            return;
        }
        
        try {
            // Get the latest week from the database
            const latestWeek = weeks.length > 0 ? weeks[0] : null;
            
            // Convert tags string to proper array format for Supabase
            const cleanFormData = {
                ...formData,
                week_start: latestWeek,
                tags: typeof formData.tags === 'string' 
                    ? (formData.tags.trim() === '' ? [] : formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag))
                    : (Array.isArray(formData.tags) ? formData.tags : [])
            };

            const { error } = await supabase
                .from('tracks')
                .insert([{
                    ...cleanFormData,
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;
            
            setShowAddForm(false);
            setFormData({
                track_name: '', artists: '', album: '', spotify_url: '',
                album_art_url: '', popularity: 0, playlist_name: '', tags: []
            });
            fetchTracks();
        } catch (error) {
            console.error('Error adding track:', error);
        }
    };

    const handleUpdateTrack = async (e) => {
        e.preventDefault();
        
        // Validate Spotify URL if provided
        if (formData.spotify_url && !formData.spotify_url.startsWith('https://open.spotify.com/track/')) {
            alert('Please enter a valid Spotify track URL (must start with https://open.spotify.com/track/)');
            return;
        }
        
        try {
            // Convert tags string to proper array format for Supabase
            const cleanFormData = {
                ...formData,
                tags: typeof formData.tags === 'string' 
                    ? (formData.tags.trim() === '' ? [] : formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag))
                    : (Array.isArray(formData.tags) ? formData.tags : [])
            };

            const { error } = await supabase
                .from('tracks')
                .update({
                    ...cleanFormData,
                    //updated_at: new Date().toISOString()
                })
                .eq('id', editingTrack.id);

            if (error) throw error;
            
            setEditingTrack(null);
            setFormData({
                track_name: '', artists: '', album: '', spotify_url: '',
                album_art_url: '', popularity: 0, playlist_name: '', tags: []
            });
            fetchTracks();
        } catch (error) {
            console.error('Error updating track:', error);
        }
    };

    const handleDeleteTrack = async (id) => {
        if (confirm('Are you sure you want to delete this track?')) {
            try {
                const { error } = await supabase
                    .from('tracks')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                fetchTracks();
            } catch (error) {
                console.error('Error deleting track:', error);
            }
        }
    };

    const startEdit = (track) => {
        setEditingTrack(track);
        setFormData({
            track_name: track.track_name,
            artists: track.artists,
            album: track.album,
            spotify_url: track.spotify_url,
            album_art_url: track.album_art_url,
            popularity: track.popularity,
            playlist_name: track.playlist_name,
            tags: track.tags || ''
        });
    };

    const groupTracksByWeek = (tracks) => {
        const grouped = {};
        tracks.forEach(track => {
            const week = track.week_start || 'Unknown Week';
            if (!grouped[week]) grouped[week] = [];
            grouped[week].push(track);
        });
        return grouped;
    };

    const toggleWeek = (week) => {
        setExpandedWeeks(prev => 
            prev.includes(week) 
                ? prev.filter(w => w !== week)
                : [...prev, week]
        );
    };



    // Bulk selection functions
    const toggleTrackSelection = (trackId) => {
        setSelectedTracks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(trackId)) {
                newSet.delete(trackId);
            } else {
                newSet.add(trackId);
            }
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedTracks(new Set());
            setSelectAll(false);
        } else {
            const allTrackIds = tracks.map(track => track.id);
            setSelectedTracks(new Set(allTrackIds));
            setSelectAll(true);
        }
    };

    const handleBulkDelete = async (permanent = false) => {
        if (selectedTracks.size === 0) {
            alert('Please select tracks to delete');
            return;
        }

        const action = permanent ? 'permanently delete' : 'archive';
        const confirmMessage = `Are you sure you want to ${action} ${selectedTracks.size} selected track(s)? This action cannot be undone.`;
        
        if (!confirm(confirmMessage)) return;

        try {
            if (permanent) {
                // Permanent delete
                const { error } = await supabase
                    .from('tracks')
                    .delete()
                    .in('id', Array.from(selectedTracks));
                
                if (error) throw error;
            } else {
                // Archive (soft delete)
                const { error } = await supabase
                    .from('tracks')
                    .update({ 
                        archived: true,
                    })
                    .in('id', Array.from(selectedTracks));
                
                if (error) throw error;
            }

            // Clear selection and refresh
            setSelectedTracks(new Set());
            setSelectAll(false);
            fetchTracks();
            
            alert(`Successfully ${action}d ${selectedTracks.size} track(s)`);
        } catch (error) {
            console.error(`Error ${action}ing tracks:`, error);
            alert(`Failed to ${action} tracks. Please try again.`);
        }
    };

    const handleRestoreTracks = async () => {
        if (selectedTracks.size === 0) {
            alert('Please select tracks to restore');
            return;
        }

        if (!confirm(`Are you sure you want to restore ${selectedTracks.size} selected track(s)?`)) return;

        try {
            const { error } = await supabase
                .from('tracks')
                .update({ 
                    archived: false, 
                })
                .in('id', Array.from(selectedTracks));
            
            if (error) throw error;

            // Clear selection and refresh
            setSelectedTracks(new Set());
            setSelectAll(false);
            fetchTracks();
            
            alert(`Successfully restored ${selectedTracks.size} track(s)`);
        } catch (error) {
            console.error('Error restoring tracks:', error);
            alert('Failed to restore tracks. Please try again.');
        }
    };

    const groupedTracks = groupTracksByWeek(tracks);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-5 py-6 sm:py-8 font-sans">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b-2 border-gray-200">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 m-0 text-center sm:text-left">🎵 Tracks Management</h1>
                <button 
                    onClick={() => setShowAddForm(true)}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-none py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl hover:-translate-y-0.5 w-full sm:w-auto"
                >
                    ➕ Add New Track
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8 flex-wrap items-stretch sm:items-center">
                <select 
                    value={selectedWeek} 
                    onChange={(e) => setSelectedWeek(e.target.value)}
                    className="px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm bg-white transition-colors duration-300 focus:outline-none focus:border-indigo-500"
                >
                    <option value="">All Weeks</option>
                    {weeks.map(week => (
                        <option key={week} value={week}>
                            Friday, {(() => {
                                try {
                                    // Parse the date string properly to avoid timezone issues
                                    const [year, month, day] = week.split('-').map(Number);
                                    const date = new Date(year, month - 1, day); // month is 0-indexed
                                    return date.toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric'
                                    });
                                } catch (e) {
                                    return week;
                                }
                            })()}
                        </option>
                    ))}
                </select>

                <select 
                    value={filterPlaylist} 
                    onChange={(e) => setFilterPlaylist(e.target.value)}
                    className="px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm bg-white transition-colors duration-300 focus:outline-none focus:border-indigo-500"
                >
                    <option value="">All Playlists</option>
                    <option value="New Music Friday">New Music Friday</option>
                    <option value="Release Radar">Release Radar</option>
                    <option value="Manual">Manual</option>
                </select>

                <input
                    type="text"
                    placeholder="Search tracks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm bg-white transition-colors duration-300 focus:outline-none focus:border-indigo-500"
                />

                <button onClick={fetchTracks} className="bg-emerald-500 text-white border-none py-2.5 px-5 rounded-lg font-semibold cursor-pointer transition-colors duration-300 hover:bg-emerald-600">
                    🔎 Search
                </button>
                
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="showArchived"
                        checked={showArchived}
                        onChange={(e) => setShowArchived(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="showArchived" className="text-sm text-gray-700 cursor-pointer">
                        Show Archived Tracks
                    </label>
                </div>
                
                {/* Tag Filter Dropdown */}
                <div className="relative tag-dropdown">
                    <button
                        onClick={() => setShowTagDropdown(!showTagDropdown)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <span>🏷️ Filter by Tags</span>
                        {filterTags.length > 0 && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                {filterTags.length} selected
                            </span>
                        )}
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${showTagDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    
                    {/* Dropdown Menu */}
                    {showTagDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                            <div className="p-3 border-b border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Selected Tags:</span>
                                    <button
                                        onClick={() => setFilterTags([])}
                                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {filterTags.map(tag => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                                        >
                                            {tag}
                                            <button
                                                onClick={() => setFilterTags(prev => prev.filter(t => t !== tag))}
                                                className="text-blue-600 hover:text-blue-800 font-bold"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="p-3">
                                <span className="text-sm font-medium text-gray-700 mb-2 block">Available Tags:</span>
                                <div className="space-y-2">
                                    {availableTags.map(tag => (
                                        <label key={tag} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={filterTags.includes(tag)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setFilterTags(prev => [...prev, tag]);
                                                    } else {
                                                        setFilterTags(prev => prev.filter(t => t !== tag));
                                                    }
                                                }}
                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700">{tag}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>



            {/* Automated Music Updates Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Automated Music Updates</h2>
                        <p className="text-gray-600">Your music is automatically updated every week</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Current Schedule Status */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h3 className="font-medium text-blue-900 mb-2">📅 Current Schedule</h3>
                        <div className="space-y-2 text-sm text-blue-800">
                            <p><strong>Frequency:</strong> Every Friday</p>
                            <p><strong>Time:</strong> {(() => {
                                // Create a date for Friday 2 PM UTC
                                const now = new Date();
                                const friday = new Date(now);
                                const daysUntilFriday = (5 - now.getDay() + 7) % 7;
                                friday.setDate(now.getDate() + daysUntilFriday);
                                friday.setUTCHours(14, 0, 0, 0); // 2 PM UTC
                                
                                return friday.toLocaleString('en-US', {
                                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                                    weekday: 'long',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                });
                            })()} (your timezone)</p>
                            <p><strong>Status:</strong> <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Active</span></p>
                        </div>
                    </div>

                    {/* Last Update Info */}
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <h3 className="font-medium text-green-900 mb-2">🤖 Last Update</h3>
                        <div className="space-y-2 text-sm text-green-800">
                            <p><strong>Method:</strong> GitHub Actions</p>
                            <p><strong>Last Run:</strong> {tracks.length > 0 ? `${Math.floor((new Date() - new Date(tracks[0]?.created_at)) / (1000 * 60 * 60 * 24))} days ago` : 'Never'}</p>
                            <p><strong>Total Tracks:</strong> {tracks.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add/Edit Form */}
            {(showAddForm || editingTrack) && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
                    <div className="bg-white p-8 rounded-xl w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 m-0">{editingTrack ? 'Edit Track' : 'Add New Track'}</h2>
                        <form onSubmit={editingTrack ? handleUpdateTrack : handleAddTrack}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Track Name *</label>
                                    <input
                                        type="text"
                                        placeholder="Enter track name"
                                        value={formData.track_name}
                                        onChange={(e) => setFormData({...formData, track_name: e.target.value})}
                                        required
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm transition-colors duration-300 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Artists *</label>
                                    <input
                                        type="text"
                                        placeholder="Enter artist names"
                                        value={formData.artists}
                                        onChange={(e) => setFormData({...formData, artists: e.target.value})}
                                        required
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm transition-colors duration-300 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Album</label>
                                    <input
                                        type="text"
                                        placeholder="Enter album name"
                                        value={formData.album}
                                        onChange={(e) => setFormData({...formData, album: e.target.value})}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm transition-colors duration-300 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Spotify URL</label>
                                    <input
                                        type="url"
                                        placeholder="https://open.spotify.com/track/..."
                                        value={formData.spotify_url}
                                        onChange={(e) => setFormData({...formData, spotify_url: e.target.value})}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm transition-colors duration-300 focus:outline-none focus:border-indigo-500"
                                    />
                                    {formData.spotify_url && !formData.spotify_url.startsWith('https://open.spotify.com/track/') && (
                                        <p className="text-red-500 text-xs mt-1">⚠️ Please enter a valid Spotify track URL</p>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Album Art URL</label>
                                    <input
                                        type="url"
                                        placeholder="https://example.com/album-art.jpg"
                                        value={formData.album_art_url}
                                        onChange={(e) => setFormData({...formData, album_art_url: e.target.value})}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm transition-colors duration-300 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Popularity Score</label>
                                    <input
                                        type="number"
                                        placeholder="0-100"
                                        value={formData.popularity}
                                        onChange={(e) => setFormData({...formData, popularity: parseInt(e.target.value)})}
                                        min="0"
                                        max="100"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm transition-colors duration-300 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Playlist Source *</label>
                                    <select
                                        value={formData.playlist_name}
                                        onChange={(e) => setFormData({...formData, playlist_name: e.target.value})}
                                        required
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm transition-colors duration-300 focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="">Select a playlist</option>
                                        <option value="New Music Friday">New Music Friday</option>
                                        <option value="Release Radar">Release Radar</option>
                                        <option value="Manual">Manual</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Auto-Assigned Week</label>
                                    <div className="px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-lg text-sm text-gray-600">
                                        {weeks.length > 0 ? (() => {
                                            try {
                                                // Parse the date string properly to avoid timezone issues
                                                const [year, month, day] = weeks[0].split('-').map(Number);
                                                const date = new Date(year, month - 1, day); // month is 0-indexed
                                                return `Week of Friday, ${date.toLocaleDateString('en-US', {
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}`;
                                            } catch (e) {
                                                return `Week of Friday, ${weeks[0]}`;
                                            }
                                        })() : 'No weeks available'}
                                    </div>
                                </div>
                            </div>
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                                <input
                                    type="text"
                                    placeholder="Enter tags separated by commas (e.g., pop, rock, indie)"
                                    value={formData.tags}
                                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm transition-colors duration-300 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="flex gap-4 justify-end mt-6">
                                <button type="submit" className="bg-indigo-500 text-white border-none py-3 px-6 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-300 hover:bg-indigo-600">
                                    {editingTrack ? 'Update Track' : 'Add Track'}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setEditingTrack(null);
                                    }}
                                    className="bg-gray-200 text-gray-700 border-none py-3 px-6 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-300 hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Actions Toolbar */}
            {selectedTracks.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-blue-900 font-medium">
                                {selectedTracks.size} track(s) selected
                            </span>
                            <button
                                onClick={() => setSelectedTracks(new Set())}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                                Clear Selection
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            {!showArchived ? (
                                <>
                                    <button
                                        onClick={() => handleBulkDelete(false)}
                                        className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                                    >
                                        📦 Archive Selected
                                    </button>
                                    <button
                                        onClick={() => handleBulkDelete(true)}
                                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                                    >
                                        🗑️ Delete Permanently
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleRestoreTracks}
                                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    🔄 Restore Selected
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Tracks Display */}
            <div className="mt-8">
                {!loading && Object.keys(groupedTracks).length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={selectAll}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Select All Tracks ({tracks.length})
                                </span>
                            </div>
                            <div className="text-sm text-gray-500">
                                {selectedTracks.size} of {tracks.length} selected
                            </div>
                        </div>
                    </div>
                )}
                
                {loading ? (
                    <div className="text-center py-16 text-gray-500 text-lg">Loading tracks...</div>
                ) : Object.keys(groupedTracks).length === 0 ? (
                    <div className="text-center py-16 text-gray-500 text-lg">No tracks found</div>
                ) : (
                    Object.entries(groupedTracks).map(([week, weekTracks]) => (
                        <div key={week} className="mb-6">
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => toggleWeek(week)}
                                                className="flex items-center gap-2 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                                            >
                                                <svg 
                                                    className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${expandedWeeks.includes(week) ? 'rotate-180' : ''}`}
                                                    fill="none" 
                                                    stroke="currentColor" 
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                                <h2 className="text-xl font-semibold text-gray-900">📅 Week of Friday, {(() => {
                                                    try {
                                                        // Parse the date string properly to avoid timezone issues
                                                        const [year, month, day] = week.split('-').map(Number);
                                                        const date = new Date(year, month - 1, day); // month is 0-indexed
                                                        return date.toLocaleDateString('en-US', {
                                                            month: 'long',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        });
                                                    } catch (e) {
                                                        return week;
                                                    }
                                                })()}</h2>
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm text-gray-600">{weekTracks.length} tracks</span>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={weekTracks.every(track => selectedTracks.has(track.id))}
                                                    onChange={() => {
                                                        const weekTrackIds = weekTracks.map(t => t.id);
                                                        if (weekTracks.every(track => selectedTracks.has(track.id))) {
                                                            // Deselect all week tracks
                                                            setSelectedTracks(prev => {
                                                                const newSet = new Set(prev);
                                                                weekTrackIds.forEach(id => newSet.delete(id));
                                                                return newSet;
                                                            });
                                                        } else {
                                                            // Select all week tracks
                                                            setSelectedTracks(prev => {
                                                                const newSet = new Set(prev);
                                                                weekTrackIds.forEach(id => newSet.add(id));
                                                                return newSet;
                                                            });
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                                <span className="text-xs text-gray-500">Select Week</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {expandedWeeks.includes(week) && (
                                    <div className="p-6">
                                        <div className="space-y-3">
                                            {weekTracks.map(track => (
                                                <div key={track.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-200">
                                                    {/* Selection Checkbox */}
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedTracks.has(track.id)}
                                                        onChange={() => toggleTrackSelection(track.id)}
                                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                                                    />
                                                    
                                                    {/* Album Art */}
                                                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 flex items-center justify-center">
                                                        {track.album_art_url ? (
                                                            <img src={track.album_art_url} alt="Album Art" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="text-2xl text-gray-400">🎵</div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Track Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-lg font-semibold text-gray-900 truncate">{track.track_name}</h3>
                                                        <p className="text-gray-600 text-sm font-medium truncate">{track.artists}</p>
                                                        <p className="text-gray-500 text-sm truncate">{track.album}</p>
                                                    </div>
                                                    
                                                    {/* Meta Info */}
                                                    <div className="flex items-center gap-3 flex-shrink-0">
                                                        <span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-xs font-semibold">{track.playlist_name}</span>
                                                        <span className="text-amber-500 font-semibold text-sm">⭐ {track.popularity}</span>
                                                    </div>
                                                    
                                                    {/* Actions */}
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {track.spotify_url && (
                                                            <a 
                                                                href={track.spotify_url} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="bg-green-500 text-white p-2 rounded-md hover:bg-green-600 transition-colors duration-200"
                                                                title="Open in Spotify"
                                                            >
                                                                🎧
                                                            </a>
                                                        )}
                                                        <button 
                                                            onClick={() => startEdit(track)}
                                                            className="bg-amber-500 text-white p-2 rounded-md hover:bg-amber-600 transition-colors duration-200"
                                                            title="Edit Track"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteTrack(track.id)}
                                                            className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition-colors duration-200"
                                                            title="Delete Track"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
