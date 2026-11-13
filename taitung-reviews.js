(() => {
  const key = 'slow-taitung-reviews-v1';
  const records = Object.create(null);
  let canStore = true;
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '{}');
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      for (const p of places) {
        const r = raw[p.id];
        if (r && typeof r === 'object') records[p.id] = {
          rating: Number.isInteger(r.rating) && r.rating >= 0 && r.rating <= 5 ? r.rating : 0,
          thoughts: typeof r.thoughts === 'string' ? r.thoughts.slice(0, 2000) : '',
          updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : ''
        };
      }
    }
  } catch { canStore = false; }

  const get = id => records[id] || {rating: 0, thoughts: '', updatedAt: ''};
  const hasRecord = r => r.rating > 0 || r.thoughts.trim().length > 0;
  const stars = r => r.rating ? '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating) : '尚未評分';

  function updateSummaries() {
    document.querySelectorAll('[data-review-summary]').forEach(button => {
      const r = get(button.dataset.reviewSummary);
      button.querySelector('.review-score').textContent = r.rating ? `${stars(r)} ${r.rating}/5` : '我的評分・尚未評分';
      button.querySelector('.review-link').textContent = hasRecord(r) ? '查看／編輯感想 ↗' : '記錄感想與評分 ↗';
      const preview = button.querySelector('.review-preview');
      preview.textContent = r.thoughts.trim();
      preview.hidden = !r.thoughts.trim();
    });
  }

  function decorateCards() {
    document.querySelectorAll('#cards .card').forEach(card => {
      if (card.querySelector('[data-review-summary]')) return;
      const id = card.querySelector('[data-detail]')?.dataset.detail;
      if (!id) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'review-summary';
      button.dataset.detail = id;
      button.dataset.reviewSummary = id;
      button.innerHTML = '<span class="review-score"></span><span class="review-link"></span><span class="review-preview" hidden></span>';
      card.querySelector('.card-info').append(button);
    });
    updateSummaries();
  }

  function mountEditor() {
    const body = document.querySelector('#detail-content .detail-body');
    if (!body || body.querySelector('.review-editor') || !currentId) return;
    const id = currentId;
    const r = get(id);
    const section = document.createElement('section');
    section.className = 'review-editor';
    section.setAttribute('aria-labelledby', 'review-heading');
    section.innerHTML = `<div class="eyebrow">MY TRAVEL NOTES</div><h3 id="review-heading">我的感想與評分</h3><p class="review-local-note">自動保存在這個瀏覽器，不會公開；更換裝置或清除瀏覽資料後不會保留。</p><fieldset class="review-rating"><legend>我的評分</legend><div class="review-stars">${[1,2,3,4,5].map(n => `<label class="star-option"><input type="radio" name="review-rating" value="${n}" aria-label="${n} 星"><span aria-hidden="true">★</span></label>`).join('')}</div><div class="review-rating-meta"><output id="review-rating-label">尚未評分</output><button type="button" class="review-reset-rating">取消評分</button></div></fieldset><label for="review-thoughts" class="review-label">旅行感想</label><textarea id="review-thoughts" rows="5" maxlength="2000" placeholder="好吃嗎？風景如何？有什麼想留給下次的自己？"></textarea><div class="review-footer"><span id="review-counter"></span><span id="review-status" role="status" aria-live="polite"></span></div><button type="button" class="primary review-save">儲存紀錄 ✓</button>`;
    body.insertBefore(section, body.querySelector('.source-note'));
    const field = section.querySelector('textarea');
    field.value = r.thoughts;
    if (r.rating) section.querySelector(`input[value="${r.rating}"]`).checked = true;
    function refresh() {
      const value = get(id);
      section.querySelectorAll('.star-option').forEach(label => label.classList.toggle('filled', Number(label.querySelector('input').value) <= value.rating));
      section.querySelector('#review-rating-label').textContent = value.rating ? `${value.rating} / 5 星` : '尚未評分';
      section.querySelector('#review-counter').textContent = `${field.value.length} / 2000`;
      section.querySelector('.review-reset-rating').disabled = !value.rating;
    }
    function save() {
      records[id] = {rating: Number(section.querySelector('input:checked')?.value || 0), thoughts: field.value, updatedAt: new Date().toISOString()};
      try {
        localStorage.setItem(key, JSON.stringify(records));
        canStore = true;
        section.querySelector('#review-status').textContent = '已儲存在此瀏覽器 ✓';
      } catch {
        canStore = false;
        section.querySelector('#review-status').textContent = '無法儲存，請先複製感想備份';
      }
      refresh();
      updateSummaries();
    }
    field.addEventListener('input', save);
    section.querySelectorAll('input').forEach(input => input.addEventListener('change', save));
    section.querySelector('.review-reset-rating').addEventListener('click', () => {
      section.querySelectorAll('input').forEach(input => input.checked = false);
      save();
    });
    section.querySelector('.review-save').addEventListener('click', save);
    section.querySelector('#review-status').textContent = !canStore ? '瀏覽器儲存無法使用，請先複製感想備份' : hasRecord(r) ? '已載入上次的紀錄' : '評分或輸入後自動儲存';
    refresh();
  }

  new MutationObserver(decorateCards).observe(document.querySelector('#cards'), {childList: true});
  new MutationObserver(mountEditor).observe(document.querySelector('#detail-content'), {childList: true});
  document.addEventListener('click', event => {
    if (event.target.closest('[data-review-summary]')) {
      queueMicrotask(() => {
        mountEditor();
        document.querySelector('.review-editor')?.scrollIntoView({block: 'start'});
      });
    }
  });
  decorateCards();
})();
