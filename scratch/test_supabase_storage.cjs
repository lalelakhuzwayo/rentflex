const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

function loadEnv() {
    const envFiles = ['.env.production', '.env'];
    const envVars = {};
    for (const file of envFiles) {
        const fullPath = path.resolve(process.cwd(), file);
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            for (const line of content.split('\n')) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                    const firstEq = trimmed.indexOf('=');
                    const key = trimmed.slice(0, firstEq).trim();
                    const val = trimmed.slice(firstEq + 1).trim();
                    if (!envVars[key]) envVars[key] = val;
                }
            }
        }
    }
    return envVars;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://agqgrotwuvqnefqryoia.supabase.co';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection to:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorage() {
    console.log('--- Checking rentflex-files Bucket ---');
    const { data: files, error: filesError } = await supabase.storage.from('rentflex-files').list();
    console.log('List rentflex-files result:', { files: files ? files.length : null, error: filesError });

    // Test PNG image buffer upload
    const dummyImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const testFileName = `test_property_${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('rentflex-files')
        .upload(testFileName, dummyImageBuffer, { contentType: 'image/png', upsert: true });

    console.log('\n--- Image Upload Result ---', { uploadData, error: uploadError });

    if (!uploadError) {
        const { data: urlData } = supabase.storage.from('rentflex-files').getPublicUrl(testFileName);
        console.log('✨ Public Image URL generated successfully:', urlData.publicUrl);
    }
}

testStorage().catch(console.error);
