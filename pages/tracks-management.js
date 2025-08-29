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

    // Form state for adding/editing tracks
    const [formData, setFormData] = useState({
        track_name: '',
        artists: '',
        album: '',
        spotify_url: '',
        album_art_url: '',
        popularity: 0,
        playlist_name: '',
        week_start: '',
        tags: ''
    });

    useEffect(() => {
        fetchTracks();
        fetchWeeks();
    }, []);

    const fetchTracks = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('tracks')
                .select('*')
                .order('created_at', { ascending: false });

            if (selectedWeek) {
                query = query.eq('week_start', selectedWeek);
            }
            if (filterPlaylist) {
                query = query.eq('playlist_name', filterPlaylist);
            }
            if (searchTerm) {
                query = query.or(`track_name.ilike.%${searchTerm}%,artists.ilike.%${searchTerm}%`);
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

    const handleAddTrack = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('tracks')
                .insert([{
                    ...formData,
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;
            
            setShowAddForm(false);
            setFormData({
                track_name: '', artists: '', album: '', spotify_url: '',
                album_art_url: '', popularity: 0, playlist_name: '', week_start: '', tags: ''
            });
            fetchTracks();
        } catch (error) {
            console.error('Error adding track:', error);
        }
    };

    const handleUpdateTrack = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('tracks')
                .update({
                    ...formData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingTrack.id);

            if (error) throw error;
            
            setEditingTrack(null);
            setFormData({
                track_name: '', artists: '', album: '', spotify_url: '',
                album_art_url: '', popularity: 0, playlist_name: '', week_start: '', tags: ''
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
            week_start: track.week_start,
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
                        <option key={week} value={week}>{week}</option>
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
                </select>

                <input
                    type="text"
                    placeholder="Search tracks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm bg-white transition-colors duration-300 focus:outline-none focus:border-indigo-500"
                />

                <button onClick={fetchTracks} className="bg-emerald-500 text-white border-none py-2.5 px-5 rounded-lg font-semibold cursor-pointer transition-colors duration-300 hover:bg-emerald-600">
                    🔄 Refresh
                </button>
            </div>

            {/* Add/Edit Form */}
            {(showAddForm || editingTrack) && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
                    <div className="bg-white p-8 rounded-xl w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 m-0">{editingTrack ? 'Edit Track' : 'Add New Track'}</h2>
                        <form onSubmit={editingTrack ? handleUpdateTrack : handleAddTrack}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                <input
                                    type="text"
                                    placeholder="Track Name"
                                    value={formData.track_name}
                                    onChange={(e) => setFormData({...formData, track_name: e.target.value})}
                                    required
                                    className="px-4 py-3 border-2 border-gray-200 rounded-lg text-sm transition-colors duration-300 focus:outline-none focus:border-indigo-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Artists"
                                    value={formData.artists}
                                    onChange={(e) => setFormData({...formData, artists: e.target.value})}
                                    required
                                    className="px-4 py-3 border-2 border-gray-200 rounded-lg text-sm transition-colors duration-300 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                <input
                                    type="text"
                                    placeholder="Album"
                                    value={formData.album}
                                    onChange={(e) => setFormData({...formData, album: e.target.value})}
                                    className="px-4 py-3 border-2 border-gray-200 rounded-lg text-sm transition-colors duration-300 focus:outline-none focus:border-indigo-500"
                                />
                                <input
                                    type="url"
                                    placeholder="Spotify URL"
                                    value={formData.spotify_url}
                                    onChange={(e) => setFormData({...formData, spotify_url: e.target.value})}
                                    className="px-4 py-3 border-2 border-gray-200 rounded-lg text-sm transition-colors duration-300 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                <input
                                    type="url"
                                    placeholder="Album Art URL"
                                    value={formData.album_art_url}
                                    onChange={(e) => setFormData({...formData, album_art_url: e.target.value})}
                                    className="px-4 py-3 border-2 border-gray-200 rounded-lg text-sm transition-colors duration-300 focus:outline-none focus:border-indigo-500"
                                />
                                <input
                                    type="number"
                                    placeholder="Popularity (0-100)"
                                    value={formData.popularity}
                                    onChange={(e) => setFormData({...formData, popularity: parseInt(e.target.value)})}
                                    min="0"
                                    max="100"
                                    className="px-4 py-3 border-2 border-gray-200 rounded-lg text-sm transition-colors duration-300 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                <select
                                    value={formData.playlist_name}
                                    onChange={(e) => setFormData({...formData, playlist_name: e.target.value})}
                                    required
                                    className="px-4 py-3 border-2 border-gray-200 rounded-lg text-sm transition-colors duration-300 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">Select Playlist</option>
                                    <option value="New Music Friday">New Music Friday</option>
                                    <option value="Release Radar">Release Radar</option>
                                </select>
                                <input
                                    type="date"
                                    value={formData.week_start}
                                    onChange={(e) => setFormData({...formData, week_start: e.target.value})}
                                    required
                                    className="px-4 py-3 border-2 border-gray-200 rounded-lg text-sm transition-colors duration-300 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="mb-5">
                                <input
                                    type="text"
                                    placeholder="Tags (comma separated)"
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

            {/* Tracks Display */}
            <div className="mt-8">
                {loading ? (
                    <div className="text-center py-16 text-gray-500 text-lg">Loading tracks...</div>
                ) : Object.keys(groupedTracks).length === 0 ? (
                    <div className="text-center py-16 text-gray-500 text-lg">No tracks found</div>
                ) : (
                    Object.entries(groupedTracks).map(([week, weekTracks]) => (
                        <div key={week} className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-5 pb-3 border-b-2 border-gray-100">📅 Week of {week}</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                                {weekTracks.map(track => (
                                    <div key={track.id} className="bg-white rounded-xl p-4 sm:p-5 shadow-lg border border-gray-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                                        <div className="w-full h-40 sm:h-48 rounded-lg overflow-hidden mb-4 bg-gray-100 flex items-center justify-center">
                                            {track.album_art_url ? (
                                                <img src={track.album_art_url} alt="Album Art" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-5xl text-gray-400">🎵</div>
                                            )}
                                        </div>
                                        <div className="mb-4">
                                            <h3 className="text-xl font-semibold text-gray-900 mb-2">{track.track_name}</h3>
                                            <p className="text-gray-600 text-sm font-medium mb-1">{track.artists}</p>
                                            <p className="text-gray-400 text-sm mb-3">{track.album}</p>
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-xs font-semibold">{track.playlist_name}</span>
                                                <span className="text-amber-500 font-semibold text-sm">⭐ {track.popularity}</span>
                                            </div>
                                            {track.spotify_url && (
                                                <a 
                                                    href={track.spotify_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-block bg-green-500 text-white text-decoration-none py-2 px-4 rounded-md text-sm font-semibold transition-colors duration-300 hover:bg-green-600 mb-4"
                                                >
                                                    🎧 Open in Spotify
                                                </a>
                                            )}
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <button 
                                                onClick={() => startEdit(track)}
                                                className="flex-1 bg-amber-500 text-white border-none py-2 px-4 rounded-md text-sm font-semibold cursor-pointer transition-all duration-300 hover:bg-amber-600"
                                            >
                                                ✏️ Edit
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteTrack(track.id)}
                                                className="flex-1 bg-red-500 text-white border-none py-2 px-4 rounded-md text-sm font-semibold cursor-pointer transition-all duration-300 hover:bg-red-600"
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
