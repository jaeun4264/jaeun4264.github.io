(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* entrances: parts of each section rise one after another */
  const rising = [...document.querySelectorAll('[data-rise]')];
  const groups = new Map();
  rising.forEach((el) => {
    const host = el.closest('section, article, .verb') || document.body;
    const n = groups.get(host) || 0;
    el.style.setProperty('--d', `${Math.min(n, 5) * 80}ms`);
    groups.set(host, n + 1);
  });
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    rising.forEach((el) => io.observe(el));
  } else {
    rising.forEach((el) => el.classList.add('is-in'));
  }

  /* work index: the name crossing the middle sets the held square */
  const names = [...document.querySelectorAll('.work-names a[data-key]')];
  const minis = [...document.querySelectorAll('.mini')];
  const kind = document.getElementById('work-kind');
  const year = document.getElementById('work-year');
  const setWork = (a) => {
    minis.forEach((m) => m.classList.toggle('is-on', m.dataset.for === a.dataset.key));
    kind.textContent = a.dataset.kind;
    year.textContent = a.dataset.year;
  };
  if ('IntersectionObserver' in window) {
    const mid = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setWork(e.target); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    names.forEach((a) => mid.observe(a));
  }
  names.forEach((a) => { a.addEventListener('focus', () => setWork(a)); a.addEventListener('mouseenter', () => setWork(a)); });

  /* the SyncTrip demo plays only while it is on screen */
  const vid = document.querySelector('.trip-video video');
  if (vid && 'IntersectionObserver' in window && !reduce) {
    new IntersectionObserver(([e]) => { if (e.isIntersecting) vid.play().catch(() => {}); else vid.pause(); }, { threshold: 0.4 }).observe(vid);
  }

  /* live thing: relative Korean dates become real dates */
  const ta = document.getElementById('try-text');
  const outTitle = document.getElementById('try-title');
  const outDate = document.getElementById('try-date');
  const outRel = document.getElementById('try-rel');
  const nextBtn = document.getElementById('try-next');
  const samples = [
    '다음 주 화요일 밤 11시 59분까지 3장 연습문제 풀어서 LMS에 올려 주세요.',
    '기말 프로젝트 제안서는 11월 14일 오후 6시까지 제출입니다.',
    '모레까지 실습 코드 깃에 올리고, 오전 9시 전에 확인할게요.',
    '이번 주 금요일 수업 전까지 논문 한 편 읽어 오세요.',
    '3일 뒤에 퀴즈 있으니까 4장까지 복습해 오세요.',
  ];
  let si = 0;
  const DAYS = '일월화수목금토';
  const pad = (n) => String(n).padStart(2, '0');

  function parse(text, now = new Date()) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let date = null; let hit = [];
    let m;
    if ((m = text.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/))) {
      date = new Date(today.getFullYear(), +m[1] - 1, +m[2]);
      if (date < today) date.setFullYear(date.getFullYear() + 1);
      hit.push(m[0]);
    } else if ((m = text.match(/(이번\s*주|다음\s*주|다다음\s*주)\s*([월화수목금토일])요일/))) {
      const mondayOffset = (today.getDay() + 6) % 7;
      const monday = new Date(today); monday.setDate(today.getDate() - mondayOffset);
      const weeks = m[1].startsWith('다다음') ? 2 : m[1].startsWith('다음') ? 1 : 0;
      const idx = (DAYS.indexOf(m[2]) + 6) % 7;
      date = new Date(monday); date.setDate(monday.getDate() + weeks * 7 + idx);
      hit.push(m[0]);
    } else if ((m = text.match(/(오늘|내일|모레|글피)/))) {
      const add = { 오늘: 0, 내일: 1, 모레: 2, 글피: 3 }[m[1]];
      date = new Date(today); date.setDate(today.getDate() + add);
      hit.push(m[0]);
    } else if ((m = text.match(/(\d+)\s*(일|주)\s*(뒤|후)/))) {
      date = new Date(today); date.setDate(today.getDate() + (+m[1]) * (m[2] === '주' ? 7 : 1));
      hit.push(m[0]);
    } else if ((m = text.match(/([월화수목금토일])요일/))) {
      const want = DAYS.indexOf(m[1]);
      let add = (want - today.getDay() + 7) % 7; if (add === 0) add = 7;
      date = new Date(today); date.setDate(today.getDate() + add);
      hit.push(m[0]);
    }
    let h = 23, mi = 59, timed = false;
    if ((m = text.match(/(오전|오후|밤|저녁|아침|새벽)?\s*(\d{1,2})\s*시\s*(?:(\d{1,2})\s*분|(반))?/))) {
      h = +m[2]; mi = m[3] ? +m[3] : m[4] ? 30 : 0;
      if (['오후', '밤', '저녁'].includes(m[1]) && h < 12) h += 12;
      timed = true; hit.push(m[0]);
    } else if ((m = text.match(/자정/))) { hit.push(m[0]); }

    let title = text;
    hit.forEach((x) => { title = title.replace(x, ' '); });
    title = title
      .replace(/(까지는|까지|전까지|에|는|은)\s/g, ' ')
      .replace(/(제출입니다|해\s*주세요|주세요|하세요|오세요|할게요|입니다|있으니까)[.!]?/g, '')
      .replace(/^[\s,.]+|[\s,.]+$/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^(까지|전|에)\s*/, '');
    return { date, h, mi, timed, title };
  }

  function render() {
    const r = parse(ta.value);
    outTitle.textContent = r.title || '제목을 찾지 못했어요';
    if (!r.date) {
      outDate.textContent = '날짜 없음';
      outRel.textContent = '“다음 주 화요일”, “모레”, “11월 14일” 같은 말을 넣어 보세요.';
      return;
    }
    const d = r.date;
    outDate.textContent = `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]}) ${pad(r.h)}:${pad(r.mi)}`;
    const now = new Date();
    const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.round((d - t0) / 86400000);
    const rel = diff === 0 ? '오늘' : `오늘부터 ${diff}일 뒤`;
    outRel.textContent = `${d.getFullYear()}년 · ${rel}${r.timed ? '' : ' · 시간이 없어 23:59로 둠'}`;
  }
  if (ta) {
    ta.addEventListener('input', render);
    nextBtn.addEventListener('click', () => { si = (si + 1) % samples.length; ta.value = samples[si]; render(); });
    render();
  }
})();
