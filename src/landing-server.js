const express = require('express');
const cors = require('cors');
const path = require('path');

class LandingServer {
  constructor() {
    this.app = express();
    this.port = 3000;
    this.server = null;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'landing')));
  }

  setupRoutes() {
    // 메인 랜딩페이지
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'landing', 'index.html'));
    });

    // API 엔드포인트들
    this.app.post('/api/login', (req, res) => {
      const { email, password } = req.body;
      console.log('로그인 시도:', email);
      
      // 여기에 실제 로그인 로직을 구현할 수 있습니다
      // 현재는 간단한 응답만 반환
      res.json({
        success: true,
        message: '로그인 성공',
        user: { email, name: '사용자' }
      });
    });

    this.app.post('/api/register', (req, res) => {
      const { email, password, name } = req.body;
      console.log('회원가입 시도:', email, name);
      
      // 여기에 실제 회원가입 로직을 구현할 수 있습니다
      res.json({
        success: true,
        message: '회원가입 성공',
        user: { email, name }
      });
    });

    // 서비스 정보
    this.app.get('/api/service-info', (req, res) => {
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
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`랜딩페이지 서버가 http://localhost:${this.port} 에서 실행 중입니다`);
        resolve();
      });

      this.server.on('error', (error) => {
        console.error('랜딩페이지 서버 시작 실패:', error);
        reject(error);
      });
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log('랜딩페이지 서버가 종료되었습니다');
    }
  }

  getUrl() {
    return `http://localhost:${this.port}`;
  }
}

module.exports = LandingServer; 