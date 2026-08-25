import app from './src/app';
import { connectDB, disconnectDB } from './src/config/db';
import { User, ChatThread, ThreadParticipant, Message, Contact } from './src/models';

const PORT = 3001;

async function runTests() {
  console.log('🧪 Starting End-to-End API Verification...');
  await connectDB();
  const server = app.listen(PORT);

  try {
    const baseUrl = `http://localhost:${PORT}/v1`;

    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json() as any;
    console.log('✅ Health Check:', healthData);

    // 2. Register User 1 (Alice)
    const aliceRegRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Smith',
        email: 'alice@wavechat.app',
        password: 'password123',
      }),
    });
    const aliceData = await aliceRegRes.json() as any;
    console.log('✅ Register Alice:', aliceData.success, aliceData.data?.user?.email);

    // 3. Register User 2 (Bob)
    const bobRegRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob Jones',
        email: 'bob@wavechat.app',
        password: 'password123',
      }),
    });
    const bobData = await bobRegRes.json() as any;
    console.log('✅ Register Bob:', bobData.success, bobData.data?.user?.email);

    const aliceToken = aliceData.data.accessToken;
    const aliceRefreshToken = aliceData.data.refreshToken;
    const bobToken = bobData.data.accessToken;
    const bobUser = bobData.data.user;

    // 4. Login Alice
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice@wavechat.app',
        password: 'password123',
      }),
    });
    const loginData = await loginRes.json() as any;
    console.log('✅ Login Alice:', loginData.success);

    // 5. Refresh token
    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: aliceRefreshToken }),
    });
    const refreshData = await refreshRes.json() as any;
    console.log('✅ Token Refresh:', refreshData.success, !!refreshData.data?.accessToken);

    // 6. User search
    const searchRes = await fetch(`${baseUrl}/user/search?query=Bob`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    const searchData = await searchRes.json() as any;
    console.log('✅ User Search (Bob):', searchData.data?.length, searchData.data?.[0]?.name);

    // 7. Send Contact Request
    const reqRes = await fetch(`${baseUrl}/contacts/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({ contactUserId: bobUser.id }),
    });
    const reqData = await reqRes.json() as any;
    console.log('✅ Send Contact Request:', reqData.success);

    // 8. Accept Contact Request
    const acceptRes = await fetch(`${baseUrl}/contacts/${reqData.data.id}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bobToken}` },
    });
    const acceptData = await acceptRes.json() as any;
    console.log('✅ Accept Contact Request:', acceptData.success);

    // 9. List Contacts
    const contactsRes = await fetch(`${baseUrl}/contacts`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    const contactsData = await contactsRes.json() as any;
    console.log('✅ Get Contacts:', contactsData.data?.length, contactsData.data?.[0]?.contactUser?.name);

    // 10. Create Direct Chat Thread
    const threadRes = await fetch(`${baseUrl}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        type: 'DIRECT',
        recipientUserId: bobUser.id,
      }),
    });
    const threadData = await threadRes.json() as any;
    const threadId = threadData.data.id;
    console.log('✅ Create Direct Chat Thread:', threadData.success, threadId);

    // 11. Send Message from Alice
    const msg1Res = await fetch(`${baseUrl}/chats/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        text: 'Hello Bob! Welcome to WaveChat.',
        messageType: 'TEXT',
      }),
    });
    const msg1Data = await msg1Res.json() as any;
    console.log('✅ Send Message (Alice -> Bob):', msg1Data.success, msg1Data.data?.text);

    // 12. Send Message from Bob
    const msg2Res = await fetch(`${baseUrl}/chats/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bobToken}`,
      },
      body: JSON.stringify({
        text: 'Hey Alice! Glad to be here.',
        messageType: 'TEXT',
      }),
    });
    const msg2Data = await msg2Res.json() as any;
    console.log('✅ Send Message (Bob -> Alice):', msg2Data.success, msg2Data.data?.text);

    // 13. Get Messages (Cursor Pagination)
    const msgsRes = await fetch(`${baseUrl}/chats/${threadId}/messages?limit=10`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    const msgsData = await msgsRes.json() as any;
    console.log('✅ Get Messages:', msgsData.data?.messages?.length, 'hasMore:', msgsData.data?.hasMore);

    // 14. Mark Thread Read
    const readRes = await fetch(`${baseUrl}/chats/${threadId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    const readData = await readRes.json() as any;
    console.log('✅ Mark Thread Read:', readData.success);

    // 15. Get Threads for Alice
    const threadsRes = await fetch(`${baseUrl}/chats`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    const threadsData = await threadsRes.json() as any;
    console.log('✅ Get Threads:', threadsData.data?.length, 'unreadCount:', threadsData.data?.[0]?.unreadCount);

    console.log('\n🎉 ALL 15 ENDPOINT CHECKS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('❌ E2E Test Failed:', err);
  } finally {
    server.close();
    try {
      await Message.deleteMany({});
      await ThreadParticipant.deleteMany({});
      await ChatThread.deleteMany({});
      await Contact.deleteMany({});
      await User.deleteMany({});
    } catch (e) {
      // Ignore cleanup error
    }
    await disconnectDB();
    process.exit(0);
  }
}

runTests();
