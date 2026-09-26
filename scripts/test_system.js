const http = require('http');

async function runTests() {
  console.log('=== STARTING SYSTEM INTEGRATION TESTS ===\n');

  // Helper
  async function request(url, options = {}) {
    const res = await fetch('http://localhost:3000' + url, options);
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch (e) { json = text; }
    return { status: res.status, ok: res.ok, data: json };
  }

  // Test 1: Public Countdown
  console.log('Test 1: GET /api/countdown');
  const cdRes = await request('/api/countdown');
  console.log('Status:', cdRes.status, 'Title:', cdRes.data?.countdown?.title);
  if (!cdRes.ok) throw new Error('Countdown GET failed');

  // Test 2: Contact Form to Discord Webhook
  console.log('\nTest 2: POST /api/contact (Discord Webhook)');
  const contactRes = await request('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'System Verification Bot',
      email: 'verify@octadevs.com',
      project: 'Automated integration test for Discord Webhook and Octa Devs lead notification.'
    })
  });
  console.log('Status:', contactRes.status, 'Response:', contactRes.data);
  if (!contactRes.ok || !contactRes.data?.success) throw new Error('Contact webhook failed');

  // Test 3: Admin Login with incorrect password
  console.log('\nTest 3: POST /api/admin/login (Wrong Password)');
  const badLogin = await request('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'wrongpassword' })
  });
  console.log('Status (expected 401):', badLogin.status);
  if (badLogin.status !== 401) throw new Error('Expected 401 for wrong password');

  // Test 4: Admin Login with correct password
  console.log('\nTest 4: POST /api/admin/login (Correct Password admin00)');
  const goodLogin = await request('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'admin00' })
  });
  console.log('Status:', goodLogin.status, 'Token received:', !!goodLogin.data?.token);
  if (!goodLogin.ok || !goodLogin.data?.token) throw new Error('Admin login failed');
  const token = goodLogin.data.token;

  // Test 5: Verify Token
  console.log('\nTest 5: GET /api/admin/verify');
  const verifyRes = await request('/api/admin/verify', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Status:', verifyRes.status, 'Valid:', verifyRes.data?.success);
  if (!verifyRes.data?.success) throw new Error('Token verification failed');

  // Test 6: Update Launch Countdown
  console.log('\nTest 6: POST /api/admin/countdown');
  const futureDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
  const updateCd = await request('/api/admin/countdown', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Octa Devs 2.0 Global Launch',
      subtitle: 'Designing and building world-class digital products.',
      target_date: futureDate,
      is_active: true
    })
  });
  console.log('Status:', updateCd.status, 'Updated title:', updateCd.data?.countdown?.title);
  if (!updateCd.ok) throw new Error('Update countdown failed');

  // Test 7: Team Members CRUD
  console.log('\nTest 7: Team Members CRUD');
  // Create
  const createMember = await request('/api/admin/team', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Rohan Mehta',
      role: 'Head of Mobile Engineering',
      bio: 'iOS & React Native specialist with 8+ years building fintech applications.',
      avatar_url: '',
      sort_order: 3,
      socials: { github: 'https://github.com', linkedin: 'https://linkedin.com' }
    })
  });
  console.log('Member created:', createMember.data?.member?.id);
  const memberId = createMember.data?.member?.id;

  // Read
  const teamList = await request('/api/team');
  console.log('Team count:', teamList.data?.team?.length);

  // Update
  const updateMember = await request(`/api/admin/team/${encodeURIComponent(memberId)}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      bio: 'Senior iOS & Flutter architect focused on smooth animations and robust offline systems.'
    })
  });
  console.log('Member updated bio:', updateMember.data?.member?.bio?.slice(0, 30));

  // Delete test member
  const delMember = await request(`/api/admin/team/${encodeURIComponent(memberId)}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Member deleted:', delMember.data?.success);

  // Test 8: Projects CRUD
  console.log('\nTest 8: Projects CRUD');
  // Create
  const createProj = await request('/api/admin/projects', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Apex Financial App',
      category: 'Fintech Mobile App',
      description: 'High-speed trading and crypto portfolio manager for iOS & Android.',
      image_url: './framer_assets/BMKOu79jBtM2GOCccyl1NoizDoU.png',
      project_url: 'https://octadevs.com',
      status: 'Coming Soon',
      sort_order: 1
    })
  });
  console.log('Project created:', createProj.data?.project?.id, createProj.data?.project?.title);
  const projId = createProj.data?.project?.id;

  // Read
  const projList = await request('/api/projects');
  console.log('Projects count:', projList.data?.projects?.length);

  // Stats
  console.log('\nTest 9: Admin Stats');
  const statsRes = await request('/api/admin/stats', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Stats:', statsRes.data?.stats);

  console.log('\n=== ALL API TESTS PASSED SUCCESSFULLY! ===\n');
}

runTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
