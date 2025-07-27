const EventEmitter = require('events');
const WhisperRecognition = require('./whisper-recognition');

class VoiceAssistant extends EventEmitter {
  constructor() {
    super();
    this.isListening = false;
    this.recognition = null;
    this.synthesis = null;
    this.whisperRecognition = new WhisperRecognition();
    this.audioLevel = 0;
    this.detectedLanguage = 'ko'; // 기본 언어는 한국어
    
    this.initSpeechRecognition();
    this.initSpeechSynthesis();
  }

  // 언어 감지 함수 (다국어 지원)
  detectLanguage(text) {
    if (!text || !text.trim()) return 'ko';
    
    const cleanText = text.trim().toLowerCase();
    console.log('언어 감지 중:', text);
    
    // 한글 패턴 (한글 유니코드 범위: AC00-D7AF)
    const koreanPattern = /[가-힣]/;
    // 영어 패턴 (영어 알파벳)
    const englishPattern = /[a-zA-Z]/;
    // 중국어 패턴 (간체/번체)
    const chinesePattern = /[\u4e00-\u9fff]/;
    // 일본어 패턴 (히라가나, 카타카나)
    const japanesePattern = /[\u3040-\u309f\u30a0-\u30ff]/;
    // 스페인어 패턴 (ñ, á, é, í, ó, ú, ü)
    const spanishPattern = /[ñáéíóúü]/;
    // 프랑스어 패턴 (à, â, ç, é, è, ê, ë, î, ï, ô, ù, û, ü, ÿ)
    const frenchPattern = /[àâçéèêëîïôùûüÿ]/;
    // 독일어 패턴 (ä, ö, ü, ß)
    const germanPattern = /[äöüß]/;
    
    // 영어 단어 패턴 (일반적인 영어 명령어들)
    const englishCommands = [
      'open', 'close', 'search', 'click', 'type', 'scroll', 'call', 'message',
      'file', 'system', 'settings', 'chrome', 'safari', 'finder', 'terminal',
      'photo', 'camera', 'take', 'picture', 'analyze', 'page', 'tab',
      'google', 'youtube', 'facebook', 'twitter', 'instagram', 'whatsapp',
      'can', 'you', 'please', 'help', 'me', 'with', 'this', 'that',
      'new', 'jeans', 'about', 'tell', 'information', 'details'
    ];
    
    // 영어 명령어가 포함되어 있으면 영어로 판단
    const hasEnglishCommand = englishCommands.some(cmd => cleanText.includes(cmd));
    
    console.log('한글 포함:', koreanPattern.test(text));
    console.log('영어 포함:', englishPattern.test(text));
    console.log('중국어 포함:', chinesePattern.test(text));
    console.log('일본어 포함:', japanesePattern.test(text));
    console.log('스페인어 포함:', spanishPattern.test(text));
    console.log('프랑스어 포함:', frenchPattern.test(text));
    console.log('독일어 포함:', germanPattern.test(text));
    console.log('영어 명령어 포함:', hasEnglishCommand);
    
    // 언어별 우선순위로 감지
    if (koreanPattern.test(text)) {
      console.log('감지된 언어: 한국어');
      return 'ko';
    }
    else if (chinesePattern.test(text)) {
      console.log('감지된 언어: 중국어');
      return 'zh';
    }
    else if (japanesePattern.test(text)) {
      console.log('감지된 언어: 일본어');
      return 'ja';
    }
    else if (spanishPattern.test(text)) {
      console.log('감지된 언어: 스페인어');
      return 'es';
    }
    else if (frenchPattern.test(text)) {
      console.log('감지된 언어: 프랑스어');
      return 'fr';
    }
    else if (germanPattern.test(text)) {
      console.log('감지된 언어: 독일어');
      return 'de';
    }
    else if (englishPattern.test(text) && hasEnglishCommand) {
      console.log('감지된 언어: 영어 (명령어 포함)');
      return 'en';
    }
    else if (englishPattern.test(text)) {
      console.log('감지된 언어: 영어 (알파벳만)');
      return 'en';
    }
    else {
      console.log('감지된 언어: 한국어 (기본값)');
      return 'ko';
    }
  }

