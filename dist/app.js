import { PokerGame, emptySession, RANKS, ON_CHECK, ON_BET, FIRST_BET, CALL_RAISE } from './game.js';
import { createPokerScene } from './scene.js';

const $ = selector => document.querySelector(selector);
const storageKey = 'one-card-session-v1';
let storageAvailable = true;
let saved = emptySession();
let soundOn = false;
try {
  const raw = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (raw && Number.isSafeInteger(raw.hands) && raw.hands >= 0 && raw.hands < 1e9 && Number.isSafeInteger(raw.money) && Math.abs(raw.money) <= raw.hands * 2 && Number.isSafeInteger(raw.wins) && raw.wins >= 0 && raw.wins <= raw.hands && Array.isArray(raw.history)) {
    saved = { money: raw.money, hands: raw.hands, wins: raw.wins, history: raw.history.filter(h => Number.isSafeInteger(h.number) && h.number > 0 && h.number <= raw.hands && RANKS.includes(h.player) && (h.opponent === null || RANKS.includes(h.opponent)) && [-2,-1,1,2].includes(h.delta) && typeof h.reason === 'string').slice(0,100) };
  }
  soundOn = localStorage.getItem('one-card-sound') === 'on';
} catch { storageAvailable = false; }
let game = new PokerGame(saved);
let computerTimer;
let dealTimer;
let presented = false;
let audio;
let lastSavedHand = saved.hands;
let pokerScene = null;

