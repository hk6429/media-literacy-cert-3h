export type Question = {
  id: string;
  moduleId: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
};

type Competency = {
  concept: string;
  scenario: string;
  principle: string;
  bestAction: string;
  evidence: string;
  teachingMove: string;
  misconception: string;
};

type ModuleBank = {
  moduleId: string;
  distractors: string[];
  competencies: Competency[];
};

const BANKS: ModuleBank[] = [
  {
    moduleId: "framing",
    distractors: ["只看留言區哪一方人數較多", "把標題當成完整事件", "認為有照片就不需要背景", "只選擇符合原本立場的說法", "用作者職稱代替證據", "看到不同版本就認定全部造假", "以情緒強烈程度判斷真假", "只計算文章字數與圖片數量"],
    competencies: [
      { concept: "選擇與省略", scenario: "報導校園活動時只呈現歡呼畫面，沒有交代反對意見", principle: "任何媒體成品都經過選材，畫面之外的資訊也會影響理解", bestAction: "列出報導呈現與未呈現的人物、資料和觀點", evidence: "完整採訪名單、原始素材與活動背景", teachingMove: "讓學生用『看見／沒看見』雙欄表比較報導", misconception: "只要畫面真實，報導就一定完整客觀" },
      { concept: "標題框架", scenario: "三篇文章把同一措施分別稱為改革、亂象與實驗", principle: "命名會設定理解入口並暗示價值判斷", bestAction: "比對標題用詞、正文證據與被設定的責任者", evidence: "三篇完整正文、原始政策內容與標題用詞", teachingMove: "請學生為同一事件寫支持、反對與中性標題", misconception: "標題只是吸引注意，完全不影響讀者理解" },
      { concept: "事實、觀點與推論", scenario: "文章把『會議三點結束』和『主持人故意拖延』寫在同一段", principle: "可核對事實、價值評斷與動機推論需要不同證據", bestAction: "逐句分類，並替推論標出尚缺的證據", evidence: "會議紀錄、完整發言與可支持動機判斷的資料", teachingMove: "讓學生把報導句子貼到事實、觀點、推論三區", misconception: "只要句子出現在新聞裡，就都屬於事實" },
      { concept: "消息來源與話語權", scenario: "網路霸凌報導只有校方聲明，沒有受影響學生與旁觀者聲音", principle: "來源的專業、位置、利益與缺席者都要納入判斷", bestAction: "補找不同位置的獨立來源並說明各自限制", evidence: "來源身分、與事件關係、原始說法及相互印證資料", teachingMove: "畫出事件利害關係人地圖，標示誰能說話、誰缺席", misconception: "職位最高的人一定能代表事件全部真相" },
      { concept: "五問讀法", scenario: "學生只說『我覺得這篇怪怪的』卻說不出要查什麼", principle: "有效懷疑要轉成能指向下一步資料的具體問題", bestAction: "依序追問製作者、受眾、目的、證據與其他解釋", evidence: "能回答五問的作者資訊、原始資料與替代解釋", teachingMove: "用同一張五問卡分析一則自己原本就同意的貼文", misconception: "媒體素養就是對所有媒體保持不相信" },
    ],
  },
  {
    moduleId: "advertising",
    distractors: ["只看廣告是否拍得漂亮", "認為名人推薦等於科學證明", "看到限時就立刻購買", "忽略贊助與分潤關係", "只比較品牌知名度", "把折扣幅度當成品質證據", "認為有數字就一定可信", "只要標示廣告就不必查內容"],
    competencies: [
      { concept: "商業目的與目標受眾", scenario: "短影音用同儕流行語推薦學習產品並附購買連結", principle: "廣告會依目標受眾設計語言，目的在促成行動與品牌好感", bestAction: "辨認付費者、目標受眾、期待行動與被淡化的成本", evidence: "贊助者、投放對象、購買條件與產品限制", teachingMove: "讓學生替同一產品分別設計青少年版與家長版訊息", misconception: "只要內容提供一些知識，就不可能是商業廣告" },
      { concept: "原生廣告與業配揭露", scenario: "生活分享文末有折扣碼與合作標籤，正文卻像個人心得", principle: "內容形式自然不會消除利益關係，揭露能協助受眾重新衡量", bestAction: "查贊助標示、產品提供、分潤連結與品牌控制程度", evidence: "合作揭露、合約要求、優惠碼與購買連結", teachingMove: "比較同一創作者的自主分享與品牌合作貼文", misconception: "網紅說是親身使用，就不需要揭露商業合作" },
      { concept: "情緒與稀缺訴求", scenario: "廣告倒數十分鐘並宣稱不購買就會落後同儕", principle: "稀缺、焦慮與從眾會壓縮比較和思考時間", bestAction: "暫停倒數壓力，另查價格、替代方案、限制與退換條件", evidence: "活動期限真實性、歷史價格、完整條款與替代商品", teachingMove: "把焦慮型廣告改寫成只保留可核對資訊的版本", misconception: "情緒越強烈，越能證明商品確實有效" },
      { concept: "數據與見證", scenario: "商品宣稱九成使用者有效，卻沒有樣本數與研究來源", principle: "百分比需要分母、抽樣與測量方法，證言不能取代研究", bestAction: "要求原始研究並檢查樣本、對照組、出資者與測量方式", evidence: "研究全文、樣本來源、問卷題目、對照組與利益揭露", teachingMove: "讓學生替三個缺乏分母的廣告數字補問查核問題", misconception: "廣告出現百分比和專家照片，就已具備科學證據" },
      { concept: "置入性行銷", scenario: "戲劇角色反覆特寫某商品並自然說出優點", principle: "商業安排融入故事時，受眾可能降低對廣告的警覺", bestAction: "記錄品牌露出、鏡頭、台詞與商業標示，再判斷內容自主性", evidence: "節目贊助資訊、露出方式、片尾標示與製作說明", teachingMove: "逐鏡分析一段節目，區分劇情需要與品牌露出", misconception: "只要角色沒有直接喊購買，就不算商業說服" },
    ],
  },
  {
    moduleId: "representation",
    distractors: ["再把羞辱內容公開播放一次", "要求受害者自己退出網路", "把群體都用同一特徵描述", "只用按讚數判斷傷害", "認為玩笑就不會造成影響", "只處罰一個留言者就結束", "要求當事人公開證明自己清白", "把外貌稱讚當成唯一價值"],
    competencies: [
      { concept: "媒體再現", scenario: "某群體在戲劇中長期只出現為無助或危險角色", principle: "重複的角色配置會塑造誰正常、誰值得被信任的社會想像", bestAction: "檢查出現頻率、角色主動性、發言權與缺席形象", evidence: "一段期間內的角色樣本、台詞、情節功能與結局", teachingMove: "讓學生統計一週節目中的角色位置並提出重製方案", misconception: "只要單一角色不是故意歧視，就不會形成再現問題" },
      { concept: "刻板印象與單一故事", scenario: "報導用一個極端個案代表整個年齡或族群", principle: "群體內部差異不能被單一案例抹平", bestAction: "補充多樣個案、具體脈絡與當事人自己的聲音", evidence: "群體資料、不同處境案例與原始訪談", teachingMove: "把一個扁平角色改寫成三種不同背景與選擇", misconception: "用相反的正面標籤就能完全消除刻板印象" },
      { concept: "物化與外貌框架", scenario: "表演報導從作品內容轉為逐項評分女藝人身材", principle: "當身體成為主要評價對象，人的能力、意見與主體性會被擠到背景", bestAction: "分析評價語言並改寫為聚焦作品、脈絡與本人觀點", evidence: "原始表演、完整訪談、報導用詞與版面配置", teachingMove: "比較作品評論與外貌評論，討論各自讓什麼被看見", misconception: "只要是正面稱讚外貌，就不可能構成物化" },
      { concept: "網路霸凌判斷", scenario: "失誤影片被加嘲諷字幕，從班群持續轉到公開帳號並標記本人", principle: "反覆性、權力不對等、公開擴散與難以退出會放大傷害", bestAction: "停止擴散、保存必要證據、支持當事人並啟動通報", evidence: "發布時間線、轉傳範圍、留言內容、當事人處境與威脅程度", teachingMove: "用情境卡區分衝突、批評、霸凌與重大侵害並配對處理", misconception: "網路內容只是文字和圖片，不會造成真實傷害" },
      { concept: "旁觀者行動", scenario: "學生看到羞辱貼文，想用轉傳並留言譴責的方式幫忙", principle: "善意轉傳仍會增加曝光，支持應以安全與當事人選擇為中心", bestAction: "不再轉傳，私下支持、檢舉並向可信任成人求助", evidence: "原始網址與必要截圖、平台規則、當事人希望及安全風險", teachingMove: "設計前五分鐘、當天與後續一週的旁觀者行動卡", misconception: "只要在轉傳時加上反對文字，就不算擴散傷害" },
    ],
  },
  {
    moduleId: "verification",
    distractors: ["先轉傳再等別人查證", "只閱讀原網站自我介紹", "以搜尋排名第一當結論", "只看圖片畫質是否清楚", "找到一個同意來源就停止", "把無法證實直接寫成造假", "只憑查核者語氣是否肯定", "忽略發布日期與原始脈絡"],
    competencies: [
      { concept: "停下並拆解主張", scenario: "群組訊息令人恐慌並催促所有人立刻轉傳", principle: "情緒是啟動查證的提醒，不是直接判假的證據", bestAction: "停止轉傳，把訊息改寫成可核對的人、事、時、地主張", evidence: "原始訊息、發布時間、具體主張與可查實體", teachingMove: "讓學生把情緒標題改寫成一個可驗證句子", misconception: "只要訊息讓人害怕，就可以直接判定為假訊息" },
      { concept: "來源與溯源", scenario: "名稱像研究院的網站沒有作者、地址與研究連結", principle: "自我介紹不能取代獨立的組織與作者查核", bestAction: "另開分頁查機構歷史、作者資格、更正紀錄與原始資料", evidence: "組織登記、作者資料、編輯政策、原始研究與外部評價", teachingMove: "比較三個同名或近似名稱網站，找出真正發布主體", misconception: "網站名稱專業、版面漂亮，就足以證明來源可靠" },
      { concept: "橫向閱讀", scenario: "學生一直在可疑文章內尋找它自己提供的證明", principle: "查來源時應離開原頁面，查看其他獨立來源如何描述它", bestAction: "開啟機構背景、原始資料與獨立報導三類分頁交叉比對", evidence: "不同網域的獨立資料、原始文件與可追溯引用", teachingMove: "限時三分鐘進行分頁查核並記錄每頁回答的問題", misconception: "把同一網站多讀幾篇，就等於完成多來源查證" },
      { concept: "圖片與脈絡查證", scenario: "舊颱風淹水照片在新颱風期間配上現在式文字流傳", principle: "圖片本身真實，不代表搭配的時間、地點與敘述正確", bestAction: "找較早版本，核對地標、天候、日期與原作者描述", evidence: "最早發布紀錄、原始檔、地標比對、氣象與新聞資料", teachingMove: "提供同圖不同文的案例，讓學生追查最早版本", misconception: "反向搜尋找到同一張真照片，就證明目前貼文為真" },
      { concept: "證據結論與限制", scenario: "查完後只有部分資料，卻想把結果寫成百分之百造假", principle: "結論強度必須配得上證據，資料不足也應清楚標示", bestAction: "分開說明已證實、未證實、誤導脈絡與目前限制", evidence: "可重查網址、時間、原始檔、證據鏈與未解問題", teachingMove: "用主張、來源、證據、限制、判定五欄寫查核報告", misconception: "查核結論只能二選一：完全真或完全假" },
    ],
  },
  {
    moduleId: "platforms",
    distractors: ["把推薦頁當成全體民意", "只追蹤更多相同立場帳號", "看到很多分享就判定正確", "用版面美醜判定內容農場", "允許所有 App 永久定位", "把不知道真假一起轉傳", "認為免費服務不會收集資料", "用單一極端來源假裝多元"],
    competencies: [
      { concept: "推薦演算法", scenario: "平台持續推送令人憤怒的內容，使用者以為那就是最重要新聞", principle: "推薦系統主要預測互動與停留，不負責裁判真相或公共重要性", bestAction: "把推薦與社會共識分開，另查不同來源與原始資料", evidence: "推薦紀錄、互動行為、不同帳號結果與平台說明", teachingMove: "比較不同使用者的同主題首頁，推測影響排序的訊號", misconception: "平台一直推薦的內容，就代表多數人都認為重要且正確" },
      { concept: "過濾氣泡與回音室", scenario: "教師動態牆幾乎全是支持同一政策的貼文", principle: "個人資訊環境只是社會切片，不能直接推論整體共識", bestAction: "主動加入不同立場的高品質來源並使用非個人化搜尋", evidence: "不同社群、民調方法、原始政策資料與多元報導", teachingMove: "讓學生畫自己的資訊來源地圖並找出缺少的位置", misconception: "追蹤一個最極端的反方帳號，就等於擁有多元資訊" },
      { concept: "內容農場", scenario: "文章標題驚人，內文重複改寫，找不到作者與原始數據", principle: "內容農場核心問題是低成本流量生產與責任、來源不透明", bestAction: "追查作者、引用、原始資料、更正機制與營利方式", evidence: "作者頁、來源連結、原始數據、網站組織與更正紀錄", teachingMove: "讓學生追一個農場文數據，看能否回到第一手來源", misconception: "只要網站廣告多或版面不好看，就一定是內容農場" },
      { concept: "病毒式傳播與轉傳責任", scenario: "只有一句話的校園截圖快速擴散，原對話前後都被裁掉", principle: "越容易快速理解與分享的內容，越可能省略必要脈絡", bestAction: "先找完整對話與原始發布者，確認前後文再決定是否分享", evidence: "未裁切原圖、完整對話、時間線與原始發布帳號", teachingMove: "用傳話與截圖裁切活動觀察訊息如何在轉傳中變形", misconception: "加一句『不知道真假』再轉傳，就不必負擔擴散責任" },
      { concept: "個資與數位足跡", scenario: "一個修圖 App 要求永久定位、聯絡人與麥克風權限", principle: "服務便利與資料交換必須符合功能必要性與最小化原則", bestAction: "檢查各權限是否必要，關閉多餘存取並避免上傳學生個資", evidence: "權限清單、隱私政策、資料用途、保存期限與刪除方式", teachingMove: "進行 App 權限健檢，逐項說明保留或關閉的理由", misconception: "沒有公開發文，就不會留下任何可被分析的數位足跡" },
    ],
  },
  {
    moduleId: "deepfake",
    distractors: ["只看畫面有沒有眨眼", "完全相信單一偵測器分數", "用訊息裡的新電話回撥", "未經同意模仿學生聲音", "把流暢回答當成正確資料", "不標示任何 AI 修改", "把學生個資上傳陌生工具", "以成品漂亮取代查證歷程"],
    competencies: [
      { concept: "生成式 AI 的機率性", scenario: "AI 用肯定語氣提供不存在的研究與引文", principle: "流暢是生成品質，不是事實正確性的保證", bestAction: "把輸出視為草稿，逐項核對關鍵事實、引文與原始來源", evidence: "可開啟的原始文獻、作者、出版資訊與交叉來源", teachingMove: "讓學生標記 AI 回答中的事實、推論與待查項目", misconception: "AI 回答完整而且語氣有自信，就可以直接當教材" },
      { concept: "深偽來源查證", scenario: "選舉前流傳一段人物發言影片，嘴型自然且畫質清楚", principle: "固定視覺破綻會失效，來源與情境查證比肉眼口訣可靠", bestAction: "找原始發布、完整版本、其他鏡位、行程與本人正式說明", evidence: "原直播、檔案資訊、不同角度紀錄、可信機構與時間線", teachingMove: "比較裁切版與完整版，建立不依賴單一破綻的查證表", misconception: "人物眨眼自然、嘴型同步，就能排除深偽" },
      { concept: "仿聲詐騙與第二管道", scenario: "疑似校長聲音來電，要求保密並立刻提供驗證碼", principle: "聲音相似不能證明聯絡管道與說話者身分", bestAction: "中止原通話，用既有通訊錄或另一位可信任人員確認", evidence: "原來的聯絡方式、通聯紀錄、正式流程與第二人確認", teachingMove: "演練仿聲緊急情境，要求學生說出中止與回查步驟", misconception: "只要對方知道校內人名與職稱，就能確認是本人" },
      { concept: "同意、隱私與著作權", scenario: "全班被要求上傳臉孔與聲音製作換臉作業，沒有替代方案", principle: "能生成不等於有權生成，同意必須知情、自願且可撤回", bestAction: "改用虛構或授權素材，提供不參與替代方案並限制保存", evidence: "授權範圍、同意紀錄、工具條款、資料去向與刪除機制", teachingMove: "讓學生用風險矩陣評估素材來源、對象、公開範圍與傷害", misconception: "多數同學都答應，就能代表每個人的同意都是自由的" },
      { concept: "負責任 AI 課堂", scenario: "學生用 AI 做出漂亮作品，但說不出資料來源與修改內容", principle: "AI 素養評量應看來源、查證、揭露、倫理選擇與人工判斷", bestAction: "要求標示 AI 生成範圍、保留來源與提示、說明查核和修改理由", evidence: "生成紀錄、來源清單、查證表、授權與版本差異", teachingMove: "用過程檔案袋評量提示、來源、查證、揭露與反思", misconception: "只要最後作品效果好，就代表學生具備 AI 素養" },
    ],
  },
];

