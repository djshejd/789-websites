// Original, simplified picture-description practice; not an official test.
const toeic = [
 ['a slice of toast','Toast is available at the breakfast buffet.','早餐自助餐提供吐司。','A slice of toast has butter on it.','一片吐司上放著奶油。'],
 ['a fried egg','The guest ordered a fried egg.','客人點了一份煎蛋。','A fried egg is shown.','圖中是一顆煎蛋。'],
 ['a carton of milk','Please put the milk in the refrigerator.','請把牛奶放進冰箱。','A carton of milk is shown.','圖中是一盒牛奶。'],
 ['a cup of coffee','The server brought a cup of coffee.','服務生端來一杯咖啡。','There is coffee in a cup.','杯子裡有咖啡。'],
 ['a cup of tea','Would you like a cup of tea while you wait?','等候時，您想喝杯茶嗎？','A tea bag is hanging from a cup.','一個茶包吊在杯邊。'],
 ['a glass of juice','Orange juice is included with breakfast.','早餐附有柳橙汁。','A straw is in a glass of juice.','一根吸管插在果汁杯裡。'],
 ['fresh bread','The bakery sells fresh bread every morning.','這家麵包店每天早上販售新鮮麵包。','A loaf of bread is shown.','圖中是一條麵包。'],
 ['spread butter on bread','Please spread some butter on the bread.','請在麵包上抹些奶油。','A block of butter is on a dish.','一塊奶油放在盤子上。'],
 ['strawberry jam','The hotel serves toast with strawberry jam.','這間飯店供應搭配草莓果醬的吐司。','A jar of jam has a lid on it.','一罐果醬上有蓋子。'],
 ['a slice of cheese','Could you add a slice of cheese to my order?','可以在我的餐點加一片起司嗎？','A piece of cheese has holes in it.','一塊起司上有一些孔洞。'],
 ['order a sandwich','I would like to order a sandwich to go.','我想點一份三明治外帶。','A triangular sandwich is shown.','圖中是一份三角形三明治。'],
 ['a stack of pancakes','The restaurant serves pancakes until ten.','這家餐廳供應鬆餅到十點。','Several pancakes are stacked on a plate.','幾片鬆餅疊放在盤子上。'],
 ['a freshly made waffle','Your freshly made waffle will be ready soon.','您現做的格子鬆餅很快就好。','A waffle has a square pattern.','一片格子鬆餅上有方格圖案。'],
 ['a bowl of cereal','Cereal and milk are available at the buffet.','自助餐提供穀片和牛奶。','A bowl contains cereal and a spoon.','碗裡有穀片和一支湯匙。'],
 ['a cup of yogurt','You can choose yogurt or fruit with your meal.','您的餐點可選擇搭配優格或水果。','A cup of yogurt is shown.','圖中是一杯優格。'],
 ['a ripe banana','Fresh bananas are available near the counter.','櫃檯附近有新鮮香蕉。','A peeled banana is shown.','圖中是一根剝開的香蕉。'],
 ['a fresh apple','Please wash the apples before serving them.','供餐前請先把蘋果洗乾淨。','An apple has a leaf near its stem.','一顆蘋果的果梗旁有片葉子。'],
 ['avocado toast','Avocado toast is our breakfast special today.','酪梨吐司是我們今天的早餐特餐。','Half an avocado has a large seed.','半顆酪梨裡有一顆大果核。'],
 ['crispy bacon','The guest asked for eggs and crispy bacon.','客人點了雞蛋和酥脆培根。','Two strips of bacon are shown.','圖中是兩條培根。'],
 ['a butter croissant','The bakery opens at seven and sells croissants.','這家麵包店七點開門，並販售可頌。','A curved croissant is shown.','圖中是一個彎曲的可頌。']
];
// This illustration depicts an unpeeled banana; keep the statement literal.
toeic[15][3]='A curved yellow banana is shown.'; toeic[15][4]='圖中是一根彎曲的黃色香蕉。';
words.forEach((w,i)=>{w.example=toeic[i][1];w.translation=toeic[i][2]});
const baseRenderLearn=renderLearn;
renderLearn=function(){baseRenderLearn();const w=words[index];$('.category').textContent='TOEIC PREP · FOOD & DINING · 入門';$('.word-sub').innerHTML=`<span>${w.ipa}</span><span class="pos-tag">n. ${usage[index][1]}</span>`;$('.example').innerHTML=`<span class="eyebrow">CONTEXT · 餐飲情境</span><p lang="en" style="margin-top:8px">${w.example}</p><button class="listen small" id="listenExample" style="margin-top:12px">▷　Listen to example</button><details class="translation-details"><summary>查看中文與用法</summary><p><strong>${w.zh}</strong> · ${w.translation}</p><p>${usage[index][1]}；搭配上方餐飲例句練習此單字。</p></details>`;$('.usage-note').innerHTML=`<strong>COLLOCATION · 常用搭配</strong><p lang="en">${toeic[index][0]}</p>`;$('#listenExample').onclick=()=>speak(w.example)};
introQuiz=function(){mode='quiz';quiz=null;update();$('#app').innerHTML=`<div class="quiz"><span class="eyebrow">PICTURE DESCRIPTION · LISTENING</span><div class="start-art">${art('pancake',true)}</div><h2>Listen. Look. Choose.</h2><p>聽四句英文，選出最符合圖片的一句。<br>國中銜接多益入門 · 20 題原創插畫練習<br>需要提示時，可展開英文逐字稿。</p><p class="practice-note">參考 Part 1 的四選一形式，以插畫與可重播語音練習，並非正式測驗。</p><button class="know-btn" id="startQuiz">Start practice　→</button></div>`;$('#startQuiz').onclick=()=>startQuiz(words)};
renderQuestion=function(){const q=quiz,w=q.questions[q.pos];q.answered=false;q.showText=false;q.options=shuffle([w,...shuffle(words.filter(x=>x.id!==w.id)).slice(0,3)]);$('#app').innerHTML=`<div class="quiz toeic-quiz"><span class="eyebrow">LISTENING PRACTICE · ${String(q.pos+1).padStart(2,'0')} / ${q.questions.length}</span><h2>Choose the best description.</h2><p>聽完 A–D，選出最符合圖片的描述。</p><div class="illustration">${quizArt(w.en)}</div><div class="audio-tools"><button class="listen" id="playOptions">◖))　播放四個選項</button><button class="listen small" id="showTranscript">顯示英文逐字稿</button></div><div class="quiz-options">${q.options.map((o,i)=>`<button class="option" data-answer="${o.id}" aria-label="選擇 ${'ABCD'[i]}"><span>${'ABCD'[i]}</span><b class="option-text" lang="en" hidden>${toeic[o.id][3]}</b><b class="option-placeholder">選擇 ${'ABCD'[i]}</b></button>`).join('')}</div><div class="quiz-feedback" role="status" aria-live="polite"></div><button class="know-btn" id="nextQuestion" hidden>Next　→</button></div>`;document.querySelectorAll('[data-answer]').forEach(btn=>btn.onclick=()=>answer(Number(btn.dataset.answer)));$('#playOptions').onclick=()=>speak(q.options.map((o,i)=>`${'ABCD'[i]}. ${toeic[o.id][3]}`).join(' ... '));$('#showTranscript').onclick=()=>{q.showText=!q.showText;document.querySelectorAll('.option-text').forEach(e=>e.hidden=!q.showText);document.querySelectorAll('.option-placeholder').forEach(e=>e.hidden=q.showText);$('#showTranscript').textContent=q.showText?'隱藏英文逐字稿':'顯示英文逐字稿'};$('#nextQuestion').onclick=()=>{if('speechSynthesis' in window)speechSynthesis.cancel();q.pos++;if(q.pos===q.questions.length)renderResult();else renderQuestion()}};
answer=function(id){const q=quiz;if(!q||q.answered)return;q.answered=true;if('speechSynthesis' in window)speechSynthesis.cancel();const w=q.questions[q.pos],correct=id===w.id;if(correct)q.score++;else q.wrong.push(w);document.querySelectorAll('[data-answer]').forEach(b=>{b.disabled=true;const n=Number(b.dataset.answer);if(n===w.id)b.classList.add('correct');else if(n===id)b.classList.add('wrong')});document.querySelectorAll('.option-text').forEach(e=>e.hidden=false);document.querySelectorAll('.option-placeholder').forEach(e=>e.hidden=true);$('#showTranscript').hidden=true;$('.quiz-feedback').innerHTML=`<strong>${correct?'✓ Correct!':'Keep practicing.'} Answer: ${'ABCD'[q.options.findIndex(o=>o.id===w.id)]}</strong><p lang="en">${toeic[w.id][3]}</p><p>${toeic[w.id][4]}</p><p class="answer-note">辨識重點：${w.en}（${w.zh}）。其餘三句描述的是其他圖片；判斷時需同時核對物品、形狀與位置。</p><button class="listen small" id="answerAudio" style="display:inline-flex">◖))　聽正確描述</button>`;$('#answerAudio').onclick=()=>speak(toeic[w.id][3]);$('#nextQuestion').hidden=false;$('#nextQuestion').textContent=q.pos===q.questions.length-1?'View results　→':'Next　→'};
const baseRenderResult=renderResult;
renderResult = function () {
  baseRenderResult();
  const result = $('#app .quiz');
  result.classList.add('toeic-results');
  result.querySelector('.eyebrow').textContent = 'PRACTICE RESULTS · 練習答對題數';

  const scoreTrack = document.createElement('div');
  scoreTrack.className = 'toeic-score-track';
  scoreTrack.setAttribute('aria-hidden', 'true');
  const scoreFill = document.createElement('div');
  scoreFill.className = 'toeic-score-fill';
  scoreFill.style.width = `${quiz.score / quiz.questions.length * 100}%`;
  scoreTrack.append(scoreFill);
  result.querySelector('.score').after(scoreTrack);

  const reviewList = result.querySelector('.review-list');

  if (quiz.wrong.length) {
    const review = document.createElement('section');
    review.className = 'toeic-review';
    review.setAttribute('aria-labelledby', 'toeic-review-title');
    review.innerHTML = `
      <h3 id="toeic-review-title">錯題解析（${quiz.wrong.length} 題）</h3>
      ${quiz.wrong.map(word => {
        const [, , , description, translation] = toeic[word.id];
        return `
          <details>
            <summary><span lang="en">${word.en}</span> · ${word.zh}</summary>
            <div class="toeic-review-detail">
              ${art(word.en)}
              <div>
                <p class="toeic-review-answer" lang="en">${description}</p>
                <p>${translation}</p>
                <button type="button" class="listen small" data-review-audio="${word.id}">聽正確描述</button>
              </div>
            </div>
          </details>`;
      }).join('')}`;
    review.querySelectorAll('[data-review-audio]').forEach(button => {
      button.onclick = () => speak(toeic[Number(button.dataset.reviewAudio)][3]);
    });
    reviewList.replaceWith(review);

    const retry = result.querySelector('#retryWrong');
    const startReview = retry.onclick;
    retry.onclick = () => {
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      startReview();
      const question = $('#app h2');
      question.tabIndex = -1;
      question.focus();
    };
  } else {
    reviewList.remove();
  }

  const note = document.createElement('p');
  note.className = 'practice-note';
  note.textContent = '此為原創練習成績，不換算多益正式分數。';
  result.append(note);

  const heading = result.querySelector('h2');
  heading.tabIndex = -1;
  heading.focus();
};
$('#learnTab').onclick=()=>{quiz=null;renderLearn()};$('#quizTab').onclick=introQuiz;
renderLearn();
