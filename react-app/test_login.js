import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pljpcybyafphlgleuyyj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsanBjeWJ5YWZwaGxnbGV1eXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTkxNTAsImV4cCI6MjA5Mzg5NTE1MH0.to_KG4vEzd7AOdAzLfF_22ckI42I3xq5ykqj9gWK80Y';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLogin(code) {
  console.log(`Testing viewer code: ${code}`);
  
  // 1. Validate code via RPC
  const { data: isValid, error: rpcError } = await supabase.rpc('validate_viewer_code', {
    input_code: code,
  });

  if (rpcError) {
    console.error('RPC Error:', rpcError);
    return;
  }
  
  if (!isValid) {
    console.log('Invalid or expired code');
    return;
  }

  console.log('Code is valid! Signing in as viewer user...');

  // 2. Sign in as viewer user
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'viewer@diary.app',
    password: 'viewer-internal-9x7k2m',
  });

  if (error) {
    console.error('Sign-in failed:', error.message);
  } else {
    console.log('Successfully signed in as viewer!', data.user.email);
  }
}

testLogin('280906');
