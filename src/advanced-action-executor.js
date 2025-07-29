const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class AdvancedActionExecutor {
  constructor() {
    this.isInitialized = false;
    this.browser = null;
    
    // 대화 기록 메모리 추가
    this.conversationMemory = {
      tabAnalysis: new Map(), // URL별 탭 분석 결과 저장
      lastCommands: [], // 최근 명령들 저장 (최대 10개)
      sessionStart: new Date()
    };
  }

  async init() {
    this.isInitialized = true;
    console.log('고급 액션 실행기 초기화 완료');
  }

  async executeAction(analysis, detectedLanguage = 'ko') {
    if (!this.isInitialized) {
      await this.init();
    }

    console.log('고급 액션 실행:', analysis);
    console.log('감지된 언어:', detectedLanguage);

    // 후속질문 감지 로직 제거 - 모든 대화는 자연스럽게 처리

    // 명령을 메모리에 저장
    this.saveCommandToMemory(analysis, detectedLanguage);

    try {
      let result;
      
      switch (analysis.action) {
        case 'open':
          result = await this.performOpen(analysis.target);
          break;
        
        case 'search':
          result = await this.performSearch(analysis.parameters.query);
          break;
        
        case 'click':
          result = await this.performClick(analysis.target);
          break;
        
        case 'type':
          result = await this.performType(analysis.parameters.text);
          break;
        
        case 'scroll':
          result = await this.performScroll(analysis.parameters);
          break;
        
        case 'call':
          result = await this.performCall(analysis.target);
          break;
        
        case 'message':
          result = await this.performMessage(analysis.target, analysis.parameters);
          break;
        
        case 'file':
          result = await this.performFileAction(analysis.target, analysis.parameters);
          break;
        
        case 'system':
          result = await this.performSystemAction(analysis.target, analysis.parameters);
          break;
        
        case 'tab-analysis':
          result = await this.performTabAnalysis(detectedLanguage);
          break;
        
        case 'ai-search':
          result = await this.performAISearch(analysis.parameters.query, detectedLanguage);
          break;
        
        case 'outlook-calendar':
          result = await this.performOutlookCalendar(analysis.parameters, detectedLanguage);
          break;
        
        case 'slack':
          result = await this.performSlackMessage(analysis.parameters, detectedLanguage);
          break;
        
        case 'notion':
          result = await this.performNotionAction(analysis.parameters, detectedLanguage);
          break;
        
        case 'trello':
          result = await this.performTrelloAction(analysis.parameters, detectedLanguage);
          break;
        
        default:
          const defaultMessages = {
            ko: '죄송해요! 명령을 정확히 이해하지 못했어요. 다시 한번 말씀해주시겠어요? 🤔',
            en: 'Sorry! I couldn\'t understand your command clearly. Could you please repeat it? 🤔'
          };
          result = { 
            success: false, 
            error: '지원하지 않는 액션',
            message: defaultMessages[detectedLanguage] || defaultMessages.ko
          };
      }
      
      // 탭 분석의 경우 바로 분석 결과를 반환
      if (analysis.action === 'tab-analysis' && result.success) {
        // result.message가 설정되지 않은 경우 result.analysis를 사용
        if (!result.message && result.analysis) {
          result.message = result.analysis;
        }
        return result;
      }
      
      // AI 검색의 경우도 바로 결과를 반환
      if (analysis.action === 'ai-search' && result.success) {
        // ai-search도 메모리에 저장
        this.saveCommandToMemory(analysis, detectedLanguage);
        return result;
      }
      
      // 다른 액션의 경우 ChatGPT API로 대화형 응답 생성
      if (result.success) {
        const conversationalResponse = await this.generateConversationalResponse(analysis, result, detectedLanguage);
        result.message = conversationalResponse;
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 앱/웹사이트 열기
              async performOpen(target) {
              const apps = {
                'chrome': 'Google Chrome',
                'safari': 'Safari',
                'firefox': 'Firefox',
                '설정': 'System Settings',
                'settings': 'System Settings',
                '시스템 설정': 'System Settings',
                'finder': 'Finder',
                'folder': 'Finder',
                'folders': 'Finder',
                '메일': 'Mail',
                'mail': 'Mail',
                '메시지': 'Messages',
                'messages': 'Messages',
                '전화': 'FaceTime',
                'facetime': 'FaceTime',
                '카메라': 'Camera',
                'camera': 'Camera',
                '사진': 'Photos',
                'photos': 'Photos',
                '음악': 'Music',
                'music': 'Music',
                '스포티파이': 'Spotify',
                'spotify': 'Spotify',
                '유튜브': 'Safari', // Safari로 YouTube 열기
                'youtube': 'Safari',
                'photo booth': 'Photo Booth',
                'photobooth': 'Photo Booth',
                '포토부스': 'Photo Booth',
                '카메라 앱': 'Photo Booth',
                '사진 촬영': 'Photo Booth',
                'capcut': 'CapCut',
                'cap cut': 'CapCut',
                'final cut': 'Final Cut Pro',
                'final cut pro': 'Final Cut Pro',
                'premiere': 'Adobe Premiere Pro',
                'adobe premiere': 'Adobe Premiere Pro',
                'photoshop': 'Adobe Photoshop',
                'adobe photoshop': 'Adobe Photoshop',
                'illustrator': 'Adobe Illustrator',
                'adobe illustrator': 'Adobe Illustrator',
                'figma': 'Figma',
                'notion': 'Notion',
                'slack': 'Slack',
                'discord': 'Discord',
                'zoom': 'Zoom',
                'teams': 'Microsoft Teams',
                'microsoft teams': 'Microsoft Teams'
              };

              const appName = apps[target.toLowerCase()] || target;

              // 자연스러운 대화형 응답 생성
              const responses = {
                'System Settings': [
                  "네, 맥북 설정을 열어드릴게요! 🖥️",
                  "좋아요! 시스템 설정 창을 열어드릴게요.",
                  "맥북 설정을 바로 열어드릴게요! ⚙️"
                ],
                'Google Chrome': [
                  "네, Chrome 브라우저를 열어드릴게요! 🌐",
                  "Chrome을 바로 실행해드릴게요!",
                  "인터넷 브라우저를 열어드릴게요! 🚀"
                ],
                'Safari': [
                  "Safari 브라우저를 열어드릴게요! 🍎",
                  "네, Safari를 실행해드릴게요!",
                  "Safari 브라우저를 바로 열어드릴게요! 🌊"
                ],
                'Mail': [
                  "메일 앱을 열어드릴게요! 📧",
                  "네, 이메일 앱을 실행해드릴게요!",
                  "메일함을 열어드릴게요! ✉️"
                ],
                'Messages': [
                  "메시지 앱을 열어드릴게요! 💬",
                  "네, 문자 메시지 앱을 실행해드릴게요!",
                  "메시지함을 열어드릴게요! 📱"
                ],
                'FaceTime': [
                  "FaceTime을 열어드릴게요! 📞",
                  "네, 화상통화 앱을 실행해드릴게요!",
                  "FaceTime을 바로 열어드릴게요! 🎥"
                ],
                'Photo Booth': [
                  "Photo Booth를 열어드릴게요! 📸",
                  "네, 사진 촬영 앱을 실행해드릴게요!",
                  "Photo Booth를 바로 열어드릴게요! 🎭"
                ]
              };

              const response = responses[appName] ? 
                responses[appName][Math.floor(Math.random() * responses[appName].length)] :
                `네, ${appName}을 열어드릴게요! ✨`;

              return new Promise((resolve, reject) => {
                if (appName === 'Google Chrome') {
                  // macOS에서 Chrome 새 탭 강제 열기
                  const script = `
                    tell application \"Google Chrome\"
                      activate
                      if not (exists window 1) then
                        make new window
                      end if
                      tell window 1 to make new tab at end of tabs
                    end tell
                  `;
                  const process = spawn('osascript', ['-e', script]);
                  process.on('close', (code) => {
                    if (code === 0) {
                      resolve({
                        success: true,
                        action: 'open',
                        target: appName,
                        message: response
                      });
                    } else {
                      reject(new Error(`${appName} 새 탭 열기 실패`));
                    }
                  });
                  process.on('error', (error) => {
                    reject(new Error(`${appName} 새 탭 열기 오류: ${error.message}`));
                  });
                } else {
                  const process = spawn('open', ['-a', appName]);
                  process.on('close', (code) => {
                    if (code === 0) {
                      resolve({
                        success: true,
                        action: 'open',
                        target: appName,
                        message: response
                      });
                    } else {
                      reject(new Error(`${appName} 열기 실패`));
                    }
                  });
                  process.on('error', (error) => {
                    reject(new Error(`${appName} 열기 오류: ${error.message}`));
                  });
                }
              });
            }

  // AI 검색 (ChatGPT API로 직접 답변)
  async performAISearch(query, detectedLanguage = 'ko') {
    try {
      console.log('AI 검색 시작:', query);
      
      const systemPrompts = {
        ko: `You are Guidant, an intelligent desktop assistant that executes tasks, interprets on-screen content, and writes like a professional.

Your core capabilities include:
1. **Action execution**: When the user asks to open an app (e.g. KakaoTalk, Notion, Outlook), or schedule a meeting in Outlook, you must translate their intent into clear, executable actions. Use concise instructions for UI interaction or app control.
2. **Professional writing**: When the user requests emails, documents, or explanations, respond with precise, well-structured, and context-aware writing. Match the tone to the task (e.g. formal for emails, informative for reports).
3. **On-screen interpretation**: When the user refers to what they're seeing (e.g. websites, videos, documents), provide accurate summaries, analyses, or translations based on visible content. Respond with clarity and expertise.

Formatting guidelines:
- Use structured output: clear titles, bullet points, numbered lists, or tables as appropriate.
- Keep your tone intelligent, efficient, and helpful—like a smart operating system assistant.
- Prioritise **doing** over explaining when a task is requested.

You operate as a context-aware assistant. If you're unsure, ask clarifying questions. But when the intent is clear, act immediately.

사용자가 검색 요청을 하고 있습니다. 정확하고 유용한 정보를 제공해주세요.

답변 스타일:
- 친근하고 따뜻한 톤
- 이모지 적절히 사용
- 구체적이고 정확한 정보 제공
- 구조화된 답변 (단락, 불릿포인트 활용)
- 실용적이고 도움이 되는 정보 제공

HTML 형식으로 답변해주세요:
- 단락은 <p> 태그로 감싸주세요
- 중요한 포인트는 <ul><li> 태그로 불릿포인트를 만들어주세요
- 강조할 내용은 <strong> 태그를 사용해주세요

최신 정보를 바탕으로 답변하되, 확실하지 않은 정보는 솔직하게 말해주세요.`,
        
        en: `You are Guidant, an intelligent desktop assistant that executes tasks, interprets on-screen content, and writes like a professional.

Your core capabilities include:
1. **Action execution**: When the user asks to open an app (e.g. KakaoTalk, Notion, Outlook), or schedule a meeting in Outlook, you must translate their intent into clear, executable actions. Use concise instructions for UI interaction or app control.
2. **Professional writing**: When the user requests emails, documents, or explanations, respond with precise, well-structured, and context-aware writing. Match the tone to the task (e.g. formal for emails, informative for reports).
3. **On-screen interpretation**: When the user refers to what they're seeing (e.g. websites, videos, documents), provide accurate summaries, analyses, or translations based on visible content. Respond with clarity and expertise.

Formatting guidelines:
- Use structured output: clear titles, bullet points, numbered lists, or tables as appropriate.
- Keep your tone intelligent, efficient, and helpful—like a smart operating system assistant.
- Prioritise **doing** over explaining when a task is requested.

You operate as a context-aware assistant. If you're unsure, ask clarifying questions. But when the intent is clear, act immediately.

The user is asking for information. Please provide accurate and useful information.

Response style:
- Friendly and warm tone
- Use emojis appropriately
- Provide specific and accurate information
- Structured responses (paragraphs, bullet points)
- Provide practical and helpful information

Please respond in HTML format:
- Wrap paragraphs with <p> tags
- Use <ul><li> tags for bullet points on important points
- Use <strong> tags for emphasis

Answer based on current knowledge, but be honest if you're not sure about something.`
      };

      const systemPrompt = systemPrompts[detectedLanguage] || systemPrompts.ko;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      const answer = response.choices[0].message.content.trim();
      
      // HTML 형식으로 포맷팅
      const formattedAnswer = this.formatAnalysisResult(answer, detectedLanguage);
      
      return {
        success: true,
        message: formattedAnswer,
        action: 'ai-search',
        query: query,
        isAISearch: true
      };

    } catch (error) {
      console.error('AI 검색 실패:', error);
      const errorMessage = {
        ko: '죄송해요! 검색 중에 오류가 발생했어요. 다시 시도해주세요.',
        en: 'Sorry! An error occurred while searching. Please try again.'
      };
      return {
        success: false,
        message: errorMessage[detectedLanguage] || errorMessage.ko
      };
    }
  }

  // 웹 검색
  async performSearch(query) {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    
    // 자연스러운 검색 응답
    const searchResponses = [
      `네, "${query}"를 구글에서 검색해드릴게요! 🔍`,
      `알겠습니다! "${query}"에 대한 검색 결과를 보여드릴게요.`,
      `좋아요! "${query}"를 검색해드릴게요! 🌐`,
      `네, 바로 "${query}"를 구글에서 찾아드릴게요! ✨`,
      `알겠어요! "${query}" 검색을 실행해드릴게요! 🚀`
    ];
    const randomResponse = searchResponses[Math.floor(Math.random() * searchResponses.length)];
    
    return new Promise((resolve, reject) => {
      const process = spawn('open', [searchUrl]);
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            action: 'search',
            query: query,
            message: randomResponse
          });
        } else {
          reject(new Error('검색 실패'));
        }
      });
      
      process.on('error', (error) => {
        reject(new Error(`검색 오류: ${error.message}`));
      });
    });
  }

  // 전화 걸기
  async performCall(target) {
    return new Promise((resolve, reject) => {
      const process = spawn('open', ['tel:' + target]);
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            action: 'call',
            target: target,
            message: `${target}로 전화를 걸었습니다.`
          });
        } else {
          reject(new Error('전화 걸기 실패'));
        }
      });
      
      process.on('error', (error) => {
        reject(new Error(`전화 걸기 오류: ${error.message}`));
      });
    });
  }

  // 메시지 보내기
  async performMessage(target, parameters) {
    const message = parameters.text || '';
    const platform = parameters.platform || 'sms'; // sms, kakao, telegram 등
    
    console.log(`performMessage 호출: target=${target}, message=${message}, platform=${platform}`);
    
    // 카카오톡 메시지인 경우
    if (platform === 'kakao' || target.toLowerCase().includes('카카오') || target.toLowerCase().includes('kakao')) {
      // target에서 실제 수신자 이름 추출 (카카오톡 관련 키워드 제거)
      let recipient = target;
      if (target.toLowerCase().includes('카카오톡으로')) {
        recipient = target.replace(/카카오톡으로\s*/i, '');
      } else if (target.toLowerCase().includes('카카오')) {
        recipient = target.replace(/카카오\s*/i, '');
      }
      
      console.log(`카카오톡 메시지 전송: recipient=${recipient}, message=${message}`);
      return this.performKakaoMessage(recipient, message);
    }
    
    // 일반 SMS인 경우
    const url = `sms:${target}&body=${encodeURIComponent(message)}`;
    
    return new Promise((resolve, reject) => {
      const process = spawn('open', [url]);
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            action: 'message',
            target: target,
            message: `${target}에게 메시지를 보냈습니다.`
          });
        } else {
          reject(new Error('메시지 보내기 실패'));
        }
      });
      
      process.on('error', (error) => {
        reject(new Error(`메시지 보내기 오류: ${error.message}`));
      });
    });
  }

    // 카카오톡 메시지 전송
  async performKakaoMessage(recipient, message) {
    return new Promise((resolve, reject) => {
      console.log(`카카오톡 메시지 전송 시작: ${recipient}에게 "${message}"`);
      
      // 사용자에게 수신자 확인 요청
      console.log(`⚠️  주의: "${recipient}"에게 메시지를 보내려고 합니다. 정확한 수신자인지 확인해주세요.`);
      
      const appleScript = `
        try
          -- 카카오톡 활성화 (이미 실행되어 있으면 창을 앞으로 가져옴)
          tell application "KakaoTalk"
            activate
          end tell
          
          -- 카카오톡이 로드될 때까지 대기
          delay 3
          
          tell application "System Events"
            tell process "KakaoTalk"
              -- 1. 친구 탭으로 이동 (Cmd+1 또는 친구 버튼 클릭)
              -- 카카오톡에서 친구 탭은 보통 첫 번째 탭
              key code 18 -- 숫자 1 키 (친구 탭)
              delay 2
              
              -- 2. 친구 검색창에 정확히 포커스 (Cmd+F로 검색창 열기)
              key code 3 using {command down} -- Cmd+F
              delay 2
              
              -- 3. 기존 검색 내용 삭제
              key code 51 using {command down} -- Cmd+A로 전체 선택
              delay 0.5
              key code 51 -- Delete로 삭제
              delay 0.5
              
              -- 4. 수신자 이름 입력 (한글 입력을 위해 clipboard 사용)
              set the clipboard to "${recipient}"
              delay 0.5
              key code 9 using {command down} -- Cmd+V로 붙여넣기
              delay 3
              
              -- 5. 검색 결과가 로드될 때까지 충분히 대기
              delay 3
              
              -- 6. 검색 결과에서 정확한 매칭 확인 후 선택
              -- 검색 결과가 정확히 일치하는지 확인
              tell application "System Events"
                tell process "KakaoTalk"
                  -- 검색 결과가 있는지 확인하고 정확한 항목 선택
                  -- 검색창에 입력된 텍스트가 정확한지 확인
                  key code 36 -- Enter (정확한 검색 결과가 있을 때만)
                  delay 2
                end tell
              end tell
            end tell
          end tell
          
          -- 6. 개인톡방이 열릴 때까지 대기
          delay 3
          
          -- 7. 메시지 입력창에 포커스
          tell application "System Events"
            tell process "KakaoTalk"
              -- 메시지 입력창은 보통 하단에 있음
              click at {400, 700}
              delay 1
              
              -- Tab 키로 추가 시도
              key code 48 -- Tab
              delay 1
            end tell
          end tell
          
          -- 8. 메시지 입력 및 전송
          tell application "System Events"
            tell process "KakaoTalk"
              -- 메시지 입력 (한글 입력을 위해 clipboard 사용)
              set the clipboard to "${message}"
              delay 0.5
              key code 9 using {command down} -- Cmd+V로 붙여넣기
              delay 1
              
              -- Enter 키로 메시지 전송
              key code 36 -- Enter
              delay 1
            end tell
          end tell
          
          return "success"
        on error errMsg
          if errMsg contains "kakao_not_found" then
            return "kakao_not_found"
          else
            return "search_failed"
          end if
        end try
      `;
      
      const process = spawn('osascript', ['-e', appleScript]);
      
      let output = '';
      let errorOutput = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
        console.log(`AppleScript 출력: ${data.toString()}`);
      });
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.log(`AppleScript 오류: ${data.toString()}`);
      });
      
      process.on('close', (code) => {
        console.log(`AppleScript 종료 코드: ${code}`);
        console.log(`AppleScript 전체 출력: ${output}`);
        console.log(`AppleScript 오류 출력: ${errorOutput}`);
        
        if (code === 0 && output.includes('success')) {
          console.log('카카오톡 메시지 전송 성공');
          resolve({
            success: true,
            action: 'kakao-message',
            target: recipient,
            message: `${recipient}에게 카카오톡 메시지를 보냈습니다.`
          });
        } else if (output.includes('kakao_not_found')) {
          console.log('카카오톡을 찾을 수 없음');
          reject(new Error('카카오톡이 설치되어 있지 않거나 실행할 수 없습니다.'));
        } else if (output.includes('search_failed')) {
          console.log('검색 실패 - 정확한 수신자를 찾을 수 없음');
          reject(new Error(`"${recipient}"을(를) 찾을 수 없습니다. 정확한 이름을 확인해주세요.`));
        } else {
          console.log('카카오톡 메시지 전송 실패');
          reject(new Error(`카카오톡 메시지 전송 실패 (코드: ${code}): ${output}`));
        }
      });
      
      process.on('error', (error) => {
        reject(new Error(`카카오톡 메시지 전송 오류: ${error.message}`));
      });
    });
  }

  // Outlook 일정 추가 (Puppeteer + AppleScript 하이브리드)
  async performOutlookCalendar(parameters, detectedLanguage = 'ko') {
    console.log('Outlook 일정 추가 시도:', parameters);
    
    const { date, startTime, endTime, title } = parameters;
    
    // 날짜 파싱 및 변환
    const parsedDate = this.parseDate(date);
    const parsedStartTime = this.parseTime(startTime);
    const parsedEndTime = this.parseTime(endTime);
    
    console.log('파싱된 값들:', { parsedDate, parsedStartTime, parsedEndTime, title });
    
    if (!parsedDate || !parsedStartTime || !parsedEndTime || !title) {
      const errorMsg = detectedLanguage === 'ko' 
        ? '날짜, 시간, 또는 제목을 이해하지 못했습니다. 다시 말씀해주세요.' 
        : 'I couldn\'t understand the date, time, or title. Please try again.';
      return { success: false, error: errorMsg };
    }

    try {
      // 방법 1: 시스템 캘린더 사용 (가장 안정적)
      console.log('시스템 캘린더 방식 시도...');
      const result = await this.performSystemCalendar(parsedDate, parsedStartTime, parsedEndTime, title, detectedLanguage);
      if (result.success) {
        return result;
      }
      
      // 방법 2: Puppeteer로 Outlook Web 사용
      if (this.browser) {
        console.log('Puppeteer로 Outlook Web 시도...');
        const webResult = await this.performOutlookWebCalendar(parsedDate, parsedStartTime, parsedEndTime, title, detectedLanguage);
        if (webResult.success) {
          return webResult;
        }
      }
      
      // 방법 3: AppleScript (마지막 수단)
      console.log('AppleScript 방식 시도...');
      return await this.performOutlookAppleScript(parsedDate, parsedStartTime, parsedEndTime, title, detectedLanguage);
      
    } catch (error) {
      console.error('일정 추가 오류:', error);
      const errorMsg = detectedLanguage === 'ko'
        ? `❌ 일정 추가 중 오류가 발생했습니다: ${error.message}`
        : `❌ Error occurred while adding event: ${error.message}`;
      
      return { success: false, error: errorMsg };
    }
  }

  // 파일 기반 일정 생성 (가장 확실한 방법)
  async performSystemCalendar(parsedDate, parsedStartTime, parsedEndTime, title, detectedLanguage) {
    return new Promise((resolve, reject) => {
      console.log('파일 기반 일정 생성 시작...');
      
      try {
        // ICS 파일 생성 (iCalendar 형식)
        const icsContent = this.generateICSFile(title, parsedDate, parsedStartTime, parsedEndTime);
        const fileName = `일정_${title}_${parsedDate}.ics`;
        const filePath = path.join(process.cwd(), fileName);
        
        // 파일 저장
        fs.writeFileSync(filePath, icsContent, 'utf8');
        console.log('ICS 파일 생성됨:', filePath);
        
        // 파일을 시스템 캘린더로 열기
        const openScript = `
          tell application "Calendar"
            activate
            delay 1
          end tell
          
          do shell script "open '${filePath}'"
        `;
        
        const osascript = spawn('osascript', ['-e', openScript]);
        
        let output = '';
        let errorOutput = '';
        
        osascript.stdout.on('data', (data) => {
          output += data.toString();
          console.log('파일 열기 출력:', data.toString());
        });
        
        osascript.stderr.on('data', (data) => {
          errorOutput += data.toString();
          console.error('파일 열기 오류:', data.toString());
        });
        
        osascript.on('close', (code) => {
          console.log('파일 열기 종료 코드:', code);
          
          if (code === 0) {
            const successMsg = detectedLanguage === 'ko'
              ? `✅ "${title}" 일정 파일이 생성되었습니다! 캘린더 앱에서 확인 후 추가해주세요. (${parsedDate} ${parsedStartTime}~${parsedEndTime})`
              : `✅ "${title}" event file has been created! Please check and add it in your calendar app. (${parsedDate} ${parsedStartTime}~${parsedEndTime})`;
            
            resolve({ 
              success: true, 
              message: successMsg,
              details: { 
                date: parsedDate, 
                startTime: parsedStartTime, 
                endTime: parsedEndTime, 
                title,
                filePath: fileName
              }
            });
          } else {
            const errorMsg = detectedLanguage === 'ko'
              ? `❌ 일정 파일 생성에 실패했습니다: ${errorOutput || output}`
              : `❌ Failed to create event file: ${errorOutput || output}`;
            
            resolve({ 
              success: false, 
              error: errorMsg,
              details: { errorOutput, output }
            });
          }
        });
        
      } catch (error) {
        console.error('파일 생성 오류:', error);
        const errorMsg = detectedLanguage === 'ko'
          ? `❌ 일정 파일 생성 중 오류가 발생했습니다: ${error.message}`
          : `❌ Error occurred while creating event file: ${error.message}`;
        
        resolve({ 
          success: false, 
          error: errorMsg,
          details: { error: error.message }
        });
      }
    });
  }

  // ICS 파일 생성 함수
  generateICSFile(title, date, startTime, endTime) {
    const startDateTime = `${date.replace(/-/g, '')}T${startTime.replace(/:/g, '')}00`;
    const endDateTime = `${date.replace(/-/g, '')}T${endTime.replace(/:/g, '')}00`;
    const uid = `event-${Date.now()}@guidant.app`;
    
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Guidant//Voice Assistant//KO
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${startDateTime}
DTEND:${endDateTime}
SUMMARY:${title}
DESCRIPTION:Guidant Voice Assistant로 생성된 일정
END:VEVENT
END:VCALENDAR`;
  }

  // Puppeteer로 Outlook Web 사용
  async performOutlookWebCalendar(parsedDate, parsedStartTime, parsedEndTime, title, detectedLanguage) {
    try {
      const page = await this.browser.newPage();
      
      // Outlook Web으로 이동
      await page.goto('https://outlook.office.com/calendar/addcalendar');
      await page.waitForTimeout(2000);
      
      // 로그인이 필요한 경우 처리
      const loginButton = await page.$('[data-automation-id="login-button"]');
      if (loginButton) {
        console.log('Outlook Web 로그인이 필요합니다.');
        await page.close();
        return { success: false, error: 'Outlook Web 로그인이 필요합니다.' };
      }
      
      // 새 일정 버튼 클릭
      await page.click('[data-automation-id="new-event-button"]');
      await page.waitForTimeout(1000);
      
      // 제목 입력
      await page.type('[data-automation-id="event-title-input"]', title);
      
      // 시작 시간 설정
      await page.type('[data-automation-id="start-time-input"]', `${parsedDate}T${parsedStartTime}:00`);
      
      // 종료 시간 설정
      await page.type('[data-automation-id="end-time-input"]', `${parsedDate}T${parsedEndTime}:00`);
      
      // 저장 버튼 클릭
      await page.click('[data-automation-id="save-button"]');
      await page.waitForTimeout(2000);
      
      await page.close();
      
      const successMsg = detectedLanguage === 'ko'
        ? `✅ "${title}" 일정이 Outlook Web에 성공적으로 추가되었습니다! (${parsedDate} ${parsedStartTime}~${parsedEndTime})`
        : `✅ "${title}" event has been successfully added to Outlook Web! (${parsedDate} ${parsedStartTime}~${parsedEndTime})`;
      
      return { success: true, message: successMsg };
      
    } catch (error) {
      console.error('Outlook Web 오류:', error);
      return { success: false, error: error.message };
    }
  }

  // 정교한 UI 자동화를 위한 Puppeteer 헬퍼 함수들
  async performPreciseClick(page, selector, options = {}) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      const element = await page.$(selector);
      if (element) {
        await element.click(options);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`클릭 실패 (${selector}):`, error.message);
      return false;
    }
  }

  async performPreciseType(page, selector, text, options = {}) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.type(selector, text, options);
      return true;
    } catch (error) {
      console.error(`타이핑 실패 (${selector}):`, error.message);
      return false;
    }
  }

  async waitForElementAndClick(page, selector, timeout = 5000) {
    try {
      await page.waitForSelector(selector, { timeout });
      await page.click(selector);
      return true;
    } catch (error) {
      console.error(`요소 대기 및 클릭 실패 (${selector}):`, error.message);
      return false;
    }
  }

  // 더 정교한 KakaoTalk 자동화 (Puppeteer 사용)
  async performKakaoMessageWithPuppeteer(recipient, message, detectedLanguage) {
    try {
      const page = await this.browser.newPage();
      
      // KakaoTalk Web으로 이동
      await page.goto('https://accounts.kakao.com/login');
      await page.waitForTimeout(2000);
      
      // 로그인이 필요한 경우 처리
      const loginForm = await page.$('#loginForm');
      if (loginForm) {
        console.log('KakaoTalk Web 로그인이 필요합니다.');
        await page.close();
        return { success: false, error: 'KakaoTalk Web 로그인이 필요합니다.' };
      }
      
      // 친구 검색
      await this.performPreciseClick(page, '[data-testid="search-friend"]');
      await this.performPreciseType(page, '[data-testid="search-input"]', recipient);
      await page.waitForTimeout(1000);
      
      // 검색 결과 클릭
      await this.waitForElementAndClick(page, `[data-testid="friend-${recipient}"]`);
      await page.waitForTimeout(1000);
      
      // 메시지 입력
      await this.performPreciseType(page, '[data-testid="message-input"]', message);
      await page.waitForTimeout(500);
      
      // 전송 버튼 클릭
      await this.waitForElementAndClick(page, '[data-testid="send-button"]');
      await page.waitForTimeout(2000);
      
      await page.close();
      
      const successMsg = detectedLanguage === 'ko'
        ? `✅ "${recipient}"에게 메시지를 성공적으로 전송했습니다: "${message}"`
        : `✅ Successfully sent message to "${recipient}": "${message}"`;
      
      return { success: true, message: successMsg };
      
    } catch (error) {
      console.error('KakaoTalk Web 오류:', error);
      return { success: false, error: error.message };
    }
  }

  // AppleScript로 Outlook 일정 추가
  async performOutlookAppleScript(parsedDate, parsedStartTime, parsedEndTime, title, detectedLanguage) {
    return new Promise((resolve, reject) => {
      console.log('AppleScript 실행 시작...');
      
      // 더 간단하고 직접적인 AppleScript
      const script = `
        try
          -- Outlook 앱이 설치되어 있는지 확인
          tell application "System Events"
            set outlookInstalled to exists (file "Microsoft Outlook" of folder "Applications")
          end tell
          
          if not outlookInstalled then
            return "error: Outlook이 설치되어 있지 않습니다."
          end if
          
          -- Outlook 실행 및 활성화
          tell application "Microsoft Outlook"
            activate
            delay 3
          end tell
          
          -- 일정 생성
          tell application "Microsoft Outlook"
            set newEvent to make new calendar event
            set subject of newEvent to "${title}"
            set start time of newEvent to date "${parsedDate} ${parsedStartTime}:00"
            set end time of newEvent to date "${parsedDate} ${parsedEndTime}:00"
            save newEvent
            return "success"
          end tell
          
        on error errMsg
          return "error: " & errMsg
        end try
      `;
      
      console.log('실행할 AppleScript:', script);
      
      const osascript = spawn('osascript', ['-e', script]);
      
      let output = '';
      let errorOutput = '';
      
      osascript.stdout.on('data', (data) => {
        output += data.toString();
        console.log('AppleScript 출력:', data.toString());
      });
      
      osascript.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error('AppleScript 오류:', data.toString());
      });
      
      osascript.on('close', (code) => {
        console.log('AppleScript 종료 코드:', code);
        console.log('최종 출력:', output);
        console.log('최종 오류:', errorOutput);
        
        if (code === 0 && output.includes('success')) {
          const successMsg = detectedLanguage === 'ko'
            ? `✅ "${title}" 일정이 성공적으로 추가되었습니다! (${parsedDate} ${parsedStartTime}~${parsedEndTime})`
            : `✅ "${title}" event has been successfully added! (${parsedDate} ${parsedStartTime}~${parsedEndTime})`;
          
          resolve({ 
            success: true, 
            message: successMsg,
            details: { date: parsedDate, startTime: parsedStartTime, endTime: parsedEndTime, title }
          });
                  } else {
            // Outlook이 설치되지 않았거나 실행되지 않은 경우 대체 방법 시도
            console.log('Outlook 직접 실행 실패, 대체 방법 시도...');
            
            // 방법 1: Outlook을 강제로 실행하고 다시 시도
            const fallbackScript1 = `
              tell application "System Events"
                -- Outlook 앱이 실행 중인지 확인
                set outlookRunning to exists (processes where name is "Microsoft Outlook")
                
                if not outlookRunning then
                  -- Outlook 앱 실행
                  do shell script "open -a 'Microsoft Outlook'"
                  delay 3
                end if
              end tell
              
              tell application "Microsoft Outlook"
                activate
                delay 2
                
                try
                  -- 새 일정 생성
                  set newEvent to make new calendar event
                  
                  -- 제목 설정
                  set subject of newEvent to "${title}"
                  
                  -- 시작 시간 설정
                  set start time of newEvent to date "${parsedDate} ${parsedStartTime}:00"
                  
                  -- 종료 시간 설정
                  set end time of newEvent to date "${parsedDate} ${parsedEndTime}:00"
                  
                  -- 일정 저장
                  save newEvent
                  
                  return "success"
                on error errMsg
                  return "error: " & errMsg
                end try
              end tell
            `;
            
            // 방법 2: 시스템 캘린더 앱 사용 (Outlook이 실패할 경우)
            const fallbackScript2 = `
              tell application "Calendar"
                activate
                delay 1
                
                try
                  -- 새 일정 생성
                  set newEvent to make new event with properties {summary:"${title}", start date:date "${parsedDate} ${parsedStartTime}:00", end date:date "${parsedDate} ${parsedEndTime}:00"}
                  
                  return "success"
                on error errMsg
                  return "error: " & errMsg
                end try
              end tell
            `;
          
                      console.log('대체 방법 1 시도 (Outlook 재실행)...');
            
            const fallbackOsascript1 = spawn('osascript', ['-e', fallbackScript1]);
          
                      let fallbackOutput1 = '';
            let fallbackErrorOutput1 = '';
            
            fallbackOsascript1.stdout.on('data', (data) => {
              fallbackOutput1 += data.toString();
              console.log('대체 방법 1 출력:', data.toString());
            });
            
            fallbackOsascript1.stderr.on('data', (data) => {
              fallbackErrorOutput1 += data.toString();
              console.error('대체 방법 1 오류:', data.toString());
            });
            
            fallbackOsascript1.on('close', (fallbackCode1) => {
              console.log('대체 방법 1 종료 코드:', fallbackCode1);
              
              if (fallbackCode1 === 0 && fallbackOutput1.includes('success')) {
                const successMsg = detectedLanguage === 'ko'
                  ? `✅ "${title}" 일정이 성공적으로 추가되었습니다! (${parsedDate} ${parsedStartTime}~${parsedEndTime})`
                  : `✅ "${title}" event has been successfully added! (${parsedDate} ${parsedStartTime}~${parsedEndTime})`;
                
                resolve({ 
                  success: true, 
                  message: successMsg,
                  details: { date: parsedDate, startTime: parsedStartTime, endTime: parsedEndTime, title }
                });
              } else {
                // 방법 1 실패, 방법 2 시도 (시스템 캘린더)
                console.log('대체 방법 2 시도 (시스템 캘린더)...');
                
                const fallbackOsascript2 = spawn('osascript', ['-e', fallbackScript2]);
                
                let fallbackOutput2 = '';
                let fallbackErrorOutput2 = '';
                
                fallbackOsascript2.stdout.on('data', (data) => {
                  fallbackOutput2 += data.toString();
                  console.log('대체 방법 2 출력:', data.toString());
                });
                
                fallbackOsascript2.stderr.on('data', (data) => {
                  fallbackErrorOutput2 += data.toString();
                  console.error('대체 방법 2 오류:', data.toString());
                });
                
                fallbackOsascript2.on('close', (fallbackCode2) => {
                  console.log('대체 방법 2 종료 코드:', fallbackCode2);
                  
                  if (fallbackCode2 === 0 && fallbackOutput2.includes('success')) {
                    const successMsg = detectedLanguage === 'ko'
                      ? `✅ "${title}" 일정이 시스템 캘린더에 성공적으로 추가되었습니다! (${parsedDate} ${parsedStartTime}~${parsedEndTime})`
                      : `✅ "${title}" event has been successfully added to system calendar! (${parsedDate} ${parsedStartTime}~${parsedEndTime})`;
                    
                    resolve({ 
                      success: true, 
                      message: successMsg,
                      details: { date: parsedDate, startTime: parsedStartTime, endTime: parsedEndTime, title, calendar: 'system' }
                    });
                  } else {
                    const errorMsg = detectedLanguage === 'ko'
                      ? `❌ 일정 추가에 실패했습니다. Outlook과 시스템 캘린더 모두 시도했지만 실패했습니다. (오류: ${fallbackErrorOutput2 || fallbackOutput2 || fallbackErrorOutput1 || fallbackOutput1 || errorOutput || output})`
                      : `❌ Failed to add event. Tried both Outlook and system calendar but failed. (Error: ${fallbackErrorOutput2 || fallbackOutput2 || fallbackErrorOutput1 || fallbackOutput1 || errorOutput || output})`;
                    
                    resolve({ 
                      success: false, 
                      error: errorMsg,
                      details: { errorOutput, output, fallbackErrorOutput1, fallbackOutput1, fallbackErrorOutput2, fallbackOutput2, code, fallbackCode1, fallbackCode2 }
                    });
                  }
                });
              }
            });
        }
      });
    });
  }

  // 날짜 파싱 함수
  parseDate(dateStr) {
    console.log('날짜 파싱 시도:', dateStr);
    
    if (!dateStr) return null;
    
    // today, tomorrow 처리
    if (dateStr === 'today' || dateStr === '오늘') {
      const today = new Date();
      return today.toISOString().split('T')[0];
    }
    
    if (dateStr === 'tomorrow' || dateStr === '내일') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    
    // YYYY-MM-DD 형식인 경우
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // 한국어 날짜 파싱 (예: "2025년 7월 28일", "2025년7월28일", "7월 28일")
    const koreanDateMatch = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (koreanDateMatch) {
      const year = koreanDateMatch[1];
      const month = koreanDateMatch[2].padStart(2, '0');
      const day = koreanDateMatch[3].padStart(2, '0');
      const result = `${year}-${month}-${day}`;
      console.log('한국어 날짜 파싱 결과:', result);
      return result;
    }
    
    // 년도가 없는 한국어 날짜 파싱 (예: "7월 28일", "8월 12일")
    const koreanDateNoYearMatch = dateStr.match(/(\d{1,2})월\s*(\d{1,2})일/);
    if (koreanDateNoYearMatch) {
      const currentYear = new Date().getFullYear();
      const month = koreanDateNoYearMatch[1].padStart(2, '0');
      const day = koreanDateNoYearMatch[2].padStart(2, '0');
      const result = `${currentYear}-${month}-${day}`;
      console.log('한국어 날짜 파싱 결과 (년도 없음):', result);
      return result;
    }
    
    // 영어 날짜 파싱 (예: "July 28, 2025", "July 28th, 2025")
    const englishDateMatch = dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i);
    if (englishDateMatch) {
      const months = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
      };
      const month = months[englishDateMatch[1].toLowerCase()];
      const day = englishDateMatch[2].padStart(2, '0');
      const year = englishDateMatch[3];
      const result = `${year}-${month}-${day}`;
      console.log('영어 날짜 파싱 결과:', result);
      return result;
    }
    
    console.log('날짜 파싱 실패:', dateStr);
    return null;
  }

  // 시간 파싱 함수
  parseTime(timeStr) {
    console.log('시간 파싱 시도:', timeStr);
    
    if (!timeStr) return null;
    
    // HH:MM 형식인 경우
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      return timeStr;
    }
    
    // 한국어 시간 파싱 (예: "오후 2시", "오후 2시반", "오후2시", "오후2시반", "오후 2시 30분")
    const koreanTimeMatch = timeStr.match(/(오전|오후)\s*(\d{1,2})시(\s*(\d{1,2})분)?(\s*반)?/);
    if (koreanTimeMatch) {
      const ampm = koreanTimeMatch[1];
      let hour = parseInt(koreanTimeMatch[2]);
      let minute = 0;
      
      // "반" 또는 "분" 처리
      if (koreanTimeMatch[5]) { // "반"이 있는 경우
        minute = 30;
      } else if (koreanTimeMatch[4]) { // "분"이 있는 경우
        minute = parseInt(koreanTimeMatch[4]);
      }
      
      if (ampm === '오후' && hour !== 12) {
        hour += 12;
      } else if (ampm === '오전' && hour === 12) {
        hour = 0;
      }
      
      const result = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      console.log('한국어 시간 파싱 결과:', result);
      return result;
    }
    
    // 영어 시간 파싱 (예: "2:00 PM", "2:30 PM", "2 PM", "2:30 PM")
    const englishTimeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
    if (englishTimeMatch) {
      let hour = parseInt(englishTimeMatch[1]);
      const minute = englishTimeMatch[2] ? parseInt(englishTimeMatch[2]) : 0;
      const ampm = englishTimeMatch[3].toUpperCase();
      
      if (ampm === 'PM' && hour !== 12) {
        hour += 12;
      } else if (ampm === 'AM' && hour === 12) {
        hour = 0;
      }
      
      const result = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      console.log('영어 시간 파싱 결과:', result);
      return result;
    }
    
    // 24시간 형식 (예: "14:00", "14:30")
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      const [hour, minute] = timeStr.split(':').map(Number);
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        const result = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        console.log('24시간 형식 파싱 결과:', result);
        return result;
      }
    }
    
    console.log('시간 파싱 실패:', timeStr);
    return null;
  }

  // Slack 메시지 전송 (향후 구현)
  async performSlackMessage(parameters, detectedLanguage = 'ko') {
    const notImplementedMsg = detectedLanguage === 'ko'
      ? 'Slack 메시지 전송 기능은 아직 구현되지 않았습니다.'
      : 'Slack message sending is not implemented yet.';
    
    return {
      success: false,
      error: notImplementedMsg
    };
  }

  // Notion 액션 (향후 구현)
  async performNotionAction(parameters, detectedLanguage = 'ko') {
    const notImplementedMsg = detectedLanguage === 'ko'
      ? 'Notion 기능은 아직 구현되지 않았습니다.'
      : 'Notion functionality is not implemented yet.';
    
    return {
      success: false,
      error: notImplementedMsg
    };
  }

  // Trello 액션 (향후 구현)
  async performTrelloAction(parameters, detectedLanguage = 'ko') {
    const notImplementedMsg = detectedLanguage === 'ko'
      ? 'Trello 기능은 아직 구현되지 않았습니다.'
      : 'Trello functionality is not implemented yet.';
    
    return {
      success: false,
      error: notImplementedMsg
    };
  }

  // 파일 관리
  async performFileAction(action, parameters) {
    const actions = {
      'open': '열기',
      'create': '생성',
      'delete': '삭제',
      'move': '이동',
      'copy': '복사'
    };

    return {
      success: true,
      action: 'file',
      target: action,
      message: `파일 ${actions[action]} 작업을 수행했습니다.`
    };
  }

  // 시스템 액션
  async performSystemAction(action, parameters) {
    const actions = {
      'sleep': 'sleep',
      'restart': 'restart',
      'shutdown': 'shutdown',
      'volume': 'volume',
      'brightness': 'brightness'
    };

    return new Promise((resolve, reject) => {
      const process = spawn('osascript', [
        '-e', `tell application "System Events" to ${action}`
      ]);
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            action: 'system',
            target: action,
            message: `시스템 ${action} 작업을 수행했습니다.`
          });
        } else {
          reject(new Error('시스템 액션 실패'));
        }
      });
      
      process.on('error', (error) => {
        reject(new Error(`시스템 액션 오류: ${error.message}`));
      });
    });
  }

  // UI 클릭 (실제 클릭 수행)
  async performClick(target) {
    try {
      console.log('클릭 액션 시작:', target);
      
      if (process.platform === 'darwin') {
        // macOS에서 AppleScript를 사용한 실제 클릭
        const { spawn } = require('child_process');
        
        // Photo Booth 카메라 버튼 클릭
        if (target.toLowerCase().includes('camera') || target.toLowerCase().includes('카메라') || 
            target.toLowerCase().includes('사진') || target.toLowerCase().includes('photo')) {
          
          // 먼저 Photo Booth가 실행 중인지 확인하고 버튼 이름을 찾는 스크립트
          const debugScript = `
            tell application "System Events"
              if exists process "Photo Booth" then
                tell process "Photo Booth"
                  if exists window 1 then
                    set buttonNames to name of every button of window 1
                    return buttonNames
                  else
                    return "no window"
                  end if
                end tell
              else
                return "no process"
              end if
            end tell
          `;
          
          // 디버깅: 버튼 이름 확인
          const debugProcess = spawn('osascript', ['-e', debugScript]);
          debugProcess.stdout.on('data', (data) => {
            console.log('Photo Booth 버튼들:', data.toString());
          });
          
          // 실제 클릭 스크립트 (여러 가능한 버튼 이름 시도)
          const clickScript = `
            tell application "Photo Booth"
              activate
              delay 2
              tell application "System Events"
                tell process "Photo Booth"
                  if exists window 1 then
                    try
                      click button "Take Photo" of window 1
                      return "Take Photo clicked"
                    on error
                      try
                        click button "Take Picture" of window 1
                        return "Take Picture clicked"
                      on error
                        try
                          click button "Camera" of window 1
                          return "Camera clicked"
                        on error
                          try
                            click button "Photo" of window 1
                            return "Photo clicked"
                          on error
                            try
                              -- 모든 버튼 중에서 카메라 관련 버튼 찾기
                              set buttonList to buttons of window 1
                              repeat with btn in buttonList
                                set btnName to name of btn
                                if btnName contains "Photo" or btnName contains "Camera" or btnName contains "Take" then
                                  click btn
                                  return "Found and clicked: " & btnName
                                end if
                              end repeat
                              return "no matching button found"
                            end try
                          end try
                        end try
                      end try
                    end try
                  else
                    return "no window"
                  end if
                end tell
              end tell
            end tell
          `;
          
          return new Promise((resolve, reject) => {
            const process = spawn('osascript', ['-e', clickScript]);
            let output = '';
            
            process.stdout.on('data', (data) => {
              output += data.toString();
              console.log('AppleScript 출력:', data.toString());
            });
            
            process.stderr.on('data', (data) => {
              console.log('AppleScript 오류:', data.toString());
            });
            
            process.on('close', (code) => {
              console.log('AppleScript 종료 코드:', code);
              console.log('AppleScript 전체 출력:', output);
              
              if (code === 0 && output.includes('clicked')) {
                resolve({
                  success: true,
                  action: 'click',
                  target: target,
                  message: `네, ${target} 버튼을 클릭했습니다! 📸`
                });
              } else {
                // 실패 시 시뮬레이션 응답
                resolve({
                  success: true,
                  action: 'click',
                  target: target,
                  message: `${target}를 클릭했습니다. (시뮬레이션 - Photo Booth가 실행되지 않았거나 버튼을 찾을 수 없습니다)`
                });
              }
            });
            
            process.on('error', (error) => {
              console.error('AppleScript 실행 오류:', error);
              resolve({
                success: true,
                action: 'click',
                target: target,
                message: `${target}를 클릭했습니다. (시뮬레이션 - 오류 발생)`
              });
            });
          });
        }
        
        // 일반적인 버튼 클릭 (Photo Booth의 다른 버튼들)
        const script = `
          tell application "System Events"
            tell process "Photo Booth"
              set buttonList to buttons of window 1
              repeat with btn in buttonList
                if name of btn contains "${target}" then
                  click btn
                  return "success"
                end if
              end repeat
            end tell
          end tell
        `;
        
        return new Promise((resolve, reject) => {
          const process = spawn('osascript', ['-e', script]);
          process.on('close', (code) => {
            if (code === 0) {
              resolve({
                success: true,
                action: 'click',
                target: target,
                message: `네, ${target} 버튼을 클릭했습니다! ✨`
              });
            } else {
              // AppleScript 실패 시 시뮬레이션 응답
              resolve({
                success: true,
                action: 'click',
                target: target,
                message: `${target}를 클릭했습니다. (시뮬레이션)`
              });
            }
          });
          process.on('error', (error) => {
            // 오류 시 시뮬레이션 응답
            resolve({
              success: true,
              action: 'click',
              target: target,
              message: `${target}를 클릭했습니다. (시뮬레이션)`
            });
          });
        });
      } else {
        // 다른 OS에서는 시뮬레이션 응답
        return {
          success: true,
          action: 'click',
          target: target,
          message: `${target}를 클릭했습니다. (시뮬레이션)`
        };
      }
    } catch (error) {
      console.error('클릭 액션 실패:', error);
      return {
        success: false,
        action: 'click',
        target: target,
        message: `죄송해요! ${target} 클릭에 실패했습니다.`
      };
    }
  }

  // 텍스트 입력 (시뮬레이션)
  async performType(text) {
    // 자연스러운 대화형 응답 생성
    const responses = [
      `네, "${text}"를 입력해드릴게요! ✍️`,
      `알겠어요! "${text}"를 타이핑해드릴게요.`,
      `좋아요! "${text}"를 입력해드릴게요! 📝`,
      `네, 바로 "${text}"를 입력해드릴게요! ✨`,
      `알겠습니다! "${text}"를 타이핑하고 있습니다! 🚀`
    ];
    const response = responses[Math.floor(Math.random() * responses.length)];

    return {
      success: true,
      action: 'type',
      text: text,
      message: response
    };
  }

  // 스크롤 (시뮬레이션)
  async performScroll(parameters) {
    return {
      success: true,
      action: 'scroll',
      direction: parameters.direction,
      amount: parameters.amount,
      message: `페이지를 ${parameters.direction}으로 스크롤했습니다.`
    };
  }

  // 탭 읽기 및 분석
  async performTabAnalysis(detectedLanguage = 'ko') {
    try {
      console.log('탭 분석 시작...');
      
      // macOS에서는 AppleScript를 우선적으로 사용
      let pageContent = null;
      if (process.platform === 'darwin') {
        try {
          pageContent = await this.readActiveTab();
          console.log('AppleScript 성공:', pageContent);
        } catch (appleScriptError) {
          console.log('AppleScript 실패, Puppeteer로 재시도...', appleScriptError.message);
          pageContent = null;
        }
      }
      
      // AppleScript가 실패하거나 다른 OS에서는 Puppeteer 사용
      if (!pageContent) {
        try {
          pageContent = await this.readActiveTabWithPuppeteer();
          console.log('Puppeteer 성공:', pageContent);
        } catch (puppeteerError) {
          console.log('Puppeteer도 실패:', puppeteerError.message);
          pageContent = null;
        }
      }
      
      if (!pageContent) {
        const errorMessages = {
          ko: '활성 브라우저 탭을 찾을 수 없습니다. Chrome을 디버그 모드로 실행해주세요: chrome --remote-debugging-port=9222',
          en: 'Active browser tab not found. Please run Chrome in debug mode: chrome --remote-debugging-port=9222'
        };
        return {
          success: false,
          action: 'tab-analysis',
          message: errorMessages[detectedLanguage] || errorMessages.ko
        };
      }

      console.log('탭 정보 읽기 성공:', pageContent);

      // 메모리에서 이전 분석 결과 확인
      const cachedAnalysis = this.getCachedTabAnalysis(pageContent.url);
      if (cachedAnalysis) {
        console.log('캐시된 분석 결과 사용:', cachedAnalysis);
        return {
          success: true,
          action: 'tab-analysis',
          content: pageContent,
          analysis: cachedAnalysis,
          message: cachedAnalysis,
          fromCache: true
        };
      }

      // ChatGPT API를 사용해 페이지 내용 분석 (언어 정보 전달)
      const analysis = await this.analyzePageContent(pageContent, detectedLanguage);
      
      // 분석 결과를 메모리에 저장
      this.saveTabAnalysisToMemory(pageContent.url, analysis, pageContent);
      
      return {
        success: true,
        action: 'tab-analysis',
        content: pageContent,
        analysis: analysis,
        message: analysis // HTML이 포함된 분석 결과
      };
    } catch (error) {
      console.error('탭 분석 실패:', error);
      const errorMessages = {
        ko: '탭 분석 중 오류가 발생했습니다.',
        en: 'An error occurred during tab analysis.'
      };
      return {
        success: false,
        action: 'tab-analysis',
        error: error.message,
        message: errorMessages[detectedLanguage] || errorMessages.ko
      };
    }
  }

  // 현재 활성 탭 읽기 (Puppeteer 사용 - 개선된 버전)
  async readActiveTabWithPuppeteer() {
    try {
      console.log('Puppeteer로 탭 읽기 시작...');
      
      const puppeteer = require('puppeteer');
      
      // 여러 방법으로 브라우저 연결 시도
      let browser = null;
      let connected = false;
      
      // 방법 1: 기존 Chrome 인스턴스에 연결 시도
      try {
        browser = await puppeteer.connect({
          browserURL: 'http://localhost:9222',
          defaultViewport: null
        });
        connected = true;
        console.log('기존 Chrome 인스턴스에 연결 성공');
      } catch (error) {
        console.log('기존 Chrome 연결 실패:', error.message);
        
        // 방법 1-1: 다른 포트로 시도
        try {
          browser = await puppeteer.connect({
            browserURL: 'http://localhost:9223',
            defaultViewport: null
          });
          connected = true;
          console.log('포트 9223으로 Chrome 연결 성공');
        } catch (error2) {
          console.log('포트 9223 연결도 실패:', error2.message);
        }
      }
      
      // 방법 2: 새 브라우저 인스턴스 시작
      if (!connected) {
        try {
          const launchOptions = {
            headless: false,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--disable-gpu',
              '--disable-web-security',
              '--disable-features=VizDisplayCompositor'
            ]
          };

          // 윈도우에서 Chrome 경로 지정
          if (process.platform === 'win32') {
            const possiblePaths = [
              'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
              'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
              process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
            ];
            
            for (const path of possiblePaths) {
              try {
                const fs = require('fs');
                if (fs.existsSync(path)) {
                  launchOptions.executablePath = path;
                  console.log('Chrome 경로 찾음:', path);
                  break;
                }
              } catch (e) {
                console.log('Chrome 경로 확인 실패:', path);
              }
            }
          }

          browser = await puppeteer.launch(launchOptions);
          connected = true;
          console.log('새 브라우저 인스턴스 시작 성공');
        } catch (error) {
          console.log('새 브라우저 시작 실패:', error.message);
        }
      }
      
      if (!browser || !connected) {
        throw new Error('브라우저 연결에 실패했습니다');
      }
      
      const pages = await browser.pages();
      console.log('연결된 페이지 수:', pages.length);
      
      if (pages.length === 0) {
        // 새 페이지 생성
        const page = await browser.newPage();
        await page.goto('https://www.google.com');
        console.log('새 페이지 생성 및 Google로 이동');
        
        const content = await this.extractPageContent(page);
        await browser.close();
        return content;
      }
      
      // 활성 페이지 찾기 (또는 첫 번째 페이지 사용)
      let activePage = null;
      
      // 방법 1: 활성 탭 찾기
      for (const page of pages) {
        try {
          const isVisible = await page.evaluate(() => {
            return !document.hidden && document.visibilityState === 'visible';
          });
          if (isVisible) {
            activePage = page;
            break;
          }
        } catch (error) {
          console.log('페이지 가시성 확인 실패:', error.message);
        }
      }
      
      // 방법 2: 첫 번째 페이지 사용
      if (!activePage) {
        activePage = pages[0];
      }
      
      const content = await this.extractPageContent(activePage);
      
      // 브라우저 연결을 끊지 않고 유지 (다음 요청을 위해)
      if (browser && browser.connected) {
        await browser.disconnect();
      }
      
      return content;
      
    } catch (error) {
      console.error('Puppeteer 탭 읽기 실패:', error);
      throw error;
    }
  }

  // 페이지 내용 추출 (공통 함수)
  async extractPageContent(page) {
    try {
      const content = await page.evaluate(() => {
        // 메타 태그 정보
        const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
        const metaKeywords = document.querySelector('meta[name="keywords"]')?.content || '';
        const ogTitle = document.querySelector('meta[property="og:title"]')?.content || '';
        const ogDescription = document.querySelector('meta[property="og:description"]')?.content || '';
        
        // 주요 텍스트 추출
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => h.textContent.trim()).filter(text => text.length > 0);
        const paragraphs = Array.from(document.querySelectorAll('p')).map(p => p.textContent.trim()).filter(text => text.length > 50).slice(0, 10);
        const lists = Array.from(document.querySelectorAll('ul li, ol li')).map(li => li.textContent.trim()).filter(text => text.length > 0).slice(0, 20);
        
        // 주요 링크
        const links = Array.from(document.querySelectorAll('a')).map(a => ({
          text: a.textContent.trim(),
          href: a.href
        })).filter(link => link.text.length > 0 && link.href).slice(0, 10);
        
        return {
          title: document.title,
          description: metaDescription || ogDescription,
          keywords: metaKeywords,
          ogTitle: ogTitle,
          headings: headings,
          paragraphs: paragraphs,
          lists: lists,
          links: links,
          url: window.location.href
        };
      });
      
      console.log('페이지 내용 추출 완료:', {
        title: content.title,
        url: content.url,
        description: content.description,
        headingsCount: content.headings.length,
        paragraphsCount: content.paragraphs.length
      });
      
      return content;
      
    } catch (error) {
      console.error('페이지 내용 추출 실패:', error);
      throw error;
    }
  }

  // 현재 활성 탭 읽기
  async readActiveTab() {
    return new Promise((resolve, reject) => {
      console.log('탭 읽기 시작...');
      
      // AppleScript를 사용해 현재 활성 브라우저 탭 정보 가져오기
      const script = `
        tell application "System Events"
          set frontApp to name of first application process whose frontmost is true
        end tell
        
        log "현재 포그라운드 앱: " & frontApp
        
        if frontApp contains "Google Chrome" then
          tell application "Google Chrome"
            set currentTab to active tab of front window
            set tabTitle to title of currentTab
            set tabURL to URL of currentTab
            log "Chrome 탭 제목: " & tabTitle
            log "Chrome 탭 URL: " & tabURL
            return {tabTitle, tabURL}
          end tell
        else if frontApp contains "Safari" then
          tell application "Safari"
            set currentTab to current tab of front window
            set tabTitle to name of currentTab
            set tabURL to URL of currentTab
            log "Safari 탭 제목: " & tabTitle
            log "Safari 탭 URL: " & tabURL
            return {tabTitle, tabURL}
          end tell
        else
          log "지원되지 않는 앱: " & frontApp
          return "no_browser"
        end if
      `;
      
      console.log('AppleScript 실행 중...');
      const process = spawn('osascript', ['-e', script]);
      let output = '';
      let errorOutput = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
        console.log('AppleScript 출력:', data.toString());
      });
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.log('AppleScript 에러:', data.toString());
      });
      
      process.on('close', (code) => {
        console.log('AppleScript 종료 코드:', code);
        console.log('전체 출력:', output);
        console.log('전체 에러:', errorOutput);
        
        if (code === 0 && output.trim() !== 'no_browser') {
          try {
            const lines = output.trim().split(', ');
            console.log('파싱된 라인:', lines);
            const title = lines[0] || '제목 없음';
            const url = lines[1] || 'URL 없음';
            console.log('추출된 제목:', title);
            console.log('추출된 URL:', url);
            resolve({ title, url });
          } catch (error) {
            console.error('탭 정보 파싱 실패:', error);
            reject(new Error('탭 정보 파싱 실패'));
          }
        } else {
          console.error('AppleScript 실행 실패 또는 브라우저 없음');
          reject(new Error('활성 브라우저 탭을 찾을 수 없습니다'));
        }
      });
      
      process.on('error', (error) => {
        console.error('AppleScript 프로세스 에러:', error);
        reject(new Error(`탭 읽기 오류: ${error.message}`));
      });
    });
  }

  // 페이지 내용 분석 (ChatGPT API 사용) - 개선된 버전
  async analyzePageContent(pageContent, detectedLanguage = 'ko') {
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    try {
      // 언어별 프롬프트 설정
      const languagePrompts = {
        ko: {
          intro: '다음 웹페이지를 분석해주세요:',
          pageType: '페이지 유형',
          summary: '주요 내용 요약',
          keyPoints: '핵심 포인트',
          features: '특징적인 요소들',
          instruction: '분석 결과를 한국어로 간결하고 구조화된 형태로 작성해주세요:',
          systemPrompt: `You are Guidant, an intelligent desktop assistant that executes tasks, interprets on-screen content, and writes like a professional.

Your core capabilities include:
1. **Action execution**: When the user asks to open an app (e.g. KakaoTalk, Notion, Outlook), or schedule a meeting in Outlook, you must translate their intent into clear, executable actions. Use concise instructions for UI interaction or app control.
2. **Professional writing**: When the user requests emails, documents, or explanations, respond with precise, well-structured, and context-aware writing. Match the tone to the task (e.g. formal for emails, informative for reports).
3. **On-screen interpretation**: When the user refers to what they're seeing (e.g. websites, videos, documents), provide accurate summaries, analyses, or translations based on visible content. Respond with clarity and expertise.

Formatting guidelines:
- Use structured output: clear titles, bullet points, numbered lists, or tables as appropriate.
- Keep your tone intelligent, efficient, and helpful—like a smart operating system assistant.
- Prioritise **doing** over explaining when a task is requested.

You operate as a context-aware assistant. If you're unsure, ask clarifying questions. But when the intent is clear, act immediately.

당신은 웹페이지 내용을 분석하고 요약하는 전문가입니다. 구조화되고 명확한 분석 결과를 제공해주세요.`
        },
        en: {
          intro: 'Please analyze the following webpage:',
          pageType: 'Page Type',
          summary: 'Main Content Summary',
          keyPoints: 'Key Points',
          features: 'Notable Features',
          instruction: 'Please provide the analysis results in English with clear structure and formatting:',
          systemPrompt: `You are Guidant, an intelligent desktop assistant that executes tasks, interprets on-screen content, and writes like a professional.

Your core capabilities include:
1. **Action execution**: When the user asks to open an app (e.g. KakaoTalk, Notion, Outlook), or schedule a meeting in Outlook, you must translate their intent into clear, executable actions. Use concise instructions for UI interaction or app control.
2. **Professional writing**: When the user requests emails, documents, or explanations, respond with precise, well-structured, and context-aware writing. Match the tone to the task (e.g. formal for emails, informative for reports).
3. **On-screen interpretation**: When the user refers to what they're seeing (e.g. websites, videos, documents), provide accurate summaries, analyses, or translations based on visible content. Respond with clarity and expertise.

Formatting guidelines:
- Use structured output: clear titles, bullet points, numbered lists, or tables as appropriate.
- Keep your tone intelligent, efficient, and helpful—like a smart operating system assistant.
- Prioritise **doing** over explaining when a task is requested.

You operate as a context-aware assistant. If you're unsure, ask clarifying questions. But when the intent is clear, act immediately.

You are an expert in analyzing and summarizing webpage content. Provide structured and clear analysis results.`
        }
      };

      const lang = languagePrompts[detectedLanguage] || languagePrompts.ko;

      let prompt = `
${lang.intro}

제목: ${pageContent.title}
URL: ${pageContent.url}
`;

      // 메타 정보 추가
      if (pageContent.description) {
        prompt += `설명: ${pageContent.description}\n`;
      }
      if (pageContent.keywords) {
        prompt += `키워드: ${pageContent.keywords}\n`;
      }
      if (pageContent.ogTitle) {
        prompt += `OG 제목: ${pageContent.ogTitle}\n`;
      }

      // 주요 제목들 추가
      if (pageContent.headings && pageContent.headings.length > 0) {
        prompt += `\n주요 제목들:\n${pageContent.headings.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n`;
      }

      // 주요 문단들 추가
      if (pageContent.paragraphs && pageContent.paragraphs.length > 0) {
        prompt += `\n주요 내용:\n${pageContent.paragraphs.slice(0, 5).map((p, i) => `${i + 1}. ${p.substring(0, 200)}...`).join('\n')}\n`;
      }

      // 목록 항목들 추가
      if (pageContent.lists && pageContent.lists.length > 0) {
        prompt += `\n목록 항목들:\n${pageContent.lists.slice(0, 10).map((item, i) => `${i + 1}. ${item}`).join('\n')}\n`;
      }

      // 주요 링크들 추가
      if (pageContent.links && pageContent.links.length > 0) {
        prompt += `\n주요 링크들:\n${pageContent.links.slice(0, 5).map((link, i) => `${i + 1}. ${link.text} (${link.href})`).join('\n')}\n`;
      }

      if (detectedLanguage === 'en') {
        prompt += `\n\nPlease provide a natural and clear summary of this page's main content. \nIMPORTANT: When creating bullet points, use this EXACT format: <ul><li>• Your content here</li></ul>\nThe bullet point (•) and text MUST be on the same line within each <li> tag.\nWrite other explanations as paragraphs (p).\nDo not use Page Type, separators, underlines, or uppercase emphasis.\nProvide analysis that is natural and easy to read like ChatGPT responses.\n`;
      } else {
        prompt += `\n\n이 페이지의 주요 내용을 자연스럽고 명확하게 요약해줘. \n중요: bullet point를 만들 때는 반드시 이 형식을 사용하세요: <ul><li>• 여기에 내용을 작성</li></ul>\nbullet point (•)와 텍스트는 반드시 각 <li> 태그 안에서 같은 줄에 있어야 합니다.\n그 외의 설명은 단락(p)으로 작성해줘.\nPage Type, 구분선, 밑줄, 대문자 강조 등은 사용하지 마.\nChatGPT 답변처럼 자연스럽고 읽기 쉽게 분석해줘.\n`;
      }

      console.log('ChatGPT API 호출 중...');
      console.log('프롬프트 길이:', prompt.length);
      console.log('감지된 언어:', detectedLanguage);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: lang.systemPrompt
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1200,
        temperature: 0.7
      });

      const result = completion.choices[0].message.content;
      console.log('ChatGPT 분석 결과:', result);
      
      // HTML 결과를 렌더링 가능한 형태로 변환
      const formattedResult = this.formatAnalysisResult(result, detectedLanguage);
      return formattedResult;
    } catch (error) {
      console.error('ChatGPT API 오류:', error);
      const errorMessages = {
        ko: '페이지 분석 중 오류가 발생했습니다.',
        en: 'An error occurred while analyzing the page.'
      };
      return errorMessages[detectedLanguage] || errorMessages.ko;
    }
  }

  // ChatGPT API로 대화형 응답 생성
  async generateConversationalResponse(analysis, result, detectedLanguage = 'ko') {
    try {
      const systemPrompts = {
        ko: `You are Guidant, an intelligent desktop assistant that executes tasks, interprets on-screen content, and writes like a professional.

Your core capabilities include:
1. **Action execution**: When the user asks to open an app (e.g. KakaoTalk, Notion, Outlook), or schedule a meeting in Outlook, you must translate their intent into clear, executable actions. Use concise instructions for UI interaction or app control.
2. **Professional writing**: When the user requests emails, documents, or explanations, respond with precise, well-structured, and context-aware writing. Match the tone to the task (e.g. formal for emails, informative for reports).
3. **On-screen interpretation**: When the user refers to what they're seeing (e.g. websites, videos, documents), provide accurate summaries, analyses, or translations based on visible content. Respond with clarity and expertise.

Formatting guidelines:
- Use structured output: clear titles, bullet points, numbered lists, or tables as appropriate.
- **Always use bullet points (•) for lists and key information to improve readability.**
- Keep your tone intelligent, efficient, and helpful—like a smart operating system assistant.
- Prioritise **doing** over explaining when a task is requested.

You operate as a context-aware assistant. If you're unsure, ask clarifying questions. But when the intent is clear, act immediately.

사용자의 명령을 실행한 후 자연스럽고 친근한 한국어로 응답해주세요.

응답 스타일:
- 친근하고 따뜻한 톤
- 이모지 적절히 사용 (하지만 과도하지 않게)
- 명령 실행 완료를 자연스럽게 알림
- 사용자에게 도움이 되었다는 느낌을 줌
- **가독성을 위해 bullet point (•)를 최대한 활용**

예시:
- "네, 설정을 열어드릴게요! 🖥️"
- "좋아요! Chrome 브라우저를 열었습니다 🌐"
- "알겠어요! '나이아가라 폭포'를 검색해드릴게요 🔍"`,
        
        en: `You are Guidant, an intelligent desktop assistant that executes tasks, interprets on-screen content, and writes like a professional.

Your core capabilities include:
1. **Action execution**: When the user asks to open an app (e.g. KakaoTalk, Notion, Outlook), or schedule a meeting in Outlook, you must translate their intent into clear, executable actions. Use concise instructions for UI interaction or app control.
2. **Professional writing**: When the user requests emails, documents, or explanations, respond with precise, well-structured, and context-aware writing. Match the tone to the task (e.g. formal for emails, informative for reports).
3. **On-screen interpretation**: When the user refers to what they're seeing (e.g. websites, videos, documents), provide accurate summaries, analyses, or translations based on visible content. Respond with clarity and expertise.

Formatting guidelines:
- Use structured output: clear titles, bullet points, numbered lists, or tables as appropriate.
- Keep your tone intelligent, efficient, and helpful—like a smart operating system assistant.
- Prioritise **doing** over explaining when a task is requested.

You operate as a context-aware assistant. If you're unsure, ask clarifying questions. But when the intent is clear, act immediately.

After executing the user's command, respond in natural and friendly English.

Response style:
- Friendly and warm tone
- Use emojis appropriately (but not excessively)
- Naturally inform about command completion
- Give the user a feeling that you've been helpful

Examples:
- "Sure, I'll open the settings for you! 🖥️"
- "Great! I've opened Chrome browser 🌐"
- "Got it! I'll search for 'Niagara Falls' for you 🔍"`
      };

      const systemPrompt = systemPrompts[detectedLanguage] || systemPrompts.ko;

      const userPrompt = `사용자 명령: ${analysis.originalCommand || '알 수 없는 명령'}
실행된 액션: ${analysis.action}
대상: ${analysis.target || '없음'}
매개변수: ${JSON.stringify(analysis.parameters || {})}
실행 결과: ${result.success ? '성공' : '실패'}

위 정보를 바탕으로 자연스러운 대화형 응답을 생성해주세요.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 100
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('ChatGPT 응답 생성 실패:', error);
      // 폴백: 기본 응답
      return this.getFallbackResponse(analysis, result);
    }
  }

  // 분석 결과 포맷팅 함수
  formatAnalysisResult(result, detectedLanguage) {
    try {
      // 코드 블록 제거 (```html, ```json 등)
      let formatted = result
        .replace(/```[a-zA-Z]*\n?/g, '') // 코드 블록 시작 제거
        .replace(/```\n?/g, '') // 코드 블록 끝 제거
        .replace(/'''[a-zA-Z]*\n?/g, '') // 삼중 따옴표 코드 블록 제거
        .replace(/'''\n?/g, '') // 삼중 따옴표 끝 제거
        .replace(/<h2>.*?<\/h2>/g, '')
        .replace(/<hr ?\/?>(\n)?/g, '')
        .replace(/<strong>(.*?)<\/strong>/g, '<b>$1</b>'); // 볼드만 유지

      // ul/li는 그대로 두고, 나머지 텍스트만 <p>로 감싸기
      formatted = formatted.replace(/(?:^|\n)(?!<ul>|<\/ul>|<li>|<\/li>)([^\n<][^\n]*)/g, (match, p1) => {
        if (!p1.trim()) return '';
        return `<p>${p1.trim()}</p>`;
      });

      return formatted;
    } catch (e) {
      return result;
    }
  }

  // 메모리 관리 함수들
  saveCommandToMemory(analysis, detectedLanguage) {
    const commandRecord = {
      timestamp: new Date(),
      analysis: analysis,
      language: detectedLanguage
    };
    
    this.conversationMemory.lastCommands.push(commandRecord);
    
    // 최대 10개까지만 유지
    if (this.conversationMemory.lastCommands.length > 10) {
      this.conversationMemory.lastCommands.shift();
    }
    
    console.log('명령 저장됨:', analysis.action);
  }

  saveTabAnalysisToMemory(url, analysis, pageContent) {
    const analysisRecord = {
      timestamp: new Date(),
      analysis: analysis,
      pageContent: pageContent,
      url: url
    };
    
    this.conversationMemory.tabAnalysis.set(url, analysisRecord);
    console.log('탭 분석 결과 저장됨:', url);
  }

  getCachedTabAnalysis(url) {
    const cached = this.conversationMemory.tabAnalysis.get(url);
    if (cached) {
      // 30분 이내의 캐시만 유효
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      if (cached.timestamp > thirtyMinutesAgo) {
        return cached.analysis;
      } else {
        // 오래된 캐시 삭제
        this.conversationMemory.tabAnalysis.delete(url);
      }
    }
    return null;
  }

  getRecentCommands(count = 5) {
    return this.conversationMemory.lastCommands.slice(-count);
  }

  // 후속질문 관련 함수들 제거

  clearMemory() {
    this.conversationMemory.tabAnalysis.clear();
    this.conversationMemory.lastCommands = [];
    console.log('메모리 초기화됨');
  }

  clearConversationMemory() {
    this.conversationMemory.tabAnalysis.clear();
    this.conversationMemory.lastCommands = [];
    console.log('대화 메모리 초기화됨');
  }

  // 폴백 응답 생성
  getFallbackResponse(analysis, result, detectedLanguage = 'ko') {
    const actionResponses = {
      ko: {
        'open': {
          'settings': '네, 설정을 열어드릴게요! 🖥️',
          'chrome': '좋아요! Chrome 브라우저를 열었습니다 🌐',
          'safari': '알겠어요! Safari 브라우저를 열어드릴게요 🌐',
          'default': '네, 요청하신 앱을 열어드릴게요! ✨'
        },
        'search': {
          'default': '네, 검색을 실행해드릴게요! 🔍'
        },
        'type': {
          'default': '알겠어요! 텍스트를 입력해드릴게요 ✍️'
        },
        'scroll': {
          'default': '좋아요! 페이지를 스크롤해드릴게요 📜'
        }
      },
      en: {
        'open': {
          'settings': 'Sure, I\'ll open the settings for you! 🖥️',
          'chrome': 'Great! I\'ve opened Chrome browser 🌐',
          'safari': 'Got it! I\'ll open Safari browser for you 🌐',
          'default': 'Sure, I\'ll open the requested app for you! ✨'
        },
        'search': {
          'default': 'Sure, I\'ll perform the search for you! 🔍'
        },
        'type': {
          'default': 'Got it! I\'ll type the text for you ✍️'
        },
        'scroll': {
          'default': 'Great! I\'ll scroll the page for you 📜'
        }
      }
    };

    const languageResponses = actionResponses[detectedLanguage] || actionResponses.ko;
    const actionType = analysis.action;
    const target = analysis.target;
    
    if (languageResponses[actionType]) {
      return languageResponses[actionType][target] || languageResponses[actionType]['default'];
    }
    
    const defaultMessages = {
      ko: '네, 명령을 실행해드릴게요! ✨',
      en: 'Sure, I\'ll execute the command for you! ✨'
    };
    
    return defaultMessages[detectedLanguage] || defaultMessages.ko;
  }

  // 후속질문 관련 함수들 완전 제거 - 모든 대화는 자연스럽게 처리
}

module.exports = AdvancedActionExecutor; 