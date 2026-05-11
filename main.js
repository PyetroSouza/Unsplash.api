'use strict';

const UNSPLASH_KEY = '4Ni1a1vblzcSB6h4fKMWECMD9X_VSoT0hSieP7pf_KI';
const API_BASE     = 'https://api.unsplash.com';
const PER_PAGE     = 20;
const FAVS_KEY     = 'galeria_favs';

const state = {
    query:       'nature',
    page:        1,
    total:       0,
    loading:     false,
    showFavs:    false,
    activePhoto: null,
};

const elements = {
    grid:         document.getElementById('galleryGrid'),
    loader:       document.getElementById('loader'),
    empty:        document.getElementById('emptyState'),
    loadMore:     document.getElementById('loadMoreWrap'),
    loadMoreBtn:  document.getElementById('loadMoreBtn'),
    statusText:   document.getElementById('statusText'),
    statusCount:  document.getElementById('statusCount'),
    searchInput:  document.getElementById('searchInput'),
    searchBtn:    document.getElementById('searchBtn'),
    btnAll:       document.getElementById('btnAll'),
    btnFav:       document.getElementById('btnFav'),
    tags:         document.querySelectorAll('.tag'),
    modal:        document.getElementById('modal'),
    modalImg:     document.getElementById('modalImg'),
    modalTitle:   document.getElementById('modalTitle'),
    modalDesc:    document.getElementById('modalDesc'),
    modalAuthor:  document.getElementById('modalAuthor'),
    modalEyebrow: document.getElementById('modalEyebrow'),
    modalLink:    document.getElementById('modalLink'),
    modalFavBtn:  document.getElementById('modalFavBtn'),
    modalClose:   document.getElementById('modalClose'),
    toast:        document.getElementById('toast'),
};

function show(el, display = 'block') {
    el.style.display = display;
}

function hide(el) {
    el.style.display = 'none';
}

function clearElement(el) {
    el.innerHTML = '';
}

function setText(el, text) {
    el.textContent = text;
}

function updateFavButton(btn, faved) {
    btn.classList.toggle('faved', faved);
    btn.querySelector('svg').setAttribute('fill', faved ? 'currentColor' : 'none');
}

function resetGallery() {
    clearElement(elements.grid);
    state.page = 1;
    hide(elements.loadMore);
    hide(elements.empty);
}

function handleLoadError(err) {
    console.error(err);

    if (err.message.includes('401')) {
        showApiKeyWarning();
    } else {
        showToast('Erro ao carregar imagens');
    }
}

function getFavs() {
    try { return JSON.parse(localStorage.getItem(FAVS_KEY)) || {}; }
    catch { return {}; }
}

function saveFavs(favs) {
    localStorage.setItem(FAVS_KEY, JSON.stringify(favs));
}

function isFav(id) {
    return !!getFavs()[id];
}

function toggleFav(photo) {
    const favs = getFavs();

    if (favs[photo.id]) {
        delete favs[photo.id];
        showToast('Removido dos favoritos');
    } else {
        favs[photo.id] = {
            id:     photo.id,
            url:    photo.urls.regular,
            thumb:  photo.urls.small,
            author: photo.user.name,
            desc:   photo.description || photo.alt_description || '',
            link:   photo.links.html,
        };
        showToast('Adicionado aos favoritos');
    }

    saveFavs(favs);
    return !!favs[photo.id];
}

async function fetchPhotos(query, page = 1) {
    const url = `${API_BASE}/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${PER_PAGE}&client_id=${UNSPLASH_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Unsplash API: ${res.status}`);
    return res.json();
}

function buildCardHTML(photo, faved) {
    const desc = photo.description || photo.alt_description || '';

    return `
        <div class="card-img-wrap">
            <img
                src="${photo.urls.small}"
                data-src="${photo.urls.regular}"
                alt="${desc || 'Fotografia'}"
                loading="lazy"
            />
            <div class="card-overlay">
                <div class="card-meta">
                    <span class="card-author">${photo.user.name}</span>
                    ${desc ? `<span class="card-desc">${desc}</span>` : ''}
                </div>
            </div>
        </div>
        <button class="card-fav ${faved ? 'faved' : ''}" aria-label="Favoritar foto de ${photo.user.name}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${faved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.6">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
        </button>
    `;
}

function setupCardEvents(card, photo) {
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.card-fav')) openModal(photo);
    });

    card.querySelector('.card-fav').addEventListener('click', (e) => {
        e.stopPropagation();
        onFavClick(e.currentTarget, photo);
    });
}

function createCard(photo) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.id = photo.id;
    card.innerHTML = buildCardHTML(photo, isFav(photo.id));
    setupCardEvents(card, photo);
    return card;
}

function onFavClick(btn, photo) {
    const newFaved = toggleFav(photo);

    updateFavButton(btn, newFaved);

    if (state.activePhoto?.id === photo.id) {
        syncModalFavBtn(newFaved);
    }

    if (state.showFavs && !newFaved) {
        removeCardAnimated(btn.closest('.card'));
    }
}

function removeCardAnimated(card) {
    card.style.transition = 'opacity 0.3s, transform 0.3s';
    card.style.opacity    = '0';
    card.style.transform  = 'scale(0.95)';
    setTimeout(() => card.remove(), 320);
}

function appendCards(photos) {
    photos.forEach((photo, i) => {
        const card = createCard(photo);
        elements.grid.appendChild(card);
        setTimeout(() => card.classList.add('visible'), i * 55);
    });
}

