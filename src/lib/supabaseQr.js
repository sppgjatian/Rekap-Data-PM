import { createClient } from '@supabase/supabase-js';

const supabaseUrlQr = 'https://exeawjvpprhbilrvpics.supabase.co';
const supabaseAnonKeyQr = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4ZWF3anZwcHJoYmlscnZwaWNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NDI4MTAsImV4cCI6MjEwODUxODgxMH0.16xdS15R7IRruuLOV26hYv2j8CjACrR42xstaQnoZAc';

export const supabaseQr = createClient(supabaseUrlQr, supabaseAnonKeyQr);
