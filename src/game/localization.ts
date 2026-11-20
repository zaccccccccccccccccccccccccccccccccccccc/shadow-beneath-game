import type Phaser from 'phaser';
export type GameLocale = 'zh-Hans' | 'zh-Hant';

const LOCALE_KEY = 'under-the-shadow-locale';

const copy = {
  'zh-Hans': {
    helpTitle: '求救 · 调查指引', helpButton: '求救 / 我卡住了',
    helpBody: '求救会在主角头顶显示方向箭头，\n并在地面画出可走的虚线。\n请自己移动；交谈和调查仍由你决定。', helpRemaining: '剩余引路次数：{count}', helpRouteAction: '显示引路', helpExhausted: '本次调查的求救次数已用完。按 M 看地图，继续沿街区探索。',
    helpWalkTitle: '到达后由你决定', helpWalkBody: '走近人物后，按 E / 空格或点击人物交谈。点击地面寻路与键盘移动都可以继续使用。',
    helpClose: '返回调查', helpNoTarget: '当前任务没有可指引的人物或地点；请按清单操作。',
    helpUseMap: '按 M 打开地图；已到访区域可以直接快速传送。', arrivedInteract: '已到达附近。按 E / 空格，或点人物，决定是否交谈。', clickApproach: '正在靠近：{target}；到达后由你选择是否交谈。',
    semiAutoArrowOn: '引路已开启：跟随头顶黄箭头和地面虚线，自己走向目标。', semiArrivedInteraction: '已到达目标附近；按 E / 空格，或点击人物继续。', semiArrivedPortal: '已到传送碑附近；按 E / 空格进入，或按 M 查看地图。', semiArrivedWalk: '已到达路面提示牌。现在继续调查。', semiNoRoute: '暂时找不到可走路线；请打开地图确认位置。',
    objectiveHelp: '试用求救：按 H 或点击按钮显示引路',
    groundWalkHint: 'WASD / ↑↓←→ 行走 · 点击地面自动前往', waystone: '传送碑', waystoneGlyph: '碑', portalDestination: '前往 {area}', portalDestinationList: '本区传送碑去向', portalReady: '可前往', portalLocked: '待解锁', waystoneReach: '已到传送碑附近：按 E / 空格或点互动进入。', waystoneDiscovered: '已记录传送点：{area}', waystoneNotVisited: '尚未到访此区域；先沿街道前往传送碑。', alreadyHere: '你已在这个区域。', mapFastTravelHint: '点击绿色的已到访区域，即可直接快速传送',
    achievementKicker: '档案成就已解锁', achievementTitle: '第一幕完成', achievementBody: '你已完成第一幕「看见」。', achievementNextLabel: '接下来 · 第二幕', achievementNextTitle: '账本的空白页', achievementNextBody: '会面、账目和缺页已对上。下一份档案将追问：是谁拿走了那一页？', achievementClose: '领取伙伴，继续调查', companionName: '守正之灵 · 獬豸', companionGift: '第一幕礼物：守正之灵加入队伍', companionMeaning: '獬豸辨曲直。见财先问来路，不为一时之利越过底线。', companionJoined: '守正之灵已跟上你，往后的调查它会同行。', lawTitle: '学习法条 · 仍须核实事实', lawBody: '《刑法》第385条：利用职务便利非法收受财物并为他人谋利，可能构成受贿罪。\n《刑法》第389条：为谋取不正当利益给予国家工作人员财物，可能构成行贿罪。\n本案仍须以证据、身份与主观目的继续核实，不能据此定罪。', headToHarborHint: '沿旧城传送碑前往海边码头，再走到海边茶馆。', scrollTasks: '滚轮或箭头查看', objectiveDone: '任务完成：{task}', evidenceCardTitle: '获得线索 · 第 {count} 条',
    gateKicker: '监察组 · 见习档案', gameTitle: '阴影之下', gateHelp: '请留下你的调查员名字。', nameLabel: '调查员名称', start: '进入档案', rongJie: '荣姐',
    languageLabel: '显示语言', simplified: '简体中文', traditional: '繁體中文',
    rotateTitle: '请将手机横向握持', rotateBody: '横屏时文字和地图更清楚；也可以保持竖屏继续。', continuePortrait: '仍以竖屏继续', touchHelp: '左侧摇杆移动 · 右侧按钮求救／互动／线索／地图', mobileHelp: '求救',
    prologueKicker1: '澳门 · 雨夜', prologueTitle1: '没有署名的信', prologueBody1: '雨水从监察组的门缝淌进来。\n信封没有署名，只写了四个字：南湾项目。',
    prologueKicker2: '一份不完整的档案', prologueTitle2: '被抽走的一页', prologueBody2: '审批比以往快了许多。\n三笔费用有签名，附件却少了一页账。',
    prologueKicker3: '荣姐的提醒', prologueTitle3: '先分清看见与听说', prologueBody3: '“一封信只是起点。\n先找人，再把时间、地点和账目逐一对上。”',
    prologueKicker4: '你的第一夜', prologueTitle4: '接过这盏灯', prologueBody4: '“我先记下能核实的事实。\n如果有人撒谎，就让证据自己指出来。”',
    prologueKicker5: '街灯亮起', prologueTitle5: '从这里出发', prologueBody5: '荣姐指向雨中的街道：\n“先学会走近。旧城和海边，都在等你。”',
    replay: '档案回放中', tutorialHeader: '见习生训练档案 · 第 0 关', tutorialStep1: '1 / 3  先学会移动', tutorialStep2: '2 / 3  靠近发光的记录点',
    tutorialMove: '移动鼠标转向 · 点击石路寻路 · WASD / 方向键即时移动', tutorialApproach: '灯光会让细节浮现。向右前方走近那张遗落的便笺。',
    clueNear: '灯光照到了一张遗落的便笺。再靠近一点。', capture: '定格并记录', step3: '3 / 3  前往拱门，进入第一幕', exitPrompt: '记录不是结论，而是下一次追问的起点。去右侧拱门。',
    tutorialTitle: '第 0 关 · 学会看见', tutorialIntro: '榮姐把灯递给你：\n“今晚只做一件事——亲自走近，再写下你确实看见的。”', starting: '训练即将开始…', actOne: '第一幕／看见',
    actOneKicker: '廉署监察组 · 见习生档案 01', actOneTitle: '第一幕 · 看见', actOneBody: '榮姐说：\n“唔好靠估，行过去睇。”\n\n今天不是要你抓人。\n把你亲眼见到的事，完整地记录下来。', startingPatrol: '巡查即将开始…',
    deskLabel: '监察组 · {name} · 档案 01', oil: '灯油', firstPrompt: '先看清，再判断', controls: '移动鼠标转向 · 点击地面寻路 · WASD / 方向键即时移动',
    captureTitle: '定格取证', evidenceFile: '证 物 档 案', ordinary: '档案类别：日常往来', academic: '档案类别：校园诚信', classify: '请将这件事放入正确的位置',
    done: '记录完成', redline: '红线标记', continue: '点击继续巡查', lampOut: '灯火熄灭 · 本回合进入盲区回放', restart: '第一幕演示结束 · 刷新页面可重新开始',
    discovered: '发现异动：{title}', approachForEvidence: '靠近后可定格取证', idleControls: '点击地面移动 · WASD / 方向键移动',
    archived: '两条线索已归档 · 新档案正在送达', nextSoon: '第一幕取证完成 · 即将进入下一份档案',
    chapterSwitch: '档案切换', nextChapter: '第二幕 · 账本的空白页', nextTitle: '社团活动费',
    nextSummary: '三笔看似无关的报销，指向同一页被撕下的账本。下一次巡查，你需要比“看见”更早一步：学会追问。',
    patchStatus: '内容制作中 · 本次版本已预留入口与章节转场', returnTutorial: '返回第 0 关',
    sodaTitle: '一瓶汽水', sodaWitness: '家俊 · 新同事', sodaDescription: '“新手第一天嘛，请你喝。”他递来一瓶还带着水珠的汽水。',
    sodaCorrect: '普通的人情往来，不涉及职权与利益交换。', sodaIncorrect: '可疑不等于违规；先把事情看清，才下判断。',
    cardTitle: '借出的学生证', cardWitness: '家俊与一名应考学生', cardDescription: '走廊转角，家俊把自己的学生证交给一名神色匆忙的同学。你听见对方低声说：“我只差这一次。”',
    cardCorrect: '这不是受贿，但借证代考属于严重的学术不诚实。应完整记录事实，并交由学校按程序处理。',
    cardIncorrect: '看见一张学生证，不等于已掌握全部事实；记录与判断都要有依据。',
    courtesy: '人情往来', courtesySub: '正常而无害的情谊', declaration: '需要记录', declarationSub: '事实需交主管处理', corruption: '违法贪腐', corruptionSub: '越过制度的红线',
    worldChapter: '第一幕 · 看见', districtHQ: '廉署据点', districtOldTown: '旧城街区', districtCampus: '校园与社团', districtHarbor: '海边码头', districtHill: '山边住宅',
    objectiveHeading: '调查清单', objectiveMove: '先沿石路走几步', objectiveMentor: '与榮姐交谈', objectiveSupervisor: '向林主任了解案情', objectiveFile: '查看匿名举报案卷', objectiveNotebook: '按 L 查看线索记录本', objectiveMap: '按 M 查看街区地图', objectiveOldTown: '前往旧城街区', objectiveInformant: '询问街头线人', objectiveCafe: '前往海边码头 → 到茶馆核实会面', objectiveCampus: '前往校园与社团 → 调查账目', objectiveLedger: '找到被遗漏的账页', taskComplete: '教学完成 · 案件调查继续',
    mapLabel: '街区地图', mapExpand: '按 M 展开地图', mapClose: '按 M 或 Esc 关闭', interactHint: '空格／点击：交谈或调查', moveHint: 'WASD／方向键移动 · 点击地面前往', notebookHint: '按 L 查看线索记录', clueBook: '线索记录', noClues: '目前还没有线索。调查人物和物件，线索会自动归档。', clueRecorded: '线索已记入记录本', evidenceRecorded: '关键证据已归档', dialogueContinue: '继续', dialogueLeave: '结束交谈', notebookClose: '关闭记录本', mobileInteract: '互动', mobileNotebook: '线索', mobileMap: '地图',
    scenePromptTitle: '第 0 关 · 廉署据点', scenePromptBody: '先熟悉调查工作：和榮姐碰面、查看案卷，再带着清单走进街区。', beginExplore: '开始调查', areaEntering: '前往：{area}', tutorialDoorLocked: '完成据点清单后，就可以开始街区巡查。', informantDoorLocked: '先到旧城找线人核实举报内容。', accountsDoorLocked: '先核对社团账目，再前往山边住宅区。',
    npcMentor: '榮姐', npcSupervisor: '林主任', npcInformant: '街头线人 阿强', npcCafe: '海边茶馆老板', npcStudent: '学生 阿晴', npcTreasurer: '社团负责人 家俊', npcDeveloper: '地产商 李先生', npcColleague: '调查同伴 阿澄',
    mentorIntro: '榮姐把灯递到你手里：“先别急着判断。把案卷、证词和你亲眼看到的事情逐一对上。”', supervisorIntro: '林主任把一份薄薄的卷宗推到桌边。举报信没有写出名字，只留下一项审批和几笔去向不明的款项。', fileIntro: '南湾项目的审批案卷。日期、金额和签名都在这里；附件中有一页被抽走了。', colleagueIntro: '阿澄正在整理街区地图：“我把已知地点标上去了。没核实的部分先留空。”', informantIntro: '阿强压低声音：“我只说亲眼见过的。你要是愿意听，我把时间和地点告诉你。”', cafeIntro: '老板擦着杯子说：“最近几周三晚上，总有人订靠窗那张桌子。登记簿还在。”', studentIntro: '阿晴攥着书包带：“那张学生证确实在我手上待过一会儿，但事情不是你想的那样。”', treasurerIntro: '家俊摊开社团的活动账目：“每笔钱都有单据，只是有一页附件不知道放到哪了。”', developerIntro: '李先生看了一眼你的证件：“项目的事我都按程序回答。你想先核对哪一笔？”',
    askMission: '今晚先查什么？', askHow: '我该从哪里开始？', endTalk: '我记下了。', mentorReply: '先把举报信和项目档案对上。再去旧城找线人，核实每一个说法。记得把亲眼看到和听来的话分开记录。', supervisorReply: '南湾项目的审批记录不完整。你先熟悉档案，再沿着街区的会面线索查下去。不要因为一个传闻就下结论。', fileDialogue: '匿名举报提到南湾项目的审批过程。案卷显示审批时间明显短于同类项目，附件里还缺了一页社团活动费的报销记录。',
    optionRecord: '把异常审批时间记下来', optionMissingPage: '标记缺失的报销页', optionAskMeeting: '追问每周三的会面', optionAskPackage: '询问黑色文件袋', optionCheckRegister: '核对访客登记', optionStudentID: '询问学生证的事', optionAccount: '核实社团报销账目', optionPolite: '先礼貌结束对话',
    resultRecord: '案卷已注明：本次审批用时 18 天，同类项目通常约需 90 天。这个差异值得核实。', resultMissingPage: '报销附件少了一页。先记录缺页事实，之后找经手人核对。', resultMeeting: '线人说，项目审批期间有人每周三在海边茶馆见面。你记下了时间和地点，仍需其他记录印证。', resultPackage: '线人记得有人带走一只黑色文件袋，但无法确认里面是什么。把它作为待核实线索。', resultRegister: '店主愿意让你核对访客登记。几次周三晚间的记录被同一笔预订关联起来。', resultStudentID: '社团负责人承认学生证被借用过。先记录当事人的说法，稍后再核对校方流程。', resultAccount: '两笔活动报销的金额和日期对不上。你拿到了账目副本，下一步需要找出缺失附件。', resultPolite: '对方没有补充更多信息。你可以先调查别处，再回来继续询问。',
    clueBudget: '南湾项目审批用时 18 天；同类项目通常约需 90 天。', clueMissingPage: '社团活动费的报销附件缺少一页，需向经手人核实。', clueMeeting: '线人提供每周三海边茶馆会面的时间与地点，仍待其他资料印证。', cluePackage: '有人带走黑色文件袋；线人无法确认袋中物品。', clueRegister: '访客登记显示多次周三晚间预订与同一项目相关。', clueStudentID: '社团负责人承认学生证曾被借用，校方记录尚待核实。', clueAccounts: '两笔社团活动报销金额和日期不一致，已取得账目副本。',
  },
  'zh-Hant': {
    helpTitle: '求救 · 調查指引', helpButton: '求救 / 我卡住了',
    helpBody: '求救會在主角頭頂顯示方向箭頭，\n並在地面畫出可走的虛線。\n請自行移動；交談和調查仍由你決定。', helpRemaining: '剩餘引路次數：{count}', helpRouteAction: '顯示引路', helpExhausted: '本次調查的求救次數已用完。按 M 看地圖，繼續沿街區探索。',
    helpWalkTitle: '到達後由你決定', helpWalkBody: '走近人物後，按 E / 空格鍵或點擊人物交談。點擊地面尋路與鍵盤移動都可以繼續使用。',
    helpClose: '返回調查', helpNoTarget: '目前任務沒有可指引的人物或地點；請按清單操作。',
    helpUseMap: '按 M 開啟地圖；已到訪區域可以直接快速傳送。', arrivedInteract: '已到達附近。按 E / 空格鍵，或點人物，決定是否交談。', clickApproach: '正在靠近：{target}；到達後由你選擇是否交談。',
    semiAutoArrowOn: '引路已開啟：跟隨頭頂黃箭頭和地面虛線，自行走向目標。', semiArrivedInteraction: '已到達目標附近；按 E / 空格鍵，或點擊人物繼續。', semiArrivedPortal: '已到傳送碑附近；按 E / 空格鍵進入，或按 M 查看地圖。', semiArrivedWalk: '已到達路面提示牌。現在繼續調查。', semiNoRoute: '暫時找不到可行路線；請開啟地圖確認位置。',
    objectiveHelp: '試用求救：按 H 或點擊按鈕顯示引路',
    groundWalkHint: 'WASD / ↑↓←→ 行走 · 點擊地面自動前往', waystone: '傳送碑', waystoneGlyph: '碑', portalDestination: '前往 {area}', portalDestinationList: '本區傳送碑去向', portalReady: '可前往', portalLocked: '待解鎖', waystoneReach: '已到傳送碑附近：按 E / 空格鍵或點互動進入。', waystoneDiscovered: '已記錄傳送點：{area}', waystoneNotVisited: '尚未到訪此區域；先沿街道前往傳送碑。', alreadyHere: '你已在這個區域。', mapFastTravelHint: '點擊綠色的已到訪區域，即可直接快速傳送',
    achievementKicker: '檔案成就已解鎖', achievementTitle: '第一幕完成', achievementBody: '你已完成第一幕「看見」。', achievementNextLabel: '接下來 · 第二幕', achievementNextTitle: '帳本的空白頁', achievementNextBody: '會面、帳目和缺頁已對上。下一份檔案將追問：是誰拿走了那一頁？', achievementClose: '領取夥伴，繼續調查', companionName: '守正之靈 · 獬豸', companionGift: '第一幕禮物：守正之靈加入隊伍', companionMeaning: '獬豸辨曲直。見財先問來路，不為一時之利越過底線。', companionJoined: '守正之靈已跟上你，往後的調查它會同行。', lawTitle: '學習法條 · 仍須核實事實', lawBody: '《刑法》第385條：利用職務便利非法收受財物並為他人謀利，可能構成受賄罪。\n《刑法》第389條：為謀取不正當利益給予國家工作人員財物，可能構成行賄罪。\n本案仍須以證據、身份與主觀目的繼續核實，不能據此定罪。', headToHarborHint: '沿舊城傳送碑前往海邊碼頭，再走到海邊茶館。', scrollTasks: '滾輪或箭頭查看', objectiveDone: '任務完成：{task}', evidenceCardTitle: '獲得線索 · 第 {count} 條',
    gateKicker: '監察組 · 見習檔案', gameTitle: '陰影之下', gateHelp: '請留下你的調查員名字。', nameLabel: '調查員名稱', start: '進入檔案', rongJie: '榮姐',
    languageLabel: '顯示語言', simplified: '简体中文', traditional: '繁體中文',
    rotateTitle: '請將手機橫向握持', rotateBody: '橫向時文字和地圖更清楚；也可以保持直向繼續。', continuePortrait: '仍以直向繼續', touchHelp: '左側搖桿移動 · 右側按鈕求救／互動／線索／地圖', mobileHelp: '求救',
    prologueKicker1: '澳門 · 雨夜', prologueTitle1: '沒有署名的信', prologueBody1: '雨水從監察組的門縫淌進來。\n信封沒有署名，只寫了四個字：南灣項目。',
    prologueKicker2: '一份不完整的檔案', prologueTitle2: '被抽走的一頁', prologueBody2: '審批比以往快了許多。\n三筆費用有簽名，附件卻少了一頁帳。',
    prologueKicker3: '榮姐的提醒', prologueTitle3: '先分清看見與聽說', prologueBody3: '「一封信只是起點。\n先找人，再把時間、地點和帳目逐一對上。」',
    prologueKicker4: '你的第一夜', prologueTitle4: '接過這盞燈', prologueBody4: '「我先記下能核實的事實。\n如果有人說謊，就讓證據自己指出來。」',
    prologueKicker5: '街燈亮起', prologueTitle5: '從這裡出發', prologueBody5: '榮姐指向雨中的街道：\n「先學會走近。舊城和海邊，都在等你。」',
    replay: '檔案回放中', tutorialHeader: '見習生訓練檔案 · 第 0 關', tutorialStep1: '1 / 3  先學會移動', tutorialStep2: '2 / 3  靠近發光的記錄點',
    tutorialMove: '移動滑鼠轉向 · 點擊石路尋路 · WASD／方向鍵即時移動', tutorialApproach: '燈光會讓細節浮現。向右前方走近那張遺落的便箋。',
    clueNear: '燈光照到了一張遺落的便箋。再靠近一點。', capture: '定格並記錄', step3: '3 / 3  前往拱門，進入第一幕', exitPrompt: '記錄不是結論，而是下一次追問的起點。去右側拱門。',
    tutorialTitle: '第 0 關 · 學會看見', tutorialIntro: '榮姐把燈遞給你：\n「今晚只做一件事——親自走近，再寫下你確實看見的。」', starting: '訓練即將開始…', actOne: '第一幕／看見',
    actOneKicker: '廉署監察組 · 見習生檔案 01', actOneTitle: '第一幕 · 看見', actOneBody: '榮姐說：\n「唔好靠估，行過去睇。」\n\n今天不是要你抓人。\n把你親眼見到的事，完整地記錄下來。', startingPatrol: '巡查即將開始…',
    deskLabel: '監察組 · {name} · 檔案 01', oil: '燈油', firstPrompt: '先看清，再判斷', controls: '移動滑鼠轉向 · 點擊地面尋路 · WASD／方向鍵即時移動',
    captureTitle: '定格取證', evidenceFile: '證 物 檔 案', ordinary: '檔案類別：日常往來', academic: '檔案類別：校園誠信', classify: '請將這件事放入正確的位置',
    done: '記錄完成', redline: '紅線標記', continue: '點擊繼續巡查', lampOut: '燈火熄滅 · 本回合進入盲區回放', restart: '第一幕演示結束 · 重新整理頁面即可重玩',
    discovered: '發現異動：{title}', approachForEvidence: '靠近後可定格取證', idleControls: '點擊地面移動 · WASD／方向鍵移動',
    archived: '兩條線索已歸檔 · 新檔案正在送達', nextSoon: '第一幕取證完成 · 即將進入下一份檔案',
    chapterSwitch: '檔案切換', nextChapter: '第二幕 · 帳本的空白頁', nextTitle: '社團活動費',
    nextSummary: '三筆看似無關的報銷，指向同一頁被撕下的帳本。下一次巡查，你需要比「看見」更早一步：學會追問。',
    patchStatus: '內容製作中 · 本次版本已預留入口與章節轉場', returnTutorial: '返回第 0 關',
    sodaTitle: '一支汽水', sodaWitness: '家俊 · 新同事', sodaDescription: '「新手頭一日嘛，請你飲。」他遞來一支仍帶水珠的汽水。',
    sodaCorrect: '普通的人情往來，不涉及職權與利益交換。', sodaIncorrect: '可疑不等於違規；先把事情看清，才下判斷。',
    cardTitle: '借出的學生證', cardWitness: '家俊與一名應考學生', cardDescription: '走廊轉角，家俊把自己的學生證交給一名神色匆忙的同學。你聽見對方低聲說：「我只差這一次。」',
    cardCorrect: '這不是受賄，但借證代考屬於嚴重的學術不誠實。應完整記錄事實，並交由學校按程序處理。',
    cardIncorrect: '看見一張學生證，不等於已掌握全部事實；記錄與判斷都要有依據。',
    courtesy: '人情往來', courtesySub: '正常而無害的情誼', declaration: '需要記錄', declarationSub: '事實需交主管處理', corruption: '違法貪腐', corruptionSub: '越過制度的紅線',
    worldChapter: '第一幕 · 看見', districtHQ: '廉署據點', districtOldTown: '舊城街區', districtCampus: '校園與社團', districtHarbor: '海邊碼頭', districtHill: '山邊住宅',
    objectiveHeading: '調查清單', objectiveMove: '先沿石路走幾步', objectiveMentor: '與榮姐交談', objectiveSupervisor: '向林主任了解案情', objectiveFile: '查看匿名舉報案卷', objectiveNotebook: '按 L 查看線索記錄簿', objectiveMap: '按 M 查看街區地圖', objectiveOldTown: '前往舊城街區', objectiveInformant: '詢問街頭線人', objectiveCafe: '前往海邊碼頭 → 到茶館核實會面', objectiveCampus: '前往校園與社團 → 調查帳目', objectiveLedger: '找出被遺漏的帳頁', taskComplete: '教學完成 · 案件調查繼續',
    mapLabel: '街區地圖', mapExpand: '按 M 展開地圖', mapClose: '按 M 或 Esc 關閉', interactHint: '空白鍵／點擊：交談或調查', moveHint: 'WASD／方向鍵移動 · 點擊地面前往', notebookHint: '按 L 查看線索記錄', clueBook: '線索記錄', noClues: '目前還沒有線索。調查人物和物件，線索會自動歸檔。', clueRecorded: '線索已記入記錄簿', evidenceRecorded: '關鍵證據已歸檔', dialogueContinue: '繼續', dialogueLeave: '結束交談', notebookClose: '關閉記錄簿', mobileInteract: '互動', mobileNotebook: '線索', mobileMap: '地圖',
    scenePromptTitle: '第 0 關 · 廉署據點', scenePromptBody: '先熟悉調查工作：和榮姐碰面、查看案卷，再帶着清單走進街區。', beginExplore: '開始調查', areaEntering: '前往：{area}', tutorialDoorLocked: '完成據點清單後，就可以開始街區巡查。', informantDoorLocked: '先到舊城找線人核實舉報內容。', accountsDoorLocked: '先核對社團帳目，再前往山邊住宅區。',
    npcMentor: '榮姐', npcSupervisor: '林主任', npcInformant: '街頭線人 阿強', npcCafe: '海邊茶館老闆', npcStudent: '學生 阿晴', npcTreasurer: '社團負責人 家俊', npcDeveloper: '地產商 李先生', npcColleague: '調查同伴 阿澄',
    mentorIntro: '榮姐把燈遞到你手裡：「先別急着判斷。把案卷、證詞和你親眼所見逐一對上。」', supervisorIntro: '林主任把一份薄薄的卷宗推到桌邊。舉報信沒有寫出名字，只留下了一項審批和幾筆去向不明的款項。', fileIntro: '南灣項目的審批案卷。日期、金額和簽名都在這裡；附件中有一頁被抽走了。', colleagueIntro: '阿澄正在整理街區地圖：「我把已知地點標上去了。未核實的部分先留空。」', informantIntro: '阿強壓低聲音：「我只說親眼見過的。你願意聽的話，我把時間和地點告訴你。」', cafeIntro: '老闆擦着杯子說：「最近幾個星期三晚上，總有人訂靠窗那張桌子。登記簿還在。」', studentIntro: '阿晴攥着書包帶：「那張學生證確實在我手上待過一會兒，但事情不是你想的那樣。」', treasurerIntro: '家俊攤開社團活動帳目：「每筆錢都有單據，只是有一頁附件不知放到哪了。」', developerIntro: '李先生看了一眼你的證件：「項目的事我都按程序回答。你想先核對哪一筆？」',
    askMission: '今晚先查甚麼？', askHow: '我該從哪裡開始？', endTalk: '我記下了。', mentorReply: '先把舉報信和項目檔案對上。再去舊城找線人，核實每一個說法。記得把親眼所見和聽來的話分開記錄。', supervisorReply: '南灣項目的審批記錄不完整。你先熟悉檔案，再沿着街區的會面線索查下去。不要因為一個傳聞就下結論。', fileDialogue: '匿名舉報提到南灣項目的審批過程。案卷顯示審批時間明顯短於同類項目，附件裡還缺了一頁社團活動費的報銷記錄。',
    optionRecord: '把異常審批時間記下來', optionMissingPage: '標記缺少的報銷頁', optionAskMeeting: '追問每週三的會面', optionAskPackage: '詢問黑色文件袋', optionCheckRegister: '核對訪客登記', optionStudentID: '詢問學生證一事', optionAccount: '核實社團報銷帳目', optionPolite: '先禮貌結束對話',
    resultRecord: '案卷已註明：本次審批用時 18 天，同類項目通常約需 90 天。這個差異值得核實。', resultMissingPage: '報銷附件少了一頁。先記錄缺頁事實，之後找經手人核對。', resultMeeting: '線人說，項目審批期間有人每週三在海邊茶館見面。你記下了時間和地點，仍需其他記錄印證。', resultPackage: '線人記得有人帶走一隻黑色文件袋，但無法確認裡面是甚麼。把它作為待核實線索。', resultRegister: '店主願意讓你核對訪客登記。幾次週三晚間的記錄被同一筆預訂關聯起來。', resultStudentID: '社團負責人承認學生證曾被借用。先記錄當事人的說法，稍後再核對校方流程。', resultAccount: '兩筆活動報銷的金額和日期對不上。你拿到了帳目副本，下一步需要找出缺失附件。', resultPolite: '對方沒有補充更多資訊。你可以先調查別處，再回來繼續詢問。',
    clueBudget: '南灣項目審批用時 18 天；同類項目通常約需 90 天。', clueMissingPage: '社團活動費的報銷附件缺少一頁，需向經手人核實。', clueMeeting: '線人提供每週三海邊茶館會面的時間與地點，仍待其他資料印證。', cluePackage: '有人帶走黑色文件袋；線人無法確認袋中物品。', clueRegister: '訪客登記顯示多次週三晚間預訂與同一項目相關。', clueStudentID: '社團負責人承認學生證曾被借用，校方記錄尚待核實。', clueAccounts: '兩筆社團活動報銷金額和日期不一致，已取得帳目副本。',
  },
} as const;

