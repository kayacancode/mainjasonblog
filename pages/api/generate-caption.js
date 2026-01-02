import { createClient } from '@supabase/supabase-js'

// Lazy Supabase client to avoid module-level errors
let supabaseInstance = null
function getSupabase() {
    if (!supabaseInstance) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase environment variables')
        }
        supabaseInstance = createClient(supabaseUrl, supabaseKey)
    }
    return supabaseInstance
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = getSupabase()

  try {
    const { week_start, style = 'balanced', regenerate = false } = req.body

    if (!week_start) {
      return res.status(400).json({ error: 'week_start is required' })
    }

    // Get tracks for the week
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('*')
      .eq('week_start', week_start)
      .order('popularity', { ascending: false })

    if (tracksError) {
      console.error('Error fetching tracks:', tracksError)
      return res.status(500).json({ error: 'Failed to fetch tracks' })
    }

    if (!tracks || tracks.length === 0) {
      return res.status(404).json({ error: 'No tracks found for this week' })
    }

    // Check if caption already exists and we're not regenerating
    if (!regenerate) {
      const { data: existingImages } = await supabase
        .from('images')
        .select('caption, hashtags, caption_style')
        .eq('week_start', week_start)
        .single()

      if (existingImages && existingImages.caption) {
        return res.status(200).json({
          success: true,
          caption: existingImages.caption,
          hashtags: existingImages.hashtags || [],
          style: existingImages.caption_style || style,
          method: 'existing',
          message: 'Using existing caption'
        })
      }
    }

    // Generate caption using JavaScript (production-ready)
    console.log('Generating caption with JavaScript...')
    const captionResult = generateCaptionJS(tracks, week_start, style)
    console.log('Caption result:', captionResult)

    // Update images table with caption
    const { error: updateError } = await supabase
      .from('images')
      .upsert({
        week_start: week_start,
        caption: captionResult.caption,
        hashtags: captionResult.hashtags,
        caption_style: captionResult.style,
        updated_at: new Date().toISOString()
      }, {
        on_conflict: 'week_start'
      })

    if (updateError) {
      console.error('Error updating caption:', updateError)
      return res.status(500).json({ error: 'Failed to save caption' })
    }

    res.status(200).json({
      success: true,
      caption: captionResult.caption,
      hashtags: captionResult.hashtags,
      style: captionResult.style,
      method: captionResult.method,
      character_count: captionResult.character_count,
      message: regenerate ? 'Caption regenerated successfully' : 'Caption generated successfully'
    })

  } catch (error) {
    console.error('Caption generation error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

function generateCaptionJS(tracks, week_start, style) {
  try {
    // Get top tracks (up to 3 for caption)
    const topTracks = tracks.slice(0, 3)
    
    // Generate caption based on style
    let caption = ''
    let hashtags = []
    
    switch (style) {
      case 'emoji_heavy':
        caption = generateEmojiHeavyCaption(topTracks, week_start)
        break
      case 'minimal':
        caption = generateMinimalCaption(topTracks, week_start)
        break
      case 'review_style':
        caption = generateReviewCaption(topTracks, week_start)
        break
      default: // balanced
        caption = generateBalancedCaption(topTracks, week_start)
    }
    
    // Generate hashtags
    hashtags = generateHashtags(tracks, week_start)
    
    return {
      success: true,
      caption: caption,
      hashtags: hashtags,
      style: style,
      method: 'javascript',
      character_count: caption.length,
      generated_at: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('JavaScript caption generation error:', error)
    return {
      success: false,
      error: 'Failed to generate caption',
      details: error.message
    }
  }
}

function generateEmojiHeavyCaption(tracks, week_start) {
  const artists = tracks.map(t => t.artist || 'Unknown').slice(0, 3)
  const artistsText = artists.join(', ')
  
  return `🎵 NEW MUSIC FRIDAY - Week of ${week_start} 🎵

🔥 This week's fire tracks from ${artistsText} and more! 🔥

💯 Fresh sounds hitting different! What's your favorite? 💯

#NewMusicFriday #FreshTracks #MusicDiscovery`
}

function generateMinimalCaption(tracks, week_start) {
  const artists = tracks.map(t => t.artist || 'Unknown').slice(0, 2)
  const artistsText = artists.join(' & ')
  
  return `New Music Friday - ${week_start}

Featuring ${artistsText} and more fresh tracks.

What are you listening to this week?`
}

function generateReviewCaption(tracks, week_start) {
  const topTrack = tracks[0] || {}
  const artist = topTrack.artist || 'Unknown Artist'
  const trackName = topTrack.name || 'Unknown Track'
  const genre = topTrack.genre || 'Unknown Genre'
  
  return `New Music Friday Review - ${week_start}

This week's standout: ${artist} delivers with "${trackName}" - a ${genre.toLowerCase()} track that showcases their signature style.

Plus more fresh releases from the week's top artists. Solid lineup overall.`
}

function generateBalancedCaption(tracks, week_start) {
  const artists = tracks.map(t => t.artist || 'Unknown').slice(0, 3)
  const artistsText = artists.join(', ')
  
  return `🎵 New Music Friday - ${week_start}

This week's highlights include fresh tracks from ${artistsText} and more!

Always excited to discover new sounds. What caught your ear? 🎧`
}

function generateHashtags(tracks, week_start) {
  const hashtags = [
    '#NewMusicFriday',
    '#MusicDiscovery',
    '#FreshTracks',
    '#NewMusic',
    '#MusicFriday'
  ]
  
  // Add genre-based hashtags
  const genres = tracks.map(t => (t.genre || '').toLowerCase())
  if (genres.some(g => g.includes('pop'))) hashtags.push('#PopMusic')
  if (genres.some(g => g.includes('hip') || g.includes('rap'))) hashtags.push('#HipHop')
  if (genres.some(g => g.includes('rock'))) hashtags.push('#RockMusic')
  if (genres.some(g => g.includes('electronic') || g.includes('edm'))) hashtags.push('#ElectronicMusic')
  if (genres.some(g => g.includes('alternative'))) hashtags.push('#AlternativeMusic')
  
  // Add year hashtag
  const year = week_start.split('-')[0]
  hashtags.push(`#${year}Music`)
  
  // Add mood-based hashtags
  const moods = tracks.map(t => (t.mood || '').toLowerCase())
  if (moods.some(m => m.includes('energetic'))) hashtags.push('#EnergeticVibes')
  if (moods.some(m => m.includes('upbeat'))) hashtags.push('#UpbeatTunes')
  if (moods.some(m => m.includes('melancholic'))) hashtags.push('#MelancholicSounds')
  
  return hashtags.slice(0, 12) // Limit to 12 hashtags
}
