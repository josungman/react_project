const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// DB 연결 풀 생성
const createConnectionPool = (dbConfig) => {
  return mysql.createPool({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
};

// DB 연결 상태 확인
app.get('/api/db/health', async (req, res) => {
  try {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '3306',
      database: process.env.DB_NAME || 'channeltalk_db',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    };

    const pool = createConnectionPool(dbConfig);
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    res.json({ success: true, message: 'DB 연결 성공' });
  } catch (error) {
    console.error('DB 연결 실패:', error);
    res.status(500).json({ success: false, error: 'DB 연결 실패' });
  }
});

// 오늘 날짜의 태그 데이터 가져오기
app.post('/api/db/tags/today', async (req, res) => {
  try {
    const { date, dbConfig } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, error: '날짜가 필요합니다.' });
    }

    const pool = createConnectionPool(dbConfig);
    const connection = await pool.getConnection();

    // SQL 쿼리 실행
    const [rows] = await connection.execute(`
      SELECT 
        tag_name,
        COUNT(*) as count
      FROM channel_talk_messages 
      WHERE DATE(created_at) = ?
      GROUP BY tag_name
      ORDER BY count DESC
    `, [date]);

    connection.release();

    // 결과를 프론트엔드에서 기대하는 형식으로 변환
    const tagData = {};
    rows.forEach(row => {
      tagData[row.tag_name] = row.count.toString();
    });

    res.json(tagData);
  } catch (error) {
    console.error('태그 데이터 조회 실패:', error);
    res.status(500).json({ success: false, error: '데이터 조회 실패' });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});

module.exports = app; 