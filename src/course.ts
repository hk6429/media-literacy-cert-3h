export type CourseModule = {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  objectives: string[];
  sections: Array<{
    title: string;
    content: string[];
    activity?: string;
  }>;
  sources: Array<{ label: string; url: string }>;
};

export type Question = {
  id: string;
  moduleId: string;
  kind: "module" | "final";
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
};

export const COURSE_MODULES: CourseModule[] = [
  {
    id: "construction",
    title: "模組一｜媒體不是窗戶，而是取景框",
    minutes: 45,
    summary: "從選材、框架與再現切入，練習看見一則訊息如何被製作，而不只判斷它是真是假。",
    objectives: [
      "區分事實、觀點與詮釋",
      "辨認標題、畫面、受訪者與數據取樣造成的框架效果",
      "把媒體再現、性別刻板印象與權力關係轉成可教的問題",
    ],
    sections: [
      {
        title: "同一件事，為什麼會有不同版本？",
        content: [
          "媒體不可能把世界完整搬到眼前。每一則訊息都經過選擇：誰被訪問、哪一句被留下、哪張照片被放大、哪段背景被省略。",
          "因此，媒體素養的第一問不是「這是真的嗎」，而是「這個版本讓我看見什麼，又沒有讓我看見什麼」。",
        ],
        activity: "找一則近期校園新聞，列出報導中的人物、時間、數據來源與缺席的觀點。",
      },
      {
        title: "從標題走進框架",
        content: [
          "標題會先替讀者安排情緒與因果。例如把制度問題寫成個人品格問題，或用單一極端個案代表整個群體。",
          "閱讀時可依序追問：誰在說？對誰說？想讓我相信什麼？採用了哪些證據？還能有什麼解釋？",
        ],
        activity: "替同一個校園事件各寫一個支持、反對與中性標題，再比較三者省略了什麼。",
      },
      {
        title: "媒體再現與刻板印象",
        content: [
          "廣告、戲劇與社群貼文會反覆定義何謂成功、漂亮、正常或值得被看見。重複出現的形象久了，容易被誤認為自然事實。",
          "教學時應避免只要求學生抓出『錯誤』，還要討論誰因此得利、誰被簡化，以及如何重做一個更公平的版本。",
        ],
      },
    ],
    sources: [
      {
        label: "國立公共資訊圖書館：不可能不思辨！給教學現場的媒體素養課",
        url: "https://literacy-hub.nlpi.edu.tw/video/JLEanNMGodzV",
      },
    ],
  },
  {
    id: "verification",
    title: "模組二｜查證不是找答案，而是找證據",
    minutes: 45,
    summary: "建立停、看、查、比、判的查證流程，並理解演算法、內容農場與情緒誘發如何影響判斷。",
    objectives: [
      "使用橫向閱讀檢查來源可信度",
      "辨認斷章取義、錯置脈絡與以圖代證",
      "以可追溯證據說明判斷，而非只憑直覺貼真假標籤",
    ],
    sections: [
      {
        title: "先停下來，別讓情緒替你按分享",
        content: [
          "越讓人憤怒、害怕、驚訝或覺得『一定要立刻告訴大家』的內容，越需要暫停。情緒不是內容為假的證明，卻是查證應該開始的提醒。",
          "先確認原始發布者、發布日期、完整上下文與可驗證的主張，再決定是否相信或轉傳。",
        ],
      },
      {
        title: "橫向閱讀：離開原頁面查原頁面",
        content: [
          "不要只在可疑網站裡尋找它自己的『關於我們』。另開分頁搜尋發布者、作者與引用來源，看看其他可信機構如何描述它。",
          "圖片也要追查最早出處。『照片是真的』不等於搭配的時間、地點與敘述就是真的。",
        ],
        activity: "挑一則群組訊息，記錄原始主張、原始來源、兩個獨立來源及目前最合理的判定。",
      },
      {
        title: "內容農場、過濾氣泡與演算法",
        content: [
          "平台會依互動紀錄預測你想看什麼。這能提高便利性，也可能讓相似觀點不斷回來，使人誤以為『大家都這樣想』。",
          "破解方法不是完全退出網路，而是主動加入不同來源、搜尋反方論據，並將『推薦給我』和『社會共識』分開。",
        ],
      },
    ],
    sources: [
      {
        label: "台灣事實查核中心：媒體素養資源",
        url: "https://tfc-taiwan.org.tw/",
      },
    ],
  },
  {
    id: "deepfake",
    title: "模組三｜AI 深偽時代的辨真與責任",
    minutes: 45,
    summary: "理解生成式 AI、換臉與仿聲的風險，建立不迷信單一破綻的驗證策略，並轉化為課堂活動。",
    objectives: [
      "理解深偽可能結合影像、聲音、字幕與社群脈絡",
      "採用來源與情境查證，不迷信肉眼或單一偵測器",
      "討論同意、隱私、著作權與傷害責任",
    ],
    sections: [
      {
        title: "深偽不只是換臉",
        content: [
          "生成式 AI 可以仿聲、換臉、修改嘴型、重建場景，也能用真實影像搭配虛假字幕。真正的風險常來自多種技術與社交工程一起出現。",
          "不要把眨眼、手指或畫面閃爍當成永久有效的辨識口訣。模型會進步，固定破綻會失效。",
        ],
      },
      {
        title: "比看破綻更可靠的查證",
        content: [
          "先找原始發布帳號與完整版，再比對當事人、機構、可信媒體與其他角度的紀錄。若內容要求匯款、提供驗證碼或立刻行動，改用已知電話等第二管道確認。",
          "AI 偵測工具只能當線索，不能單獨作為定罪或處分依據；應保留原始檔、網址、時間與查證歷程。",
        ],
        activity: "設計一張『收到疑似校長仿聲訊息』的校園應變流程卡，至少包含暫停、第二管道確認與通報。",
      },
      {
        title: "從會辨識走向負責任使用",
        content: [
          "課堂不宜要求學生未經同意模仿真人聲音或臉孔。即使只是玩笑，也可能侵犯人格、隱私或造成難以回復的傷害。",
          "較安全的活動可使用虛構角色、教師自願提供的素材或清楚授權的公開素材，並要求標示 AI 生成與說明修改範圍。",
        ],
      },
    ],
    sources: [
      {
        label: "112 學年度教師研習：AI 世代高效工作、學習與深偽技術",
        url: "https://literacy-hub.nlpi.edu.tw/",
      },
    ],
  },
];

