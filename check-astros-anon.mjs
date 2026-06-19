import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ptuzewebbzvxlibtrvth.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0dXpld2ViYnp2eGxpYnRydnRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MzU3MjgsImV4cCI6MjA5NjIxMTcyOH0.ciRVLSWMQKNIb0-fLnqmP5_o3HKQRkSuM2zv4uRvSbw";

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabaseAnon.from('astrologers').select('id, name');
  if (error) {
    console.error("Error querying astrologers as anon:", error);
  } else {
    console.log(`Found ${data.length} astrologers in the database (via anon):`);
    console.log(data);
  }
}

check();
