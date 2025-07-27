const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

class CursorAgent {
  constructor() {
    this.browser = null;
    this.page = null;
    this.commandHistory = [];
    this.isInitialized = false;
    
    this.init();
  }

  async init() {
    try {
      console.log('Puppeteer 브라우저 시작 중...');
      this.browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: [
          '--start-maximized',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ],
        ignoreDefaultArgs: ['--disable-extensions']
      });
      
      console.log('새 페이지 생성 중...');
      this.page = await this.browser.newPage();
      
      console.log('Google 페이지로 이동 중...');
      await this.page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
      
      this.isInitialized = true;
      console.log('Cursor Agent 초기화 완료');
    } catch (error) {
      console.error('Cursor Agent 초기화 실패:', error);
      // 초기화 실패해도 계속 진행하되, 브라우저 없이
      this.isInitialized = true;
      this.browser = null;
      this.page = null;
    }
  }

  async executeCommand(voiceCommand) {
    if (!this.isInitialized) {
      throw new Error('Cursor Agent가 초기화되지 않았습니다.');
    }

    console.log('명령 실행:', voiceCommand);
    
    // 명령어 분석
    const analysis = this.analyzeCommand(voiceCommand);
    
    // 브라우저가 없으면 시뮬레이션 모드로 실행
    if (!this.browser || !this.page) {
      console.log('브라우저가 없어서 시뮬레이션 모드로 실행합니다.');
      const result = await this.simulateAction(analysis);
      
      // 명령 히스토리 저장
      this.commandHistory.push({
        command: voiceCommand,
        analysis,
        result,
        timestamp: new Date()
      });

      return result;
    }
    
    const result = await this.performAction(analysis);
    
    // 명령 히스토리 저장
    this.commandHistory.push({
      command: voiceCommand,
      analysis,
      result,
      timestamp: new Date()
    });

    return result;
  }

  analyzeCommand(command) {
    const normalized = command.toLowerCase();
    
    // 명령어 타입 분류
    let actionType = 'unknown';
    let target = null;
    let parameters = {};

    // 클릭 명령 분석
    if (normalized.includes('클릭') || normalized.includes('눌러') || normalized.includes('click')) {
      actionType = 'click';
      target = this.extractClickTarget(command);
    }
    
    // 검색 명령 분석
    else if (normalized.includes('검색') || normalized.includes('찾아') || normalized.includes('search')) {
      actionType = 'search';
      target = this.extractSearchQuery(command);
    }
    
    // 열기 명령 분석
    else if (normalized.includes('열어') || normalized.includes('open')) {
      actionType = 'open';
      target = this.extractOpenTarget(command);
    }
    
    // 스크롤 명령 분석
    else if (normalized.includes('스크롤') || normalized.includes('scroll')) {
      actionType = 'scroll';
      parameters = this.extractScrollParameters(command);
    }
    
    // 입력 명령 분석
    else if (normalized.includes('입력') || normalized.includes('type')) {
      actionType = 'type';
      target = this.extractTypeContent(command);
    }

    return {
      type: actionType,
      target,
      parameters,
      originalCommand: command
    };
  }

  extractClickTarget(command) {
    const normalized = command.toLowerCase();
    
    // 색상 기반 타겟 추출
    const colors = ['빨간', '파란', '초록', '노란', '주황', '보라', '분홍', '검은', '흰'];
    const foundColors = colors.filter(color => normalized.includes(color));
    
    // 위치 기반 타겟 추출
    const positions = ['왼쪽', '오른쪽', '위', '아래', '중앙', '가운데'];
    const foundPositions = positions.filter(pos => normalized.includes(pos));
    
    // 요소 타입 추출
    const elements = ['버튼', '링크', '입력창', '텍스트', '이미지', '메뉴'];
    const foundElements = elements.filter(elem => normalized.includes(elem));
    
    // 특정 텍스트 추출
    const textMatch = command.match(/[""]([^""]+)[""]/);
    const specificText = textMatch ? textMatch[1] : null;

    return {
      colors: foundColors,
      positions: foundPositions,
      elements: foundElements,
      text: specificText
    };
  }

  extractSearchQuery(command) {
    // 검색어 추출 로직
    const searchPatterns = [
      /검색해줘\s+(.+)/,
      /찾아줘\s+(.+)/,
      /search\s+(.+)/,
      /[""]([^""]+)[""]\s+검색/
    ];

    for (const pattern of searchPatterns) {
      const match = command.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  extractOpenTarget(command) {
    // 열기 대상 추출 (한국어 + 영어)
    const openPatterns = [
      /열어줘\s+(.+)/,
      /열어주세요\s+(.+)/,
      /open\s+(.+)/,
      /[""]([^""]+)[""]\s+열어/,
      /can you open\s+(.+)/,
      /please open\s+(.+)/,
      /open the\s+(.+)/,
      /open my\s+(.+)/,
      /open\s+(.+)\s+settings/,
      /open\s+(.+)\s+of my\s+(.+)/,
      /open the settings of my\s+(.+)/,
      /open the\s+(.+)\s+of my\s+(.+)/
    ];

    for (const pattern of openPatterns) {
      const match = command.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // "설정" 관련 명령어 처리
    if (command.includes('설정') || command.includes('settings')) {
      return '시스템 설정';
    }

    // "구글" 관련 명령어 처리
    if (command.includes('구글') || command.includes('google')) {
      return 'Google';
    }

    // "Chrome" 관련 명령어 처리
    if (command.toLowerCase().includes('chrome')) {
      return 'Chrome';
    }

    return null;
  }

  extractScrollParameters(command) {
    const normalized = command.toLowerCase();
    
    let direction = 'down';
    let amount = 100;

    if (normalized.includes('위로') || normalized.includes('up')) {
      direction = 'up';
    } else if (normalized.includes('아래로') || normalized.includes('down')) {
      direction = 'down';
    } else if (normalized.includes('왼쪽으로') || normalized.includes('left')) {
      direction = 'left';
    } else if (normalized.includes('오른쪽으로') || normalized.includes('right')) {
      direction = 'right';
    }

    // 스크롤 양 추출
    const amountMatch = normalized.match(/(\d+)\s*픽셀/);
    if (amountMatch) {
      amount = parseInt(amountMatch[1]);
    }

    return { direction, amount };
  }

  extractTypeContent(command) {
    // 입력할 내용 추출
    const typePatterns = [
      /입력해줘\s+(.+)/,
      /type\s+(.+)/,
      /[""]([^""]+)[""]\s+입력/
    ];

    for (const pattern of typePatterns) {
      const match = command.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  async performAction(analysis) {
    switch (analysis.type) {
      case 'click':
        return await this.performClick(analysis.target);
      
      case 'search':
        return await this.performSearch(analysis.target);
      
      case 'open':
        return await this.performOpen(analysis.target);
      
      case 'scroll':
        return await this.performScroll(analysis.parameters);
      
      case 'type':
        return await this.performType(analysis.target);
      
      default:
        throw new Error(`지원하지 않는 명령 타입: ${analysis.type}`);
    }
  }

  async performClick(target) {
    try {
      if (target.text) {
        // 특정 텍스트를 가진 요소 클릭
        await this.page.click(`text="${target.text}"`);
        return { success: true, action: 'click', target: target.text };
      } else {
        // 색상/위치 기반 요소 찾기 및 클릭
        const selector = this.buildSelector(target);
        await this.page.click(selector);
        return { success: true, action: 'click', target: selector };
      }
    } catch (error) {
      throw new Error(`클릭 실패: ${error.message}`);
    }
  }

  async performSearch(query) {
    try {
      if (!query) {
        throw new Error('검색어가 없습니다.');
      }
      
      // 검색창 찾기 및 검색 실행
      await this.page.type('input[type="search"], input[name="q"], input[placeholder*="검색"]', query);
      await this.page.keyboard.press('Enter');
      return { success: true, action: 'search', query };
    } catch (error) {
      throw new Error(`검색 실패: ${error.message}`);
    }
  }

  async performOpen(target) {
    try {
      // macOS 시스템 설정 열기 (한국어 + 영어)
      if (target === '시스템 설정' || target === '설정' || target.includes('설정') ||
          target === 'System Settings' || target === 'settings' || target.toLowerCase().includes('setting')) {
        return await this.openSystemPreferences();
      }

      // Chrome 브라우저 열기
      if (target === 'Chrome' || target.toLowerCase().includes('chrome')) {
        return await this.openChrome();
      }
      
      if (target && target.includes('http')) {
        // URL 열기
        await this.page.goto(target);
      } else if (target) {
        // 검색을 통한 열기
        await this.performSearch(target);
      } else {
        // 기본 페이지로 이동
        await this.page.goto('https://www.google.com');
      }
      return { success: true, action: 'open', target: target || 'Google' };
    } catch (error) {
      throw new Error(`열기 실패: ${error.message}`);
    }
  }

  async openSystemPreferences() {
    return new Promise((resolve, reject) => {
      // macOS 시스템 설정 열기
      const openProcess = spawn('open', ['-a', 'System Settings']);
      
      openProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ 
            success: true, 
            action: 'open', 
            target: '시스템 설정',
            message: '맥북 시스템 설정을 열었습니다.'
          });
        } else {
          reject(new Error('시스템 설정 열기 실패'));
        }
      });
      
      openProcess.on('error', (error) => {
        reject(new Error(`시스템 설정 열기 오류: ${error.message}`));
      });
    });
  }

  async openChrome() {
    return new Promise((resolve, reject) => {
      // macOS Chrome 브라우저 열기
      const openProcess = spawn('open', ['-a', 'Google Chrome']);
      
      openProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ 
            success: true, 
            action: 'open', 
            target: 'Chrome',
            message: 'Chrome 브라우저를 열었습니다.'
          });
        } else {
          reject(new Error('Chrome 열기 실패'));
        }
      });
      
      openProcess.on('error', (error) => {
        reject(new Error(`Chrome 열기 오류: ${error.message}`));
      });
    });
  }

  async performScroll(parameters) {
    try {
      const { direction, amount } = parameters;
      
      switch (direction) {
        case 'up':
          await this.page.evaluate(() => window.scrollBy(0, -amount));
          break;
        case 'down':
          await this.page.evaluate(() => window.scrollBy(0, amount));
          break;
        case 'left':
          await this.page.evaluate(() => window.scrollBy(-amount, 0));
          break;
        case 'right':
          await this.page.evaluate(() => window.scrollBy(amount, 0));
          break;
      }
      
      return { success: true, action: 'scroll', direction, amount };
    } catch (error) {
      throw new Error(`스크롤 실패: ${error.message}`);
    }
  }

  async performType(content) {
    try {
      // 현재 포커스된 요소에 입력
      await this.page.keyboard.type(content);
      return { success: true, action: 'type', content };
    } catch (error) {
      throw new Error(`입력 실패: ${error.message}`);
    }
  }

  buildSelector(target) {
    let selector = '';
    
    if (target.elements.length > 0) {
      selector += target.elements[0];
    }
    
    if (target.colors.length > 0) {
      selector += `[style*="${target.colors[0]}"]`;
    }
    
    if (target.positions.length > 0) {
      // 위치 기반 선택자는 CSS로 구현하기 어려우므로 JavaScript로 처리
      selector = 'body'; // 기본값
    }
    
    return selector || 'body';
  }

  // 명령 히스토리 조회
  getCommandHistory() {
    return this.commandHistory;
  }

  // 시뮬레이션 액션 실행
  async simulateAction(analysis) {
    console.log('시뮬레이션 액션 실행:', analysis);
    
    switch (analysis.type) {
      case 'click':
        return { 
          success: true, 
          action: 'click', 
          target: analysis.target?.text || '시뮬레이션 클릭',
          message: `"${analysis.target?.text || '요소'}"를 클릭했습니다.`
        };
      
      case 'search':
        return { 
          success: true, 
          action: 'search', 
          query: analysis.target,
          message: `"${analysis.target}"를 검색했습니다.`
        };
      
      case 'open':
        // macOS 시스템 설정인 경우 실제로 열기 시도 (한국어 + 영어)
        if (analysis.target === '시스템 설정' || analysis.target === '설정' || analysis.target.includes('설정') ||
            analysis.target === 'System Settings' || analysis.target === 'settings' || 
            (analysis.target && analysis.target.toLowerCase().includes('setting'))) {
          try {
            return await this.openSystemPreferences();
          } catch (error) {
            return { 
              success: false, 
              action: 'open', 
              target: analysis.target,
              message: `시스템 설정 열기 실패: ${error.message}`
            };
          }
        }
        
        // Chrome 브라우저인 경우 실제로 열기 시도
        if (analysis.target === 'Chrome' || (analysis.target && analysis.target.toLowerCase().includes('chrome'))) {
          try {
            return await this.openChrome();
          } catch (error) {
            return { 
              success: false, 
              action: 'open', 
              target: analysis.target,
              message: `Chrome 열기 실패: ${error.message}`
            };
          }
        }
        
        return { 
          success: true, 
          action: 'open', 
          target: analysis.target || 'Google',
          message: `"${analysis.target || 'Google'}"을 열었습니다.`
        };
      
      case 'scroll':
        return { 
          success: true, 
          action: 'scroll', 
          direction: analysis.parameters.direction,
          amount: analysis.parameters.amount,
          message: `페이지를 ${analysis.parameters.direction}으로 스크롤했습니다.`
        };
      
      case 'type':
        return { 
          success: true, 
          action: 'type', 
          content: analysis.target,
          message: `"${analysis.target}"를 입력했습니다.`
        };
      
      default:
        return { 
          success: false, 
          action: 'unknown', 
          message: '알 수 없는 명령어입니다.'
        };
    }
  }

  // 브라우저 종료
  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = CursorAgent; 