  // 언어별 응답 메시지 생성
  getResponseMessage(command, result, language) {
    const messages = {
      ko: {
        success: `명령 "${command}"이 성공적으로 실행되었습니다.`,
        error: `명령 "${command}" 실행 중 오류가 발생했습니다.`,
        unknown: `"${command}" 명령을 이해할 수 없습니다.`,
        listening: '음성 인식이 시작되었습니다. 말씀해 주세요.',
        stopped: '음성 인식이 중지되었습니다.'
      },
      en: {
        success: `Command "${command}" executed successfully.`,
        error: `Error occurred while executing command "${command}".`,
        unknown: `I couldn't understand the command "${command}".`,
        listening: 'Voice recognition started. Please speak.',
        stopped: 'Voice recognition stopped.'
      }
    };
    
    return messages[language] || messages.ko;
  }

  async initSpeechRecognition() {
    console.log('음성 인식 시스템 초기화 중...');
    
    // Whisper 음성 인식 시스템 초기화 시도
    const whisperAvailable = await this.whisperRecognition.init();
    
    if (whisperAvailable) {
      console.log('Whisper 음성 인식 시스템 사용');
      this.setupWhisperRecognition();
    } else {
      console.log('Whisper를 사용할 수 없어서 WebSpeech API를 시도합니다.');
      this.initWebSpeechRecognition();
    }
  }

