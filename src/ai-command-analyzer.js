const OpenAI = require('openai');

class AICommandAnalyzer {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.isAvailable = !!process.env.OPENAI_API_KEY;
  }

  async analyzeCommand(userCommand, detectedLanguage = 'ko') {
    // 1단계: 음성 인식 후처리 - 일반적인 오인식 수정
    const correctedCommand = this.correctSpeechRecognition(userCommand);
    console.log(`원본 명령: "${userCommand}" → 수정된 명령: "${correctedCommand}"`);
    
    // 2단계: ChatGPT로 음성 인식 결과 재검증 및 개선
    const improvedCommand = await this.improveSpeechRecognition(correctedCommand);
    console.log(`개선된 명령: "${improvedCommand}"`);
    
    // API 키가 없으면 기본 분석기 사용
    if (!this.isAvailable) {
      console.log('ChatGPT API를 사용할 수 없어서 기본 분석기를 사용합니다.');
      return this.fallbackAnalysis(improvedCommand);
    }

    try {
      // 언어에 따른 시스템 프롬프트 설정
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

당신은 사용자의 자연어 명령을 분석하여 컴퓨터 제어 액션으로 변환하는 AI 어시스턴트입니다.

사용 가능한 액션 타입:
1. open: 앱/웹사이트 열기
2. search: 웹 검색 (브라우저에서 검색)
3. ai-search: ChatGPT API로 직접 답변 제공
4. click: UI 요소 클릭
5. type: 텍스트 입력
6. scroll: 페이지 스크롤
7. call: 전화 걸기
8. message: 메시지 보내기
9. file: 파일 관리
10. system: 시스템 설정
11. tab-analysis: 현재 브라우저 탭 분석
12. outlook-calendar: Outlook 일정 추가/관리
13. slack: Slack 메시지 전송
14. notion: Notion 페이지 관리
15. trello: Trello 카드 관리

**중요: 반드시 JSON 형식으로만 응답하세요!**

응답 형식 (JSON):
{
  "action": "액션타입",
  "target": "대상",
  "parameters": {
    "query": "검색어",
    "text": "입력할 텍스트",
    "direction": "스크롤 방향",
    "amount": "스크롤 양"
  },
  "confidence": 0.95,
  "explanation": "분석 설명"
}

**규칙:**
1. 반드시 JSON 형식으로만 응답
2. 일반적인 질문은 "ai-search" 액션으로 처리
3. 설명이나 자연어 응답 금지
4. JSON 파싱 가능한 형식만 사용
5. 코드 블록 사용 금지 - 순수 JSON만 반환

예시:
- "구글에서 나이아가라 폭포 검색해줘" → {"action": "search", "target": "Google", "parameters": {"query": "나이아가라 폭포"}}
- "나이아가라 폭포에 대해 알려줘" → {"action": "ai-search", "target": "ai", "parameters": {"query": "나이아가라 폭포"}}
- "can you search up 나이아가라 폭포" → {"action": "ai-search", "target": "ai", "parameters": {"query": "나이아가라 폭포"}}
- "지금 뭐하고 있어?" → {"action": "ai-search", "target": "ai", "parameters": {"query": "지금 뭐하고 있어?"}}
- "So what are you doing right now?" → {"action": "ai-search", "target": "ai", "parameters": {"query": "So what are you doing right now?"}}
- "오늘 날씨 어때?" → {"action": "ai-search", "target": "ai", "parameters": {"query": "오늘 날씨 어때?"}}
- "How's the weather today?" → {"action": "ai-search", "target": "ai", "parameters": {"query": "How's the weather today?"}}
- "뭐해?" → {"action": "ai-search", "target": "ai", "parameters": {"query": "뭐해?"}}
- "What are you doing?" → {"action": "ai-search", "target": "ai", "parameters": {"query": "What are you doing?"}}
- "Chrome 열어줘" → {"action": "open", "target": "Chrome"}
- "폴더 열어줘" → {"action": "open", "target": "folder"}
- "Finder 열어줘" → {"action": "open", "target": "finder"}
- "CapCut 열어줘" → {"action": "open", "target": "CapCut"}
- "Final Cut 열어줘" → {"action": "open", "target": "Final Cut Pro"}
- "Photoshop 열어줘" → {"action": "open", "target": "Adobe Photoshop"}
- "Figma 열어줘" → {"action": "open", "target": "Figma"}
- "이 페이지를 분석해줘" → {"action": "tab-analysis", "target": "current_tab"}
- "현재 탭 분석해줘" → {"action": "tab-analysis", "target": "current_tab"}
- "이 뉴스 기사 요약해줘" → {"action": "tab-analysis", "target": "current_tab"}
- "Photo Booth 카메라 버튼 클릭해줘" → {"action": "click", "target": "camera"}
- "카메라 버튼 눌러줘" → {"action": "click", "target": "camera"}
- "사진 찍기 버튼 클릭해줘" → {"action": "click", "target": "camera"}
- "전화 걸어줘" → {"action": "call", "target": "전화"}
- "설정 열어줘" → {"action": "open", "target": "시스템 설정"}
- "김철수에게 안녕하세요 메시지 보내줘" → {"action": "message", "target": "김철수", "parameters": {"text": "안녕하세요", "platform": "kakao"}}
- "카카오톡으로 영희에게 만나서 반가웠어 메시지 보내줘" → {"action": "message", "target": "영희", "parameters": {"text": "만나서 반가웠어", "platform": "kakao"}}
- "친구에게 오늘 날씨 좋네요 메시지 보내줘" → {"action": "message", "target": "친구", "parameters": {"text": "오늘 날씨 좋네요", "platform": "kakao"}}
- "엄마에게 안녕하세요 메시지 보내줘" → {"action": "message", "target": "엄마", "parameters": {"text": "안녕하세요", "platform": "kakao"}}
- "아빠한테 오늘 날씨 좋네요 메시지 보내줘" → {"action": "message", "target": "아빠", "parameters": {"text": "오늘 날씨 좋네요", "platform": "kakao"}}

@mention 방식 예시:
- "@outlook 2025년 7월 28일 오후 2시~2시반까지 회의 잡아줘" → {"action": "outlook-calendar", "target": "outlook", "parameters": {"date": "2025년 7월 28일", "startTime": "오후 2시", "endTime": "오후 2시반", "title": "회의"}}
- "@outlook 내일 오전 10시부터 11시까지 팀 미팅 예약해줘" → {"action": "outlook-calendar", "target": "outlook", "parameters": {"date": "내일", "startTime": "오전 10시", "endTime": "오전 11시", "title": "팀 미팅"}}
- "@outlook 오늘 오후 3시부터 4시까지 클라이언트 미팅" → {"action": "outlook-calendar", "target": "outlook", "parameters": {"date": "오늘", "startTime": "오후 3시", "endTime": "오후 4시", "title": "클라이언트 미팅"}}
- "@outlook 7월 30일 오후 2시~3시까지 프로젝트 리뷰" → {"action": "outlook-calendar", "target": "outlook", "parameters": {"date": "2025년 7월 30일", "startTime": "오후 2시", "endTime": "오후 3시", "title": "프로젝트 리뷰"}}
- "@slack #general 채널에 안녕하세요 메시지 보내줘" → {"action": "slack", "target": "slack", "parameters": {"channel": "general", "text": "안녕하세요"}}
- "@notion 오늘 회의록 페이지 만들어줘" → {"action": "notion", "target": "notion", "parameters": {"action": "create_page", "title": "오늘 회의록"}}
- "@trello 프로젝트 보드에 새 카드 추가해줘" → {"action": "trello", "target": "trello", "parameters": {"action": "create_card", "title": "새 카드"}}`,
        
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

You are an AI assistant that analyzes user's natural language commands and converts them into computer control actions.

Available action types:
1. open: open app/website
2. search: web search (open browser)
3. ai-search: direct answer via ChatGPT API
4. click: click UI element
5. type: text input
6. scroll: page scroll
7. call: make phone call
8. message: send message
9. file: file management
10. system: system settings
11. tab-analysis: analyze current browser tabs
12. outlook-calendar: Outlook calendar management
13. slack: Slack message sending
14. notion: Notion page management
15. trello: Trello card management

**IMPORTANT: You MUST respond ONLY in JSON format!**

Response format (JSON):
{
  "action": "action_type",
  "target": "target",
  "parameters": {
    "query": "search_query",
    "text": "text_to_input",
    "direction": "scroll_direction",
    "amount": "scroll_amount"
  },
  "confidence": 0.95,
  "explanation": "analysis_explanation"
}

**Rules:**
1. Respond ONLY in JSON format
2. General questions should use "ai-search" action
3. No explanations or natural language responses
4. Use only JSON-parseable format
5. NO code blocks - return pure JSON only

Examples:
- "search for Niagara Falls on Google" → {"action": "search", "target": "Google", "parameters": {"query": "Niagara Falls"}}
- "tell me about Niagara Falls" → {"action": "ai-search", "target": "ai", "parameters": {"query": "Niagara Falls"}}
- "can you search up Niagara Falls" → {"action": "ai-search", "target": "ai", "parameters": {"query": "Niagara Falls"}}
- "So what are you doing right now?" → {"action": "ai-search", "target": "ai", "parameters": {"query": "So what are you doing right now?"}}
- "What are you doing?" → {"action": "ai-search", "target": "ai", "parameters": {"query": "What are you doing?"}}
- "How's the weather today?" → {"action": "ai-search", "target": "ai", "parameters": {"query": "How's the weather today?"}}
- "What time is it?" → {"action": "ai-search", "target": "ai", "parameters": {"query": "What time is it?"}}
- "How are you?" → {"action": "ai-search", "target": "ai", "parameters": {"query": "How are you?"}}
- "open Chrome" → {"action": "open", "target": "Chrome"}
- "open the folder" → {"action": "open", "target": "folder"}
- "open Finder" → {"action": "open", "target": "finder"}
- "open CapCut" → {"action": "open", "target": "CapCut"}
- "open Final Cut Pro" → {"action": "open", "target": "Final Cut Pro"}
- "open Photoshop" → {"action": "open", "target": "Adobe Photoshop"}
- "open Figma" → {"action": "open", "target": "Figma"}
- "analyze this page" → {"action": "tab-analysis", "target": "current_tab"}
- "summarize this article" → {"action": "tab-analysis", "target": "current_tab"}
- "what's on this page" → {"action": "tab-analysis", "target": "current_tab"}
- "click the camera button in Photo Booth" → {"action": "click", "target": "camera"}
- "click the camera button" → {"action": "click", "target": "camera"}
- "take a photo" → {"action": "click", "target": "camera"}
- "make a phone call" → {"action": "call", "target": "phone"}
- "open settings" → {"action": "open", "target": "system settings"}
- "send a message to John saying hello" → {"action": "message", "target": "John", "parameters": {"text": "hello", "platform": "kakao"}}
- "message Sarah about the weather" → {"action": "message", "target": "Sarah", "parameters": {"text": "about the weather", "platform": "kakao"}}

@mention examples:
- "@outlook schedule a meeting for July 28th, 2025 from 2:00 PM to 2:30 PM" → {"action": "outlook-calendar", "target": "outlook", "parameters": {"date": "July 28, 2025", "startTime": "2:00 PM", "endTime": "2:30 PM", "title": "meeting"}}
- "@outlook book a team meeting tomorrow from 10 AM to 11 AM" → {"action": "outlook-calendar", "target": "outlook", "parameters": {"date": "tomorrow", "startTime": "10 AM", "endTime": "11 AM", "title": "team meeting"}}
- "@outlook schedule client meeting today from 3 PM to 4 PM" → {"action": "outlook-calendar", "target": "outlook", "parameters": {"date": "today", "startTime": "3 PM", "endTime": "4 PM", "title": "client meeting"}}
- "@outlook book project review for July 30th from 2 PM to 3 PM" → {"action": "outlook-calendar", "target": "outlook", "parameters": {"date": "July 30, 2025", "startTime": "2 PM", "endTime": "3 PM", "title": "project review"}}
- "@slack send hello message to #general channel" → {"action": "slack", "target": "slack", "parameters": {"channel": "general", "text": "hello"}}
- "@notion create a meeting notes page for today" → {"action": "notion", "target": "notion", "parameters": {"action": "create_page", "title": "meeting notes for today"}}
- "@trello add a new card to the project board" → {"action": "trello", "target": "trello", "parameters": {"action": "create_card", "title": "new card"}}`
      };

      const systemPrompt = systemPrompts[detectedLanguage] || systemPrompts.ko;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: improvedCommand }
        ],
        temperature: 0.01,
        max_tokens: 150
      });

      let responseContent = response.choices[0].message.content.trim();
      
      // 코드 블록 제거 (```json ... ```)
      if (responseContent.startsWith('```json')) {
        responseContent = responseContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (responseContent.startsWith('```')) {
        responseContent = responseContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // JSON 응답이 아닌 경우 처리
      if (!responseContent.startsWith('{')) {
        console.log('GPT가 JSON이 아닌 응답을 반환했습니다:', responseContent);
        
        // 일반적인 질문인지 확인
        const questionKeywords = ['what', 'how', 'why', 'when', 'where', 'tell me', 'explain', 'describe', '뭐', '어떻게', '왜', '언제', '어디', '알려줘', '설명', '이해'];
        const isQuestion = questionKeywords.some(keyword => 
          responseContent.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (isQuestion) {
          // 질문인 경우 ai-search로 처리
          return {
            action: 'ai-search',
            target: 'ai',
            parameters: { query: userCommand },
            confidence: 0.9,
            explanation: '일반적인 질문으로 인식하여 AI 검색으로 처리',
            originalCommand: userCommand
          };
        } else {
          // 다른 경우 폴백 분석 사용
          return this.fallbackAnalysis(userCommand);
        }
      }
      
      const analysis = JSON.parse(responseContent);
      // 원본 명령 추가
      analysis.originalCommand = userCommand;
      return analysis;
    } catch (error) {
      console.error('AI 명령 분석 실패:', error);
      // 폴백: 기본 명령 분석
      return this.fallbackAnalysis(userCommand);
    }
  }

  fallbackAnalysis(command) {
    const lowerCommand = command.toLowerCase();
    
    // Chrome 관련 명령어
    if (lowerCommand.includes('chrome') || lowerCommand.includes('크롬') || 
        lowerCommand.includes('인터넷') || lowerCommand.includes('internet')) {
      return {
        action: 'open',
        target: 'Chrome',
        parameters: {},
        confidence: 0.9,
        explanation: 'Chrome 브라우저 열기'
      };
    }
    
    // 설정 관련 명령어
    if (lowerCommand.includes('설정') || lowerCommand.includes('settings') || 
        lowerCommand.includes('맥북 설정') || lowerCommand.includes('macbook')) {
      return {
        action: 'open',
        target: '시스템 설정',
        parameters: {},
        confidence: 0.9,
        explanation: '시스템 설정 열기'
      };
    }
    
    // Photo Booth 관련 명령어
    if (lowerCommand.includes('photo booth') || lowerCommand.includes('photobooth') || 
        lowerCommand.includes('포토부스') || lowerCommand.includes('카메라 앱') || 
        lowerCommand.includes('사진 촬영')) {
      return {
        action: 'open',
        target: 'Photo Booth',
        parameters: {},
        confidence: 0.9,
        explanation: 'Photo Booth 앱 열기'
      };
    }
    
    // 클릭 관련 명령어
    if (lowerCommand.includes('클릭') || lowerCommand.includes('click') || 
        lowerCommand.includes('눌러') || lowerCommand.includes('버튼')) {
      // 클릭 대상 추출
      let target = command;
      target = target.replace(/클릭|click|눌러|버튼|해줘|해주세요|please/gi, '').trim();
      
      if (target.includes('카메라') || target.includes('camera') || target.includes('사진')) {
        return {
          action: 'click',
          target: 'camera',
          parameters: {},
          confidence: 0.8,
          explanation: '카메라 버튼 클릭'
        };
      }
      
      if (target) {
        return {
          action: 'click',
          target: target,
          parameters: {},
          confidence: 0.7,
          explanation: `${target} 클릭`
        };
      }
    }
    
    // 검색 관련 명령어
    if (lowerCommand.includes('검색') || lowerCommand.includes('search') || 
        lowerCommand.includes('구글') || lowerCommand.includes('google')) {
      // 검색어 추출
      let query = command;
      query = query.replace(/검색|search|구글|google/gi, '').trim();
      query = query.replace(/해줘|해주세요|please/gi, '').trim();
      
      if (query) {
        return {
          action: 'search',
          target: 'Google',
          parameters: { query: query },
          confidence: 0.8,
          explanation: `"${query}" 검색`
        };
      }
    }
    
    // 일반적인 질문인 경우
    const questionKeywords = ['what', 'how', 'why', 'when', 'where', 'tell me', 'explain', 'describe', '뭐', '어떻게', '왜', '언제', '어디', '알려줘', '설명', '이해'];
    const isQuestion = questionKeywords.some(keyword => 
      lowerCommand.includes(keyword.toLowerCase())
    );
    
    if (isQuestion) {
      return {
        action: 'ai-search',
        target: 'ai',
        parameters: { query: command },
        confidence: 0.7,
        explanation: '일반적인 질문으로 인식'
      };
    }
    
    // 기본값
    return {
      action: 'unknown',
      target: null,
      parameters: {},
      confidence: 0.1,
      explanation: '알 수 없는 명령'
    };
  }

  correctSpeechRecognition(command) {
    let corrected = command;
    
    // 일반적인 음성 인식 오류 수정
    const corrections = {
      // "and" → "on" 수정 (예: "type hello and google" → "type hello on google")
      ' and google': ' on google',
      ' and chrome': ' on chrome',
      ' and internet': ' on internet',
      
      // "word" → "world" 수정
      ' word ': ' world ',
      ' word.': ' world.',
      ' word?': ' world?',
      
      // "fermi" → "for me" 수정
      ' fermi ': ' for me ',
      ' fermi.': ' for me.',
      ' fermi?': ' for me?',
      
      // "crown" → "chrome" 수정
      ' crown ': ' chrome ',
      ' crown.': ' chrome.',
      ' crown?': ' chrome?',
      
      // "setting" → "settings" 수정
      ' setting ': ' settings ',
      ' setting.': ' settings.',
      ' setting?': ' settings?',
      
      // "new jin" → "new jeans" 수정
      ' new jin ': ' new jeans ',
      ' new jin.': ' new jeans.',
      ' new jin?': ' new jeans?',
      ' new jin': ' new jeans',
      
      // "jean" → "jeans" 수정
      ' jean ': ' jeans ',
      ' jean.': ' jeans.',
      ' jean?': ' jeans?',
      
      // "type" 명령 개선
      'type ': 'type ',
      ' on ': ' on '
    };
    
    // 각 수정사항 적용 (정규식 대신 단순 문자열 치환으로 속도 향상)
    for (const [pattern, replacement] of Object.entries(corrections)) {
      corrected = corrected.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replacement);
    }
    
    return corrected;
  }

  async improveSpeechRecognition(command) {
    if (!this.isAvailable) {
      return command; // API가 없으면 원본 반환
    }

    try {
      const systemPrompt = `You are Guidant, an intelligent desktop assistant that executes tasks, interprets on-screen content, and writes like a professional.

Your core capabilities include:
1. **Action execution**: When the user asks to open an app (e.g. KakaoTalk, Notion, Outlook), or schedule a meeting in Outlook, you must translate their intent into clear, executable actions. Use concise instructions for UI interaction or app control.
2. **Professional writing**: When the user requests emails, documents, or explanations, respond with precise, well-structured, and context-aware writing. Match the tone to the task (e.g. formal for emails, informative for reports).
3. **On-screen interpretation**: When the user refers to what they're seeing (e.g. websites, videos, documents), provide accurate summaries, analyses, or translations based on visible content. Respond with clarity and expertise.

Formatting guidelines:
- Use structured output: clear titles, bullet points, numbered lists, or tables as appropriate.
- Keep your tone intelligent, efficient, and helpful—like a smart operating system assistant.
- Prioritise **doing** over explaining when a task is requested.

You operate as a context-aware assistant. If you're unsure, ask clarifying questions. But when the intent is clear, act immediately.

당신은 음성 인식 결과를 개선하는 전문가입니다.
사용자가 실제로 말하려고 했던 내용을 추측하여 정확한 문장으로 수정해주세요.

주요 개선 사항:
1. 발음 오류 수정 (예: "crown" → "chrome", "fermi" → "for me")
2. 문법 오류 수정
3. 맥락에 맞는 단어로 교체
4. 자연스러운 문장으로 완성

예시:
- "Can you open the crown for me?" → "Can you open Chrome for me?"
- "you type NAGARA Fold at Google" → "Can you type Niagara Falls on Google?"
- "나야 갈아 폭풀하고 국물에 검색해줘" → "나이아가라 폭포를 구글에서 검색해줘"
- "can you open up photo booth" → "Can you open Photo Booth on my MacBook?"
- "new jin" → "new jeans"
- "tell me about new jin" → "tell me about new jeans"

원본 음성 인식 결과만 수정하고, 명령의 의도는 유지해주세요.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `음성 인식 결과: "${command}"` }
        ],
        temperature: 0.3,
        max_tokens: 100
      });

      const improvedCommand = response.choices[0].message.content.trim();
      
      // 따옴표 제거
      return improvedCommand.replace(/^["']|["']$/g, '');
    } catch (error) {
      console.error('음성 인식 개선 실패:', error);
      return command; // 실패하면 원본 반환
    }
  }
}

module.exports = AICommandAnalyzer; 