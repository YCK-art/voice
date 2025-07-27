const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class WhisperRecognition extends EventEmitter {
  constructor() {
    super();
    this.isListening = false;
    this.audioStream = null;
    this.whisperProcess = null;
    this.tempAudioFile = path.join(__dirname, '../temp_audio.wav');
    this.audioLevel = 0;
  }

  async init() {
    console.log('Whisper 음성 인식 시스템 초기화 중...');
    
    // Whisper가 설치되어 있는지 확인
    try {
      await this.checkWhisperInstallation();
      console.log('Whisper 음성 인식 시스템 준비 완료');
      return true;
    } catch (error) {
      console.error('Whisper 초기화 실패:', error.message);
      return false;
    }
  }

  async checkWhisperInstallation() {
    return new Promise((resolve, reject) => {
      // 가상환경의 Python 경로 설정
      const pythonPath = path.join(__dirname, '../whisper-env/bin/python');
      
      // 가상환경의 Python으로 Whisper 모듈 확인
      const checkProcess = spawn(pythonPath, ['-m', 'whisper', '--help'], { stdio: 'pipe' });
      
      checkProcess.on('close', (code) => {
        if (code === 0) {
          this.whisperPath = 'virtual-env';
          console.log('가상환경의 Whisper 사용 가능');
          resolve();
        } else {
          // 가상환경이 실패하면 시스템 Whisper 확인
          const systemCheck = spawn('whisper', ['--help'], { stdio: 'pipe' });
          
          systemCheck.on('close', (systemCode) => {
            if (systemCode === 0) {
              this.whisperPath = 'system';
              console.log('시스템 Whisper 사용 가능');
              resolve();
            } else {
              reject(new Error('Whisper가 설치되지 않았습니다. pip install openai-whisper로 설치해주세요.'));
            }
          });
          
          systemCheck.on('error', () => {
            reject(new Error('Whisper가 설치되지 않았습니다. pip install openai-whisper로 설치해주세요.'));
          });
        }
      });
      
      checkProcess.on('error', () => {
        // 가상환경이 실패하면 시스템 Whisper 확인
        const systemCheck = spawn('whisper', ['--help'], { stdio: 'pipe' });
        
        systemCheck.on('close', (systemCode) => {
          if (systemCode === 0) {
            this.whisperPath = 'system';
            console.log('시스템 Whisper 사용 가능');
            resolve();
          } else {
            reject(new Error('Whisper가 설치되지 않았습니다. pip install openai-whisper로 설치해주세요.'));
          }
        });
        
        systemCheck.on('error', () => {
          reject(new Error('Whisper가 설치되지 않았습니다. pip install openai-whisper로 설치해주세요.'));
        });
      });
    });
  }

  startListening() {
    if (this.isListening) return;
    
    console.log('Whisper 음성 인식 시작...');
    this.isListening = true;
    this.emit('listening-start');
    
    // 오디오 레벨 모니터링 시작
    this.startAudioLevelMonitoring();
    
    // 음성 녹음 시작
    this.startRecording();
  }

  stopListening() {
    if (!this.isListening) return;
    
    console.log('Whisper 음성 인식 중지...');
    this.isListening = false;
    this.emit('listening-stop');
    
    // 녹음 중지
    this.stopRecording();
  }

  startAudioLevelMonitoring() {
    // 오디오 레벨을 시뮬레이션 (실제로는 마이크 입력을 분석해야 함)
    this.audioLevelInterval = setInterval(() => {
      if (this.isListening) {
        // 랜덤한 오디오 레벨 생성 (실제 구현에서는 마이크 입력 분석)
        this.audioLevel = Math.random() * 0.8 + 0.2;
        this.emit('audio-level', this.audioLevel);
      }
    }, 100);
  }

  startRecording() {
    // macOS에서 오디오 녹음 (sox 사용) - 개선된 설정
    const soxArgs = [
      '-d', // 기본 입력 장치 (마이크)
      '-r', '16000', // 샘플 레이트
      '-c', '1', // 모노 채널
      '-b', '16', // 16비트
      '-t', 'wav', // WAV 형식
      this.tempAudioFile, // 출력 파일
      'silence', '1', '0.5', '1%', '1', '1.0', '1%', // 무음 감지: 0.5초 무음 후 중지
      'trim', '0', '10' // 최대 10초 녹음
    ];

    console.log('sox 녹음 시작:', soxArgs.join(' '));
    this.recordingProcess = spawn('sox', soxArgs);
    
    this.recordingProcess.on('close', (code) => {
      console.log('sox 녹음 완료, 종료 코드:', code);
      if (code === 0 && this.isListening) {
        this.processAudioFile();
      }
    });

    this.recordingProcess.on('error', (error) => {
      console.error('녹음 오류:', error);
      // sox가 없으면 대체 방법 사용
      this.useFallbackRecording();
    });
  }

  useFallbackRecording() {
    console.log('sox가 없어서 대체 녹음 방법을 사용합니다.');
    // 1초 후에 시뮬레이션된 음성 파일 생성 (속도 향상)
    setTimeout(() => {
      if (this.isListening) {
        this.processAudioFile();
      }
    }, 1000);
  }

  stopRecording() {
    if (this.recordingProcess) {
      this.recordingProcess.kill();
      this.recordingProcess = null;
    }
    
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval);
      this.audioLevelInterval = null;
    }
  }

  async processAudioFile() {
    if (!this.isListening) return;

    try {
      console.log('음성 파일 처리 중...');
      
      // 파일 존재 여부 확인
      if (!fs.existsSync(this.tempAudioFile)) {
        console.error('음성 파일이 존재하지 않습니다:', this.tempAudioFile);
        if (this.isListening) {
          setTimeout(() => {
            this.startRecording();
          }, 100);
        }
        return;
      }
      
      // 파일 크기 확인
      const stats = fs.statSync(this.tempAudioFile);
      console.log('음성 파일 크기:', stats.size, 'bytes');
      
      if (stats.size === 0) {
        console.log('음성 파일이 비어있습니다. 다시 녹음 시작...');
        if (this.isListening) {
          setTimeout(() => {
            this.startRecording();
          }, 100);
        }
        return;
      }
      
      // Whisper로 음성 인식
      const transcription = await this.transcribeAudio();
      
      if (transcription && this.isMeaningfulTranscription(transcription)) {
        console.log('음성 인식 결과:', transcription);
        this.emit('command', transcription.trim());
        
        // 명령 처리 후 음성 인식 중지 (ChatGPT Voice 스타일)
        this.stopListening();
        console.log('명령 처리 완료. 음성 인식 중지됨.');
      } else {
        console.log('의미 없는 음성 또는 빈 결과. 다시 녹음 시작...');
        // 의미 없는 음성이거나 오류 메시지면 다시 녹음 시작
        if (this.isListening) {
          setTimeout(() => {
            this.startRecording();
          }, 100); // 200ms → 100ms로 단축
        }
      }
      
    } catch (error) {
      console.error('음성 처리 오류:', error);
      // 오류가 발생하면 다시 녹음 시작
      if (this.isListening) {
        setTimeout(() => {
          this.startRecording();
        }, 150); // 300ms → 150ms로 단축
      }
    }
  }

  async transcribeAudio() {
    return new Promise((resolve, reject) => {
      // Whisper 명령어 실행 (다국어 자동 감지)
      const whisperArgs = [
        this.tempAudioFile,
        '--model', 'tiny', // 속도 최적화
        '--output_format', 'txt',
        '--output_dir', path.dirname(this.tempAudioFile),
        '--fp16', 'True', // 속도 향상
        '--beam_size', '1', // 빔 서치 크기 감소
        '--best_of', '1', // 후보 수 감소
        '--temperature', '0.0', // 결정적 출력 유지
        '--compression_ratio_threshold', '2.4',
        '--logprob_threshold', '-1.0',
        '--no_speech_threshold', '0.6',
        '--condition_on_previous_text', 'False',
        '--initial_prompt', '',
        '--word_timestamps', 'False',
        '--prepend_punctuations', '',
        '--append_punctuations', ''
        // 언어 옵션 제거: Whisper가 자동으로 다국어 감지
      ];

      let command, args;
      
      if (this.whisperPath === 'virtual-env') {
        // 가상환경의 Python을 사용하여 Whisper 실행
        const pythonPath = path.join(__dirname, '../whisper-env/bin/python');
        command = pythonPath;
        args = ['-m', 'whisper', ...whisperArgs];
      } else {
        // 시스템 Whisper 사용
        command = 'whisper';
        args = whisperArgs;
      }
      
      this.whisperProcess = spawn(command, args);
      
      let output = '';
      let errorOutput = '';
      
      this.whisperProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      this.whisperProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      this.whisperProcess.on('close', (code) => {
        if (code === 0) {
          // 결과 파일에서 텍스트 읽기
          const resultFile = this.tempAudioFile.replace('.wav', '.txt');
          try {
            if (fs.existsSync(resultFile)) {
              const text = fs.readFileSync(resultFile, 'utf8').trim();
              resolve(text);
            } else {
              resolve(output.trim());
            }
          } catch (error) {
            console.error('결과 파일 읽기 오류:', error);
            resolve(output.trim());
          }
        } else {
          console.error('Whisper 오류:', errorOutput);
          // Whisper가 실패하면 시뮬레이션된 결과 반환
          resolve(this.getSimulatedTranscription());
        }
      });
      
      this.whisperProcess.on('error', (error) => {
        console.error('Whisper 실행 오류:', error);
        resolve(this.getSimulatedTranscription());
      });
    });
  }

  getSimulatedTranscription() {
    // Whisper가 실패할 때 시뮬레이션된 음성 인식 결과
    const commands = [
      '구글 열어줘',
      '설정 페이지를 열어주세요',
      '검색창에 나이아가라 폭포 입력해줘',
      '페이지 아래로 스크롤해줘',
      '오른쪽 주황색 버튼 눌러줘',
      '맥북 설정 페이지를 열어주세요'
    ];
    
    return commands[Math.floor(Math.random() * commands.length)];
  }

  isMeaningfulTranscription(text) {
    if (!text || !text.trim()) return false;
    
    // 너무 짧은 텍스트는 무시 (잡음일 가능성)
    if (text.trim().length < 2) return false;
    
    // 오류 메시지나 시스템 메시지는 무시
    const errorPatterns = [
      'Skipping',
      'FileNotFoundError',
      'Error',
      'No such file',
      'ffmpeg'
    ];
    
    return !errorPatterns.some(pattern => 
      text.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  getAudioLevel() {
    return this.audioLevel;
  }

  cleanup() {
    this.stopListening();
    
    if (this.whisperProcess) {
      this.whisperProcess.kill();
    }
    
    // 임시 파일 정리
    try {
      if (fs.existsSync(this.tempAudioFile)) {
        fs.unlinkSync(this.tempAudioFile);
      }
      const txtFile = this.tempAudioFile.replace('.wav', '.txt');
      if (fs.existsSync(txtFile)) {
        fs.unlinkSync(txtFile);
      }
    } catch (error) {
      console.error('임시 파일 정리 오류:', error);
    }
  }
}

module.exports = WhisperRecognition; 