const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
function money(value, signed = false) {
  const prefix = value < 0 ? '−' : signed && value > 0 ? '+' : '';
  return `${prefix}$${Math.abs(value)}`;
}
function saveSession() {
  try { localStorage.setItem(storageKey, JSON.stringify(game.session)); }
  catch { storageAvailable = false; }
}
function playSound(won = false) {
  if (!soundOn) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume().catch(() => {});
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(won ? 523.25 : 240, t);
    osc.frequency.exponentialRampToValueAtTime(won ? 783.99 : 160, t + .12);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(.045, t + .01);
    gain.gain.exponentialRampToValueAtTime(.001, t + .18);
    osc.connect(gain); gain.connect(audio.destination); osc.start(t); osc.stop(t + .2);
  } catch { soundOn = false; renderSound(); }
}
function face(rank) {
  const spade = '<svg aria-hidden="true"><use href="#i-spade"/></svg>';
  const corner = `<span>${rank}</span>${spade}`;
  const center = Number(rank) ? `<div class="card-pips ${Number(rank) % 2 ? 'odd' : ''}">${spade.repeat(Number(rank))}</div>` : `<div class="royal-card ${rank === 'A' ? 'ace' : ''}">${rank === 'A' ? '' : `<strong>${rank}</strong>`}${spade}</div>`;
  return `<div class="card-corner">${corner}</div>${center}<div class="card-corner bottom">${corner}</div>`;
}
function renderHistory() {
  const list = $('#history');
  list.replaceChildren();
  game.session.history.forEach(hand => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.title = `Hand ${hand.number}: ${hand.reason}. ${money(hand.delta,true)}.`;
    const number = document.createElement('span'); number.className = 'history-number'; number.textContent = String(hand.number).padStart(3,'0');
    const cards = document.createElement('span'); cards.className = 'history-cards';
    const yours = document.createElement('span'); yours.className = 'mini-card your-mini'; yours.textContent = `${hand.player}♠`; yours.setAttribute('aria-label',`Your card ${hand.player} of spades`);
    const vs = document.createElement('span'); vs.className = 'history-versus'; vs.textContent = '/'; vs.setAttribute('aria-hidden','true');
    const theirs = document.createElement('span'); theirs.className = 'mini-card opponent-mini'; theirs.textContent = hand.opponent ? `${hand.opponent}♠` : '—'; theirs.setAttribute('aria-label', hand.opponent ? `Computer card ${hand.opponent} of spades` : 'Computer card not revealed');
    cards.append(yours,vs,theirs);
    const result = document.createElement('span'); result.className = `history-delta ${hand.delta < 0 ? 'negative' : ''}`; result.textContent = money(hand.delta,true);
    const reason = document.createElement('span');
    reason.className = 'history-reason';
    reason.textContent = ['You folded','Computer folded'].includes(hand.reason) ? hand.reason : 'Showdown';
    li.append(number,cards,result,reason); list.append(li);
  });
  $('#history-empty').hidden = game.session.hands > 0;
  $('#history-count').textContent = `${game.session.history.length} / 100`;
  $('#history-help').replaceChildren(...[...list.children].map(item => item.cloneNode(true)));
  $('#history-help-empty').hidden = game.session.history.length > 0;
}
function renderSound() {
  $('#sound').innerHTML = `${icon(soundOn ? 'volume' : 'mute')}<span>Sound ${soundOn ? 'on' : 'off'}</span>`;
  $('#sound').setAttribute('aria-pressed',String(soundOn));
  $('#sound').setAttribute('aria-label',`Sound ${soundOn ? 'on' : 'off'}`);
}
function render() {
  const active = game.phase !== 'idle';
  const complete = game.phase === 'complete';
  const deciding = ['decision','response'].includes(game.phase) && presented;
  const response = game.phase === 'response';
  const net = $('#net-winnings');
  net.innerHTML = `${money(game.session.money)}<span>.00</span>`;
  net.classList.toggle('positive',game.session.money > 0); net.classList.toggle('negative',game.session.money < 0);
  $('#hands-played').textContent = game.session.hands;
  $('#win-rate').textContent = game.session.hands ? `${Math.round(100 * game.session.wins / game.session.hands)}%` : '—';
  $('#session-caption').textContent = !game.session.hands ? 'A fresh start. Make it count.' : `${game.session.wins} ${game.session.wins === 1 ? 'win' : 'wins'} in ${game.session.hands} ${game.session.hands === 1 ? 'hand' : 'hands'}. Keep your nerve.`;
  $('#storage-note').textContent = storageAvailable ? 'Your session is saved in this browser.' : 'Storage unavailable. This session stays in this tab.';
  $('#hand-label').textContent = `HAND ${String(game.session.hands + (complete ? 0 : 1)).padStart(3,'0')}`;
  const opener = game.phase === 'idle' ? game.nextOpener : game.opener;
  $('#turn-order').textContent = game.phase === 'idle' ? opener === 'player' ? 'You open next' : 'Computer opens next' : complete ? opener === 'player' ? 'You opened' : 'Computer opened' : opener === 'player' ? 'You open' : 'Computer opens';
  $('#pot-value').innerHTML = `$${game.pot}<span>.00</span>`;
  $('.chips').className = `chips ${active ? 'in-play' : ''} ${game.pot === 3 ? 'three' : game.pot >= 4 ? 'four' : ''}`;
  $('#your-stake').textContent = active ? `$${game.playerStake} in` : '—';
  $('#computer-stake').textContent = active ? `$${game.opponentStake} in` : '—';
  if (active) $('#your-face').innerHTML = face(RANKS[game.player]);
  if (game.revealed) $('#computer-face').innerHTML = face(RANKS[game.opponent]);
  $('#your-card').classList.toggle('face-up',active && presented);
  $('#computer-card').classList.toggle('face-up',game.revealed);
  $('#your-card').setAttribute('aria-label',active && presented ? `Your card: ${RANKS[game.player]} of spades` : 'Your card, not dealt');
  $('#computer-card').setAttribute('aria-label',game.revealed ? `Computer card: ${RANKS[game.opponent]} of spades` : 'Computer card, concealed');
  $('#your-seat').classList.toggle('winner',complete && game.outcome.delta > 0);
  $('#computer-seat').classList.toggle('winner',complete && game.outcome.delta < 0);
  $('#your-seat').classList.toggle('folded',complete && game.outcome.reason === 'You folded');
  $('#computer-seat').classList.toggle('folded',complete && game.outcome.reason === 'Computer folded');
  $('#your-action').textContent = !active ? 'Take a seat' : game.phase === 'decision' ? 'Your move' : game.phase === 'response' ? 'Call or fold' : complete ? game.outcome.reason === 'You folded' ? 'Folded' : game.outcome.delta > 0 ? 'Winner' : 'Next hand?' : game.playerAction === 'check' ? 'Checked' : game.playerAction === 'bet' ? 'Bet $1' : 'Waiting';
  $('#computer-action').textContent = !active ? 'Ready when you are' : game.phase === 'thinking' ? 'Thinking…' : complete ? game.outcome.reason === 'Computer folded' ? 'Folded' : `${RANKS[game.opponent]} high` : game.computerAction === 'bet' ? 'Bet $1' : game.computerAction === 'raise' ? 'Raised $1' : game.computerAction === 'check' ? 'Checked' : 'Card concealed';
  $('#action-zero').innerHTML = `${response ? 'Fold' : 'Check'} <kbd>A</kbd>`;
  $('#action-one').innerHTML = `${response ? 'Call $1' : 'Bet $1'} <kbd>S</kbd>`;
  $('#action-zero').disabled = !deciding; $('#action-one').disabled = !deciding;
  $('#deal').hidden = active && !complete;
  $('#deal').innerHTML = `${complete ? 'Deal again' : 'Deal a hand'} ${icon('arrow')}`;
  $('.action-panel').classList.toggle('thinking',game.phase === 'thinking' || active && !presented);
  let title = 'The table is yours.';
  let copy = opener === 'player' ? 'A $1 ante each. You open this hand.' : 'A $1 ante each. The computer opens this hand.';
  let symbol = 'spade';
  if (game.phase === 'decision') { title = 'Your card. Your call.'; copy = game.opener === 'computer' ? 'The computer checked. Check or bet $1.' : `You’re holding ${RANKS[game.player]}♠. Check or put $1 on it.`; }
  if (game.phase === 'thinking') { title = game.pending === 'open' ? 'The computer opens.' : 'Over to the computer.'; copy = game.pending === 'open' ? 'It goes first this hand. Your turn follows.' : game.pending === 'check' ? 'You checked. Let’s see what it does.' : 'Your $1 bet is on the table.'; }
  if (response) { title = game.opener === 'computer' ? 'The computer bets $1.' : 'The computer raises $1.'; copy = 'Call $1 to stay in, or fold your ante.'; }
  if (active && !presented) { title = 'Dealing you in…'; copy = 'Two cards. Two $1 antes.'; }
  if (complete) {
    title = game.outcome.delta > 0 ? `You win $${game.outcome.delta}. Nicely played.` : `You lose $${Math.abs(game.outcome.delta)}. Next hand?`;
    copy = game.outcome.reason === 'You folded' ? `You folded your $1 ante. The computer held ${RANKS[game.opponent]}♠.` : game.outcome.reason === 'Computer folded' ? `The computer folded ${RANKS[game.opponent]}♠. You keep its $1 ante.` : `${RANKS[game.player]}♠ ${game.player > game.opponent ? 'beats' : 'loses to'} ${RANKS[game.opponent]}♠. ${game.pot === 4 ? 'A $4 pot, a $2 net result.' : 'A $2 pot, a $1 net result.'}`;
    symbol = game.outcome.delta > 0 ? 'check' : 'shuffle';
  }
  $('#status-title').textContent = title; $('#status-copy').textContent = copy; $('#turn-symbol').innerHTML = icon(symbol);
  pokerScene?.sync({phase:game.phase,player:active&&presented?RANKS[game.player]:null,opponent:game.revealed?RANKS[game.opponent]:null,pot:game.pot,delta:game.outcome?.delta||0,hand:game.session.hands+(complete?0:1),playerStake:game.playerStake,opponentStake:game.opponentStake});
  if (complete && game.session.hands !== lastSavedHand) {
    lastSavedHand = game.session.hands;
    saveSession(); renderHistory(); playSound(game.outcome.delta > 0);
    net.classList.remove('value-bump'); void net.offsetWidth; net.classList.add('value-bump');
    $('#storage-note').textContent = storageAvailable ? 'Your session is saved in this browser.' : 'Storage unavailable. This session stays in this tab.';
  }
}
function dealHand() {
  if (!game.deal()) return;
  clearTimeout(dealTimer); clearTimeout(computerTimer);
  presented = false;
  render(); playSound();
  for (const card of document.querySelectorAll('.playing-card')) { card.classList.remove('dealing'); void card.offsetWidth; card.classList.add('dealing'); }
  dealTimer = setTimeout(() => { presented = true; render(); queueComputerTurn(); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300);
}
function queueComputerTurn() {
  clearTimeout(computerTimer);
  if (game.phase !== 'thinking') return;
  computerTimer = setTimeout(() => { game.resolveComputer(); render(); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 700);
}
function act(value) {
  if (!presented) return;
  const action = game.phase === 'response' ? value ? 'call' : 'fold' : value ? 'bet' : 'check';
  if (!game.act(action)) return;
  render();
  if (game.phase === 'thinking') {
    playSound();
    queueComputerTurn();
  }
}
$('#deal').addEventListener('click',dealHand);
$('#action-zero').addEventListener('click',() => act(0));
$('#action-one').addEventListener('click',() => act(1));
$('#sound').addEventListener('click',() => { soundOn = !soundOn; try { localStorage.setItem('one-card-sound', soundOn ? 'on' : 'off'); } catch {} renderSound(); playSound(); });
$('#reset').addEventListener('click',() => $('#reset-dialog').showModal());
$('#confirm-reset').addEventListener('click',() => { clearTimeout(computerTimer); clearTimeout(dealTimer); game = new PokerGame(); lastSavedHand = 0; presented = false; saveSession(); render(); renderHistory(); $('#reset-dialog').close(); $('#deal').focus(); });
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelectorAll('.dialog-close,.dialog-cancel').forEach(button => button.addEventListener('click',() => dialog.close()));
  dialog.addEventListener('click',event => { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); });
}
document.addEventListener('keydown',event => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]') || event.target.closest('input,textarea,select,[contenteditable=true]')) return;
  if (!$('#table').getBoundingClientRect().bottom || $('#table').getBoundingClientRect().bottom < 0) return;
  if (event.key.toLowerCase() === 'd') { event.preventDefault(); dealHand(); }
  if (event.key.toLowerCase() === 'a' || event.key.toLowerCase() === 's') { event.preventDefault(); act(event.key.toLowerCase() === 's' ? 1 : 0); }
});

