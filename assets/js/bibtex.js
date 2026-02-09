// Minimal BibTeX parser and renderer
(function () {
  var container = document.getElementById('pub-content');
  var tabsEl = document.getElementById('pub-tabs');
  if (!container || !tabsEl) return;

  function parseBib(text) {
    var entries = [];
    var re = /@(\w+)\s*\{([^,]*),([^@]*)/g;
    var m;
    while ((m = re.exec(text)) !== null) {
      var entry = { type: m[1].toLowerCase(), key: m[2].trim(), fields: {} };
      var body = m[3];
      var fre = /(\w+)\s*=\s*[\{"]([^}"]*?)[\}"]/g;
      var fm;
      while ((fm = fre.exec(body)) !== null) {
        entry.fields[fm[1].toLowerCase()] = fm[2].trim();
      }
      entries.push(entry);
    }
    return entries;
  }

  function getYear(e) { return parseInt(e.fields.year) || 0; }

  function formatAuthors(raw) {
    if (!raw) return '';
    return raw.split(' and ').map(function (a) {
      var parts = a.trim().split(',');
      if (parts.length === 2) return parts[1].trim() + ' ' + parts[0].trim();
      return a.trim();
    }).join(', ');
  }

  function venue(e) {
    return e.fields.journal || e.fields.booktitle || e.fields.school || '';
  }

  function renderLinks(e) {
    var html = '';
    if (e.fields.pdf) {
      var u = e.fields.pdf;
      if (u && !u.startsWith('http') && !u.startsWith('/')) u = '/bib/' + u;
      html += '<a href="' + u + '" target="_blank" class="btn btn-sm btn-outline"><i class="far fa-file-pdf"></i> PDF</a> ';
    }
    if (e.fields.html) html += '<a href="' + e.fields.html + '" target="_blank" class="btn btn-sm btn-outline"><i class="fas fa-link"></i> HTML</a> ';
    if (e.fields.arxiv) html += '<a href="' + e.fields.arxiv + '" target="_blank" class="btn btn-sm btn-outline"><i class="ai ai-arxiv"></i> arXiv</a> ';
    if (e.fields.code) html += '<a href="' + e.fields.code + '" target="_blank" class="btn btn-sm btn-outline"><i class="fab fa-github"></i> Code</a> ';
    return html;
  }

  function abbrBadge(e) {
    if (!e.fields.abbr) return '';
    return '<span class="pub-abbr badge">' + e.fields.abbr + '</span>';
  }

  function awardBadge(e) {
    if (!e.fields.award) return '';
    return '<div class="pub-award"><i class="fas fa-trophy"></i> ' + e.fields.award + '</div>';
  }

  function renderEntry(e, withImage) {
    var authors = formatAuthors(e.fields.author);
    var title = e.fields.title || '';
    var v = venue(e);
    var year = e.fields.year || '';
    var links = renderLinks(e);

    var venueParts = [];
    if (v) venueParts.push(v);
    if (year) venueParts.push(year);
    var venueRaw = venueParts.join(', ');

    // Highlight author name if possible (simple split check)
    // NOTE: Hardcoded for demo, normally would match against config
    authors = authors.replace('Hongxin Wei', '<b>Hongxin Wei</b>');

    if (withImage) {
      var imgSrc = e.fields.preview ? '/img/pubs/' + e.fields.preview : '';
      var imgTag = imgSrc
        ? '<div class="pub-thumb-container"><img class="pub-thumb" src="' + imgSrc + '" alt=""></div>'
        : '<div class="pub-thumb-container empty"></div>'; // Placeholder
      return '<div class="pub-entry-card selected">' +
        imgTag +
        '<div class="pub-info">' +
        '<h4 class="pub-title">' + title + ' ' + abbrBadge(e) + '</h4>' +
        '<div class="pub-authors">' + authors + '</div>' +
        '<div class="pub-venue"><i class="far fa-calendar-alt"></i> ' + venueRaw + '</div>' +
        awardBadge(e) +
        (links ? '<div class="pub-links">' + links + '</div>' : '') +
        '</div>' +
        '</div>';
    }

    return '<div class="pub-entry-card">' +
      '<div class="pub-info">' +
      '<h4 class="pub-title">' + title + ' ' + abbrBadge(e) + '</h4>' +
      '<div class="pub-authors">' + authors + '</div>' +
      '<div class="pub-venue"><i class="far fa-calendar-alt"></i> ' + venueRaw + '</div>' +
      awardBadge(e) +
      (links ? '<div class="pub-links">' + links + '</div>' : '') +
      '</div>' +
      '</div>';
  }

  function initBibtex(text) {
    // Decode Go JSON/HTML escapes
    if (typeof text === 'string') {
      text = text.replace(/\\u003c/g, '<')
        .replace(/\\u003e/g, '>')
        .replace(/\\u0026/g, '&');
    }

    var entries = parseBib(text);
    var sorted = entries.slice().sort(function (a, b) { return getYear(b) - getYear(a); });

    // Collect years >= 2020, descending
    var yearsSet = {};
    sorted.forEach(function (e) { var y = getYear(e); if (y >= 2020) yearsSet[y] = true; });
    var years = Object.keys(yearsSet).map(Number).sort(function (a, b) { return b - a; });

    // Append year tabs after "Selected" and "All"
    /*
    years.forEach(function (y) {
      var btn = document.createElement('button');
      btn.className = 'pub-tab';
      btn.dataset.tab = String(y);
      btn.textContent = y;
      tabsEl.appendChild(btn);
    });
    */

    function show(tab) {
      if (tab === 'selected') {
        var sel = entries.filter(function (e) { return e.fields.selected === 'true'; });
        container.innerHTML = sel.length
          ? sel.map(function (e) { return renderEntry(e, true); }).join('')
          : '<p>No selected publications.</p>';
      } else if (tab === 'working') {
        var working = entries.filter(function (e) {
          var y = String(e.fields.year || '').toLowerCase();
          return y.includes('working') || y.includes('submitted') || y.includes('preprint') || e.fields.working === 'true';
        });
        container.innerHTML = working.length
          ? working.map(function (e) { return renderEntry(e, false); }).join('')
          : '<p>No working papers found.</p>';
      } else if (tab === 'all') {
        container.innerHTML = sorted.map(function (e) { return renderEntry(e, false); }).join('');
      } else {
        var y = parseInt(tab);
        var filtered = sorted.filter(function (e) { return getYear(e) === y; });
        container.innerHTML = filtered.length
          ? filtered.map(function (e) { return renderEntry(e, false); }).join('')
          : '<p>No publications for ' + y + '.</p>';
      }
    }

    show('selected');

    tabsEl.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.pub-tab');
      if (!btn) return;
      tabsEl.querySelectorAll('.pub-tab').forEach(function (t) { t.classList.remove('active'); });
      btn.classList.add('active');
      show(btn.dataset.tab);
    });
  }

  if (window.bibtexData) {
    initBibtex(window.bibtexData);
  } else {
    fetch('bib/papers.bib')
      .then(function (r) { return r.text(); })
      .then(initBibtex)
      .catch(function () {
        container.innerHTML = '<p>Failed to load publications.</p>';
      });
  }
})();
