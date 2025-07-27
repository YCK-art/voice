const OpenAI = require('openai');

class AICommandAnalyzer {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey !== 'your-openai-api-key-here') {
      this.openai = new OpenAI({
        apiKey: apiKey
      });
      this.isAvailable = true;
      console.log('ChatGPT API 사용 가능');
    } else {
      this.isAvailable = false;
      console.log('ChatGPT API 키가 설정되지 않음 - 기본 분석기 사용');
    }
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
        ko: `당신은 사용자의 자연어 명령을 분석하여 컴퓨터 제어 액션으로 변환하는 AI 어시스턴트입니다.

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
- "설정 열어줘" → {"action": "open", "target": "시스템 설정"}`,
        
        en: `You are an AI assistant that analyzes user's natural language commands and converts them into computer control actions.

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
- "open settings" → {"action": "open", "target": "system settings"}`,
        
        zh: `你是一个AI助手，分析用户的自然语言命令并将其转换为计算机控制操作。

可用操作类型：
1. open: 打开应用/网站
2. search: 网络搜索
3. ai-search: 通过ChatGPT API直接回答
4. click: 点击UI元素
5. type: 文本输入
6. scroll: 页面滚动
7. call: 拨打电话
8. message: 发送消息
9. file: 文件管理
10. system: 系统设置
11. tab-analysis: 分析当前浏览器标签页

响应格式 (JSON):
{
  "action": "操作类型",
  "target": "目标",
  "parameters": {
    "query": "搜索查询",
    "text": "要输入的文本",
    "direction": "滚动方向",
    "amount": "滚动量"
  },
  "confidence": 0.95,
  "explanation": "分析说明"
}`,
        
        ja: `あなたは、ユーザーの自然言語コマンドを分析してコンピューター制御アクションに変換するAIアシスタントです。

利用可能なアクションタイプ：
1. open: アプリ/ウェブサイトを開く
2. search: ウェブ検索
3. ai-search: ChatGPT APIによる直接回答
4. click: UI要素をクリック
5. type: テキスト入力
6. scroll: ページスクロール
7. call: 電話をかける
8. message: メッセージを送信
9. file: ファイル管理
10. system: システム設定
11. tab-analysis: 現在のブラウザタブを分析

応答形式 (JSON):
{
  "action": "アクションタイプ",
  "target": "ターゲット",
  "parameters": {
    "query": "検索クエリ",
    "text": "入力するテキスト",
    "direction": "スクロール方向",
    "amount": "スクロール量"
  },
  "confidence": 0.95,
  "explanation": "分析説明"
}`,
        
        es: `Eres un asistente de IA que analiza los comandos de lenguaje natural del usuario y los convierte en acciones de control informático.

Tipos de acción disponibles:
1. open: abrir aplicación/sitio web
2. search: búsqueda web
3. ai-search: respuesta directa a través de la API de ChatGPT
4. click: hacer clic en elemento UI
5. type: entrada de texto
6. scroll: desplazamiento de página
7. call: hacer llamada telefónica
8. message: enviar mensaje
9. file: gestión de archivos
10. system: configuración del sistema
11. tab-analysis: analizar pestañas actuales del navegador

Formato de respuesta (JSON):
{
  "action": "tipo_de_acción",
  "target": "objetivo",
  "parameters": {
    "query": "consulta_de_búsqueda",
    "text": "texto_a_introducir",
    "direction": "dirección_de_desplazamiento",
    "amount": "cantidad_de_desplazamiento"
  },
  "confidence": 0.95,
  "explanation": "explicación_del_análisis"
}`,
        
        fr: `Vous êtes un assistant IA qui analyse les commandes en langage naturel de l'utilisateur et les convertit en actions de contrôle informatique.

Types d'action disponibles :
1. open : ouvrir application/site web
2. search : recherche web
3. ai-search : réponse directe via l'API ChatGPT
4. click : cliquer sur un élément UI
5. type : saisie de texte
6. scroll : défilement de page
7. call : passer un appel téléphonique
8. message : envoyer un message
9. file : gestion de fichiers
10. system : paramètres système
11. tab-analysis : analyser les onglets actuels du navigateur

Format de réponse (JSON) :
{
  "action": "type_d_action",
  "target": "cible",
  "parameters": {
    "query": "requête_de_recherche",
    "text": "texte_à_saisir",
    "direction": "direction_de_défilement",
    "amount": "quantité_de_défilement"
  },
  "confidence": 0.95,
  "explanation": "explication_de_l_analyse"
}`,
        
        de: `Sie sind ein KI-Assistent, der die natürlichen Sprachbefehle des Benutzers analysiert und in Computersteuerungsaktionen umwandelt.

Verfügbare Aktionstypen:
1. open: App/Website öffnen
2. search: Websuche
3. ai-search: Direkte Antwort über ChatGPT API
4. click: UI-Element anklicken
5. type: Texteingabe
6. scroll: Seiten-Scroll
7. call: Telefonanruf tätigen
8. message: Nachricht senden
9. file: Dateiverwaltung
10. system: Systemeinstellungen
11. tab-analysis: Aktuelle Browser-Tabs analysieren

Antwortformat (JSON):
{
  "action": "aktionstyp",
  "target": "ziel",
  "parameters": {
    "query": "suchanfrage",
    "text": "einzugebender_text",
    "direction": "scrollrichtung",
    "amount": "scrollmenge"
  },
  "confidence": 0.95,
  "explanation": "analyseerklärung"
}`
      };

      const systemPrompt = systemPrompts[detectedLanguage] || systemPrompts.ko;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: improvedCommand }
        ],
        temperature: 0.05, // 0.1 → 0.05로 변경 (더 빠른 응답)
        max_tokens: 150 // 200 → 150으로 단축 (속도 향상)
      });

      const analysis = JSON.parse(response.choices[0].message.content);
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
          parameters: { query },
          confidence: 0.8,
          explanation: `"${query}" 검색`
        };
      }
    }
    
    // 열기 관련 명령어
    if (lowerCommand.includes('열어') || lowerCommand.includes('open')) {
      // 열기 대상 추출
      let target = command;
      target = target.replace(/열어|open|해줘|해주세요|please/gi, '').trim();
      
      if (target) {
        return {
          action: 'open',
          target: target,
          parameters: {},
          confidence: 0.7,
          explanation: `${target} 열기`
        };
      }
    }
    
    // 전화 관련 명령어
    if (lowerCommand.includes('전화') || lowerCommand.includes('call') || 
        lowerCommand.includes('phone')) {
      return {
        action: 'call',
        target: '전화',
        parameters: {},
        confidence: 0.8,
        explanation: '전화 앱 열기'
      };
    }
    
    // 메시지 관련 명령어
    if (lowerCommand.includes('메시지') || lowerCommand.includes('message') || 
        lowerCommand.includes('문자')) {
      return {
        action: 'message',
        target: '메시지',
        parameters: {},
        confidence: 0.8,
        explanation: '메시지 앱 열기'
      };
    }
    
    return {
      action: 'unknown',
      target: null,
      parameters: {},
      confidence: 0.1,
      explanation: '알 수 없는 명령',
      originalCommand: command
    };
  }

  // 음성 인식 후처리 - 일반적인 오인식 수정
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

  // ChatGPT로 음성 인식 결과 재검증 및 개선
  async improveSpeechRecognition(command) {
    if (!this.isAvailable) {
      return command; // API가 없으면 원본 반환
    }

    try {
      const systemPrompt = `당신은 음성 인식 결과를 개선하는 전문가입니다.
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
        model: "gpt-3.5-turbo",
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