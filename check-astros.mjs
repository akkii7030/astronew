import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ptuzewebbzvxlibtrvth.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0dXpld2ViYnp2eGxpYnRydnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDYzNTcyOCwiZXhwIjoyMDk2MjExNzI4fQ.m86Y05MwNRApIid1Aem2YDMW2eY7XHVg2j7oVsdGnGk";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabaseAdmin.from('astrologers').select('id, name');
  if (error) {
    console.error("Error querying astrologers:", error);
  } else {
    console.log(`Found ${data.length} astrologers in the database:`);
    console.log(data);
  }
}

check();
