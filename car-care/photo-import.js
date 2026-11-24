(() => {
  const asset = name => new URL('vendor/ocr/' + name, document.baseURI).href;
  let engine;

  function loadEngine() {
    if (!engine) {
      engine = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = asset('tesseract.min.js');
        script.onload = () => resolve(window.Tesseract);
        script.onerror = () => {
          script.remove();
          reject(Error('無法載入照片辨識程式，請重新選擇照片。'));
        };
        document.head.append(script);
      }).catch(error => {
        engine = null;
        throw error;
      });
    }
    return engine;
  }

  async function prepareImage(file) {
    if (file.size > 12_000_000) throw Error('請選擇 12 MB 以下的照片。');
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw Error('無法讀取照片，請使用清晰的 JPG、PNG 或 WebP。');
    }
    try {
      const { width, height } = bitmap;
      if (width * height > 50_000_000) throw Error('照片解析度過高，請先裁切或縮小。');
      const scale = Math.min(1, 2400 / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d', { alpha: false });
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas;
    } finally {
      bitmap.close();
    }
  }

  async function recognize(file, signal, progress) {
    const image = await prepareImage(file);
    signal.throwIfAborted();
    let worker, finished = false, timeout, abort, stopWithError;
    const stop = new Promise((_, reject) => {
      stopWithError = reject;
      abort = () => reject(signal.reason);
      signal.addEventListener('abort', abort, { once: true });
      timeout = setTimeout(() => reject(Error('照片辨識逾時，請裁切到表單文字後重試。')), 90_000);
    });
    try {
      const result = await Promise.race([stop, (async () => {
        const Tesseract = await loadEngine();
        if (finished) return;
        worker = await Tesseract.createWorker('chi_tra+eng', Tesseract.OEM.LSTM_ONLY, {
          workerPath: asset('worker.min.js'),
          corePath: asset('tesseract-core-lstm.wasm.js'),
          langPath: asset(''),
          workerBlobURL: false,
          errorHandler: () => stopWithError(Error('無法啟動照片辨識，請重新選擇照片。')),
          logger: status => {
            if (!finished && status.status === 'recognizing text') progress(Math.round(status.progress * 100));
          },
        });
        if (finished) {
          await worker.terminate();
          return;
        }
        await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.AUTO });
        return worker.recognize(image);
      })()]);
      return result.data.text;
    } catch (error) {
      if (error?.message) throw error;
      throw Error('照片辨識失敗，請重新選擇照片。');
    } finally {
      finished = true;
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      if (worker) await worker.terminate();
    }
  }

  const patterns = {
    date: /(?:保養日期|維修日期|進廠日期|施工日期|開單日期|交易日期|(?:service\s+)?date|日期)/i,
    mileage: /(?:當時里程|保養里程|目前里程|行駛里程|里程(?:數)?|公里數|mileage|odometer)(?:\s*\(?\s*(?:km|公里)\s*\)?)?/i,
    items: /(?:保養\s*[/、]\s*維修項目|保養項目|維修項目|施工項目|服務項目|品名|項目|items?|services?(?=\s*:))/i,
    cost: /(?:應付金額|應收金額|實付金額|總金額|總計|合計|費用|(?:grand\s+)?total|amount\s+due|cost)(?:\s*\(?\s*(?:ntd|twd|nt\$)\s*\)?)?/i,
    shop: /(?:保養廠|維修廠|汽車修理廠|店家|廠商|shop|garage)/i,
    plate: /(?:車牌(?:號碼)?|license\s+plate|plate)/i,
  };
  const labels = Object.values(patterns);
  const datePattern = /(?:民國\s*)?[0-9]{2,4}\s*(?:年|[./-])\s*[0-9]{1,2}\s*(?:月|[./-])\s*[0-9]{1,2}\s*日?/g;
  const mileagePattern = /\d+(?:[ ,]\d{3})*(?=\s*(?:km\b|公里))/gi;

  function extract(text) {
    const nextLabel = new RegExp(' +(?=(?:' + labels.map(pattern => pattern.source).join('|') + ')\\s*:)', 'gi');
    const lines = text.normalize('NFKC').replace(nextLabel, '\n').split(/\r?\n/).map(line =>
      line.trim().replace(/(\p{Script=Han})\s+(?=\p{Script=Han})/gu, '$1')).filter(Boolean);

    const labelOf = (line, pattern) => {
      const boundary = /^\p{Script=Han}/u.test(line) ? '' : '(?=\\s*:|\\s|$|[0-9])';
      return new RegExp('^' + pattern.source + boundary, 'i').exec(line);
    };
    const isLabel = line => labels.some(pattern => labelOf(line, pattern));
    const itemColumns = /^(?:(?:數量|單價|金額|qty\.?|unit\s+price|amount|price)\s*)+$/i;
    const get = pattern => {
      const index = lines.findIndex(line => labelOf(line, pattern));
      if (index < 0) return '';
      const rest = lines[index].slice(labelOf(lines[index], pattern)[0].length).replace(/^\s*[:：]?\s*/, '');
      if (pattern === patterns.items && (!rest || itemColumns.test(rest))) {
        const items = [];
        for (const line of lines.slice(index + 1, index + 9)) {
          if (isLabel(line) || /^(?:小計|稅額|備註|subtotal|tax\b|notes?\b)/i.test(line)) break;
          if (!itemColumns.test(line)) items.push(line.replace(/\s+\d+\s+[\d,.]+\s+[\d,.]+$/, ''));
        }
        return items.join('、');
      }
      return rest || (lines[index + 1] && !isLabel(lines[index + 1]) ? lines[index + 1] : '') || '';
    };
    const uniqueMatch = (value, pattern) => {
      const matches = new Set(Array.from(value.matchAll(pattern), result => result[0].trim()));
      return matches.size === 1 ? [...matches][0] : '';
    };

    const date = uniqueMatch(get(patterns.date), datePattern) || uniqueMatch(lines.join('\n'), datePattern);
    const mileage = get(patterns.mileage).match(/^\d+(?:[ ,]\d{3})*/)?.[0] ||
      uniqueMatch(lines.join('\n'), mileagePattern);
    const plate = get(patterns.plate).match(/^[A-Z0-9]{2,4}\s*-\s*[A-Z0-9]{2,4}\b/i)?.[0];
    return {
      date: date.replace(/\s/g, '').replace('年', '/').replace('月', '/').replace('日', ''),
      mileage: mileage.replace(/\s/g, ''),
      items: get(patterns.items).slice(0, 300),
      cost: get(patterns.cost).match(/^(?:(?:NT\s*[$S]|TWD|NTD|\$)\s*)?(\d+(?:[, ]\d{3})*(?:\.\d{1,2})?)(?![\d.,])/i)?.[1]?.replace(/\s/g, '') || '',
      shop: get(patterns.shop).slice(0, 100),
      plate: plate?.replace(/\s/g, '') || '',
    };
  }

  window.DrivePhotoImport = { recognize, extract };
})();
