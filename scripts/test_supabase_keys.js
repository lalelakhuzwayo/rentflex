import { createClient } from '@supabase/supabase-js';

const url = 'https://agqgrotwuvqnefqryoia.supabase.co';

const anonKeyJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFncWdyb3R3dXZxbmVmcXJ5b2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNzQ3NTAsImV4cCI6MjEwMzk1MDc1MH0.VOasOykrxDANPQi2npYNh3WGT4DYW6F6bv889o4oyGc';
const publishableKey = 'sb_publishable_Yp_SGfZiikwmkB0xPH0GVg_MqKO-Bfz';

async function testKey(name, key) {
    console.log(`--- Testing ${name} ---`);
    const supabase = createClient(url, key);
    try {
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (error) {
            console.log(`${name} Error:`, error.message, error.code, error.details);
        } else {
            console.log(`${name} SUCCESS! Profiles count response received.`);
        }
    } catch (e) {
        console.log(`${name} Exception:`, e.message);
    }
}

async function main() {
    await testKey('JWT Anon Key', anonKeyJWT);
    await testKey('Publishable Key', publishableKey);
}

main();
