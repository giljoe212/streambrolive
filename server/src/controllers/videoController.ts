import { Request, Response } from 'express';
import db, { initializeDatabase } from '../db/database';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from '@ffprobe-installer/ffprobe';

// Set path untuk ffmpeg dan ffprobe
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}
if (ffprobePath) {
  ffmpeg.setFfprobePath(ffprobePath.path);
}

export const uploadVideo = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Tidak ada file yang diupload' });
    }

    const { title, description, userId } = req.body;
    
    // Simpan info video ke database
    const stmt = db.prepare(`
      INSERT INTO videos 
      (user_id, title, description, filename, filepath, filesize, format, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const videoInfo = {
      userId,
      title: title || req.file.originalname,
      description: description || '',
      filename: req.file.filename,
      filepath: path.join('uploads', 'videos', req.file.filename).replace(/\\/g, '/'),
      filesize: req.file.size,
      format: req.file.mimetype,
      status: 'uploaded'
    };

    const result = stmt.run(
      videoInfo.userId,
      videoInfo.title,
      videoInfo.description,
      videoInfo.filename,
      videoInfo.filepath,
      videoInfo.filesize,
      videoInfo.format,
      videoInfo.status
    );

    // Konversi lastInsertRowid ke number jika berupa bigint
    const videoId = Number(result.lastInsertRowid);
    
    // Jalankan proses background
    processVideo(videoId);

    // Ambil data video yang baru dibuat untuk dikirim kembali ke frontend
    const newVideo = db.prepare('SELECT * FROM videos WHERE id = ?').get(videoId);

    res.json({ 
      success: true, 
      message: 'Video berhasil diupload dan sedang diproses.',
      data: newVideo
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Gagal mengupload video' });
  }
};



export const deleteVideo = (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Dapatkan path file video dan thumbnail sebelum menghapus dari DB
    const video = db.prepare('SELECT filepath, thumbnail_path FROM videos WHERE id = ?').get(id);

    if (video) {
      // Hapus file video dari sistem file
      if (video.filepath && fs.existsSync(video.filepath)) {
        fs.unlinkSync(video.filepath);
        console.log(`Deleted video file: ${video.filepath}`);
      }
      
      // Hapus file thumbnail dari sistem file
      if (video.thumbnail_path) {
        const absoluteThumbnailPath = path.join(process.cwd(), video.thumbnail_path);
        console.log(`[DELETE_VIDEO] Attempting to delete thumbnail at: ${absoluteThumbnailPath}`);
        if (fs.existsSync(absoluteThumbnailPath)) {
          fs.unlinkSync(absoluteThumbnailPath);
          console.log(`[DELETE_VIDEO] Successfully deleted thumbnail file: ${absoluteThumbnailPath}`);
        } else {
          console.log(`[DELETE_VIDEO] Thumbnail file not found at: ${absoluteThumbnailPath}`);
        }
      }
    }

    // Hapus record dari database
    const result = db.prepare('DELETE FROM videos WHERE id = ?').run(id);

    if (result.changes > 0) {
      res.json({ success: true, message: 'Video berhasil dihapus' });
    } else {
      res.status(404).json({ success: false, error: 'Video tidak ditemukan' });
    }
  } catch (error) {
    console.error(`Error deleting video ${id}:`, error);
    res.status(500).json({ success: false, error: 'Gagal menghapus video' });
  }
};

export const getVideos = (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const stmt = db.prepare(`
      SELECT 
        id, user_id, title, description, filename, filepath, filesize, duration, format, thumbnail_path, status, created_at, updated_at
      FROM videos 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `);
    const videos = stmt.all(userId);

    // Pastikan semua properti yang dibutuhkan ada
    const formattedVideos = videos.map(video => ({
      id: video.id,
      title: video.title,
      description: video.description,
      filename: video.filename,
      filepath: video.filepath, // Pastikan ini ada
      filesize: video.filesize,
      duration: video.duration,
      thumbnail: video.thumbnail_path, // Ganti nama menjadi thumbnail
      thumbnail_path: video.thumbnail_path, // Sertakan juga untuk konsistensi
      status: video.status,
      created_at: video.created_at
    }));

    console.log('[GET_VIDEOS] Sending videos to frontend:', JSON.stringify(formattedVideos, null, 2));

    res.json({ success: true, data: formattedVideos });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ success: false, error: 'Gagal mengambil daftar video' });
  }
};

// Fungsi untuk memproses video di background (thumbnail, metadata, dll)
async function processVideo(videoId: number) {
  const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(videoId);
  if (!video) {
    console.error(`Video dengan ID ${videoId} tidak ditemukan untuk diproses.`);
    return;
  }

  try {
    // 1. Generate thumbnail
    const thumbnailName = `thumbnail-${path.basename(video.filename, path.extname(video.filename))}.jpg`;
    const thumbnailDir = path.join(process.cwd(), 'uploads', 'thumbnails');
    const absoluteThumbnailPath = path.join(thumbnailDir, thumbnailName);
    const dbThumbnailPath = path.join('uploads', 'thumbnails', thumbnailName).replace(/\\/g, '/');

    // Pastikan direktori ada
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }

    await new Promise<void>((resolve, reject) => {
      ffmpeg(video.filepath)
        .on('end', () => {
          console.log(`Thumbnail generated for video ${videoId} at ${absoluteThumbnailPath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`Error generating thumbnail for ${videoId}:`, err);
          reject(err);
        })
        .screenshots({
          count: 1,
          folder: thumbnailDir,
          filename: thumbnailName,
          size: '320x180'
        });
    });

    // 2. Get video duration
    const metadata = await new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
      ffmpeg.ffprobe(video.filepath, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
    const duration = metadata?.format?.duration ?? 0;

    // 3. Update database with URL-friendly thumbnail path, duration, and status
    db.prepare(
      'UPDATE videos SET status = ?, thumbnail_path = ?, duration = ? WHERE id = ?'
    ).run('processed', dbThumbnailPath, Math.round(duration), videoId);

    console.log(`[PROCESS_VIDEO] Video ${videoId} processed. Duration: ${duration}s. Updating DB with thumbnail_path: ${dbThumbnailPath}`);

  } catch (error) {
    console.error(`Gagal memproses video ${videoId}:`, error);
    db.prepare('UPDATE videos SET status = ? WHERE id = ?').run('failed', videoId);
  }
}