function shuffledOptions(correct: string, distractors: string[], seed: number): { options: string[]; answer: number } {
  const uniqueDistractors = [...new Set(distractors.filter((item) => item !== correct))].slice(0, 3);
  const options = [correct, ...uniqueDistractors];
  const shift = seed % options.length;
  const rotated = [...options.slice(shift), ...options.slice(0, shift)];
  return { options: rotated, answer: rotated.indexOf(correct) };
}

function makeQuestion(bank: ModuleBank, competency: Competency, competencyIndex: number, variant: number): Question {
  const id = `${bank.moduleId.slice(0, 3)}-${String(competencyIndex + 1).padStart(2, "0")}-${variant + 1}`;
  const peers = [1, 2, 3].map((offset) => bank.competencies[(competencyIndex + offset) % bank.competencies.length]!);
  const rotatedPoorChoices = bank.distractors.map((_, index) => bank.distractors[(index + competencyIndex * 2 + variant) % bank.distractors.length]!);
  const specs = [
    { prompt: `遇到「${competency.scenario}」時，第一個最合適的處理方式是什麼？`, correct: competency.bestAction, explanation: `${competency.concept}的實作重點：${competency.bestAction}。` },
    { prompt: `要查核「${competency.concept}」，下列哪一組資料最能形成有效證據？`, correct: competency.evidence, explanation: `可追溯的證據應包含：${competency.evidence}。` },
    { prompt: `教師想讓學生真正練習「${competency.concept}」，哪個活動最合適？`, correct: competency.teachingMove, explanation: `好的教學活動要讓學生實際判讀與留下歷程：${competency.teachingMove}。` },
    { prompt: `關於「${competency.concept}」，下列哪一項理解最正確？`, correct: competency.principle, explanation: `核心原則是：${competency.principle}。` },
    { prompt: `討論「${competency.concept}」時，哪一個說法最需要被修正？`, correct: competency.misconception, explanation: `需要修正的迷思是「${competency.misconception}」；${competency.principle}。` },
  ] as const;
  const spec = specs[variant]!;
  const distractors = [
    rotatedPoorChoices,
    peers.map((item) => item.evidence),
    peers.map((item) => item.teachingMove),
    peers.map((item) => item.principle),
    [competency.principle, competency.bestAction, competency.evidence],
  ][variant]!;
  const { options, answer } = shuffledOptions(spec.correct, distractors, competencyIndex * 5 + variant + bank.moduleId.length);
  return { id, moduleId: bank.moduleId, prompt: spec.prompt, options, answer, explanation: spec.explanation };
}

export const QUESTIONS: Question[] = BANKS.flatMap((bank) =>
  bank.competencies.flatMap((competency, competencyIndex) =>
    Array.from({ length: 5 }, (_, variant) => makeQuestion(bank, competency, competencyIndex, variant)),
  ),
);

export const QUESTION_COUNT = QUESTIONS.length;
