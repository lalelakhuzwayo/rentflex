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
    console.log('--- Listing Storage Buckets ---');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    console.log('List buckets result:', { buckets, error: listError });

    console.log('\n--- Checking rentflex-files Bucket ---');
    const { data: files, error: filesError } = await supabase.storage.from('rentflex-files').list();
    console.log('List rentflex-files result:', { files: files ? files.length : null, error: filesError });

    // Test buffer upload
    const dummyBuffer = Buffer.from('test image data');
    const testFileName = `test_${Date.now()}.txt`;
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('rentflex-files')
        .upload(testFileName, dummyBuffer, { contentType: 'text/plain', upsert: true });

    console.log('\n--- Test Upload Result ---', { uploadData, error: uploadError });

    if (!uploadError) {
        const { data: urlData } = supabase.storage.from('rentflex-files').getPublicUrl(testFileName);
        console.log('Public URL generated:', urlData.publicUrl);
    }
}

testStorage().catch(console.error);
