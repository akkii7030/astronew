import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ptuzewebbzvxlibtrvth.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0dXpld2ViYnp2eGxpYnRydnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDYzNTcyOCwiZXhwIjoyMDk2MjExNzI4fQ.m86Y05MwNRApIid1Aem2YDMW2eY7XHVg2j7oVsdGnGk";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixDuplicates() {
  // We delete all astrologers that DO NOT have a firebase_uid
  // Since the seeder only linked the first 4, the duplicates will have a null firebase_uid
  const { data, error } = await supabaseAdmin
    .from("astrologers")
    .delete()
    .is("firebase_uid", null)
    .select("name");

  if (error) {
    console.error("Error deleting duplicates:", error);
  } else {
    console.log(`Deleted ${data.length} duplicate astrologers:`, data.map(d => d.name));
  }
}

fixDuplicates();
