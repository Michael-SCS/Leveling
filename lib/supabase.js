import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hedspjjldznbkhnmdxyh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlZHNwampsZHpuYmtobm1keHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDk0NDAsImV4cCI6MjA3OTY4NTQ0MH0.oLmHUbrPzLOwm9uO14r1x9ShoX9HEli6EhidDoPxGZg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})