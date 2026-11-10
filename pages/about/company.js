"use strict";
document.addEventListener("DOMContentLoaded", () => {
 const cards = [...document.querySelectorAll(".stat-card")];
 const details = [...document.querySelectorAll(".detail-content")];
 const summary = document.querySelector(".detail-summary");
 function show(index) {
   if(summary) summary.hidden = index !== -1;
   cards.forEach((card,i) => {card.classList.toggle("active",i===index);card.setAttribute("aria-expanded",String(i===index));});
   details.forEach((detail,i) => {detail.hidden = i!==index;detail.classList.toggle("active",i===index);});
 }
 cards.forEach((card,i) => {
   card.tabIndex=0;card.setAttribute("role","button");
   details[i].id="stat-detail-"+i;card.setAttribute("aria-controls",details[i].id);
   card.addEventListener("mouseenter",()=>show(i));
   card.addEventListener("focus",()=>show(i));
   card.addEventListener("click",()=>show(i));
   card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();show(i);}if(e.key==="Escape")show(-1);});
 });
 const stats=document.querySelector(".about-stats");
 stats?.addEventListener("mouseleave",()=>{if(!stats.contains(document.activeElement))show(-1);});
 stats?.addEventListener("focusout",e=>{if(!stats.contains(e.relatedTarget))show(-1);});
 show(-1);
 const story = document.querySelector('.highlights-story');
 const panels = [...document.querySelectorAll('.story-slide')];
 if (!story || !panels.length) return;
 const track = document.createElement('div');
 track.className = 'story-track';
 panels[0].parentNode.append(track);
 panels.forEach(panel => track.append(panel));
 let scheduled = false;
 function updateStory() {
   scheduled = false;
   const distance = Math.max(1, story.offsetHeight - window.innerHeight);
   const progress = Math.max(0, Math.min(1, -story.getBoundingClientRect().top / distance));
   const position = progress * (panels.length - 1);
   const index = Math.round(position);
   panels.forEach((panel, i) => {
     const visible = i === index;
     const distanceFromSlide = Math.abs(position - i);
     const fade = Math.max(0, Math.min(1, (distanceFromSlide - .15) / .35));
     const opacity = 1 - fade * fade * (3 - 2 * fade);
     panel.style.opacity = String(opacity);
     panel.classList.toggle('active', visible);
     panel.setAttribute('aria-hidden', String(!visible));
     panel.inert = !visible;
   });
 }
 function scheduleStory() {
   if (!scheduled) { scheduled = true; window.requestAnimationFrame(updateStory); }
 }
 window.addEventListener('scroll', scheduleStory, { passive: true });
 window.addEventListener('resize', scheduleStory);
 updateStory();
});
