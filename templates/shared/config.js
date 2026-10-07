window.BWIB_KIT_EVENT={"name": "BWIB Fall Fundraiser", "date": "October 1, 2026", "title": "The Data, Tech, and Opportunities", "subtitle": "Driving a New Era of Women’s Health", "sponsors": [{"label": "Gold DNA Sponsors", "names": [["diamond-age", "Diamond Age Data Science", "png"], ["seqera", "Seqera", "png"], ["zifo", "Zifo", "png"]]}, {"label": "Silver RNA Sponsors", "names": [["benchling", "Benchling", "png"], ["zs", "ZS", "svg"]]}, {"label": "Bronze Protein Sponsors", "names": [["bioteam", "BioTeam", "png"], ["sprout-informatics", "Sprout Informatics", "png"], ["brandeis", "Brandeis University", "png"]]}]};
window.BWIB_KIT_GUEST={"personId": "yevgenia-khodor-tolan", "name": "Yevgenia Khodor Tolan", "role": "President, BWIB", "topic": "Community and the future of BWIB", "portrait": "../../assets/portraits/yevgenia-khodor-tolan.png"};
window.BWIBKitCustomize=()=>{
const e=window.BWIB_KIT_EVENT;
for(const s of ['.title-block h1','.editorial-copy h1']){const n=document.querySelector(s);if(n)n.textContent=e.title;}
for(const s of ['.subtitle','.theme']){const n=document.querySelector(s);if(n)n.textContent=e.subtitle;}
const a=document.querySelector('.event');if(a)a.textContent=e.name;
const c=document.querySelector('.event-label');if(c){c.textContent=e.name;const d=document.createElement('span');d.textContent=e.date;c.append(d);}
const f=document.querySelector('.footer p');if(f)f.textContent=e.date;
};
