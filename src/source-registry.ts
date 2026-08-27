export type SourceReference={code:string;title:string;publisher:string;version:string;section:string;url:string;accessed:string};
type SourceKey="moe-white"|"moe-bully"|"moe-ai"|"tfc-guidelines"|"tfc-tools"|"cpc-policy"|"cpc-ecommerce"|"fda-ads";

const SOURCES:Record<SourceKey,Omit<SourceReference,"code"|"section"|"accessed">>={
  "moe-white":{title:"數位時代媒體素養教育白皮書",publisher:"教育部",version:"2023年3月",url:"https://depart.moe.edu.tw/ED2100/News.aspx?n=1353704343B62511&sms=2ADD120E8E2615E3"},
  "moe-bully":{title:"校園霸凌防制準則修正說明",publisher:"教育部學生事務及特殊教育司",version:"2024年4月19日施行",url:"https://depart.moe.edu.tw/ed2800/News_Content.aspx?n=9C2F51A0AD31862F&s=5A96AE80E87B04EF&sms=EA52AE3CDCB7AE20"},
  "moe-ai":{title:"高級中等以下學校人工智慧使用和學習指引暨配套文件",publisher:"教育部",version:"資料下載頁現行版",url:"https://pads.moe.edu.tw/download.php"},
  "tfc-guidelines":{title:"查核準則及查核結果說明",publisher:"台灣事實查核中心",version:"網站現行版",url:"https://tfc-taiwan.org.tw/fact-checking-guidelines-and-explanation/"},
  "tfc-tools":{title:"跟著 TFC 學查核：六堂查證工具課",publisher:"台灣事實查核中心",version:"2021年6月",url:"https://education.tfc-taiwan.org.tw/articles/5772"},
  "cpc-policy":{title:"消費者保護基本政策",publisher:"行政院消費者保護會",version:"2025年版",url:"https://cpc.ey.gov.tw/Page/77067C04C7989DA8"},
  "cpc-ecommerce":{title:"電子商務消費者保護綱領",publisher:"行政院消費者保護會",version:"網站現行版",url:"https://cpc.ey.gov.tw/Page/960E744883E6A75D"},
  "fda-ads":{title:"食品廣告不實、誇張、易生誤解或醫療效能認定準則",publisher:"衛生福利部食品藥物管理署",version:"2019年公告、2020年維護",url:"https://www.fda.gov.tw/TC/newsContent.aspx?cid=3&id=25314"},
};

const GROUP_BY_CODE=new Map<string,SourceKey>();
function register(key:SourceKey,codes:string){for(const code of codes.trim().split(/\s+/))GROUP_BY_CODE.set(code,key);}
register("moe-white",`ML-WP-ACCESS ML-WP-ACCOUNTABILITY ML-WP-ANALYZE ML-WP-BIAS ML-WP-CLAIM ML-WP-CONTEXT ML-WP-DATA ML-WP-DEMOCRACY ML-WP-EVIDENCE ML-WP-FRAME ML-WP-IMAGE ML-WP-REFLECT ML-WP-SAMPLING ML-WP-SOURCE REP-ANALYZE REP-CLASS REP-CONSENT REP-DIVERSITY REP-DOXXING REP-GENDER REP-HARM REP-HATE REP-OBJECTIFY REP-PRIVACY REP-REFLECT REP-STEREOTYPE REP-VICTIM REP-VOICE PL-ACCESS PL-ACCOUNTABILITY PL-APPEAL PL-BIAS PL-BUBBLE PL-BUSINESS PL-CIVIC PL-CONSENT PL-CONTENT-FARM PL-CREATE PL-DIVERSITY PL-FOOTPRINT PL-METRIC PL-PRIVACY PL-PUBLIC-MEDIA PL-RECOMMEND PL-SAFETY PL-VIRAL`);
register("moe-bully",`BULLY-BYSTANDER BULLY-EVIDENCE BULLY-MOE-2024`);
register("moe-ai",`AI-COPYRIGHT AI-DEEPFAKE AI-DETECTOR AI-PROVENANCE AI-REFLECT AI-VOICE-ETHICS AI-VOICE-SCAM MOE-AI-BIAS MOE-AI-CONSENT MOE-AI-DISCLOSE MOE-AI-GOV MOE-AI-LEARNING MOE-AI-PRIVACY MOE-AI-TEACH MOE-AI-VERIFY`);
register("tfc-guidelines",`TFC-ABSENCE TFC-BIAS TFC-CAUSAL TFC-CLAIM TFC-CORRECTION TFC-DATA TFC-EVIDENCE TFC-EXPERT TFC-LATERAL TFC-PRIMARY TFC-RESEARCH TFC-SOURCE TFC-TEACH TFC-VERDICT`);
register("tfc-tools",`TFC-CONTEXT TFC-DATE TFC-GEO TFC-IMAGE TFC-SEARCH`);
register("cpc-policy",`AD-CHILDREN AD-DISCLOSURE AD-EVIDENCE AD-GREEN AD-NATIVE AD-PERSUASION AD-PLACEMENT AD-REFLECT AD-RESEARCH AD-TARGETING AD-TEACH`);
register("cpc-ecommerce",`AD-CONSUMER AD-DARK-PATTERN AD-DATA AD-SCARCITY AD-SCHOOL`);
register("fda-ads",`AD-HEALTH`);

