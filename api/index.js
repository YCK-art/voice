const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../src/landing')));

// 라우트 설정
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../src/landing/index.html'));
});

app.get('/api/service-info', (req, res) => {
  res.json({
    name: 'Voice Cursor Assistant',
    description: '음성으로 컴퓨터를 제어하는 AI 어시스턴트',
    features: [
      '음성 명령으로 앱 실행',
      'AI 기반 대화형 어시스턴트',
      '화면 내용 분석 및 답변',
      '전역 단축키 지원'
    ],
    version: '1.0.0'
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  console.log('로그인 시도:', email);
  
  res.json({
    success: true,
    message: '로그인 성공',
    user: { email, name: '사용자' }
  });
});

app.post('/api/register', (req, res) => {
  const { email, password, name } = req.body;
  console.log('회원가입 시도:', email, name);
  
  res.json({
    success: true,
    message: '회원가입 성공',
    user: { email, name }
  });
});

// Vercel 서버리스 함수로 export
module.exports = app; 