  initWebSpeechRecognition() {
    try {
      // 브라우저 환경에서 WebSpeech API 사용
      if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
        this.recognition = new webkitSpeechRecognition();
        this.setupRecognition();
        console.log('WebSpeech API 사용 가능');
      } else if (typeof window !== 'undefined' && 'SpeechRecognition' in window) {
        this.recognition = new SpeechRecognition();
        this.setupRecognition();
        console.log('SpeechRecognition API 사용 가능');
      } else {
        console.log('WebSpeech API를 사용할 수 없어서 대체 방법을 사용합니다.');
        this.setupFallbackRecognition();
      }
    } catch (error) {
      console.error('음성 인식 초기화 오류:', error);
      this.setupFallbackRecognition();
    }
  }

  setupRecognition() {
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'ko-KR';
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      console.log('WebSpeech API 음성 인식 시작');
      this.isListening = true;
      this.emit('listening-start');
    };

    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        console.log('음성 인식 최종 결과:', finalTranscript);
        
        // 언어 감지
        this.detectedLanguage = this.detectLanguage(finalTranscript);
        console.log('감지된 언어:', this.detectedLanguage);
        
        this.isListening = false;
        this.emit('listening-stop');
        this.emit('command', finalTranscript, this.detectedLanguage);
      } else if (interimTranscript) {
        console.log('음성 인식 중간 결과:', interimTranscript);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('음성 인식 오류:', event.error);
      this.isListening = false;
      this.emit('listening-stop');
      this.emit('error', event.error);
    };

    this.recognition.onend = () => {
      console.log('WebSpeech API 음성 인식 종료');
      this.isListening = false;
      this.emit('listening-stop');
    };

    this.recognition.onaudiostart = () => {
      console.log('오디오 입력 시작');
    };

    this.recognition.onaudioend = () => {
      console.log('오디오 입력 종료');
    };

    this.recognition.onsoundstart = () => {
      console.log('소리 감지 시작');
    };

    this.recognition.onsoundend = () => {
      console.log('소리 감지 종료');
    };

    this.recognition.onspeechstart = () => {
      console.log('음성 감지 시작');
    };

    this.recognition.onspeechend = () => {
      console.log('음성 감지 종료');
    };
  }

  setupWhisperRecognition() {
    // Whisper 음성 인식 이벤트 설정
    this.whisperRecognition.on('listening-start', () => {
      this.isListening = true;
      this.emit('listening-start');
    });

    this.whisperRecognition.on('listening-stop', () => {
      this.isListening = false;
      this.emit('listening-stop');
    });

    this.whisperRecognition.on('command', (transcription) => {
      console.log('Whisper 음성 인식 결과:', transcription);
      
      // 언어 감지
      this.detectedLanguage = this.detectLanguage(transcription);
      console.log('감지된 언어:', this.detectedLanguage);
      
      this.emit('command', transcription, this.detectedLanguage);
    });

    this.whisperRecognition.on('audio-level', (level) => {
      this.audioLevel = level;
      this.emit('audio-level', level);
    });
  }

  setupFallbackRecognition() {
    // 대체 음성 인식 시스템 - 텍스트 입력 모드
    console.log('대체 음성 인식 시스템 초기화 (텍스트 입력 모드)');
    
    // 사용자가 직접 입력할 수 있는 명령어 예시
    this.exampleCommands = [
      '구글 열어줘',
      '검색창에 나이아가라 폭포 입력해줘',
      '페이지 아래로 스크롤해줘',
      '설정 열어줘',
      '오른쪽 주황색 버튼 눌러줘'
    ];
    
    console.log('사용 가능한 명령어 예시:', this.exampleCommands);
  }

  initSpeechSynthesis() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  // 시뮬레이션 모드에서 테스트 명령어 실행
  simulateCommand() {
    if (this.simulatedCommands && this.commandIndex < this.simulatedCommands.length) {
      const command = this.simulatedCommands[this.commandIndex];
      this.commandIndex = (this.commandIndex + 1) % this.simulatedCommands.length;
      
      console.log('시뮬레이션 명령 실행:', command);
      this.emit('command', command);
      
      return command;
    }
    return null;
  }

  startListening() {
    if (!this.isListening) {
      this.isListening = true;
      this.emit('listening-start');
      
      if (this.whisperRecognition) {
        this.whisperRecognition.startListening();
        console.log('Whisper 음성 인식 시작');
      } else if (this.recognition) {
        try {
          this.recognition.start();
          console.log('WebSpeech API 음성 인식 시작');
        } catch (error) {
          console.error('WebSpeech API 시작 실패:', error);
          this.emit('error', error);
        }
      } else {
        console.log('음성 인식 시작 - 툴바에서 직접 명령어를 입력하세요');
      }
    }
  }

  stopListening() {
    if (this.isListening) {
      this.isListening = false;
      this.emit('listening-stop');
      
      if (this.whisperRecognition) {
        this.whisperRecognition.stopListening();
        console.log('Whisper 음성 인식 중지');
      } else if (this.recognition) {
        try {
          this.recognition.stop();
          console.log('WebSpeech API 음성 인식 중지');
        } catch (error) {
          console.error('WebSpeech API 중지 실패:', error);
        }
      }
    }
  }

  getAudioLevel() {
    if (this.whisperRecognition) {
      return this.whisperRecognition.getAudioLevel();
    }
    return this.audioLevel;
  }

  speak(text, language = null) {
    if (this.synthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // 언어 설정
      if (language) {
        utterance.lang = language === 'ko' ? 'ko-KR' : 'en-US';
      } else {
        utterance.lang = this.detectedLanguage === 'ko' ? 'ko-KR' : 'en-US';
      }
      
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      this.synthesis.speak(utterance);
    }
  }

  // 명령어 패턴 매칭 및 정규화
  normalizeCommand(command) {
    let normalized = command.toLowerCase().trim();
    
    // 일반적인 명령어 패턴 정규화
    const patterns = {
      '열어줘': 'open',
      '닫아줘': 'close',
      '클릭해줘': 'click',
      '눌러줘': 'click',
      '검색해줘': 'search',
      '찾아줘': 'search',
      '스크롤해줘': 'scroll',
      '위로': 'scroll up',
      '아래로': 'scroll down',
      '왼쪽으로': 'scroll left',
      '오른쪽으로': 'scroll right'
    };

    Object.entries(patterns).forEach(([korean, english]) => {
      normalized = normalized.replace(new RegExp(korean, 'g'), english);
    });

    return normalized;
  }

  // 명령어 타입 분류
  classifyCommand(command) {
    const normalized = this.normalizeCommand(command);
    
    if (normalized.includes('open') || normalized.includes('열어')) {
      return 'open';
    } else if (normalized.includes('click') || normalized.includes('click')) {
      return 'click';
    } else if (normalized.includes('search') || normalized.includes('search')) {
      return 'search';
    } else if (normalized.includes('scroll')) {
      return 'scroll';
    } else if (normalized.includes('type') || normalized.includes('입력')) {
      return 'type';
    } else {
      return 'unknown';
    }
  }

  // 명령어에서 대상 요소 추출
  extractTarget(command) {
    const normalized = this.normalizeCommand(command);
    
    // 색상 추출
    const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white'];
    const foundColors = colors.filter(color => normalized.includes(color));
    
    // 위치 추출
    const positions = ['left', 'right', 'top', 'bottom', 'center', 'middle'];
    const foundPositions = positions.filter(pos => normalized.includes(pos));
    
    // 요소 타입 추출
    const elements = ['button', 'link', 'input', 'text', 'image', 'menu'];
    const foundElements = elements.filter(elem => normalized.includes(elem));
    
    return {
      colors: foundColors,
      positions: foundPositions,
      elements: foundElements,
      original: command
    };
  }
}

module.exports = VoiceAssistant; 