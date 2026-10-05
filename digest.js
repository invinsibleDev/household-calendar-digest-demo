'use strict';
function validDate(s) { return typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s+'T00:00:00Z')) && new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s; }
function instant(s) {
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(s)||!validDate(s.slice(0,10))||Number(s.slice(11,13))>23||Number(s.slice(14,16))>59||Number(s.slice(17,19))>59)throw Error('Timed events require valid ISO timestamps with an explicit offset');
 const n=Date.parse(s);if(!Number.isFinite(n))throw Error('Invalid timestamp');return n;
}
function makeDigest(input) {
 if(!input||!validDate(input.date)||typeof input.timeZone!=='string'||!Array.isArray(input.events)||input.events.length>1000)throw Error('Expected date, IANA timeZone, and at most 1000 events');
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:input.timeZone,year:'numeric',month:'2-digit',day:'2-digit'});
 const day=n=>{const p=Object.fromEntries(parts.formatToParts(n).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;};
 const time=new Intl.DateTimeFormat('en-US',{timeZone:input.timeZone,hour:'numeric',minute:'2-digit',timeZoneName:'short'});
 const seen=new Map(),events=[],warnings=[];let skippedCancelled=0,skippedDuplicates=0;
 for(let i=0;i<input.events.length;i++){
  const e=input.events[i];if(!e||typeof e!=='object')throw Error(`Invalid event at index ${i}`);
  if(typeof e.id!=='string'||!e.id.trim()||typeof e.calendarId!=='string'||!e.calendarId.trim())throw Error(`Missing source identity at index ${i}`);
  const key=JSON.stringify([e.calendarId,e.id]);const fingerprint=JSON.stringify([e.summary??null,e.start??null,e.end??null,e.status??'confirmed']);if(seen.has(key)){if(seen.get(key)!==fingerprint)throw Error(`Conflicting versions for event at index ${i}`);skippedDuplicates++;continue;}seen.set(key,fingerprint);
  if(e.status==='cancelled'){skippedCancelled++;continue;}
  const title=typeof e.summary==='string'?e.summary.replace(/[\r\n\t]/g,' ').slice(0,200):'(Untitled event)';
  const allDay=typeof e.start?.date==='string';
  if(allDay){
   if(!validDate(e.start.date)||!validDate(e.end?.date)||e.end.date<=e.start.date||e.start.dateTime||e.end.dateTime)throw Error(`Invalid all-day interval at index ${i}`);
   if(e.start.date<=input.date&&input.date<e.end.date)events.push({id:e.id,calendarId:e.calendarId,title,allDay:true,time:'All day'});
  }else{
   const start=instant(e.start?.dateTime),end=instant(e.end?.dateTime);if(end<=start||e.start.date||e.end.date)throw Error(`Invalid timed interval at index ${i}`);
   if(day(start)<=input.date&&day(end-1)>=input.date)events.push({id:e.id,calendarId:e.calendarId,title,allDay:false,start,end,time:`${day(start)} ${time.format(start)} – ${day(end)} ${time.format(end)}`});
  }
 }
 events.sort((a,b)=>Number(b.allDay)-Number(a.allDay)||(a.start||0)-(b.start||0)||a.title.localeCompare(b.title));
 const overlaps=[];
 for(let i=0;i<events.length;i++)for(let j=i+1;j<events.length;j++){
  const a=events[i],b=events[j];if(!a.allDay&&!b.allDay&&Math.max(a.start,b.start)<Math.min(a.end,b.end)){
   const begin=Math.max(a.start,b.start),finish=Math.min(a.end,b.end);
   if(day(begin)<=input.date&&day(finish-1)>=input.date)overlaps.push([i,j]);
  }
 }
 if(overlaps.length)warnings.push(`${overlaps.length} overlapping pair(s): review manually; shared copies of an event may also overlap.`);
 const lines=[`DRAFT — ${input.date} (${input.timeZone})`,...events.map(e=>`${e.time} | ${e.title}`),...(events.length?[]:['No events for this date.']),...warnings,...overlaps.map(([a,b])=>`Overlap: ${events[a].title} / ${events[b].title}`),'Review before sharing. Nothing was sent.'];
 return {date:input.date,timeZone:input.timeZone,events,overlaps,skippedCancelled,skippedDuplicates,draft:lines.join('\n'),delivery:'local-draft-only'};
}
module.exports={makeDigest};
