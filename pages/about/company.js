const cards =
document.querySelectorAll(".stat-card");

const showcase =
document.querySelector(".hero-stats-showcase");

const panel =
document.querySelector(".stat-detail-panel");

const details =
document.querySelectorAll(".detail-content");

function showStat(card) {
  showcase.classList.add('focusing'); panel.classList.add('show');
  cards.forEach(c => {
    const selected = c === card;
    c.classList.toggle('active', selected);
    c.setAttribute('aria-expanded', String(selected));
  });
  details.forEach(d => {
    const selected = d.dataset.detail === card.dataset.card;
    d.hidden = !selected; d.classList.toggle('active', selected);
  });
}
function hideStats() {
  showcase.classList.remove('focusing'); panel.classList.remove('show');
  cards.forEach(c => { c.classList.remove('active'); c.setAttribute('aria-expanded', 'false'); });
  details.forEach(d => { d.hidden = true; d.classList.remove('active'); });
}
cards.forEach(card => {
  card.tabIndex = 0; card.setAttribute('role', 'button');
  const detail = [...details].find(d => d.dataset.detail === card.dataset.card);
  if (detail) { detail.id = 'stat-detail-' + card.dataset.card; card.setAttribute('aria-controls', detail.id); }
  card.addEventListener('mouseenter', () => showStat(card));
  card.addEventListener('focus', () => showStat(card));
  card.addEventListener('click', () => showStat(card));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showStat(card); }
    if (e.key === 'Escape') { e.preventDefault(); hideStats(); }
  });
});
const stats = document.querySelector('.about-stats');
stats.addEventListener('mouseleave', () => { if (!stats.contains(document.activeElement)) hideStats(); });
stats.addEventListener('focusout', e => { if (!stats.contains(e.relatedTarget)) hideStats(); });
hideStats();

// Highlight

const slides =
document.querySelectorAll(
".highlights-story .story-slide"
);

const fill =
document.querySelector(
".highlights-story .story-progress-fill"
);

window.addEventListener("scroll",()=>{

    const section =
    document.querySelector(
    ".highlights-story"
    );

    if(!section) return;

    const rect =
    section.getBoundingClientRect();

    const progress =
    Math.max(
        0,
        Math.min(
            1,
            Math.abs(rect.top) /
            (section.offsetHeight - window.innerHeight)
        )
    );

    const index =
    Math.min(
        slides.length - 1,
        Math.floor(progress * slides.length)
    );

    slides.forEach(slide=>
        slide.classList.remove("active")
    );

    if(slides[index]){
        slides[index].classList.add("active");
    }

    if(fill){
        fill.style.height =
        `${progress * 100}%`;
    }

});