export type CopyKey = keyof typeof copy['zh-Hans'];

export function getLocale(): GameLocale {
  if (typeof window === 'undefined') return 'zh-Hant';
  return window.localStorage.getItem(LOCALE_KEY) === 'zh-Hans' ? 'zh-Hans' : 'zh-Hant';
}

export function setLocale(locale: GameLocale): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(LOCALE_KEY, locale);
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
}

export function t(key: CopyKey, values: Record<string, string> = {}): string {
  const template: string = copy[getLocale()][key];
  return template.replace(/\{(\w+)\}/g, (_, token: string) => values[token] ?? '');
}

export function gameFontFamily(): string {
  return getLocale() === 'zh-Hans' ? 'Noto Sans SC, sans-serif' : 'Noto Sans TC, sans-serif';
}

export function localizedText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, content, { fontFamily: gameFontFamily(), ...style });
}

export function localizedEvent(id: string) {
  const simplified = id === 'soda-gift'
    ? { title: 'sodaTitle' as const, witness: 'sodaWitness' as const, description: 'sodaDescription' as const, correctConsequence: 'sodaCorrect' as const, incorrectConsequence: 'sodaIncorrect' as const }
    : { title: 'cardTitle' as const, witness: 'cardWitness' as const, description: 'cardDescription' as const, correctConsequence: 'cardCorrect' as const, incorrectConsequence: 'cardIncorrect' as const };
  return Object.fromEntries(Object.entries(simplified).map(([field, key]) => [field, t(key)])) as Record<keyof typeof simplified, string>;
}

export function prologueCopy(kind: 'Kicker' | 'Title' | 'Body', index: number): string {
  const keys = [
    { Kicker: 'prologueKicker1', Title: 'prologueTitle1', Body: 'prologueBody1' },
    { Kicker: 'prologueKicker2', Title: 'prologueTitle2', Body: 'prologueBody2' },
    { Kicker: 'prologueKicker3', Title: 'prologueTitle3', Body: 'prologueBody3' },
  ] as const;
  return t(keys[Math.max(0, Math.min(2, index))][kind]);
}
