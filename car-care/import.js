(() => {
  const M = DriveModel;
  const columns = {
    name: ['車輛', '車輛名稱', '車名', 'vehicle', 'vehicle name'],
    plate: ['車牌', '車牌號碼', 'plate', 'license plate'],
    date: ['日期', '保養日期', '維修日期', '進廠日期', '施工日期', 'date', 'service date'],
    mileage: ['里程km', '里程', '公里數', '當時里程', '當時里程km', '保養里程', '保養里程km', '里程數', 'mileage', 'odometer', 'odometer km'],
    category: ['類型', '分類', '類別', '紀錄類型', '保養類型', 'category', 'type'],
    items: ['項目', '保養項目', '維修項目', '保養維修項目', '施工項目', '服務項目', 'items', 'item', 'service'],
    cost: ['費用NTD', '費用', '費用NT$', '費用TWD', '保養費用', '合計', '總金額', '金額', 'cost', 'amount'],
    shop: ['店家', '保養廠', '保養廠店家', '維修廠', '廠商', 'shop', 'garage'],
    notes: ['備註', '說明', 'notes', 'note', 'remarks'],
  };
  const required = ['date', 'mileage', 'items'];
  const clean = value => String(value ?? '').trim().normalize('NFKC').toLowerCase();
  const headerKey = value => clean(value).replace(/[\s()\/_.-]/g, '');
  const plateKey = value => clean(value).replace(/[\s-]/g, '');
  const headers = new Map(Object.entries(columns).flatMap(([field, names]) =>
    names.map(name => [headerKey(name), field])));

  function parseCsv(content) {
    const rows = [];
    let row = [], value = '', quoted = false, closed = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      if (quoted) {
        if (char !== '"') value += char;
        else if (content[i + 1] === '"') { value += '"'; i++; }
        else { quoted = false; closed = true; }
      } else if (char === ',') {
        row.push(value);
        value = '';
        closed = false;
      } else if (char === '\r' || char === '\n') {
        row.push(value);
        rows.push(row);
        row = [];
        value = '';
        closed = false;
        if (char === '\r' && content[i + 1] === '\n') i++;
      } else if (char === '"' && !value && !closed) {
        quoted = true;
      } else {
        if (closed || char === '"') throw Error('CSV 的雙引號格式不正確');
        value += char;
      }
    }

    if (quoted) throw Error('CSV 有未關閉的雙引號');
    if (row.length || value || closed) rows.push([...row, value]);
    return rows;
  }

  async function readFile(file) {
    if (file.size > 5_000_000) throw Error('請使用 5 MB 以下的表單');
    if (/\.xlsx$/i.test(file.name)) {
      try {
        return await readXlsxFile(file);
      } catch {
        throw Error('無法讀取 Excel，請確認檔案未加密且為有效的 .xlsx');
      }
    }
    if (!/\.csv$/i.test(file.name)) throw Error('請選擇 Excel（.xlsx）或 CSV（.csv）');
    const bytes = await file.arrayBuffer();
    let content;
    try {
      content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      content = new TextDecoder('big5', { fatal: true }).decode(bytes);
    }
    return [{ sheet: '', data: parseCsv(content) }];
  }

  function parseDate(value) {
    if (value instanceof Date) return M.date(value.toISOString().slice(0, 10));
    const text = clean(value);
    const parts = /^(?:民國\s*)?(\d{2,4})[./-](\d{1,2})[./-](\d{1,2})$/.exec(text);
    if (!parts) throw Error('日期請填 YYYY-MM-DD、YYYY/MM/DD 或民國日期');
    const [, year, month, day] = parts;
    const fullYear = text.startsWith('民國') || year.length < 4 ? Number(year) + 1911 : Number(year);
    return M.date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  }

  function parseNumber(value, field) {
    const cost = field === '費用';
    const raw = clean(value);
    if (!raw && cost) return 0;
    const text = cost ? raw.replace(/^(?:(?:nt|twd)\s*)?\$?\s*/, '').replace(/\s*元$/, '') :
      raw.replace(/\s*(?:km|公里)$/i, '');
    const pattern = cost ? /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/ :
      /^(?:\d+|\d{1,3}(?:,\d{3})+)$/;
    const amount = Number(text.replace(/,/g, ''));
    if (!pattern.test(text) || amount > (cost ? 1_000_000_000 : 10_000_000)) {
      throw Error(`${field}格式或數值不正確`);
    }
    return M.num(amount);
  }

  function getVehicle(state, name, plate) {
    if (!name && !plate) {
      const selected = state.vehicles.find(vehicle => vehicle.id === state.selectedId);
      if (!selected) throw Error('請先在里程誌選擇車輛');
      return selected;
    }
    const matches = state.vehicles.filter(vehicle =>
      (!name || clean(vehicle.name) === name) && (!plate || plateKey(vehicle.plate) === plate));
    if (!matches.length) throw Error('找不到這個車輛名稱或車牌；請先新增車輛或修正表單');
    if (matches.length > 1) throw Error('有多台同名車輛，請補填車牌');
    return matches[0];
  }

  function classify(category, items) {
    const type = clean(category).replace(/[\s/]/g, '');
    const known = M.categories.find(option => clean(option).replace(/[\s/]/g, '') === type);
    if (known) return known;
    if (/^(保養|定保|maintenance)$/.test(type)) return '定期保養';
    if (/^(修理|修復|repair)$/.test(type)) return '維修';
    if (/^(耗材|消耗品|consumables)$/.test(type)) return '耗材更換';
    if (/^(檢驗|其他|inspection|other)$/.test(type)) return '檢驗／其他';

    const text = clean(items);
    if (/維修|修理|修復|故障|異音|漏油|漏水|補胎|鈑金|板金|烤漆|repair/.test(text)) return '維修';
    if (/驗車|檢驗|檢測|檢查|排放|inspection/.test(text) && !/更換|換油|保養/.test(text)) return '檢驗／其他';
    if (/定期|保養|換油|機油|油濾|變速箱油|oil change|maintenance/.test(text)) return '定期保養';
    if (/輪胎|電瓶|蓄電池|煞車皮|來令片|雨刷|濾網|濾芯|空氣濾清器|火星塞|燈泡|tire|battery|wiper/.test(text)) return '耗材更換';
    return '檢驗／其他';
  }

  function recordKey(row) {
    return JSON.stringify([row.vehicleId, row.date, row.mileage, clean(row.items), row.cost, clean(row.shop), clean(row.notes)]);
  }

  function prepare(sheets, state) {
    const records = [], issues = [];
    const seen = new Set(state.records.map(recordKey));
    const today = M.today();
    let duplicates = 0, rejected = 0, sheetsFound = 0;

    for (const { sheet, data } of sheets) {
      if (!data.length) continue;
      const label = sheet ? `「${sheet}」` : '';
      let headerIndex = -1, positions;
      for (const [i, row] of data.slice(0, 20).entries()) {
        const fields = row.map(value => headers.get(headerKey(value)));
        if (required.every(field => fields.includes(field))) {
          headerIndex = i;
          positions = fields;
          break;
        }
      }
      if (headerIndex < 0) {
        issues.push(`${label || '表單'}找不到日期、里程及項目欄位。`);
        continue;
      }
      const mapped = positions.filter(Boolean);
      if (new Set(mapped).size !== mapped.length) {
        issues.push(`${label || '表單'}有重複的欄名，請合併同一欄位後重新匯入。`);
        continue;
      }
      sheetsFound++;

      for (let i = headerIndex + 1; i < data.length; i++) {
        const cells = data[i];
        if (cells.every(cell => clean(cell) === '')) continue;
        const get = field => cells[positions.indexOf(field)];
        const readText = field => String(get(field) ?? '').trim();
        try {
          if (cells.slice(positions.length).some(cell => clean(cell))) {
            throw Error('欄位數超出表頭；CSV 內含逗號的欄位請加上雙引號');
          }
          const vehicle = getVehicle(state, clean(get('name')), plateKey(get('plate')));
          const items = readText('items'), shop = readText('shop'), notes = readText('notes');
          if (!items) throw Error('缺少保養或維修項目');
          if (items.length > 300 || shop.length > 100 || notes.length > 2000) {
            throw Error('項目、店家或備註超過字數上限');
          }
          const date = parseDate(get('date'));
          if (date > today) throw Error('保養日期不可晚於今天');
          const record = {
            vehicleId: vehicle.id, date, items, shop, notes,
            mileage: parseNumber(get('mileage'), '里程'),
            cost: parseNumber(get('cost'), '費用'),
            category: classify(get('category'), items),
          };
          const key = recordKey(record);
          if (seen.has(key)) duplicates++;
          else {
            records.push(record);
            seen.add(key);
          }
        } catch (error) {
          rejected++;
          if (issues.length < 30) issues.push(`${label}第 ${i + 1} 列：${error.message}`);
        }
      }
    }

    if (!sheetsFound && !issues.length) issues.push('表單沒有資料。');
    return { records, issues, duplicates, rejected };
  }

  globalThis.DriveImport = { readFile, prepare };
})();