function strategyTable(id, rows) {
  const head = `<thead><tr><th scope="col">Card in hand</th>${RANKS.map(rank => `<th scope="col">${rank}<span class="rank-suit"> ♠</span></th>`).join('')}</tr></thead>`;
  const body = `<tbody>${rows.map(([label, values]) => `<tr><th scope="row">${label}</th>${values.map(value => `<td data-level="${value === 0 ? 'zero' : value >= .75 ? 'high' : 'mid'}">${Number((value * 100).toFixed(1))}%</td>`).join('')}</tr>`).join('')}</tbody>`;
  $(id).innerHTML = `<caption class="sr-only">${id === '#computer-strategy' ? 'Second player action probabilities by card' : 'First player action probabilities by card'}</caption>${head}${body}`;
}
strategyTable('#computer-strategy',[['Bet after a check',ON_CHECK],['Call an opening bet',ON_BET]]);
strategyTable('#player-strategy',[['Open with a bet',FIRST_BET],['Call after checking',CALL_RAISE]]);
const tabs = [...document.querySelectorAll('#strategy-tabs [role=tab]')];
function selectTab(tab, focus = false) { tabs.forEach(item => { const selected = item === tab; item.setAttribute('aria-selected',String(selected)); item.tabIndex = selected ? 0 : -1; document.getElementById(item.getAttribute('aria-controls')).hidden = !selected; }); if (focus) tab.focus(); }
tabs.forEach((tab,index) => { tab.addEventListener('click',() => selectTab(tab)); tab.addEventListener('keydown',event => { if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) { event.preventDefault(); selectTab(tabs[event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1-index],true); } }); });

