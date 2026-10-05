import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://algxqnswgizmngnykeou.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsZ3hxbnN3Z2l6bW5nbnlrZW91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNzcwNzUsImV4cCI6MjEwNjc1MzA3NX0.jx4THgaFaiWipdmq0utP7y8o0UvOLgSmT0gZogJlsxI';
export const supabase = createClient(supabaseUrl, supabaseKey);