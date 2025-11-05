import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Simple security check - you might want to add proper auth
    const { secret } = req.body;
    if (secret !== process.env.MIGRATION_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // SQL migration to add columns
        const migrationSQL = `
            ALTER TABLE images 
            ADD COLUMN IF NOT EXISTS preferred_track_id BIGINT,
            ADD COLUMN IF NOT EXISTS preferred_track_name TEXT,
            ADD COLUMN IF NOT EXISTS preferred_track_image TEXT,
            ADD COLUMN IF NOT EXISTS tracklist_title TEXT;
        `;

        // Execute via Supabase RPC or direct SQL
        // Note: Supabase JS client doesn't support raw SQL directly
        // This would need to be run via Supabase dashboard or psql
        // For now, we'll just verify the columns exist
        
        const { data: sample, error } = await supabase
            .from('images')
            .select('*')
            .limit(1);

        if (error) {
            return res.status(500).json({ 
                error: 'Failed to check table structure',
                details: error.message 
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Migration SQL ready. Please run it in Supabase SQL Editor:',
            sql: migrationSQL,
            current_columns: sample && sample.length > 0 ? Object.keys(sample[0]) : [],
            note: 'Run the SQL above in your Supabase dashboard SQL Editor to apply the migration.'
        });

    } catch (error) {
        console.error('Migration check error:', error);
        return res.status(500).json({ 
            error: 'Failed to check migration',
            details: error.message 
        });
    }
}