const TOPIC:Record<string,string>={
  ACCESS:"近用、參與及可及性",ACCOUNTABILITY:"問責、更正與透明",ANALYZE:"分析選擇、省略與話語位置",BIAS:"偏誤與反證",CLAIM:"可驗證主張與事實／意見區分",CONTEXT:"原始脈絡與前後文",DATA:"數據基準、樣本與圖表",DEMOCRACY:"第四權、公共媒體與民主參與",EVIDENCE:"證據強度與可追溯性",FRAME:"命名、框架與價值預設",IMAGE:"影像來源、裁切、時間與地點",REFLECT:"反思、限制與證據謙遜",SAMPLING:"抽樣、代表性與選擇偏誤",SOURCE:"來源資格、利益與獨立性",
  CLASS:"階級與單一故事",CONSENT:"自由、知情且可撤回的同意",DIVERSITY:"多元角色與資訊來源",DOXXING:"肉搜、個資暴露與安全",GENDER:"性別本質化與再現",HARM:"媒介擴散造成的傷害",HATE:"仇恨與去人化表述",OBJECTIFY:"物化與外貌框架",PRIVACY:"資料最小化、隱私與足跡",STEREOTYPE:"刻板印象與群體外推",VICTIM:"被害者支持與避免責備",VOICE:"聲音、角色自主與仿聲風險",
  BYSTANDER:"旁觀者停止擴散、支持與求助",MOE:"校園霸凌通報、調查與輔導程序",ABSENCE:"未找到資料不等於不存在",CAUSAL:"相關、因果與替代解釋",CORRECTION:"更正政策與可追蹤紀錄",EXPERT:"專家資格與相關領域",LATERAL:"離開原頁進行橫向閱讀",PRIMARY:"追溯原始文件與共同源頭",RESEARCH:"研究設計、測量與限制",TEACH:"教學活動與可觀察學習證據",VERDICT:"錯誤、部分錯誤、事實釐清與證據不足",DATE:"刊登日、事件日與舊聞重傳",GEO:"地標、位置與多線索定位",SEARCH:"關鍵字、原句與有效搜尋策略",
  CHILDREN:"兒童廣告識讀能力與不當操弄",CONSUMER:"交易公平、申訴與消費者權益",DARK:"暗黑操作模式、預設與取消難度",DISCLOSURE:"贊助、分潤與利益揭露",GREEN:"環境宣稱、定義與證據",HEALTH:"食品健康宣稱、療效與廣告規範",NATIVE:"原生廣告與形式揭露",PERSUASION:"情緒、從眾及稀缺說服",PLACEMENT:"置入性行銷與內容自主",SCARCITY:"倒數、原價、總價與完整條款",SCHOOL:"校園商業合作與教育界線",TARGETING:"精準投放、行為資料與控制權",
  APPEAL:"平台處分理由、保存通知與申訴",BUBBLE:"過濾氣泡、回音室與多元來源",BUSINESS:"平台營運模式與注意力誘因",CIVIC:"公共議題、公民參與與近用",CONTENT:"內容農場、來源責任與改寫",CREATE:"附來源、更正與替代文字的公民產製",FOOTPRINT:"被動互動資料與數位足跡",METRIC:"互動指標、排名與品質",PUBLIC:"公共媒體、公共責任與公共資訊",RECOMMEND:"推薦排序不等於真實或重要",SAFETY:"平台安全設定、求助與風險降低",VIRAL:"病毒傳播、速度與轉傳責任",
  COPYRIGHT:"AI生成、改作、授權與合理使用判斷",DEEPFAKE:"換臉、仿聲、錯誤字幕與來源查證",DETECTOR:"AI偵測器限制與多線索覆核",PROVENANCE:"內容來源、簽章、修改與生成標示",GOV:"校園AI治理、規範與責任分工",LEARNING:"AI輔助學習、歷程與學生責任",DISCLOSE:"AI使用揭露、工具版本與修改範圍",VERIFY:"AI輸出查證與人工覆核",
};

const TOPIC_BY_CODE:Record<string,string>={
  "REP-VOICE":"當事人發聲、角色自主與再現權力",
  "AI-VOICE-ETHICS":"仿聲、同意與倫理界線",
  "AI-VOICE-SCAM":"仿聲詐騙、第二管道與社交工程",
};

function topicFor(code:string){const compoundPrefix=code.startsWith("MOE-AI-")||code.startsWith("ML-WP-");const suffix=code.split("-").slice(compoundPrefix?2:1).join("-");const first=suffix.split("-")[0]!;const topic=TOPIC_BY_CODE[code]??TOPIC[suffix]??TOPIC[first];if(!topic)throw new Error(`來源代碼 ${code} 缺少具體章節對照`);return topic;}

export function referenceFor(code:string):SourceReference{const key=GROUP_BY_CODE.get(code);if(!key)throw new Error(`未登錄來源代碼：${code}`);return{code,...SOURCES[key],section:topicFor(code),accessed:"2026-08-27"};}
export const REGISTERED_SOURCE_REFS=Object.freeze([...GROUP_BY_CODE.keys()].sort());
