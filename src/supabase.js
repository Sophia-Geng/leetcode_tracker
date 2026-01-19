import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kcrgrdlcsyimiguirwyo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjcmdyZGxjc3lpbWlndWlyd3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NTcyNjksImV4cCI6MjA4NDQzMzI2OX0.-7QWt4mawDvvw4vs1lAH4CLeYiuDKbzz6NbQu6ikdKA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