const helpTabs = [...document.querySelectorAll('[data-help]')];
function selectHelp(tab,focus=false) {
  helpTabs.forEach(item => { const selected=item===tab; item.setAttribute('aria-selected',String(selected)); item.tabIndex=selected?0:-1; document.getElementById(item.getAttribute('aria-controls')).hidden=!selected; });
  $('.help-scroll').scrollTop=0;
  if(focus)tab.focus();
}
helpTabs.forEach((tab,index) => {
  tab.addEventListener('click',() => selectHelp(tab));
  tab.addEventListener('keydown',event => { if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return; event.preventDefault(); const next=event.key==='Home'?0:event.key==='End'?helpTabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+helpTabs.length)%helpTabs.length; selectHelp(helpTabs[next],true); });
});
$('#help').addEventListener('click',() => $('#help-dialog').showModal());
const legal = {
  privacy: ['Your game. Your browser.', '<p>This game stores completed session totals, up to 100 recent hands, and your sound preference in this browser’s local storage. Use Reset session to erase the game history.</p><p>The game has no analytics, ads, payment forms, or external font requests. It does not send your cards or session results to a game server. The hosting provider separately handles site access and its service records.</p>'],
  terms: ['A place to practice.', '<p>One Card is a free poker simulation for learning and entertainment. All amounts are fictional. They cannot be bought, withdrawn, exchanged, or redeemed for anything of value.</p><p>Session statistics are stored on your device and may be lost if you clear browser data. The supplied strategy tables guide the computer’s decisions; outcomes still depend on chance and your choices.</p>']
};
document.querySelectorAll('[data-legal]').forEach(button => button.addEventListener('click',() => { const [title,copy] = legal[button.dataset.legal]; $('#legal-title').textContent = title; $('#legal-copy').innerHTML = copy; $('#legal-dialog').showModal(); }));

renderSound(); renderHistory(); render();
document.fonts.ready.then(() => {
  try { pokerScene=createPokerScene($('#three-stage')); render(); }
  catch { $('#scene-error').textContent='3D rendering is unavailable. You can still play using this table.'; $('#scene-error').hidden=false; }
});
window.addEventListener('pagehide',() => pokerScene?.dispose(),{once:true});
