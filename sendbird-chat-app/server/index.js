import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(bodyParser.json({ limit: '2mb' }));

// 메모리 저장소(데모용). 실서비스에선 DB 사용
const callIdToChannel = new Map();

// 프론트에서 종료 시 보내는 콜 로그 수신
app.post('/api/call-logs', async (req, res) => {
  try {
    const log = req.body || {};
    if (log.callId && log.channelUrl) {
      callIdToChannel.set(log.callId, log.channelUrl);
    }
    console.log('[call-log]', log);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

// Sendbird Calls 녹음 완료 Webhook 엔드포인트 (대시보드에 등록)
app.post('/webhooks/calls/recording', async (req, res) => {
  try {
    const payload = req.body || {};
    // 샘플: payload.recordings[0].location(url), call.call_id 등
    const callId = payload?.call?.call_id || payload?.call_id || payload?.callId;
    const recordingUrl = payload?.recordings?.[0]?.location || payload?.recording_url;
    if (!callId || !recordingUrl) {
      console.warn('Webhook payload insufficient', payload);
      return res.status(200).json({ ok: true });
    }

    // callId → channelUrl 매핑 조회
    const channelUrl = callIdToChannel.get(callId);
    if (!channelUrl) {
      console.warn('No channel mapping for callId', callId);
      return res.status(200).json({ ok: true });
    }

    // 보안을 위해 여기서 pre-signed URL을 생성하는 것이 이상적
    // 데모에서는 원본 URL 그대로 사용
    const audioUrl = recordingUrl;

    // Sendbird Chat Platform API로 메시지 전송
    const APP_ID = process.env.VITE_SENDBIRD_APP_ID || process.env.SENDBIRD_APP_ID;
    const API_TOKEN = process.env.SENDBIRD_API_TOKEN; // Dashboard > Application > API Tokens
    const BASE = `https://api-${APP_ID}.sendbird.com/v3`;

    const resp = await fetch(`${BASE}/group_channels/${encodeURIComponent(channelUrl)}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf8',
        'Api-Token': API_TOKEN || '',
      },
      body: JSON.stringify({
        message_type: 'MESG',
        user_id: 'system',
        message: '통화 녹음',
        custom_type: 'call_recording',
        data: JSON.stringify({ audioUrl }),
      }),
    });
    const json = await resp.json();
    console.log('posted recording message:', json?.message_id);
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