export const QUESTIONS: Question[] = [
  {
    id: "m1-1", moduleId: "construction", kind: "module",
    prompt: "閱讀一則爭議新聞時，最能揭露媒體框架的第一步是什麼？",
    options: ["只看留言數", "辨認被選入與被省略的觀點", "確認標題字數", "尋找最生氣的留言"],
    answer: 1,
    explanation: "框架分析要同時看見被呈現與未被呈現的資訊。",
  },
  {
    id: "m1-2", moduleId: "construction", kind: "module",
    prompt: "同一校園事件出現三種不同標題，最合理的解釋是什麼？",
    options: ["只能有一個標題是真的", "標題會選擇角度並安排讀者注意力", "標題與內容無關", "字數最長的一定最客觀"],
    answer: 1,
    explanation: "標題本身就是選擇與框架的一部分。",
  },
  {
    id: "m1-3", moduleId: "construction", kind: "module",
    prompt: "討論廣告中的性別刻板印象時，下列哪個問題最有深度？",
    options: ["廣告好不好看", "用了幾種顏色", "誰被簡化、誰因此得利", "演員是否有名"],
    answer: 2,
    explanation: "媒體再現要連回權力、利益與被排除者。",
  },
  {
    id: "m1-4", moduleId: "construction", kind: "module",
    prompt: "下列哪一項最接近『事實』而非『觀點』？",
    options: ["這項政策非常荒謬", "會議於下午三時結束", "校方根本不重視學生", "這是最糟的安排"],
    answer: 1,
    explanation: "可由紀錄直接核對的時間敘述較接近可驗證事實。",
  },
  {
    id: "m2-1", moduleId: "verification", kind: "module",
    prompt: "看到令人震驚、催促立刻轉傳的訊息，最適當的第一步是什麼？",
    options: ["先轉給親友再查", "停下來辨認可驗證主張", "看按讚數", "問原訊息群組是否相信"],
    answer: 1,
    explanation: "情緒升高時先停，再把訊息拆成可查證的主張。",
  },
  {
    id: "m2-2", moduleId: "verification", kind: "module",
    prompt: "什麼是橫向閱讀？",
    options: ["把文章橫著看", "只讀同一網站更多文章", "另開分頁查發布者與原始來源", "先讀最下面的留言"],
    answer: 2,
    explanation: "橫向閱讀會離開原頁面，使用外部來源評估原頁面。",
  },
  {
    id: "m2-3", moduleId: "verification", kind: "module",
    prompt: "找到一張真實照片後，可以直接證明貼文敘述為真嗎？",
    options: ["可以", "不一定，仍需核對時間、地點與上下文", "只要畫質高就可以", "只要朋友傳的就可以"],
    answer: 1,
    explanation: "真照片也可能被錯置時間、地點或敘事脈絡。",
  },
  {
    id: "m2-4", moduleId: "verification", kind: "module",
    prompt: "平台一直推薦相似觀點時，哪個做法最能降低過濾氣泡？",
    options: ["把推薦當成社會共識", "只按更多相同內容", "主動查找不同來源與反方證據", "停止閱讀任何新聞"],
    answer: 2,
    explanation: "主動擴充來源比被動接受個人化推薦更能校正視野。",
  },
  {
    id: "m3-1", moduleId: "deepfake", kind: "module",
    prompt: "下列哪一項是面對疑似深偽內容較可靠的策略？",
    options: ["只看有沒有眨眼", "只相信單一 AI 偵測器", "查原始來源並以第二管道確認", "畫面流暢就相信"],
    answer: 2,
    explanation: "來源、脈絡與獨立管道查證比固定視覺破綻可靠。",
  },
  {
    id: "m3-2", moduleId: "deepfake", kind: "module",
    prompt: "收到疑似主管仿聲要求匯款時，應該怎麼做？",
    options: ["立即匯款", "用訊息內提供的新號碼回撥", "用既有聯絡方式向本人確認", "把驗證碼傳給對方"],
    answer: 2,
    explanation: "應使用事先已知、獨立於可疑訊息的聯絡管道確認。",
  },
  {
    id: "m3-3", moduleId: "deepfake", kind: "module",
    prompt: "教師使用 AI 仿聲設計活動時，哪一項原則最重要？",
    options: ["效果越像越好", "未經同意也可使用學生聲音", "取得同意並避免可識別真人受害", "不必標示 AI 生成"],
    answer: 2,
    explanation: "同意、可識別性與傷害預防是活動設計底線。",
  },
  {
    id: "m3-4", moduleId: "deepfake", kind: "module",
    prompt: "AI 偵測工具的結果最適合如何使用？",
    options: ["直接作為懲處唯一證據", "當成線索並搭配來源與脈絡查證", "分數超過一半就公開指控", "取代所有人工判斷"],
    answer: 1,
    explanation: "偵測器可能誤判，不能取代完整證據鏈。",
  },
  {
    id: "f-1", moduleId: "construction", kind: "final",
    prompt: "報導只採訪單一立場時，教師最適合引導學生做什麼？",
    options: ["背誦報導內容", "找出缺席的利害關係人", "計算標點", "只看發布時間"],
    answer: 1, explanation: "缺席的聲音能揭露報導框架。",
  },
  {
    id: "f-2", moduleId: "construction", kind: "final",
    prompt: "把單一極端個案描述為整個群體的共同特徵，主要涉及什麼問題？",
    options: ["過度概括與刻板印象", "圖片解析度", "著作權年限", "網路速度"],
    answer: 0, explanation: "單一個案不能自然代表整個群體。",
  },
  {
    id: "f-3", moduleId: "construction", kind: "final",
    prompt: "哪個問題最能幫助學生區分事實與觀點？",
    options: ["這句話能否由公開紀錄核對", "這句話有幾個字", "作者用了什麼字體", "留言有多少"],
    answer: 0, explanation: "可核對性是區分事實陳述的重要線索。",
  },
  {
    id: "f-4", moduleId: "construction", kind: "final",
    prompt: "媒體素養課程最不應停在哪一步？",
    options: ["辨認訊息被如何建構", "討論被忽略的聲音", "看到不同意見就判定對方愚蠢", "提出更公平的重製方案"],
    answer: 2, explanation: "媒體素養重視證據與對話，不是貼標籤。",
  },
  {
    id: "f-5", moduleId: "verification", kind: "final",
    prompt: "陌生網站自稱專業機構，最佳查法是什麼？",
    options: ["只讀它的自我介紹", "另開分頁查機構紀錄與外部評價", "看首頁是否漂亮", "看是否有廣告"],
    answer: 1, explanation: "橫向閱讀要使用站外資訊評估來源。",
  },
  {
    id: "f-6", moduleId: "verification", kind: "final",
    prompt: "舊照片被配上今天的災情文字，屬於哪種問題？",
    options: ["錯置脈絡", "完全虛構影像", "網路霸凌", "合理引用"],
    answer: 0, explanation: "素材可能真實，但時間與事件脈絡被挪用。",
  },
  {
    id: "f-7", moduleId: "verification", kind: "final",
    prompt: "一則查核結論最有說服力的部分是什麼？",
    options: ["作者語氣很肯定", "完整可追溯的證據鏈", "轉發人很多", "標題用了驚嘆號"],
    answer: 1, explanation: "可追溯證據讓他人能重做與檢驗查核。",
  },
  {
    id: "f-8", moduleId: "verification", kind: "final",
    prompt: "搜尋結果與社群推薦內容不同，最合理的理解是什麼？",
    options: ["其中一個一定造假", "排序與個人化機制不同", "搜尋結果永遠中立", "推薦內容代表多數民意"],
    answer: 1, explanation: "不同平台與排序機制會塑造不同資訊環境。",
  },
  {
    id: "f-9", moduleId: "deepfake", kind: "final",
    prompt: "影片中的人物嘴型自然，能否直接排除深偽？",
    options: ["能", "不能，仍需查來源與脈絡", "只要有字幕就能", "畫質高就能"],
    answer: 1, explanation: "生成技術會進步，不能依賴單一固定破綻。",
  },
  {
    id: "f-10", moduleId: "deepfake", kind: "final",
    prompt: "保存疑似深偽證據時，哪一組資料最完整？",
    options: ["只有截圖", "網址、時間、原始檔與查證歷程", "只有轉傳者姓名", "只有偵測分數"],
    answer: 1, explanation: "完整證據鏈應能交代素材來源與查證過程。",
  },
  {
    id: "f-11", moduleId: "deepfake", kind: "final",
    prompt: "學生想用同學照片製作換臉短片，教師首先應確認什麼？",
    options: ["影片能否爆紅", "是否取得知情同意並控制風險", "配樂是否流行", "檔案是否夠大"],
    answer: 1, explanation: "可識別真人素材必須優先處理同意與傷害風險。",
  },
  {
    id: "f-12", moduleId: "deepfake", kind: "final",
    prompt: "面對 AI 生成內容，最成熟的態度是什麼？",
    options: ["全部不信", "全部相信", "依來源、證據、目的與風險分層判斷", "只看工具品牌"],
    answer: 2, explanation: "媒體素養不是二分恐慌，而是證據導向的風險判斷。",
  },
];

