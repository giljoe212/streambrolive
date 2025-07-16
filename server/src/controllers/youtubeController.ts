import { Request, Response } from 'express';
import { google } from 'googleapis';
import db from '../db/database';

// Konfigurasi Klien OAuth 2.0
// PENTING: Ganti dengan kredensial Anda dari Google Cloud Console
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,      // Client ID
  process.env.GOOGLE_CLIENT_SECRET,  // Client Secret
  process.env.GOOGLE_REDIRECT_URI    // Redirect URI (e.g., http://localhost:3001/api/youtube/callback)
);

// Fungsi untuk memulai proses otentikasi
export const getAuthUrl = (req: Request, res: Response) => {
  const scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly'
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    // Simpan userId di state untuk mengambilnya kembali di callback
    state: req.query.userId as string,
  });

  res.json({ success: true, url });
};

// Fungsi untuk menangani callback dari Google
export const handleAuthCallback = async (req: Request, res: Response) => {
  const { code, state: userId } = req.query;

  if (!code || !userId) {
    return res.status(400).send('Callback tidak valid.');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // Simpan token ke database yang terkait dengan userId
    db.prepare(
      'INSERT OR REPLACE INTO user_tokens (user_id, provider, access_token, refresh_token, expiry_date) VALUES (?, ?, ?, ?, ?)'
    ).run(
      userId,
      'youtube',
      tokens.access_token,
      tokens.refresh_token,
      tokens.expiry_date
    );

    // Arahkan pengguna kembali ke halaman stream atau halaman sukses
    res.redirect('http://localhost:3000/streams?auth=success');

  } catch (error) {
    console.error('Error saat mendapatkan token:', error);
    res.status(500).redirect('http://localhost:3000/streams?auth=error');
  }
};

// Fungsi untuk membuat siaran langsung di YouTube
export const createLiveStream = async (req: Request, res: Response) => {
  const { userId, title, description } = req.body;

  if (!userId || !title) {
    return res.status(400).json({ success: false, error: 'User ID dan judul diperlukan' });
  }

  try {
    // 1. Ambil token dari database
    const tokenRow = db.prepare('SELECT * FROM user_tokens WHERE user_id = ? AND provider = ?').get(userId, 'youtube');
    if (!tokenRow) {
      return res.status(401).json({ success: false, error: 'Pengguna belum terhubung ke YouTube' });
    }

    // 2. Buat klien OAuth2 yang sudah terotentikasi
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    client.setCredentials({
      access_token: tokenRow.access_token,
      refresh_token: tokenRow.refresh_token,
      expiry_date: tokenRow.expiry_date,
    });

    const youtube = google.youtube({ version: 'v3', auth: client });

    // 3. Buat Live Broadcast (Acara Siaran)
    const broadcastResponse = await youtube.liveBroadcasts.insert({
      part: ['id', 'snippet', 'contentDetails', 'status'],
      requestBody: {
        snippet: {
          title: title,
          description: description || '',
          scheduledStartTime: new Date().toISOString(),
        },
        contentDetails: {
          enableAutoStart: true,
          enableAutoStop: true,
          monitorStream: {
            enableMonitorStream: true,
          },
        },
        status: {
          privacyStatus: 'public', // atau 'private', 'unlisted'
        },
      },
    });

    const broadcastId = broadcastResponse.data.id;

    // 4. Buat Live Stream (Sumber Video)
    const streamResponse = await youtube.liveStreams.insert({
      part: ['id', 'snippet', 'cdn'],
      requestBody: {
        snippet: {
          title: title,
        },
        cdn: {
          frameRate: 'variable',
          ingestionType: 'rtmp',
          resolution: 'variable',
        },
      },
    });

    const streamId = streamResponse.data.id;
    const ingestionInfo = streamResponse.data.cdn?.ingestionInfo;

    // 5. Hubungkan Broadcast ke Stream
    await youtube.liveBroadcasts.bind({
      part: ['id', 'snippet', 'contentDetails', 'status'],
      id: broadcastId as string,
      streamId: streamId as string,
    });

    res.json({
      success: true,
      message: 'Siaran langsung YouTube berhasil dibuat!',
      data: {
        broadcastId,
        streamId,
        rtmpUrl: ingestionInfo?.ingestionAddress,
        streamKey: ingestionInfo?.streamName,
        youtubeUrl: `https://www.youtube.com/watch?v=${broadcastId}`
      },
    });

  } catch (error: any) {
    console.error('Gagal membuat siaran langsung YouTube:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Gagal membuat siaran langsung di YouTube' });
  }
};
