import { useRouter } from 'next/router';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function TracksManagement() {
    const router = useRouter();
    const [tracks, setTracks] = useState([]);
    const [weeks, setWeeks] = useState([]);
    const [selectedWeek, setSelectedWeek] = useState('');
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
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
    const [showImageModal, setShowImageModal] = useState(false);
    const [currentWeekImages, setCurrentWeekImages] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [weekImageStatus, setWeekImageStatus] = useState({});
    const [weekCaptionStatus, setWeekCaptionStatus] = useState({});
    const [captionLoading, setCaptionLoading] = useState(false);
    const [showCaptionModal, setShowCaptionModal] = useState(false);
    const [currentWeekCaption, setCurrentWeekCaption] = useState(null);
    const [isEditingCaption, setIsEditingCaption] = useState(false);
    const [editingCaption, setEditingCaption] = useState('');
    const [editingHashtags, setEditingHashtags] = useState('');
    const [instagramPublisher, setInstagramPublisher] = useState(null);
    const [creatingPostForWeek, setCreatingPostForWeek] = useState(null);
    const [postMessage, setPostMessage] = useState('');
    const [showPopularityModal, setShowPopularityModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [settingsWeek, setSettingsWeek] = useState(null);
    const [selectedCoverTrack, setSelectedCoverTrack] = useState(null);
    const [savingSettings, setSavingSettings] = useState(false);
    const [processingImage, setProcessingImage] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState(null);
    const [processingPreview, setProcessingPreview] = useState(false);

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

    // Authentication check
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                router.replace('/adminsignin');
                return;
            }
            setUser(user);
            setAuthLoading(false);
        };
        
        checkAuth();

        // Auth listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session?.user) {
                router.replace('/adminsignin');
            } else {
                setUser(session.user);
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchTracks();
            fetchWeeks();
            fetchAvailableTags();
        }
    }, [authLoading, user]);

    // Initialize Instagram publisher when component mounts
    useEffect(() => {
        const initializeInstagram = () => {
            if (typeof window !== 'undefined' && window.InstagramPublisher) {
                const publisher = new window.InstagramPublisher();
                // Set the Facebook App ID
                publisher.facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
                setInstagramPublisher(publisher);
                console.log('✅ Instagram publisher initialized with App ID:', publisher.facebookAppId);
            } else {
                console.log('⏳ Instagram publisher not ready yet, retrying...');
                // Retry after a short delay
                setTimeout(initializeInstagram, 1000);
            }
        };
        
        initializeInstagram();
    }, []);

    useEffect(() => {
        fetchTracks();
    }, [selectedWeek, filterPlaylist, searchTerm, showArchived, filterTags]);

    // Check image status for all weeks when tracks are loaded
    useEffect(() => {
        if (weeks.length > 0) {
            weeks.forEach(week => {
                checkWeekImageStatus(week);
            });
        }
    }, [weeks]);


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
            
            // Check image and caption status for each week
            uniqueWeeks.forEach(week => {
                checkWeekImageStatus(week);
                checkWeekCaptionStatus(week);
            });
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

    // Helper function to regenerate tracklist for a specific week
    const regenerateTracklistForWeek = async (weekStart) => {
        if (!weekStart) return;
        
        try {
            console.log(`Regenerating tracklist for week: ${weekStart}`);
            const response = await fetch('/api/regenerate-tracklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weekStart })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Failed to regenerate tracklist:', errorData);
                // Don't show alert - just log the error silently
            } else {
                console.log('Tracklist regenerated successfully');
                // Refresh tracks to get updated image URLs
                fetchTracks();
            }
        } catch (error) {
            console.error('Error regenerating tracklist:', error);
            // Don't show alert - just log the error silently
        }
    };

    // Helper function to regenerate both graphics (cover and tracklist) for a specific week
    const regenerateBothGraphics = async (weekStart) => {
        if (!weekStart) return;
        
        if (!confirm(`Are you sure you want to regenerate both graphics (cover image and tracklist) for this week? This may take a few moments.`)) {
            return;
        }
        
        try {
            console.log(`🔄 Regenerating both graphics for week: ${weekStart}`);
            
            // Show loading state
            const loadingMessage = `Regenerating graphics for week ${weekStart}...`;
            alert(loadingMessage);
            
            // Regenerate tracklist
            const tracklistResponse = await fetch('/api/regenerate-tracklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weekStart })
            });
            
            if (!tracklistResponse.ok) {
                const errorData = await tracklistResponse.json();
                throw new Error(`Failed to regenerate tracklist: ${errorData.error || 'Unknown error'}`);
            }
            
            // Regenerate cover image using the automation flow
            // This will generate both cover and tracklist, but we already did tracklist above
            // So we'll just call the automation which will handle the cover image
            const imagesResponse = await fetch('/api/generate-images-direct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weekStart })
            });
            
            if (!imagesResponse.ok) {
                const errorData = await imagesResponse.json();
                // Tracklist was successful, so just warn about cover image
                console.warn('Tracklist regenerated, but cover image regeneration failed:', errorData);
                alert(`✅ Tracklist regenerated successfully!\n⚠️ Cover image regeneration had issues. Check console for details.`);
            } else {
                alert(`✅ Both graphics regenerated successfully!`);
            }
            
            // Refresh tracks and images to get updated URLs
            await fetchTracks();
            // Refresh week images status
            if (weekStart) {
                await fetchWeekImages(weekStart);
            }
            
        } catch (error) {
            console.error('Error regenerating graphics:', error);
            alert(`❌ Error regenerating graphics: ${error.message}`);
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
            await fetchTracks();
            
            // Check if the newly added track is in the top 10 by popularity
            // Only regenerate tracklist if it would be included
            if (latestWeek) {
                // Fetch all tracks for this week (including the newly added one)
                const { data: allTracks, error: tracksError } = await supabase
                    .from('tracks')
                    .select('*')
                    .eq('week_start', latestWeek)
                    .order('popularity', { ascending: false });
                
                if (!tracksError && allTracks && allTracks.length > 0) {
                    // Sort by popularity (descending) to get top 10
                    const sortedTracks = [...allTracks].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
                    const top10Tracks = sortedTracks.slice(0, 10);
                    
                    // Find the newly added track in the sorted list
                    // We'll identify it by matching the form data (track_name and artists)
                    const newTrackName = cleanFormData.track_name?.toLowerCase().trim();
                    const newTrackArtists = cleanFormData.artists?.toLowerCase().trim();
                    
                    const newTrackInTop10 = top10Tracks.some(track => {
                        const trackName = (track.track_name || '').toLowerCase().trim();
                        const trackArtists = (track.artists || '').toLowerCase().trim();
                        return trackName === newTrackName && trackArtists === newTrackArtists;
                    });
                    
                    if (newTrackInTop10) {
                        console.log(`🔄 New track "${cleanFormData.track_name}" is in the top 10. Regenerating tracklist...`);
                        await regenerateTracklistForWeek(latestWeek);
                    } else {
                        console.log(`ℹ️ New track "${cleanFormData.track_name}" (popularity: ${cleanFormData.popularity || 0}) is not in the top 10. Skipping tracklist regeneration.`);
                        console.log(`📊 Top 10 tracks have popularity range: ${top10Tracks[top10Tracks.length - 1]?.popularity || 0} to ${top10Tracks[0]?.popularity || 0}`);
                    }
                } else {
                    // If we can't fetch tracks or there are no tracks, regenerate anyway to be safe
                    console.log('⚠️ Could not fetch tracks to check top 10. Regenerating tracklist anyway...');
                    await regenerateTracklistForWeek(latestWeek);
                }
            }
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
            // Store week_start before updating (in case it changes)
            const oldWeekStart = editingTrack?.week_start;
            
            // Convert tags string to proper array format for Supabase
            const cleanFormData = {
                ...formData,
                tags: typeof formData.tags === 'string' 
                    ? (formData.tags.trim() === '' ? [] : formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag))
                    : (Array.isArray(formData.tags) ? formData.tags : [])
            };
            
            const newWeekStart = cleanFormData.week_start || oldWeekStart;

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
            await fetchTracks();
            
            // Always regenerate tracklist for affected weeks when a track is updated
            // This ensures the tracklist reflects any changes (popularity, name, artist, etc.)
            const weeksToRegenerate = new Set();
            
            // Add old week if it exists and is different from new week
            if (oldWeekStart && oldWeekStart !== newWeekStart) {
                weeksToRegenerate.add(oldWeekStart);
            }
            
            // Add new week
            if (newWeekStart) {
                weeksToRegenerate.add(newWeekStart);
            }
            
            // Regenerate tracklists for all affected weeks
            for (const weekStart of weeksToRegenerate) {
                console.log(`🔄 Regenerating tracklist for week ${weekStart} due to track update...`);
                await regenerateTracklistForWeek(weekStart);
            }
        } catch (error) {
            console.error('Error updating track:', error);
        }
    };

    const handleDeleteTrack = async (id) => {
        if (confirm('Are you sure you want to delete this track?')) {
            try {
                // Get the track's week_start and popularity before deleting
                const track = tracks.find(t => t.id === id);
                const weekStart = track?.week_start;
                const trackPopularity = track?.popularity || 0;
                
                const { error } = await supabase
                    .from('tracks')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                await fetchTracks();
                
                // Check if deleted track was in top 10 and regenerate if needed
                if (weekStart) {
                    // Fetch remaining tracks to check if deleted track was in top 10
                    const { data: remainingTracks } = await supabase
                        .from('tracks')
                        .select('*')
                        .eq('week_start', weekStart)
                        .order('popularity', { ascending: false });
                    
                    if (remainingTracks) {
                        const sortedTracks = [...remainingTracks].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
                        const top10Tracks = sortedTracks.slice(0, 10);
                        const minTop10Popularity = top10Tracks.length > 0 
                            ? Math.min(...top10Tracks.map(t => t.popularity || 0))
                            : 0;
                        
                        // If deleted track was in top 10 (its popularity was >= current min), regenerate
                        if (trackPopularity >= minTop10Popularity || remainingTracks.length < 10) {
                            console.log(`🔄 Deleted track was in top 10 (popularity: ${trackPopularity}). Regenerating tracklist...`);
                            await regenerateTracklistForWeek(weekStart);
                        } else {
                            console.log(`ℹ️ Deleted track (popularity: ${trackPopularity}) was not in top 10. Skipping regeneration.`);
                        }
                    } else {
                        // If we can't fetch tracks, regenerate anyway to be safe
                        console.log('⚠️ Could not fetch remaining tracks. Regenerating tracklist anyway...');
                        await regenerateTracklistForWeek(weekStart);
                    }
                }
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
            // Get tracks and their week_start values before deleting
            const tracksToDelete = tracks.filter(t => selectedTracks.has(t.id));
            const affectedWeeks = new Set(tracksToDelete.map(t => t.week_start).filter(Boolean));
            
            if (permanent) {
                // Permanent delete
                const { error } = await supabase
                    .from('tracks')
                    .delete()
                    .in('id', Array.from(selectedTracks));
                
                if (error) throw error;
            } else {
                // Archive (soft delete) - archived tracks won't show in tracklist anyway
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
            await fetchTracks();
            
            // Regenerate tracklists for all affected weeks
            // Check if any deleted tracks were in top 10
            for (const weekStart of affectedWeeks) {
                const { data: remainingTracks } = await supabase
                    .from('tracks')
                    .select('*')
                    .eq('week_start', weekStart)
                    .order('popularity', { ascending: false });
                
                if (remainingTracks) {
                    const deletedTracksInWeek = tracksToDelete.filter(t => t.week_start === weekStart);
                    const sortedTracks = [...remainingTracks].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
                    const top10Tracks = sortedTracks.slice(0, 10);
                    const minTop10Popularity = top10Tracks.length > 0 
                        ? Math.min(...top10Tracks.map(t => t.popularity || 0))
                        : 0;
                    
                    // Check if any deleted track was in top 10
                    const hadTop10Track = deletedTracksInWeek.some(t => 
                        (t.popularity || 0) >= minTop10Popularity || remainingTracks.length < 10
                    );
                    
                    if (hadTop10Track || deletedTracksInWeek.length > 0) {
                        console.log(`🔄 Regenerating tracklist for week ${weekStart} after bulk ${action}...`);
                        await regenerateTracklistForWeek(weekStart);
                    }
                } else {
                    // If we can't fetch tracks, regenerate anyway to be safe
                    console.log(`⚠️ Could not fetch remaining tracks for week ${weekStart}. Regenerating anyway...`);
                    await regenerateTracklistForWeek(weekStart);
                }
            }
            
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

    // Image management functions
    const fetchWeekImages = async (weekStart) => {
        // Check if custom_image_url exists and use it as cover_image_url
        try {
            //console.log('🔍 Fetching images for week:', weekStart);
            
            // Try different week formats to match what's in the database
            const weekFormats = [
                weekStart, // Original format (YYYY-MM-DD)
                weekStart.replace(/-/g, ''), // YYYYMMDD format
                new Date(weekStart).toISOString().split('T')[0] // Ensure YYYY-MM-DD format
            ];
            
            //console.log('📅 Trying week formats:', weekFormats);
            
            for (const format of weekFormats) {
                //console.log(`🔎 Trying format: ${format}`);
                const { data, error } = await supabase
                    .from('images')
                    .select('*')
                    .eq('week_start', format);
                
                //console.log(`📊 Query result for ${format}:`, { data, error });
                
                if (error) {
                    //console.error(`❌ Error fetching images for ${format}:`, error);
                    continue;
                }
                
                if (data && data.length > 0) {
                    //console.log(`✅ Found images for format ${format}:`, data[0]);
                    
                    // Fix old naming conventions to match actual storage files
                    const imageData = data[0];
                    
                    // If custom_image_url exists, use it as the cover_image_url
                    if (imageData.custom_image_url) {
                        imageData.cover_image_url = imageData.custom_image_url;
                    } else if (imageData.cover_image_url) {
                        // Fix old naming: cover_nmf_single_artist -> artist_collage
                        imageData.cover_image_url = imageData.cover_image_url
                            .replace('_cover_nmf_single_artist_', '_artist_collage_')
                            .replace('_nmf_single_artist_', '_artist_collage_');
                    }
                    
                    if (imageData.tracklist_image_url) {
                        // Fix old naming: tracklist_nmf_tracklist -> tracklist
                        imageData.tracklist_image_url = imageData.tracklist_image_url
                            .replace('_tracklist_nmf_tracklist_', '_tracklist_')
                            .replace('_nmf_tracklist_', '_tracklist_');
                    }
                    
                    console.log('🔧 Fixed URLs:', {
                        cover: imageData.cover_image_url,
                        tracklist: imageData.tracklist_image_url,
                        custom: imageData.custom_image_url
                    });
                    
                    return imageData;
                }
            }
            
            //console.log('❌ No images found for any format');
            return null;
        } catch (error) {
            //console.error('❌ Error fetching images:', error);
            return null;
        }
    };

    const checkWeekImageStatus = async (weekStart) => {
        const images = await fetchWeekImages(weekStart);
        setWeekImageStatus(prev => ({
            ...prev,
            [weekStart]: !!images
        }));
        return !!images;
    };

    const checkWeekCaptionStatus = async (weekStart) => {
        const caption = await fetchWeekCaption(weekStart);
        setWeekCaptionStatus(prev => ({
            ...prev,
            [weekStart]: !!(caption && caption.caption)
        }));
        return !!(caption && caption.caption);
    };

    // Caption functions
    const fetchWeekCaption = async (weekStart) => {
        try {
            //console.log('🔍 Fetching caption for week:', weekStart);
            const { data, error } = await supabase
                .from('images')
                .select('caption, hashtags, caption_style, week_start')
                .eq('week_start', weekStart)
                .single();
            
            if (error) {
                //console.error('Error fetching caption:', error);
                return null;
            }
            
            return data;
        } catch (error) {
            //console.error('Error fetching caption:', error);
            return null;
        }
    };

    const handleViewCaption = async (week = null) => {
        const targetWeek = week || selectedWeek;
        
        if (!targetWeek) {
            alert('Please select a week first');
            return;
        }

        try {
            setCaptionLoading(true);
            const captionData = await fetchWeekCaption(targetWeek);
            
            if (captionData && captionData.caption) {
                setCurrentWeekCaption(captionData);
                setEditingCaption(captionData.caption);
                setEditingHashtags(captionData.hashtags ? captionData.hashtags.join(' ') : '');
                setIsEditingCaption(false);
                setShowCaptionModal(true);
            } else {
                alert('No caption found for this week. Captions are generated automatically during the New Music Friday automation.');
            }
        } catch (error) {
            console.error('Error fetching caption:', error);
            alert('Error fetching caption');
        } finally {
            setCaptionLoading(false);
        }
    };

    const handleSaveCaption = async () => {
        if (!currentWeekCaption) return;

        try {
            setCaptionLoading(true);
            
            // Convert hashtags string to array and ensure they all start with #
            const hashtagsArray = editingHashtags
                .split(' ')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0)
                .map(tag => tag.startsWith('#') ? tag : `#${tag}`);

            const { error } = await supabase
                .from('images')
                .update({
                    caption: editingCaption,
                    hashtags: hashtagsArray,
                    updated_at: new Date().toISOString()
                })
                .eq('week_start', currentWeekCaption.week_start);

            if (error) {
                console.error('Error saving caption:', error);
                alert('Failed to save caption changes');
                return;
            }

            // Update local state
            setCurrentWeekCaption(prev => ({
                ...prev,
                caption: editingCaption,
                hashtags: hashtagsArray
            }));

            setIsEditingCaption(false);
            alert('Caption saved successfully!');
        } catch (error) {
            console.error('Error saving caption:', error);
            alert('Error saving caption');
        } finally {
            setCaptionLoading(false);
        }
    };

    // Client-side preview rendering using Canvas (avoids server-side font issues)
    const renderPreviewWithCanvas = async (imageUrl, trackName, artistName) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            const renderCanvas = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const targetSize = 1080;
                const margin = 28;
                const radius = 40;
                const borderWidth = 18;
                
                canvas.width = targetSize;
                canvas.height = targetSize;
                
                // Draw image (resized and cropped to square)
                ctx.drawImage(img, 0, 0, targetSize, targetSize);
                
                // Dark overlay
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(0, 0, targetSize, targetSize);
                
                // White border (rounded rectangle)
                ctx.strokeStyle = 'rgb(255, 255, 255)';
                ctx.lineWidth = borderWidth;
                ctx.beginPath();
                const x = margin;
                const y = margin;
                const w = targetSize - margin * 2;
                const h = targetSize - margin * 2;
                // Manual rounded rectangle path
                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + w - radius, y);
                ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
                ctx.lineTo(x + w, y + h - radius);
                ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
                ctx.lineTo(x + radius, y + h);
                ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);
                ctx.closePath();
                ctx.stroke();
                
                // Colors
                const offWhite = 'rgb(232, 220, 207)';
                const brandRed = 'rgb(226, 62, 54)';
                const lightGray = 'rgb(210, 210, 210)';
                
                // Text settings
                const artistText = (artistName || 'Custom').toUpperCase();
                const trackText = (trackName || 'Custom Image').toUpperCase();
                
                // Artist name at top (centered) - with dynamic sizing and word wrapping
                ctx.fillStyle = offWhite;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.63)';
                ctx.lineWidth = 6;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                
                let artistFontSize = 160;
                const availableWidth = targetSize - (margin * 2) - 40;
                let artistLines = [artistText];
                
                // Calculate optimal font size for artist name
                ctx.font = `bold ${artistFontSize}px Arial, sans-serif`;
                let metrics = ctx.measureText(artistText);
                
                // Reduce font size if text is too wide
                while (metrics.width > availableWidth && artistFontSize > 80) {
                    artistFontSize -= 10;
                    ctx.font = `bold ${artistFontSize}px Arial, sans-serif`;
                    metrics = ctx.measureText(artistText);
                }
                
                // If still too wide, split into multiple lines
                if (metrics.width > availableWidth && artistFontSize <= 80) {
                    artistFontSize = 100;
                    ctx.font = `bold ${artistFontSize}px Arial, sans-serif`;
                    const words = artistText.split(' ');
                    artistLines = [];
                    let currentLine = '';
                    
                    for (const word of words) {
                        const testLine = currentLine ? `${currentLine} ${word}` : word;
                        const testMetrics = ctx.measureText(testLine);
                        if (testMetrics.width > availableWidth && currentLine) {
                            artistLines.push(currentLine);
                            currentLine = word;
                        } else {
                            currentLine = testLine;
                        }
                    }
                    if (currentLine) {
                        artistLines.push(currentLine);
                    }
                }
                
                // Render artist name (single or multi-line)
                const artistY = margin + 30;
                const artistLineHeight = artistFontSize * 1.2;
                artistLines.forEach((line, index) => {
                    ctx.font = `bold ${artistFontSize}px Arial, sans-serif`;
                    ctx.strokeText(line, targetSize / 2, artistY + (index * artistLineHeight));
                    ctx.fillText(line, targetSize / 2, artistY + (index * artistLineHeight));
                });
                
                // Track name at bottom-left - with dynamic sizing and word wrapping
                ctx.textAlign = 'left';
                ctx.font = 'bold 100px Arial, sans-serif';
                let trackFontSize = 100;
                const trackMaxWidth = (targetSize / 2) - margin - 20;
                let trackLines = [trackText];
                
                metrics = ctx.measureText(trackText);
                // Reduce font size if needed
                while (metrics.width > trackMaxWidth && trackFontSize > 60) {
                    trackFontSize -= 5;
                    ctx.font = `bold ${trackFontSize}px Arial, sans-serif`;
                    metrics = ctx.measureText(trackText);
                }
                
                // If still too wide, split into multiple lines
                if (metrics.width > trackMaxWidth && trackFontSize <= 60) {
                    trackFontSize = 75;
                    ctx.font = `bold ${trackFontSize}px Arial, sans-serif`;
                    const words = trackText.split(' ');
                    trackLines = [];
                    let currentLine = '';
                    
                    for (const word of words) {
                        const testLine = currentLine ? `${currentLine} ${word}` : word;
                        const testMetrics = ctx.measureText(testLine);
                        if (testMetrics.width > trackMaxWidth && currentLine) {
                            trackLines.push(currentLine);
                            currentLine = word;
                        } else {
                            currentLine = testLine;
                        }
                    }
                    if (currentLine) {
                        trackLines.push(currentLine);
                    }
                }
                
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.59)';
                ctx.lineWidth = 4;
                ctx.textBaseline = 'top';
                ctx.fillStyle = offWhite;
                
                // Render track name (single or multi-line) at bottom-left
                const trackLineHeight = trackFontSize * 1.2;
                const trackStartY = targetSize - margin - 50 - (trackLines.length * trackLineHeight);
                trackLines.forEach((line, index) => {
                    ctx.font = `bold ${trackFontSize}px Arial, sans-serif`;
                    ctx.strokeText(line, margin + 30, trackStartY + (index * trackLineHeight));
                    ctx.fillText(line, margin + 30, trackStartY + (index * trackLineHeight));
                });
                
                // Bottom-right stacked NEW / MUSIC / FRIDAY
                // Order: NEW (top), MUSIC (middle), FRIDAY (bottom)
                // Text is left-aligned but positioned in bottom-right area
                ctx.textAlign = 'left';
                const rMargin = margin + 50;
                const bMarginRight = margin + 40;
                const stackSpacing = 16;
                
                const stackWords = [
                    { text: 'NEW', color: brandRed, fontSize: 65 },
                    { text: 'MUSIC', color: lightGray, fontSize: 50 },
                    { text: 'FRIDAY', color: lightGray, fontSize: 50 }
                ];
                
                // Calculate total height of stack and find max width
                let totalStackHeight = 0;
                let maxTextWidth = 0;
                stackWords.forEach(({ text, fontSize }) => {
                    totalStackHeight += fontSize + stackSpacing;
                    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
                    const textMetrics = ctx.measureText(text);
                    maxTextWidth = Math.max(maxTextWidth, textMetrics.width);
                });
                totalStackHeight -= stackSpacing; // Remove last spacing
                
                // Position x so text block sits in bottom-right (left-aligned text)
                // x is where text starts, so we position it so the block ends near right edge
                const stackX = targetSize - rMargin - maxTextWidth;
                
                // Start from bottom and work up (inside the border, left-aligned text in bottom-right area)
                let stackY = targetSize - bMarginRight - totalStackHeight;
                stackWords.forEach(({ text, color, fontSize }) => {
                    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
                    ctx.fillStyle = color;
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.59)';
                    ctx.lineWidth = 4;
                    ctx.textBaseline = 'top';
                    ctx.strokeText(text, stackX, stackY);
                    ctx.fillText(text, stackX, stackY);
                    stackY += fontSize + stackSpacing;
                });
                
                // Convert to data URL
                const dataUrl = canvas.toDataURL('image/png');
                resolve(dataUrl);
            };
            
            // Try with CORS first, fallback without if it fails
            img.onload = renderCanvas;
            img.onerror = () => {
                // If CORS fails, try without CORS (may not work but worth trying)
                if (img.crossOrigin === 'anonymous') {
                    img.crossOrigin = null;
                    img.src = imageUrl;
                } else {
                    reject(new Error('Failed to load image for preview. CORS may be blocking the image.'));
                }
            };
            
            // Start with CORS enabled
            img.crossOrigin = 'anonymous';
            img.src = imageUrl;
        });
    };

    const processPreviewImage = async (track) => {
        if (!track || !track.album_art_url) {
            setPreviewImageUrl(null);
            return;
        }

        setProcessingPreview(true);
        try {
            // Use client-side canvas rendering for preview (works reliably in browser)
            const previewDataUrl = await renderPreviewWithCanvas(
                track.album_art_url,
                track.track_name || 'Custom Image',
                track.artists || 'Custom'
            );
            setPreviewImageUrl(previewDataUrl);
        } catch (error) {
            console.error('Error processing preview image:', error);
            setPreviewImageUrl(null);
        } finally {
            setProcessingPreview(false);
        }
    };

    const handleOpenSettings = async (week) => {
        setSettingsWeek(week);
        setSelectedCoverTrack(null);
        setPreviewImageUrl(null);
        
        // Fetch existing preferences
        try {
            const { data, error } = await supabase
                .from('images')
                .select('preferred_track_id, preferred_track_name, preferred_track_image, custom_image_url')
                .eq('week_start', week)
                .single();
            
            if (!error && data) {
                if (data.preferred_track_id) {
                    // Find the track in the current week's tracks
                    const weekTracks = tracks.filter(t => t.week_start === week);
                    const preferredTrack = weekTracks.find(t => t.id === data.preferred_track_id);
                    if (preferredTrack) {
                        setSelectedCoverTrack(preferredTrack);
                        // Generate preview for existing selection
                        await processPreviewImage(preferredTrack);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching preferences:', error);
        }
        
        setShowSettingsModal(true);
    };

    const handleSaveSettings = async () => {
        if (!settingsWeek) return;
        
        setSavingSettings(true);
        setProcessingImage(false);
        
        try {
            let customImageUrl = null;
            
            // If a cover track is selected, process its album art with overlay
            if (selectedCoverTrack && selectedCoverTrack.album_art_url) {
                // If we already have a preview image URL, reuse it (avoids reprocessing)
                if (previewImageUrl) {
                    customImageUrl = previewImageUrl;
                } else {
                    // Otherwise, process it now
                    setProcessingImage(true);
                    try {
                        // Process the selected track's album art with overlay via API
                        const processResponse = await fetch('/api/process-custom-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                imageUrl: selectedCoverTrack.album_art_url,
                                weekStart: settingsWeek,
                                trackName: selectedCoverTrack.track_name || 'Custom Image',
                                artistName: selectedCoverTrack.artists || 'Custom'
                            })
                        });
                        
                        if (!processResponse.ok) {
                            let errorMessage = 'Failed to process image with overlay';
                            try {
                                const errorData = await processResponse.json();
                                errorMessage = errorData.error || errorData.details || errorMessage;
                                if (errorData.details) {
                                    errorMessage += `: ${errorData.details}`;
                                }
                            } catch (e) {
                                errorMessage = `HTTP ${processResponse.status}: ${processResponse.statusText}`;
                            }
                            throw new Error(errorMessage);
                        }
                        
                        const processData = await processResponse.json();
                        if (processData.processedImageUrl) {
                            customImageUrl = processData.processedImageUrl;
                        } else {
                            throw new Error('No processed image URL returned from server');
                        }
                    } catch (error) {
                        console.error('Error processing image with overlay:', error);
                        alert('Failed to process image with overlay: ' + error.message);
                        setProcessingImage(false);
                        setSavingSettings(false);
                        return;
                    } finally {
                        setProcessingImage(false);
                    }
                }
            }
            
            // First check if a record exists for this week
            const { data: existingRecord, error: checkError } = await supabase
                .from('images')
                .select('id')
                .eq('week_start', settingsWeek)
                .single();
            
            const updateData = {
                updated_at: new Date().toISOString()
            };
            
            if (selectedCoverTrack) {
                updateData.preferred_track_id = selectedCoverTrack.id;
                updateData.preferred_track_name = selectedCoverTrack.track_name;
                updateData.preferred_track_image = selectedCoverTrack.album_art_url;
                // Set the processed custom image URL (only include if we have a value)
                // Note: This requires the custom_image_url column to exist in the database
                if (customImageUrl) {
                    updateData.custom_image_url = customImageUrl;
                }
            } else {
                // Clear preference if no track selected
                updateData.preferred_track_id = null;
                updateData.preferred_track_name = null;
                updateData.preferred_track_image = null;
                // Don't try to clear custom_image_url - it may not exist in schema yet
            }
            
            // Tracklist title is now auto-generated, no need to save custom title
            
            let error = null;
            
            if (existingRecord && !checkError) {
                // Record exists, update it
                const { error: updateError } = await supabase
                    .from('images')
                    .update(updateData)
                    .eq('week_start', settingsWeek);
                error = updateError;
            } else {
                // Record doesn't exist, insert new one
                const { error: insertError } = await supabase
                    .from('images')
                    .insert({
                        week_start: settingsWeek,
                        ...updateData,
                        created_at: new Date().toISOString()
                    });
                error = insertError;
            }
            
            if (error) {
                console.error('Error saving settings:', error);
                alert('Failed to save settings: ' + error.message);
                return;
            }
            
            alert('Settings saved successfully! Your selected cover image has been processed with the branding overlay and is now ready to use for Instagram posting.');
            setShowSettingsModal(false);
            // Refresh the page to show updated images
            window.location.reload();
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Error saving settings: ' + error.message);
        } finally {
            setSavingSettings(false);
            setProcessingImage(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingCaption(currentWeekCaption.caption);
        setEditingHashtags(currentWeekCaption.hashtags ? currentWeekCaption.hashtags.join(' ') : '');
        setIsEditingCaption(false);
    };

    // Instagram post creation
    const handleCreateInstagramPost = async () => {
        if (!currentWeekImages || !currentWeekCaption) {
            alert('Please ensure both images and caption are available for this week');
            return;
        }

        if (!instagramPublisher) {
            alert('Instagram publisher not initialized. Please refresh the page and try again.');
            return;
        }

        try {
            setCreatingPostForWeek(currentWeekImages.week_start);
            setPostMessage('');

            const weekStart = currentWeekImages.week_start;
            const coverImageUrl = currentWeekImages.cover_image_url;
            const tracklistImageUrl = currentWeekImages.tracklist_image_url;
            const caption = currentWeekCaption.caption;
            const hashtags = currentWeekCaption.hashtags || [];

            const result = await instagramPublisher.handleCreatePost(
                weekStart,
                coverImageUrl,
                tracklistImageUrl,
                caption,
                hashtags
            );

            // Handle the result from Instagram publisher
            if (result.success) {
                setPostMessage(result.message);
            } else {
                setPostMessage(result.message);
            }

        } catch (error) {
            console.error('Error creating Instagram post:', error);
            setPostMessage(`Error: ${error.message}`);
        } finally {
            setCreatingPostForWeek(null);
        }
    };


    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            alert('Copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            alert('Failed to copy to clipboard');
        }
    };

    const handleViewImages = async (week = null) => {
        const targetWeek = week || selectedWeek;
        
        if (!targetWeek) {
            alert('Please select a week first');
            return;
        }
        
        // Ensure targetWeek is a string
        const weekString = String(targetWeek);
        
        const images = await fetchWeekImages(weekString);
        
        // If there's a preferred track, add its album art as the first image
        if (images && images.preferred_track_image) {
            images.selected_cover_track_image = images.preferred_track_image;
            images.selected_cover_track_name = images.preferred_track_name;
        }
        
        setCurrentWeekImages(images);
        setCurrentImageIndex(0); // Start with first image
        setShowImageModal(true);
    };


    const findWeekWithSelectedTracks = () => {
        // Find which week has selected tracks
        for (const [week, weekTracks] of Object.entries(groupedTracks)) {
            if (weekTracks.some(track => selectedTracks.has(track.id))) {
                return week;
            }
        }
        return null;
    };


    const downloadImage = (url, filename) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    const groupedTracks = groupTracksByWeek(tracks);

    // Show loading state while checking authentication
    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Sign out function
    const signOutUser = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) alert(error.message);
        else router.replace('/adminsignin');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Instagram Client Script */}
            <Script src="/instagram-client.js" strategy="afterInteractive" />
            {/* Top Navigation Bar */}
            <nav className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                            </div>
                            <h1 className="text-xl font-semibold text-gray-900">Tracks Management</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button 
                                onClick={() => router.push('/admindashboard')}
                                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Dashboard
                            </button>
                            <button 
                                onClick={signOutUser}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="w-full px-2 sm:px-4 lg:px-8 py-4 sm:py-8 font-sans">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 sm:mb-8">
                <select 
                    value={selectedWeek} 
                    onChange={(e) => {
                        console.log('Dropdown changed:', e.target.value);
                        setSelectedWeek(e.target.value);
                    }}
                    className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm bg-white transition-colors duration-300 focus:outline-none focus:border-indigo-500 w-full"
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
                    className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm bg-white transition-colors duration-300 focus:outline-none focus:border-indigo-500 w-full"
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
                    className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm bg-white transition-colors duration-300 focus:outline-none focus:border-indigo-500 w-full"
                />

                <button onClick={fetchTracks} className="bg-emerald-500 text-white border-none py-2.5 px-4 rounded-lg font-semibold cursor-pointer transition-colors duration-300 hover:bg-emerald-600 w-full">
                    🔎 Search
                </button>
                
                <div className="flex items-center gap-2 col-span-full sm:col-span-1">
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
                <div className="relative tag-dropdown col-span-full sm:col-span-1">
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

                {/* Streamlined Info Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                    {/* Current Schedule Status */}
                    <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
                        <h3 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">📅 Schedule</h3>
                        <div className="space-y-1 text-xs sm:text-sm text-blue-800">
                            <p><strong>Every Friday</strong></p>
                            <p>{(() => {
                                const now = new Date();
                                const friday = new Date(now);
                                const daysUntilFriday = (5 - now.getDay() + 7) % 7;
                                friday.setDate(now.getDate() + daysUntilFriday);
                                friday.setUTCHours(14, 0, 0, 0);
                                
                                return friday.toLocaleString('en-US', {
                                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                                    weekday: 'short',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                });
                            })()}</p>
                            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">Active</span>
                        </div>
                    </div>

                    {/* Last Update Info */}
                    <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-200">
                        <h3 className="font-medium text-green-900 mb-2 text-sm sm:text-base">🤖 Last Update</h3>
                        <div className="space-y-1 text-xs sm:text-sm text-green-800">
                            <p><strong>GitHub Actions</strong></p>
                            <p>{tracks.length > 0 ? `${Math.floor((new Date() - new Date(tracks[0]?.created_at)) / (1000 * 60 * 60 * 24))} days ago` : 'Never'}</p>
                            <p><strong>{tracks.length} tracks</strong></p>
                        </div>
                    </div>

                    {/* Popularity Scores - Clickable Modal */}
                    <div className="bg-amber-50 rounded-lg p-3 sm:p-4 border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => setShowPopularityModal(true)}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-amber-800 mb-1 text-sm sm:text-base">ℹ️ Popularity Scores</h3>
                                <p className="text-xs sm:text-sm text-amber-700">Click to learn more</p>
                            </div>
                            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
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

            {/* Popularity Scores Modal */}
            {showPopularityModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-xl w-11/12 max-w-md mx-4 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                About Popularity Scores
                            </h2>
                            <button
                                onClick={() => setShowPopularityModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="text-gray-700 leading-relaxed">
                            <p className="mb-4">
                                Some tracks may show a popularity score of <strong>0</strong>. This is completely normal and expected for newly released tracks.
                            </p>
                            
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                                <h3 className="font-semibold text-amber-800 mb-2">Why does this happen?</h3>
                                <ul className="text-sm text-amber-700 space-y-1 pl-4">
                                    <li className="list-disc">The weekly music update runs at a scheduled time</li>
                                    <li className="list-disc">Spotify may not have assigned popularity scores yet</li>
                                    <li className="list-disc">New releases need time to accumulate plays</li>
                                    <li className="list-disc">Popularity scores update throughout the week</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div className="flex justify-end mt-6">
                            <button
                                onClick={() => setShowPopularityModal(false)}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                            >
                                Got it!
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Actions Toolbar */}
            {selectedTracks.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
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
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                            {!showArchived ? (
                                <>
                                    <button
                                        onClick={() => handleBulkDelete(false)}
                                        className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors w-full sm:w-auto"
                                    >
                                        📦 Archive Selected
                                    </button>
                                    <button
                                        onClick={() => handleBulkDelete(true)}
                                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors w-full sm:w-auto"
                                    >
                                        🗑️ Delete Permanently
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleRestoreTracks}
                                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors w-full sm:w-auto"
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
                                <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                            <button
                                                onClick={() => toggleWeek(week)}
                                                className="flex items-center gap-2 hover:bg-gray-100 px-2 py-1 rounded transition-colors min-w-0 flex-1"
                                            >
                                                <svg 
                                                    className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 transition-transform duration-200 flex-shrink-0 ${expandedWeeks.includes(week) ? 'rotate-180' : ''}`}
                                                    fill="none" 
                                                    stroke="currentColor" 
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                                <h2 className="text-sm sm:text-xl font-semibold text-gray-900 truncate">📅 Week of Friday, {(() => {
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
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                                            <span className="text-xs sm:text-sm text-gray-600">{weekTracks.length} tracks</span>
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                                                {weekImageStatus[week] && (
                                                    <button
                                                        onClick={() => handleViewImages(week)}
                                                        className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm underline px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                                    >
                                                        View Images
                                                    </button>
                                                )}
                                                {weekCaptionStatus[week] && (
                                                    <button
                                                        onClick={() => handleViewCaption(week)}
                                                        className="text-green-600 hover:text-green-800 text-xs sm:text-sm underline px-2 py-1 rounded hover:bg-green-50 transition-colors"
                                                    >
                                                        View Caption
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleOpenSettings(week)}
                                                    className="text-indigo-600 hover:text-indigo-800 text-xs sm:text-sm underline px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                                                    title="Configure cover image and tracklist title"
                                                >
                                                    ⚙️ Settings
                                                </button>
                                                {/* Instagram Post Creation Button - Show if both images and caption are available */}
                                                {weekImageStatus[week] && weekCaptionStatus[week] && (
                                                    <button
                                                        onClick={async () => {
                                                            // Check if Instagram publisher is initialized
                                                            if (!instagramPublisher) {
                                                                alert('Instagram publisher not initialized. Please refresh the page and try again.');
                                                                return;
                                                            }

                                                            // Check if caption exists for this week
                                                            const captionData = await fetchWeekCaption(week);
                                                            if (!captionData || !captionData.caption) {
                                                                alert('Both images and caption are required to create an Instagram post. Please ensure caption is available for this week.');
                                                                return;
                                                            }

                                                            // Get images for this week
                                                            const imagesData = await fetchWeekImages(week);
                                                            if (!imagesData || !imagesData.cover_image_url || !imagesData.tracklist_image_url) {
                                                                alert('Both cover and tracklist images are required to create an Instagram post.');
                                                                return;
                                                            }

                                                            // Set the data and create Instagram post directly
                                                            setCurrentWeekImages(imagesData);
                                                            setCurrentWeekCaption(captionData);
                                                            
                                                            // Create Instagram post directly
                                                            try {
                                                                setCreatingPostForWeek(week);
                                                                setPostMessage('');

                                                                const weekStart = imagesData.week_start;
                                                                const coverImageUrl = imagesData.cover_image_url;
                                                                const tracklistImageUrl = imagesData.tracklist_image_url;
                                                                const caption = captionData.caption;
                                                                const hashtags = captionData.hashtags || [];

                                                                const result = await instagramPublisher.handleCreatePost(
                                                                    weekStart,
                                                                    coverImageUrl,
                                                                    tracklistImageUrl,
                                                                    caption,
                                                                    hashtags
                                                                );

                                                                // Handle the result from Instagram publisher
                                                                if (result.success) {
                                                                    setPostMessage(result.message);
                                                                    alert(`✅ ${result.message}`);
                                                                } else {
                                                                    setPostMessage(result.message);
                                                                    alert(`❌ ${result.message}`);
                                                                }

                                                            } catch (error) {
                                                                console.error('Error creating Instagram post:', error);
                                                                setPostMessage(`Error: ${error.message}`);
                                                                alert(`❌ Error creating Instagram post: ${error.message}`);
                                                            } finally {
                                                                setCreatingPostForWeek(null);
                                                            }
                                                        }}
                                                        disabled={creatingPostForWeek === week}
                                                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-1 min-w-0"
                                                    >
                                                        {creatingPostForWeek === week ? (
                                                            <>
                                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                                                Creating...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                                                </svg>
                                                                Instagram
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                                <input
                                                    type="checkbox"
                                                    checked={weekTracks.every(track => selectedTracks.has(track.id))}
                                                    onChange={() => {
                                                        console.log('Week checkbox clicked for week:', week);
                                                        const weekTrackIds = weekTracks.map(t => t.id);
                                                        console.log('Week track IDs:', weekTrackIds);
                                                        console.log('Current selectedTracks:', Array.from(selectedTracks));
                                                        
                                                        if (weekTracks.every(track => selectedTracks.has(track.id))) {
                                                            console.log('Deselecting all week tracks');
                                                            // Deselect all week tracks
                                                            setSelectedTracks(prev => {
                                                                const newSet = new Set(prev);
                                                                weekTrackIds.forEach(id => newSet.delete(id));
                                                                console.log('New selectedTracks after deselect:', Array.from(newSet));
                                                                return newSet;
                                                            });
                                                        } else {
                                                            console.log('Selecting all week tracks');
                                                            // Select all week tracks
                                                            setSelectedTracks(prev => {
                                                                const newSet = new Set(prev);
                                                                weekTrackIds.forEach(id => newSet.add(id));
                                                                console.log('New selectedTracks after select:', Array.from(newSet));
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
                                                <div key={track.id} className="bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-200">
                                                    {/* Mobile Layout */}
                                                    <div className="block sm:hidden p-3">
                                                        <div className="flex items-start gap-3 mb-3">
                                                            {/* Selection Checkbox */}
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedTracks.has(track.id)}
                                                                onChange={() => toggleTrackSelection(track.id)}
                                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0 mt-1"
                                                            />
                                                            
                                                            {/* Album Art - Smaller on mobile */}
                                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 flex items-center justify-center">
                                                                {track.album_art_url ? (
                                                                    <img src={track.album_art_url} alt="Album Art" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="text-lg text-gray-400">🎵</div>
                                                                )}
                                                            </div>
                                                            
                                                            {/* Track Info - Full width on mobile */}
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="text-base font-semibold text-gray-900 truncate">{track.track_name}</h3>
                                                                <p className="text-gray-600 text-sm font-medium truncate">{track.artists}</p>
                                                                <p className="text-gray-500 text-xs truncate">{track.album}</p>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Mobile Meta Info */}
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="bg-indigo-500 text-white px-2 py-1 rounded-full text-xs font-semibold">{track.playlist_name}</span>
                                                                <span className="text-amber-500 font-semibold text-xs">⭐ {track.popularity}</span>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Mobile Actions - Compact horizontal layout */}
                                                        <div className="flex items-center justify-between">
                                                            {track.spotify_url && (
                                                                <a 
                                                                    href={track.spotify_url} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 transition-colors duration-200 flex items-center gap-1"
                                                                    title="Open in Spotify"
                                                                >
                                                                    🎧 <span className="hidden xs:inline">Spotify</span>
                                                                </a>
                                                            )}
                                                            <div className="flex items-center gap-1">
                                                                <button 
                                                                    onClick={() => startEdit(track)}
                                                                    className="bg-amber-500 text-white px-2 py-1 rounded text-xs hover:bg-amber-600 transition-colors duration-200"
                                                                    title="Edit Track"
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteTrack(track.id)}
                                                                    className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors duration-200"
                                                                    title="Delete Track"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Desktop Layout */}
                                                    <div className="hidden sm:flex items-center gap-4 p-4">
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

            {/* Image Modal */}
            {showImageModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="relative max-w-6xl w-full max-h-[95vh]">
                        {/* Close button */}
                        <button
                            onClick={() => setShowImageModal(false)}
                            className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {currentWeekImages ? (
                            <div className="relative">
                                {/* Determine available images */}
                                {(() => {
                                    const hasSelectedCover = currentWeekImages.selected_cover_track_image;
                                    const hasCover = currentWeekImages.cover_image_url;
                                    const hasTracklist = currentWeekImages.tracklist_image_url;
                                    const totalImages = (hasSelectedCover ? 1 : 0) + (hasCover ? 1 : 0) + (hasTracklist ? 1 : 0);
                                    
                                    if (totalImages > 1) {
                                        return (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        const maxIndex = totalImages - 1;
                                                        setCurrentImageIndex(prev => prev === 0 ? maxIndex : prev - 1);
                                                    }}
                                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-all"
                                                >
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const maxIndex = totalImages - 1;
                                                        setCurrentImageIndex(prev => prev === maxIndex ? 0 : prev + 1);
                                                    }}
                                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-all"
                                                >
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            </>
                                        );
                                    }
                                    return null;
                                })()}

                                {/* Image display */}
                                <div className="text-center">
                                    {(() => {
                                        // Determine which image to show based on index
                                        let imageUrl = null;
                                        let imageTitle = '';
                                        let imageSubtitle = '';
                                        
                                        const hasSelectedCover = currentWeekImages.selected_cover_track_image;
                                        const hasCover = currentWeekImages.cover_image_url;
                                        
                                        if (currentImageIndex === 0 && hasSelectedCover) {
                                            // First image: Selected cover track
                                            imageUrl = currentWeekImages.selected_cover_track_image;
                                            imageTitle = "Selected Cover Track";
                                            imageSubtitle = currentWeekImages.selected_cover_track_name || "Cover Track";
                                        } else if ((currentImageIndex === 0 && !hasSelectedCover && hasCover) || 
                                                   (currentImageIndex === 1 && hasSelectedCover && hasCover)) {
                                            // Second image: Generated cover
                                            imageUrl = currentWeekImages.cover_image_url;
                                            imageTitle = "Cover Image";
                                            imageSubtitle = "Generated Graphic";
                                        } else {
                                            // Third image: Tracklist
                                            imageUrl = currentWeekImages.tracklist_image_url;
                                            imageTitle = "Tracklist Image";
                                            imageSubtitle = "Generated Tracklist";
                                        }
                                        
                                        if (!imageUrl) {
                                            return <div className="text-white text-lg">No image available for this week</div>;
                                        }
                                        
                                        // Clean up the URL - remove trailing ? and fix folder structure
                                        let cleanUrl = imageUrl.replace(/\?$/, '');
                                        
                                        // Fix old double folder structure to new single folder structure
                                        if (cleanUrl.includes('/instagram-images/instagram_images/')) {
                                            cleanUrl = cleanUrl.replace('/instagram-images/instagram_images/', '/instagram-images/');
                                            console.log('Fixed URL structure:', cleanUrl);
                                        }
                                        
                                        console.log('Displaying image URL:', cleanUrl);
                                        
                                        return (
                                            <img
                                                src={cleanUrl}
                                                alt={imageTitle}
                                                className="max-w-full h-auto rounded-lg shadow-2xl mx-auto"
                                                style={{ maxHeight: '80vh' }}
                                                onLoad={() => console.log('✅ Image loaded successfully')}
                                                onError={(e) => {
                                                    console.error('❌ Image failed to load:', e);
                                                    console.error('Failed URL:', cleanUrl);
                                                }}
                                            />
                                        );
                                    })()}
                                
                                    
                                    {/* Image title */}
                                    <div className="mt-4 text-white">
                                        <h3 className="text-xl font-semibold">
                                            {(() => {
                                                const hasSelectedCover = currentWeekImages.selected_cover_track_image;
                                                const hasCover = currentWeekImages.cover_image_url;
                                                
                                                if (currentImageIndex === 0 && hasSelectedCover) {
                                                    return "Selected Cover Track";
                                                } else if ((currentImageIndex === 0 && !hasSelectedCover && hasCover) || 
                                                           (currentImageIndex === 1 && hasSelectedCover && hasCover)) {
                                                    return "Cover Image";
                                                } else {
                                                    return "Tracklist Image";
                                                }
                                            })()}
                                        </h3>
                                        <p className="text-sm opacity-75">
                                            {(() => {
                                                const hasSelectedCover = currentWeekImages.selected_cover_track_image;
                                                const hasCover = currentWeekImages.cover_image_url;
                                                
                                                if (currentImageIndex === 0 && hasSelectedCover) {
                                                    return currentWeekImages.selected_cover_track_name || "Selected Cover Track";
                                                } else {
                                                    return `Week of ${currentWeekImages?.week_start || selectedWeek}`;
                                                }
                                            })()}
                                        </p>
                                    </div>


                                    {/* Action buttons */}
                                    <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
                                        <button
                                            onClick={() => downloadImage(
                                                currentImageIndex === 0 
                                                    ? currentWeekImages.cover_image_url 
                                                    : currentWeekImages.tracklist_image_url,
                                                `${currentImageIndex === 0 ? 'cover' : 'tracklist'}_${currentWeekImages?.week_start || selectedWeek}.png`
                                            )}
                                            className="bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm text-white px-6 py-2 rounded-full text-sm font-medium transition-all border border-white border-opacity-30"
                                        >
                                            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Download
                                        </button>
                                        
                                        {/* Instagram Post Creation Button - Only show if both images and caption are available */}
                                        {currentWeekImages.cover_image_url && 
                                         currentWeekImages.tracklist_image_url && 
                                         currentWeekCaption && 
                                         currentWeekCaption.caption && (
                                            <button
                                                onClick={handleCreateInstagramPost}
                                                disabled={creatingPostForWeek === currentWeekImages?.week_start}
                                                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 text-white px-6 py-2 rounded-full text-sm font-medium transition-all border border-white border-opacity-30 flex items-center justify-center"
                                            >
                                                {creatingPostForWeek === currentWeekImages?.week_start ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                        Creating Post...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                                        </svg>
                                                        Create Instagram Post
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    {/* Post Message */}
                                    {postMessage && (
                                        <div className="mt-4 text-center">
                                            <div className={`inline-block px-4 py-2 rounded-lg text-sm ${
                                                postMessage.includes('Error') 
                                                    ? 'bg-red-500 bg-opacity-20 text-red-200 border border-red-500 border-opacity-30' 
                                                    : 'bg-green-500 bg-opacity-20 text-green-200 border border-green-500 border-opacity-30'
                                            }`}>
                                                {postMessage}
                                            </div>
                                        </div>
                                    )}

                                    {/* Image indicators */}
                                    {(() => {
                                        const hasSelectedCover = currentWeekImages.selected_cover_track_image;
                                        const hasCover = currentWeekImages.cover_image_url;
                                        const hasTracklist = currentWeekImages.tracklist_image_url;
                                        const totalImages = (hasSelectedCover ? 1 : 0) + (hasCover ? 1 : 0) + (hasTracklist ? 1 : 0);
                                        
                                        if (totalImages > 1) {
                                            return (
                                                <div className="mt-4 flex justify-center gap-2">
                                                    {hasSelectedCover && (
                                                        <button
                                                            onClick={() => setCurrentImageIndex(0)}
                                                            className={`w-3 h-3 rounded-full transition-all ${
                                                                currentImageIndex === 0 ? 'bg-white' : 'bg-white bg-opacity-50'
                                                            }`}
                                                            title="Selected Cover Track"
                                                        />
                                                    )}
                                                    {hasCover && (
                                                        <button
                                                            onClick={() => setCurrentImageIndex(hasSelectedCover ? 1 : 0)}
                                                            className={`w-3 h-3 rounded-full transition-all ${
                                                                (hasSelectedCover ? currentImageIndex === 1 : currentImageIndex === 0) ? 'bg-white' : 'bg-white bg-opacity-50'
                                                            }`}
                                                            title="Cover Image"
                                                        />
                                                    )}
                                                    {hasTracklist && (
                                                        <button
                                                            onClick={() => setCurrentImageIndex(
                                                                (hasSelectedCover ? 1 : 0) + (hasCover ? 1 : 0)
                                                            )}
                                                            className={`w-3 h-3 rounded-full transition-all ${
                                                                currentImageIndex === ((hasSelectedCover ? 1 : 0) + (hasCover ? 1 : 0)) ? 'bg-white' : 'bg-white bg-opacity-50'
                                                            }`}
                                                            title="Tracklist Image"
                                                        />
                                                    )}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <div className="text-white mb-8">
                                    <div className="w-24 h-24 mx-auto mb-6 bg-white bg-opacity-10 rounded-full flex items-center justify-center">
                                        <svg className="w-12 h-12 text-white opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-semibold mb-2">No Images Yet</h3>
                                    <p className="text-lg opacity-75 mb-1">Week of {currentWeekImages?.week_start || selectedWeek}</p>
                                    <p className="text-sm opacity-60">Create stunning Instagram-ready images for this week's top tracks</p>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-sm text-white text-opacity-75">
                                        Images are automatically generated by the py_scraper script and stored in Supabase.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Caption Modal */}
            {showCaptionModal && currentWeekCaption && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-white">📝 Caption & Hashtags</h2>
                                <button
                                    onClick={() => setShowCaptionModal(false)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-sm text-gray-300 block mb-2">Week:</label>
                                    <div className="text-white font-medium">{currentWeekCaption.week_start}</div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm text-gray-300">Caption:</label>
                                        {!isEditingCaption && (
                                            <button
                                                onClick={() => setIsEditingCaption(true)}
                                                className="text-blue-400 hover:text-blue-300 text-sm"
                                            >
                                                ✏️ Edit
                                            </button>
                                        )}
                                    </div>
                                    
                                    {isEditingCaption ? (
                                        <div className="space-y-3">
                                            <textarea
                                                value={editingCaption}
                                                onChange={(e) => setEditingCaption(e.target.value)}
                                                className="w-full bg-black bg-opacity-50 rounded-lg p-4 text-white text-sm leading-relaxed resize-none"
                                                rows={6}
                                                placeholder="Enter your caption..."
                                            />
                                            <div className="text-xs text-gray-400">
                                                Characters: {editingCaption.length}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-black bg-opacity-50 rounded-lg p-4 text-white text-sm leading-relaxed whitespace-pre-line">
                                            {currentWeekCaption.caption}
                                        </div>
                                    )}
                                    
                                    {!isEditingCaption && (
                                        <button
                                            onClick={() => copyToClipboard(currentWeekCaption.caption)}
                                            className="mt-2 text-sm text-blue-300 hover:text-blue-200 transition-colors"
                                        >
                                            📋 Copy Caption
                                        </button>
                                    )}
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm text-gray-300">Hashtags:</label>
                                        {!isEditingCaption && (
                                            <button
                                                onClick={() => setIsEditingCaption(true)}
                                                className="text-blue-400 hover:text-blue-300 text-sm"
                                            >
                                                ✏️ Edit
                                            </button>
                                        )}
                                    </div>
                                    
                                    {isEditingCaption ? (
                                        <div className="space-y-3">
                                            <textarea
                                                value={editingHashtags}
                                                onChange={(e) => setEditingHashtags(e.target.value)}
                                                className="w-full bg-black bg-opacity-50 rounded-lg p-4 text-white text-sm resize-none"
                                                rows={3}
                                                placeholder="Enter hashtags separated by spaces..."
                                            />
                                            <div className="text-xs text-gray-400">
                                                Separate hashtags with spaces
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-black bg-opacity-50 rounded-lg p-4 text-white text-sm">
                                            {currentWeekCaption.hashtags ? currentWeekCaption.hashtags.join(' ') : 'No hashtags'}
                                        </div>
                                    )}
                                    
                                    {!isEditingCaption && currentWeekCaption.hashtags && currentWeekCaption.hashtags.length > 0 && (
                                        <button
                                            onClick={() => copyToClipboard(currentWeekCaption.hashtags.join(' '))}
                                            className="mt-2 text-sm text-blue-300 hover:text-blue-200 transition-colors"
                                        >
                                            📋 Copy Hashtags
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                {isEditingCaption ? (
                                    <>
                                        <button
                                            onClick={handleCancelEdit}
                                            disabled={captionLoading}
                                            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveCaption}
                                            disabled={captionLoading}
                                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
                                        >
                                            {captionLoading ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setShowCaptionModal(false)}
                                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                                    >
                                        Close
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettingsModal && settingsWeek && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-white">⚙️ Graphic Settings</h2>
                                <button
                                    onClick={() => setShowSettingsModal(false)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-sm text-gray-300 block mb-2">Week:</label>
                                    <div className="text-white font-medium">{settingsWeek}</div>
                                </div>

                                {/* Cover Track Selection */}
                                <div>
                                    <label className="text-sm font-medium text-gray-300 block mb-3">
                                        Select Cover Image Track
                                    </label>
                                    <p className="text-xs text-gray-400 mb-4">
                                        Choose which track's album art will be used as the cover. The image will be automatically processed with the branding overlay (white border, "NEW MUSIC FRIDAY" text, etc.) when you save.
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                                        {tracks
                                            .filter(t => t.week_start === settingsWeek)
                                            .map(track => (
                                                <div
                                                    key={track.id}
                                                    onClick={async () => {
                                                        const newTrack = selectedCoverTrack?.id === track.id ? null : track;
                                                        setSelectedCoverTrack(newTrack);
                                                        if (newTrack) {
                                                            await processPreviewImage(newTrack);
                                                        } else {
                                                            setPreviewImageUrl(null);
                                                        }
                                                    }}
                                                    className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                                                        selectedCoverTrack?.id === track.id
                                                            ? 'border-indigo-500 bg-indigo-500 bg-opacity-20'
                                                            : 'border-gray-700 hover:border-gray-600'
                                                    }`}
                                                >
                                                    <div className="aspect-square rounded-t-lg overflow-hidden bg-gray-800">
                                                        {track.album_art_url ? (
                                                            <img
                                                                src={track.album_art_url}
                                                                alt={track.track_name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                                🎵
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-2">
                                                        <p className="text-xs text-white font-medium truncate" title={track.track_name}>
                                                            {track.track_name}
                                                        </p>
                                                        <p className="text-xs text-gray-400 truncate" title={track.artists}>
                                                            {track.artists}
                                                        </p>
                                                    </div>
                                                    {selectedCoverTrack?.id === track.id && (
                                                        <div className="absolute top-2 right-2 bg-indigo-500 rounded-full p-1">
                                                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                    {selectedCoverTrack && (
                                        <div className="mt-3 space-y-3">
                                            <div className="p-3 bg-indigo-500 bg-opacity-20 rounded-lg border border-indigo-500">
                                                <p className="text-sm text-indigo-300">
                                                    ✓ Selected: <span className="font-medium text-white">{selectedCoverTrack.track_name}</span> by {selectedCoverTrack.artists}
                                                </p>
                                            </div>
                                            
                                            {/* Preview Section */}
                                            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                                                <label className="text-sm font-medium text-gray-300 block mb-3">
                                                    Preview with Overlay
                                                </label>
                                                {processingPreview ? (
                                                    <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
                                                        <div className="text-center">
                                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-2"></div>
                                                            <p className="text-sm text-gray-400">Processing image with overlay...</p>
                                                        </div>
                                                    </div>
                                                ) : previewImageUrl ? (
                                                    <div className="relative">
                                                        <img
                                                            src={previewImageUrl}
                                                            alt="Preview with overlay"
                                                            className="w-full rounded-lg shadow-lg"
                                                        />
                                                        <p className="mt-2 text-xs text-gray-400 text-center">
                                                            This is how your cover image will look with the branding overlay
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
                                                        <p className="text-sm text-gray-500">No preview available</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowSettingsModal(false)}
                                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveSettings}
                                    disabled={savingSettings || processingImage}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                    {processingImage ? 'Processing Image with Overlay...' : savingSettings ? 'Saving...' : 'Save Settings'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
}