export const PASSING_SCORE = 80;

export function publicCourse() {
  const publicQuestions = QUESTIONS.map(({ answer: _answer, explanation: _explanation, ...question }) => question);
  return {
    modules: COURSE_MODULES,
    moduleQuestions: publicQuestions.filter((question) => question.kind === "module"),
    finalQuestions: publicQuestions.filter((question) => question.kind === "final"),
    passingScore: PASSING_SCORE,
  };
}

export function grade(kind: "module" | "final", moduleId: string | null, answers: Array<{ id: string; answer: number }>) {
  const expected = QUESTIONS.filter((question) => question.kind === kind && (moduleId === null || question.moduleId === moduleId));
  if (expected.length === 0 || answers.length !== expected.length) throw new Error("答案數量不完整");
  const submitted = new Map(answers.map((item) => [item.id, item.answer]));
  if (submitted.size !== expected.length) throw new Error("題目不可重複");
  const details = expected.map((question) => {
    const selected = submitted.get(question.id);
    if (!Number.isInteger(selected) || selected! < 0 || selected! >= question.options.length) {
      throw new Error("答案格式錯誤");
    }
    return {
      id: question.id,
      correct: selected === question.answer,
      explanation: question.explanation,
    };
  });
  const correct = details.filter((item) => item.correct).length;
  return { score: Math.round((correct / expected.length) * 100), correct, total: expected.length, details };
}