function showApiKeyWarning() {
    elements.grid.innerHTML = `
        <div class="api-warning">
            <p class="api-warning-title">Configure sua chave da API Unsplash</p>
            <p class="api-warning-body">
                Adicione sua <strong>Access Key</strong> do Unsplash na linha<br>
                <code>const UNSPLASH_KEY = 'SUA_CHAVE_AQUI'</code><br>
                no início do arquivo <code>main.js</code>.
            </p>
            <p class="api-warning-link">
                Registre-se gratuitamente em
                <a href="https://unsplash.com/developers" target="_blank" rel="noopener">unsplash.com/developers</a>
            </p>
        </div>
    `;
}

function updateStatus() {
    setText(elements.statusText,  `"${state.query}"`);
    setText(elements.statusCount, state.total > 0 ? `${state.total.toLocaleString()} obras encontradas` : '');
}

function handlePhotosData(data) {
    state.total = data.total;
    updateStatus();

    if (data.results.length === 0 && state.page === 1) {
        show(elements.empty, 'flex');
        return;
    }

    appendCards(data.results);
    state.page++;

    const hasMore = state.page <= data.total_pages;
    show(elements.loadMore, hasMore ? 'flex' : 'none');
}

async function loadPhotos(reset = false) {
    if (state.loading) return;

    state.loading = true;

    if (reset) resetGallery();

    show(elements.loader, 'flex');
    hide(elements.loadMore);

    try {
        const data = await fetchPhotos(state.query, state.page);
        handlePhotosData(data);
    } catch (err) {
        handleLoadError(err);
    } finally {
        state.loading = false;
        hide(elements.loader);
    }
}

function loadFavs() {
    resetGallery();

    const favs = Object.values(getFavs());

    setText(elements.statusText,  'Meus Favoritos');
    setText(elements.statusCount, favs.length > 0 ? `${favs.length} obra(s)` : '');

    if (favs.length === 0) {
        show(elements.empty, 'flex');
        return;
    }

    const pseudoPhotos = favs.map((f) => ({
        id:              f.id,
        urls:            { small: f.thumb, regular: f.url },
        user:            { name: f.author },
        description:     f.desc,
        alt_description: f.desc,
        links:           { html: f.link },
    }));

    appendCards(pseudoPhotos);
}

function openModal(photo) {
    state.activePhoto = photo;

    const desc     = photo.description || photo.alt_description || 'Sem descricao';
    const title    = desc.length > 60 ? desc.slice(0, 57) + '...' : desc;
    const subtitle = photo.description && photo.alt_description ? photo.alt_description : '';

    elements.modalImg.src      = photo.urls.regular;
    elements.modalImg.alt      = desc;
    elements.modalLink.href    = photo.links.html;

    setText(elements.modalTitle,   title);
    setText(elements.modalDesc,    subtitle);
    setText(elements.modalAuthor,  photo.user.name);
    setText(elements.modalEyebrow, `${photo.user.name} · Unsplash`);

    syncModalFavBtn(isFav(photo.id));

    elements.modal.classList.add('open');
    elements.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    elements.modal.classList.remove('open');
    elements.modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    state.activePhoto = null;
}

function syncModalFavBtn(faved) {
    setText(elements.modalFavBtn, faved ? 'Favoritado' : 'Favoritar');
    elements.modalFavBtn.classList.toggle('faved', faved);
}

function onModalFavClick() {
    if (!state.activePhoto) return;

    const newFaved = toggleFav(state.activePhoto);
    syncModalFavBtn(newFaved);

    const card = elements.grid.querySelector(`.card[data-id="${state.activePhoto.id}"]`);
    if (!card) return;

    updateFavButton(card.querySelector('.card-fav'), newFaved);
}

function runSearch(query) {
    if (!query) return;

    state.query    = query;
    state.showFavs = false;

    elements.btnAll.classList.add('active');
    elements.btnFav.classList.remove('active');

    elements.tags.forEach((tag) => {
        tag.classList.toggle('active', tag.dataset.query === query);
    });

    loadPhotos(true);
}

function initEvents() {

    elements.searchBtn.addEventListener('click', () => {
        const query = elements.searchInput.value.trim();
        if (query) runSearch(query);
    });

    elements.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value.trim();
            if (query) runSearch(query);
        }
    });

    elements.tags.forEach((tag) => {
        tag.addEventListener('click', () => {
            elements.searchInput.value = tag.dataset.query;
            runSearch(tag.dataset.query);
        });
    });

    elements.btnAll.addEventListener('click', () => {
        if (state.showFavs) {
            state.showFavs = false;
            elements.btnAll.classList.add('active');
            elements.btnFav.classList.remove('active');
            loadPhotos(true);
        }
    });

    elements.btnFav.addEventListener('click', () => {
        state.showFavs = true;
        elements.btnAll.classList.remove('active');
        elements.btnFav.classList.add('active');
        loadFavs();
    });

    elements.loadMoreBtn.addEventListener('click', () => {
        if (!state.showFavs) loadPhotos(false);
    });

    elements.modalClose.addEventListener('click', closeModal);

    elements.modal.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    elements.modalFavBtn.addEventListener('click', onModalFavClick);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function showToast(msg) {
    setText(elements.toast, msg);
    elements.toast.classList.add('show');
    setTimeout(() => elements.toast.classList.remove('show'), 2400);
}

initEvents();
loadPhotos(true);