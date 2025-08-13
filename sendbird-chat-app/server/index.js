import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

dotenv.config();

const app = express();
app.use(bodyParser.json({ limit: '2mb' }));

// 파일 저장 경로 설정 및 DB 초기화
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storageDir = path.join(__dirname, 'storage');
const recordingsDir = path.join(storageDir, 'recordings');
const dbFile = path.join(storageDir, 'db.json');

await fs.mkdir(recordingsDir, { recursive: true });

const defaultData = { callLogs: [], recordings: [] };
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, defaultData);
await db.read();
db.data ||= defaultData;

// 정적 제공 (녹음 파일)
app.use('/recordings', express.static(recordingsDir));

// 메모리 저장소(데모용). 실서비스에선 DB 사용
const callIdToChannel = new Map();

// 프론트에서 종료 시 보내는 콜 로그 수신
app.post('/api/call-logs', async (req, res) => {
  try {
    const log = req.body || {};
    if (log.callId && log.channelUrl) {
      callIdToChannel.set(log.callId, log.channelUrl);
    }
    const enriched = { ...log, createdAt: Date.now() };
    db.data.callLogs.push(enriched);
    await db.write();
    console.log('[call-log]', enriched);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

// (미사용 라우터 제거됨)

// ===== 대안 플로우: direct_call:end 수신 → Calls API 폴링으로 녹음 URL 조회 후 저장 =====

const APP_ID = process.env.SENDBIRD_APP_ID || process.env.VITE_SENDBIRD_APP_ID;
// Calls Server API v1 엔드포인트 (고정 포맷)
const CALLS_BASE = `https://api-${APP_ID}.calls.sendbird.com/v1`;

async function tryFetchRecordingUrl(callId) {
  const API_TOKEN = process.env.SENDBIRD_API_TOKEN || '';
  if (!CALLS_BASE || !API_TOKEN) return null;
  const url = `${CALLS_BASE}/direct_calls/${encodeURIComponent(callId)}`;
  try {
    const r = await fetch(url, { headers: { 'Api-Token': API_TOKEN } });
    if (!r.ok) {
      let msg = '';
      try { msg = await r.text(); } catch { }
      console.log('[poll] fetch', url, '->', r.status, msg?.slice(0, 300));
      return null;
    }
    const j = await r.json().catch(() => ({}));
    const raw = j?.cloud_recordings || j?.cloudRecording || j?.cloud_recording || [];
    const recs = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    if (!recs.length) {
      console.log('[poll] no cloud_recordings yet');
      return null;
    }
    const completed = recs.find((x) => {
      const s = (x?.status || x?.state || '').toLowerCase();
      return s === 'completed' || s === 'uploaded' || s === 'ready';
    });
    if (!completed) {
      console.log('[poll] cloud_recordings status:', recs.map((x) => x?.status || x?.state || 'unknown').join(', '));
      return null;
    }
    const loc = completed?.download_url || completed?.location || completed?.url;
    if (typeof loc === 'string' && loc.startsWith('http')) {
      console.log('[poll] found recording url', loc);
      return loc;
    }
    console.log('[poll] completed but no downloadable url');
    return null;
  } catch (e) {
    console.warn('[poll] error while fetching', e);
    return null;
  }
}

async function pollAndSaveRecording(callId, channelUrl) {
  const maxAttempts = Number(process.env.RECORDING_POLL_ATTEMPTS || 12); // ~2분 (10s * 12)
  const intervalMs = Number(process.env.RECORDING_POLL_INTERVAL_MS || 10000);
  for (let i = 1; i <= maxAttempts; i++) {
    console.log(`[poll] attempt ${i}/${maxAttempts} for callId=${callId}`);
    const recordingUrl = await tryFetchRecordingUrl(callId);
    if (recordingUrl) {
      // 기존 다운로드/저장/메시지 전송 로직 재사용
      try {
        const urlObj = new URL(recordingUrl);
        const ext = path.extname(urlObj.pathname) || '.mp3';
        const filename = `${callId}-${Date.now()}${ext}`;
        const filePath = path.join(recordingsDir, filename);
        const publicUrl = `/recordings/${filename}`;

        const r = await fetch(recordingUrl);
        if (!r.ok) {
          console.error('[poll] download failed', r.status, await r.text().catch(() => ''));
          return false;
        }
        const buf = Buffer.from(await r.arrayBuffer());
        await fs.writeFile(filePath, buf);
        console.log('[poll] saved', filePath, buf.length, 'bytes');

        // DB 기록 저장
        const rec = {
          callId,
          channelUrl,
          originalUrl: recordingUrl,
          localPath: filePath,
          publicUrl,
          size: buf.length,
          createdAt: Date.now(),
          via: 'poll',
        };
        db.data.recordings.push(rec);
        await db.write();

        // 채팅 메시지 전송
        const API_TOKEN = process.env.SENDBIRD_API_TOKEN; // Chat API 토큰
        const BASE = `https://api-${APP_ID}.sendbird.com/v3`;
        await fetch(`${BASE}/group_channels/${encodeURIComponent(channelUrl)}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf8', 'Api-Token': API_TOKEN || '' },
          body: JSON.stringify({
            message_type: 'MESG',
            user_id: 'system',
            message: '통화 녹음',
            custom_type: 'call_recording',
            data: JSON.stringify({ audioUrl: publicUrl }),
          }),
        }).catch(() => { });
        return true;
      } catch (e) {
        console.error('[poll] error while saving/posting', e);
        return false;
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  console.warn('[poll] giving up for callId', callId);
  return false;
}

function extractCallIdFromPayload(payload) {
  try {
    // 우선순위가 높은 예상 경로들
    const direct = payload?.direct_call || payload?.directCall || payload?.data?.direct_call || payload?.data?.directCall;
    const call = payload?.call || payload?.data?.call || payload?.payload?.call;
    const candidates = [
      payload?.call_id,
      payload?.callId,
      payload?.data?.call_id,
      payload?.data?.callId,
      direct?.call_id,
      direct?.callId,
      direct?.id,
      call?.call_id,
      call?.callId,
      call?.id,
    ].filter(Boolean);
    if (candidates.length > 0) return String(candidates[0]);

    // 마지막 수단: 키 이름에 call와 id가 포함된 값을 깊이 탐색
    const keysToMatch = ['call_id', 'callId', 'direct_call_id', 'directCallId'];
    const queue = [payload];
    while (queue.length) {
      const cur = queue.shift();
      if (cur && typeof cur === 'object') {
        for (const [k, v] of Object.entries(cur)) {
          if (typeof v === 'string' && /call.*id|id.*call/i.test(k)) return v;
          if (keysToMatch.includes(k) && typeof v === 'string') return v;
          if (v && typeof v === 'object') queue.push(v);
        }
      }
    }
  } catch { }
  return undefined;
}

app.post('/webhooks/calls/events', async (req, res) => {
  try {
    const payload = req.body || {};
    const event = payload?.event || payload?.category || payload?.type;
    const callId = extractCallIdFromPayload(payload);
    console.log('[calls-events] event=', event, 'callId=', callId);
    if (!callId) {
      console.warn('[calls-events] cannot extract callId from payload:', JSON.stringify(payload));
    }
    if (event === 'direct_call:end' && callId) {
      let channelUrl = callIdToChannel.get(callId);
      if (!channelUrl) {
        const last = [...db.data.callLogs].reverse().find((l) => l.callId === callId && l.channelUrl);
        if (last?.channelUrl) {
          channelUrl = last.channelUrl;
          callIdToChannel.set(callId, channelUrl);
        }
      }
      if (channelUrl) {
        pollAndSaveRecording(callId, channelUrl).catch(() => { });
      } else {
        console.warn('[calls-events] missing channelUrl for callId', callId);
      }
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});


