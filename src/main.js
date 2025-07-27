require('dotenv').config({ path: './config.env' });
const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const VoiceAssistant = require('./voice-assistant');
const CursorAgent = require('./cursor-agent');
const AICommandAnalyzer = require('./ai-command-analyzer');
const AdvancedActionExecutor = require('./advanced-action-executor');
const LandingServer = require('./landing-server');

class VoiceCursorAssistant {
  constructor() {
    this.mainWindow = null;
    this.toolbarWindow = null;
    this.voiceAssistant = null;
    this.cursorAgent = null;
    this.aiAnalyzer = null;
    this.actionExecutor = null;
    this.landingServer = null;
    
    this.init();
  }

  init() {
    app.whenReady().then(async () => {
      // 랜딩페이지 서버 시작
      await this.startLandingServer();
      
      this.createToolbarWindow();
      this.createMainWindow();
      this.setupVoiceAssistant();
      this.setupGlobalShortcuts();
      this.setupIPC();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('before-quit', () => {
      if (this.landingServer) {
        this.landingServer.stop();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });
  }

  createToolbarWindow() {
    // 화면 크기 가져오기
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    // 툴바 크기 (CSS에서 설정된 크기와 일치)
    const toolbarWidth = 800;
    const toolbarHeight = 240;
    
    // 화면 중앙 위쪽에 위치하도록 계산
    const x = Math.round((screenWidth - toolbarWidth) / 2);
    const y = Math.round(screenHeight * 0.1); // 화면 높이의 10% 위치
    
    this.toolbarWindow = new BrowserWindow({
      width: toolbarWidth,
      minHeight: toolbarHeight,
      maxHeight: 600,
      x: x,
      y: y,
      frame: false,
      transparent: true,
      alwaysOnTop: true, // 기본적으로 항상 위에 표시
      resizable: false,
      skipTaskbar: true,
      hasShadow: false,
      focusable: true, // 포커스를 받을 수 있도록 설정
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
        webSecurity: false,
        allowRunningInsecureContent: true
      }
    });

    this.toolbarWindow.loadFile(path.join(__dirname, 'toolbar.html'));
    
    // 윈도우 닫힐 때 리소스 정리
    this.toolbarWindow.on('closed', () => {
      // 윈도우가 실제로 닫힐 때만 null로 설정
      if (this.toolbarWindow && this.toolbarWindow.isDestroyed()) {
        this.toolbarWindow = null;
      }
    });

    // 툴바를 기본적으로 계속 표시
    this.toolbarWindow.show();
    this.toolbarWindow.setAlwaysOnTop(true);
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false, // 메인 윈도우는 숨김 (툴바만 사용)
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    this.mainWindow.loadFile(path.join(__dirname, 'main.html'));
  }

  async startLandingServer() {
    try {
      this.landingServer = new LandingServer();
      await this.landingServer.start();
      console.log('랜딩페이지 서버가 시작되었습니다:', this.landingServer.getUrl());
    } catch (error) {
      console.error('랜딩페이지 서버 시작 실패:', error);
    }
  }

  setupVoiceAssistant() {
    this.voiceAssistant = new VoiceAssistant();
    this.cursorAgent = new CursorAgent();
    this.aiAnalyzer = new AICommandAnalyzer();
    this.actionExecutor = new AdvancedActionExecutor();
    
    // 음성 인식 결과 처리
    this.voiceAssistant.on('command', async (command, detectedLanguage) => {
      console.log('음성 명령 감지:', command);
      console.log('감지된 언어:', detectedLanguage);
      
      // 음성 명령을 툴바에 표시 (언어 정보 포함)
      this.toolbarWindow.webContents.send('voice-recognition-result', command, detectedLanguage);
      
      try {
        // AI 명령 분석 (언어 정보 포함)
        const analysis = await this.aiAnalyzer.analyzeCommand(command, detectedLanguage);
        console.log('AI 명령 분석 결과:', analysis);
        
        // 고급 액션 실행 (언어 정보 포함)
        const result = await this.actionExecutor.executeAction(analysis, detectedLanguage);
        
        // 모든 결과를 툴바에 전달 (탭 분석 포함)
        this.toolbarWindow.webContents.send('command-result', {
          success: true,
          command,
          analysis,
          result,
          message: result.message // ChatGPT API로 생성된 대화형 응답
        });
      } catch (error) {
        console.error('명령 실행 실패:', error);
        
        // 폴백: 기존 Cursor Agent 사용
        try {
          const result = await this.cursorAgent.executeCommand(command);
          this.toolbarWindow.webContents.send('command-result', {
            success: true,
            command,
            result
          });
        } catch (fallbackError) {
          this.toolbarWindow.webContents.send('command-result', {
            success: false,
            command,
            error: error.message
          });
        }
      }
    });

    // 음성 레벨 이벤트 처리
    this.voiceAssistant.on('audio-level', (level) => {
      if (this.toolbarWindow) {
        this.toolbarWindow.webContents.send('audio-level', level);
      }
    });

    // 음성 인식 시작/중지 이벤트 처리 (중복 제거)
    this.voiceAssistant.on('listening-start', () => {
      if (this.toolbarWindow) {
        this.toolbarWindow.webContents.send('listening-start');
        this.toolbarWindow.webContents.send('voice-recognition-start');
      }
    });

    this.voiceAssistant.on('listening-stop', () => {
      if (this.toolbarWindow) {
        this.toolbarWindow.webContents.send('listening-stop');
      }
    });
  }

  setupGlobalShortcuts() {
    // Cmd+X로 음성 인식 시작/중지
    globalShortcut.register('Cmd+X', () => {
      if (this.voiceAssistant) {
        this.voiceAssistant.toggleListening();
      }
    });

    // Cmd+H로 툴바 숨기기/보이기
    globalShortcut.register('Cmd+H', () => {
      console.log('Cmd+H 단축키 실행됨');
      
      // 툴바 윈도우가 없거나 파괴된 경우 새로 생성
      if (!this.toolbarWindow || this.toolbarWindow.isDestroyed()) {
        console.log('툴바 윈도우 재생성');
        this.createToolbarWindow();
        return;
      }
      
      const isVisible = this.toolbarWindow.isVisible();
      console.log('현재 툴바 상태:', isVisible ? '보임' : '숨김');
      
      if (isVisible) {
        this.toolbarWindow.hide();
        console.log('툴바 숨김 완료');
      } else {
        this.toolbarWindow.setAlwaysOnTop(true);
        this.toolbarWindow.show();
        console.log('툴바 표시 완료');
      }
    });

    // Cmd+A로 Ask 기능 실행
    globalShortcut.register('Cmd+A', () => {
      console.log('Cmd+A 단축키 실행됨');
      if (this.toolbarWindow && !this.toolbarWindow.isDestroyed()) {
        this.toolbarWindow.webContents.send('show-ask-input');
      } else {
        console.log('툴바 윈도우가 없어서 Ask 기능을 실행할 수 없습니다');
      }
    });
  }

  setupIPC() {
    // 툴바에서 음성 인식 시작/중지 요청
    ipcMain.on('toggle-voice-recognition', () => {
      if (this.voiceAssistant) {
        this.voiceAssistant.toggleListening();
      }
    });

    // 툴바에서 직접 명령 입력
    ipcMain.on('execute-command', async (event, command) => {
      try {
        // 언어 감지 (간단히 영어/한글 여부)
        let detectedLanguage = 'ko';
        if(/[a-zA-Z]/.test(command) && !/[가-힣]/.test(command)) detectedLanguage = 'en';
        // AI 명령 분석
        const analysis = await this.aiAnalyzer.analyzeCommand(command, detectedLanguage);
        // 고급 액션 실행
        const result = await this.actionExecutor.executeAction(analysis, detectedLanguage);
        event.reply('command-result', { success: true, command, analysis, result, message: result.message });
      } catch (error) {
        event.reply('command-result', { success: false, command, error: error.message });
      }
    });

    // 툴바 숨기기 요청
    ipcMain.on('hide-toolbar', () => {
      if (this.toolbarWindow) {
        this.toolbarWindow.hide();
      }
    });

    // 툴바 닫기 요청
    ipcMain.on('close-toolbar', () => {
      if (this.toolbarWindow) {
        this.toolbarWindow.close();
      }
    });

    // 윈도우 포커스 요청
    ipcMain.on('focus-window', () => {
      if (this.toolbarWindow && !this.toolbarWindow.isDestroyed()) {
        this.toolbarWindow.focus();
      }
    });
  }
}

// 애플리케이션 시작
new VoiceCursorAssistant();
