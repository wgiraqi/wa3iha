/* =========================================================
   تسجيل وعيها — منطق الاستبيان متعدد الخطوات
   ========================================================= */
(function () {
  'use strict';

  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbwV0P6yNLiQfLlvh07zQ4QW0fWbua6-S0S2a6EQkW1I0ea2lC1H_mEDGmhNDuQ1xhFE4A/exec';
  var STORE_KEY = 'wayyaha_registration_v1';
  var TOTAL = 8;

  /* ---------------- الحالة ---------------- */
  var answers = {
    name: '', address: '', education: '', educationOther: '',
    specialization: '', specializationOther: '',
    facebook: '', instagram: '', telegram: '',
    monthlySeminar: '', culturalVisits: ''
  };

  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      for (var k in answers) { if (k in saved) answers[k] = saved[k]; }
    }
  } catch (e) { /* تجاهل */ }

  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(answers)); } catch (e) {}
  }

  /* ---------------- عناصر ---------------- */
  var $ = function (id) { return document.getElementById(id); };
  var steps = Array.prototype.slice.call(document.querySelectorAll('.step'));
  var screens = {
    welcome: $('screen-welcome'), quiz: $('screen-quiz'),
    review: $('screen-review'), success: $('screen-success'), error: $('screen-error')
  };

  var barFill = $('barFill'), bar = $('bar'), dotsBox = $('dots');
  var stepLine = $('stepLine'), percentEl = $('percent');
  var railNum = $('railNum'), railFill = $('railFill'), railTitle = $('railTitle');
  var nextBtn = $('nextBtn'), prevBtn = $('prevBtn');

  var current = 1;
  var submitting = false;

  /* ---------------- نقاط التقدم ---------------- */
  (function buildDots() {
    if (!dotsBox) return;
    var html = '';
    for (var i = 1; i <= TOTAL; i++) html += '<b data-dot="' + i + '"></b>';
    dotsBox.innerHTML = html;
  })();

  /* ---------------- ملء القيم المحفوظة ---------------- */
  function hydrateForm() {
    document.querySelectorAll('[data-field]').forEach(function (el) {
      var key = el.getAttribute('data-field');
      var val = answers[key];
      if (el.type === 'radio') {
        el.checked = (val !== '' && el.value === val);
      } else if (el.tagName === 'SELECT') {
        el.value = val || '';
      } else {
        el.value = val || '';
      }
    });
    toggleSub('eduOtherWrap', answers.education === 'أخرى');
    toggleSub('specOtherWrap', answers.specialization === 'أخرى');
  }

  function toggleSub(id, show) {
    var el = $(id);
    if (el) el.hidden = !show;
  }

  /* ---------------- أحداث الإدخال ---------------- */
  document.querySelectorAll('[data-field]').forEach(function (el) {
    var key = el.getAttribute('data-field');
    var evt = (el.type === 'radio' || el.tagName === 'SELECT') ? 'change' : 'input';
    el.addEventListener(evt, function () {
      if (el.type === 'radio') {
        if (!el.checked) return;
        answers[key] = el.value;
        if (key === 'education') toggleSub('eduOtherWrap', el.value === 'أخرى');
        if (key === 'specialization') toggleSub('specOtherWrap', el.value === 'أخرى');
      } else {
        answers[key] = el.value;
      }
      persist();
      clearError(el.closest('.step'));
    });
  });

  /* ---------------- الشاشات ---------------- */
  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      if (screens[key]) screens[key].classList.toggle('is-active', key === name);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (name === 'review') renderReview();
  }

  /* ---------------- التقدم ---------------- */
  function updateProgress() {
    var pct = Math.round((current / TOTAL) * 100);
    if (barFill) barFill.style.width = pct + '%';
    if (bar) bar.setAttribute('aria-valuenow', String(pct));
    if (percentEl) percentEl.textContent = pct + '%';
    if (stepLine) stepLine.textContent = 'الخطوة ' + current + ' من ' + TOTAL;
    if (railNum) railNum.textContent = (current < 10 ? '0' : '') + current;
    if (railFill) railFill.style.height = pct + '%';
    if (railTitle) railTitle.textContent = steps[current - 1].getAttribute('data-title');
    if (dotsBox) {
      dotsBox.querySelectorAll('b').forEach(function (d, i) {
        d.classList.toggle('done', i + 1 <= current);
        d.classList.toggle('now', i + 1 === current);
      });
    }
    if (prevBtn) prevBtn.hidden = current === 1;
    var label = nextBtn.querySelector('span');
    if (label) label.textContent = (current === TOTAL) ? 'مراجعة الإجابات' : 'التالي';
  }

  function goTo(step) {
    if (step < 1 || step > TOTAL) return;
    steps.forEach(function (s) { s.classList.remove('is-active'); });
    current = step;
    steps[step - 1].classList.add('is-active');
    clearError(steps[step - 1]);
    updateProgress();
    var top = document.querySelector('.screen-quiz').getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: top, behavior: 'smooth' });
  }

  /* ---------------- التحقق ---------------- */
  function fieldOf(step, key) {
    return steps[step - 1].querySelector('[data-field="' + key + '"]');
  }

  function showError(step, message, targetEl) {
    var s = steps[step - 1];
    var err = s.querySelector('[data-err]');
    if (err) {
      err.textContent = message;
      err.hidden = false;
    }
    var holder = targetEl ? (targetEl.closest('.field') || targetEl.closest('.choices') || targetEl) : s.querySelector('.field');
    if (holder) {
      holder.classList.add('invalid');
      holder.classList.remove('shake');
      void holder.offsetWidth;
      holder.classList.add('shake');
      setTimeout(function () { holder.classList.remove('shake'); }, 520);
    }
  }

  function clearError(step) {
    if (!step) return;
    var err = step.querySelector('[data-err]');
    if (err) { err.hidden = true; err.textContent = ''; }
    step.querySelectorAll('.invalid').forEach(function (el) { el.classList.remove('invalid'); });
  }

  function validateStep(step) {
    var a = answers;
    switch (step) {
      case 1:
        if (!a.name.trim()) { showError(1, 'هذا الحقل ضروري، يرجى تعبئته للمتابعة.', fieldOf(1, 'name')); return false; }
        return true;
      case 2:
        if (!a.address.trim()) { showError(2, 'هذا الحقل ضروري، يرجى تعبئته للمتابعة.', fieldOf(2, 'address')); return false; }
        return true;
      case 3:
        if (!a.education) { showError(3, 'يرجى اختيار التحصيل الدراسي للمتابعة.', $('eduOptions')); return false; }
        if (a.education === 'أخرى' && !a.educationOther.trim()) {
          showError(3, 'هذا الحقل ضروري، يرجى تعبئته للمتابعة.', fieldOf(3, 'educationOther')); return false;
        }
        return true;
      case 4:
        if (!a.specialization) { showError(4, 'يرجى اختيار التخصص للمتابعة.', fieldOf(4, 'specialization')); return false; }
        if (a.specialization === 'أخرى' && !a.specializationOther.trim()) {
          showError(4, 'هذا الحقل ضروري، يرجى تعبئته للمتابعة.', fieldOf(4, 'specializationOther')); return false;
        }
        return true;
      case 5:
        if (!a.facebook.trim() && !a.instagram.trim()) {
          showError(5, 'يرجى إدخال معرف فيسبوك أو إنستغرام واحد على الأقل.', fieldOf(5, 'facebook'));
          return false;
        }
        return true;
      case 6:
        if (!a.telegram.trim()) { showError(6, 'هذا الحقل ضروري، يرجى تعبئته للمتابعة.', fieldOf(6, 'telegram')); return false; }
        return true;
      case 7:
        if (!a.monthlySeminar) { showError(7, 'يرجى اختيار أحد الخيارين للمتابعة.', $('seminarChoices')); return false; }
        return true;
      case 8:
        if (!a.culturalVisits) { showError(8, 'يرجى اختيار أحد الخيارين للمتابعة.', $('visitChoices')); return false; }
        return true;
      default:
        return true;
    }
  }

  /* ---------------- الأزرار ---------------- */
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      if (!validateStep(current)) return;
      if (current < TOTAL) {
        goTo(current + 1);
      } else {
        showScreen('review');
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      if (current > 1) goTo(current - 1);
    });
  }

  var startBtn = $('startBtn');
  if (startBtn) {
    startBtn.addEventListener('click', function () {
      showScreen('quiz');
      goTo(1);
    });
  }

  var homeBtn = $('homeBtn');
  if (homeBtn) {
    homeBtn.addEventListener('click', function () {
      showScreen('welcome');
    });
  }

  var editBtn = $('editBtn');
  if (editBtn) {
    editBtn.addEventListener('click', function () {
      showScreen('quiz');
      goTo(1);
    });
  }

  var brandHome = $('brandHome');
  if (brandHome) {
    brandHome.addEventListener('click', function (ev) {
      ev.preventDefault();
      showScreen('welcome');
    });
  }

  var backToReviewBtn = $('backToReviewBtn');
  if (backToReviewBtn) {
    backToReviewBtn.addEventListener('click', function () { showScreen('review'); });
  }

  var retryBtn = $('retryBtn');
  if (retryBtn) {
    retryBtn.addEventListener('click', function () {
      showScreen('review');
      submitForm();
    });
  }

  /* ---------------- المراجعة ---------------- */
  function finalEducation() {
    return answers.education === 'أخرى' ? (answers.educationOther.trim() || 'أخرى') : answers.education;
  }
  function finalSpecialization() {
    return answers.specialization === 'أخرى' ? (answers.specializationOther.trim() || 'أخرى') : answers.specialization;
  }

  function renderReview() {
    var list = $('reviewList');
    if (!list) return;
    var rows = [
      ['الاسم الثلاثي', answers.name.trim(), 1],
      ['العنوان', answers.address.trim(), 2],
      ['التحصيل الدراسي', finalEducation(), 3],
      ['التخصص', finalSpecialization(), 4],
      ['فيسبوك', answers.facebook.trim() || '—', 5],
      ['إنستغرام', answers.instagram.trim() || '—', 5],
      ['التليكرام', answers.telegram.trim() || '—', 6],
      ['حضور الندوة الشهرية', answers.monthlySeminar, 7],
      ['الزيارات للعتبات والمراكز الثقافية', answers.culturalVisits, 8]
    ];
    list.innerHTML = rows.map(function (r, i) {
      return '<div class="review-row" style="animation-delay:' + (i * 0.05) + 's">' +
        '<dt>' + r[0] + '</dt>' +
        '<dd><span class="val">' + escapeHtml(r[1] || '—') + '</span>' +
        '<button type="button" class="edit-link" data-goto="' + r[2] + '">تعديل البيانات</button></dd>' +
        '</div>';
    }).join('');

    list.querySelectorAll('[data-goto]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showScreen('quiz');
        goTo(parseInt(btn.getAttribute('data-goto'), 10) || 1);
      });
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  /* ---------------- رسالة التليكرام ---------------- */
  function cleanTelegram(v) {
    return String(v || '')
      .trim()
      .replace(/\s+/g, '')
      .replace(/^(https?:\/\/)?(t(elegram)?\.me)\//i, '')
      .replace(/^@+/, '');
  }

  function buildTelegramMessage() {
    var line = '━━━━━━━━━━━━━━';
    return [
      'تسجيل وعيها',
      line,
      '',
      '👤 الاسم الثلاثي:',
      answers.name.trim(),
      '',
      '📍 العنوان:',
      answers.address.trim(),
      '',
      '🎓 التحصيل الدراسي:',
      finalEducation(),
      '',
      '📚 التخصص:',
      finalSpecialization(),
      '',
      '📘 فيسبوك:',
      answers.facebook.trim() || '—',
      '',
      '📸 إنستغرام:',
      answers.instagram.trim() || '—',
      '',
      '✈️ التليكرام:',
      '@' + cleanTelegram(answers.telegram),
      '',
      '🕌 حضور الندوة الشهرية:',
      answers.monthlySeminar,
      '',
      '🌿 الزيارات للعتبات والمراكز الثقافية:',
      answers.culturalVisits,
      '',
      line,
      '',
      '🌱 مؤسسة وعي للفكر والثقافة',
      'مؤسسة هدفها الوعي وطريقها الثقافة ومنهاجها رسول الله وأهل بيته (ص)'
    ].join('\n');
  }

  function buildPayload() {
    return {
      surveyName: 'تسجيل وعيها',
      surveyId: 'wa3iha-2026',
      responses: [
        { question: 'الاسم الثلاثي', answer: answers.name.trim() },
        { question: 'العنوان', answer: answers.address.trim() },
        { question: 'التحصيل الدراسي', answer: finalEducation() },
        { question: 'التخصص', answer: finalSpecialization() },
        { question: 'معرف فيسبوك', answer: answers.facebook.trim() || '—' },
        { question: 'معرف إنستغرام', answer: answers.instagram.trim() || '—' },
        { question: 'معرف التليكرام', answer: '@' + cleanTelegram(answers.telegram) },
        { question: 'هل تستطيعين الحضور بندوة كل شهر مرة؟', answer: answers.monthlySeminar },
        { question: 'هل ستحضرين بزيارة للعتبات والمراكز الثقافية ضمن برنامج نسائي للمؤسسة؟', answer: answers.culturalVisits }
      ],
      submittedAt: new Date().toISOString()
    };
  }

  /* ---------------- الإرسال ---------------- */
  var submitBtn = $('submitBtn');

  function setSubmitting(on) {
    submitting = on;
    if (!submitBtn) return;
    submitBtn.disabled = on;
    submitBtn.classList.toggle('loading', on);
    var label = submitBtn.querySelector('.btn-label');
    if (label) label.textContent = on ? 'جارٍ إرسال التسجيل...' : 'إرسال التسجيل';
  }

  function submitForm() {
    if (submitting) return;

    // تحقق أخير شامل قبل الإرسال
    for (var i = 1; i <= TOTAL; i++) {
      if (!validateStep(i)) {
        showScreen('quiz');
        goTo(i);
        return;
      }
    }

    var errBox = $('submitErr');
    if (errBox) errBox.hidden = true;

    setSubmitting(true);

    var resultData = buildPayload();

    fetch(ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(resultData)
    })
      .then(function () {
        // no-cors لا يسمح بقراءة استجابة Google Apps Script،
        // لذلك نجاح fetch هنا يعني أن طلب POST أُرسل.
        setSubmitting(false);
        showScreen('success');
      })
      .catch(function () {
        setSubmitting(false);
        showScreen('error');

        var errBox2 = $('submitErr');
        if (errBox2) {
          errBox2.textContent = 'تعذر إرسال التسجيل، يرجى التحقق من الاتصال والمحاولة مرة أخرى.';
          errBox2.hidden = false;
        }
      });
  }

  if (submitBtn) submitBtn.addEventListener('click', submitForm);

  /* ---------------- تهيئة ---------------- */
  hydrateForm();
  updateProgress();

  // التنقل بلوحة المفاتيح: Enter للتالي، Escape للسابق
  document.addEventListener('keydown', function (ev) {
    if (!screens.quiz.classList.contains('is-active')) return;

    if (ev.key === 'Escape') {
      if (current > 1) { ev.preventDefault(); goTo(current - 1); }
      return;
    }

    if (ev.key !== 'Enter') return;
    var t = ev.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT')) {
      ev.preventDefault();
      if (nextBtn) nextBtn.click();
    }
  });

})();
